import { useEffect, useRef, useState } from 'react';
import { ATTRIBUTES, PLAN_SYSTEM, compareObservations, createContinuityId, frameReviewRequest, importPlan, reportProject, validateBlueprint, validateConstraint, validateModelObservations } from './continuity.js';
import { EXAMPLE_CONSTRAINTS, EXAMPLE_PLAN } from './example.js';
import './continuity.css';

const LABELS = { no_discrepancy: 'Nessuna discrepanza nel dato', possible_issue: 'Possibile discrepanza', unverifiable: 'Non valutabile' };
const emptyProject = () => ({ blueprint: null, constraints: [], reviews: [] });
function download(name, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function readImage(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Usa un’immagine JPEG, PNG o WebP fino a 8 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally { bitmap.close(); }
}

export default function ContinuityPanel({ project, setProject, scriptText, runAi, localAi, model }) {
  const [shotId, setShotId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [sceneText, setSceneText] = useState('');
  const abortRef = useRef(null);
  const planInput = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const bp = project.blueprint;
  const selected = bp?.shots.find(s => s.shot_id === shotId) || bp?.shots[0];
  const setPlan = next => { setProject(next); setShotId(next.blueprint.shots[0].shot_id); setError(''); setNotice('Piano caricato. I vincoli devono essere approvati prima del confronto.'); };
  async function importFile(file) {
    try {
      if (!file || file.size > 2 * 1024 * 1024) throw new Error('Scegli un JSON FilmDSL fino a 2 MB.');
      setPlan(importPlan(await file.text()));
    } catch (e) { setError(e.message); }
  }
  async function generatePlan() {
    setError(''); setNotice('');
    if (!localAi) { setError('Seleziona LM Studio nel pannello Motore AI. Per questo modulo la generazione e la revisione visiva usano solo quell’endpoint.'); return; }
    if (sceneText.trim().length < 20 || sceneText.length > 16000) { setError('Inserisci una sola scena, da 20 a 16.000 caratteri.'); return; }
    setBusy(true); abortRef.current = new AbortController();
    try {
      const payload = await runAi({ system: PLAN_SYSTEM, user: sceneText, signal: abortRef.current.signal });
      if (!abortRef.current.signal.aborted) setPlan({ ...emptyProject(), blueprint: validateBlueprint(payload) });
    } catch (e) { if (e.name !== 'AbortError') setError(e.message); }
    finally { setBusy(false); }
  }
  const changeConstraint = (id, action) => setProject(p => ({ ...p, constraints: action === 'delete' ? p.constraints.filter(c => c.id !== id) : p.constraints.map(c => c.id === id ? { ...c, approved: !c.approved } : c) }));
  return <section className="continuity" aria-label="Continuità DeepFrame IntelliMaker">
    <div className="ct-head"><div><h2>Continuità · DeepFrame × IntelliMaker</h2><p>Dal piano CineCrew al confronto con il girato. Primo modulo operativo.</p></div><span className="ct-badge">REVISIONE UMANA</span></div>
    <p className="ct-callout">Ponte FilmDSL compatibile con CineCrew: il motore Python non viene eseguito. Il confronto riguarda dati osservati e singoli fotogrammi; asse e raccordi in movimento richiedono verifica sul video.</p>
    <div className="ct-toolbar">
      <button disabled={busy} onClick={() => planInput.current.click()}>Importa piano CineCrew / FilmDSL</button>
      <input ref={planInput} aria-label="Importa piano JSON" type="file" accept=".json,application/json" hidden onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }} />
      <button disabled={busy} onClick={() => setPlan({ blueprint: structuredClone(EXAMPLE_PLAN), constraints: structuredClone(EXAMPLE_CONSTRAINTS), reviews: [] })}>Carica esempio sintetico</button>
      {bp && <><button disabled={busy} onClick={() => download('deepframe-filmdsl.json', bp)}>Esporta FilmDSL</button><button disabled={busy} onClick={() => download('deepframe-continuity-report.json', reportProject(project))}>Esporta progetto e report</button></>}
    </div>
    <details className="ct-card"><summary>Crea una proposta di piano da una scena con LM Studio</summary><p>Il testo viene inviato al server configurato in Motore AI. Nessun invio automatico. Il risultato è una proposta da rivedere, non una decisione del regista.</p>
      <button disabled={busy || !scriptText} onClick={() => { if (scriptText.length > 16000) setError("Il testo corrente supera 16.000 caratteri: incolla una singola scena nel campo sottostante."); else setSceneText(scriptText); }}>Copia testo corrente (controlla che sia una sola scena)</button>
      <label>Testo della scena<textarea disabled={busy} value={sceneText} maxLength={16000} rows={7} onChange={e => setSceneText(e.target.value)} placeholder="INT. BAR — SERA…" /></label>
      <button className="ct-primary" disabled={busy || !sceneText.trim()} onClick={generatePlan}>{busy ? 'Elaborazione…' : 'Proponi piano FilmDSL'}</button>
    </details>
    {busy && <button onClick={() => abortRef.current?.abort()}>Annulla richiesta</button>}
    {error && <p className="ct-error" role="alert">{error}</p>}{notice && <p className="ct-note" role="status">{notice}</p>}
    {!bp && <div className="ct-card"><h3>Comincia da un piano di inquadrature</h3><p>Importa il file <code>scene_blueprint_final.json</code> prodotto da CineCrew, genera una proposta oppure carica l’esempio. I materiali restano in questa sessione: esportali prima di chiudere o sostituire il piano.</p></div>}
    {selected && <>
      <label>Inquadratura<select disabled={busy} value={selected.shot_id} onChange={e => { setShotId(e.target.value); setError(''); }}>{bp.shots.map(s => <option key={s.shot_id}>{s.shot_id}</option>)}</select></label>
      <div className="ct-card"><h3>{bp.metadata.project_name} / {selected.shot_id}</h3><p>{selected.narrative_layer?.narrative_action || 'Azione non specificata'}</p><p>Camera: {selected.staging_layer.camera?.shot_scale || '—'} · {selected.staging_layer.camera?.movement || '—'}</p><h4>Vincoli testuali originali CineCrew</h4><ul>{selected.staging_layer.consistency_constraints.map((c,i) => <li key={i}>{c}</li>)}</ul><p>Questi testi rimangono promemoria: aggiungi sotto i valori verificabili e approvali. Non vengono convertiti automaticamente in fatti del girato.</p></div>
      <ConstraintForm key={`${bp.blueprint_id}:${selected.shot_id}`} shot={selected} busy={busy} onAdd={c => { try { const validated = validateConstraint(c, bp); setProject(p => ({ ...p, constraints: [...p.constraints, validated] })); setError(''); } catch(e) { setError(e.message); } }} />
      <div className="ct-card"><h3>Valori attesi da approvare</h3>{project.constraints.filter(c => c.shot_id === selected.shot_id).map(c => <div className="ct-constraint" key={c.id}><div><b>{c.entity_id} · {ATTRIBUTES[c.attribute]}: {c.expected}</b><small>{c.evidence || 'Riferimento non specificato'}</small></div><label><input disabled={busy} type="checkbox" checked={c.approved} onChange={() => changeConstraint(c.id)} /> Approvato</label><button disabled={busy} onClick={() => changeConstraint(c.id, 'delete')}>Rimuovi</button></div>)}{!project.constraints.some(c => c.shot_id === selected.shot_id) && <p>Nessun valore atteso: aggiungine almeno uno.</p>}</div>
      <TakeReview key={`${bp.blueprint_id}:${selected.shot_id}`} blueprint={bp} shot={selected} constraints={project.constraints} runAi={runAi} localAi={localAi} model={model} busy={busy} setBusy={setBusy} abortRef={abortRef} onError={setError} onSave={r => { setProject(p => ({ ...p, reviews: [...p.reviews, r] })); setNotice('Revisione registrata. Nessun file video modificato.'); }} />
      <div className="ct-card"><h3>Registro revisioni</h3><p>Ogni voce conserva il piano e i vincoli usati al momento del confronto. Nessuna voce certifica la correzione del media.</p>{project.reviews.length === 0 && <p>Nessuna revisione registrata.</p>}{project.reviews.map(r => <article className="ct-review" key={r.id}><h4>{r.shot_id} / {r.take_id} · {r.source === 'model' ? 'Modello: '+r.model : 'Osservazioni manuali'}</h4><p>Fotogramma: {r.frame_name} · secondo {r.time_seconds ?? 'non indicato'} · {new Date(r.created_at).toLocaleString('it-IT')}</p>{r.results.map(result => <div className={`ct-result ${result.status}`} key={result.constraint_id}><b>{LABELS[result.status]} — {result.entity_id}</b><p>{ATTRIBUTES[result.attribute]}: atteso «{result.expected}» / osservato «{result.observed || 'non determinato'}»</p><p>{result.evidence}</p><p>{result.suggestion}</p></div>)}<label>Decisione dell’operatore<select value={r.decision} onChange={e => setProject(p => ({ ...p, reviews: p.reviews.map(item => item.id === r.id ? { ...item, decision: e.target.value } : item) }))}><option value="open">Da verificare</option><option value="intentional">Discontinuità intenzionale annotata</option><option value="pickup_requested">Pickup richiesto</option><option value="post_review">Da valutare in montaggio</option></select></label></article>)}</div>
    </>}
  </section>;
}

function ConstraintForm({ shot, busy, onAdd }) {
  const [entity, setEntity] = useState(shot.staging_layer.entities[0]?.asset_id || '');
  const [attribute, setAttribute] = useState('hand'); const [expected, setExpected] = useState(''); const [evidence, setEvidence] = useState('');
  return <form className="ct-card" onSubmit={e => { e.preventDefault(); onAdd({ id: createContinuityId(), shot_id: shot.shot_id, entity_id: entity, attribute, expected, evidence, approved: false }); setExpected(''); }}><h3>Aggiungi un vincolo verificabile</h3><div className="ct-fields"><label>Entità<select disabled={busy} value={entity} onChange={e => setEntity(e.target.value)}>{shot.staging_layer.entities.map(e => <option key={e.asset_id}>{e.asset_id}</option>)}</select></label><label>Attributo<select disabled={busy} value={attribute} onChange={e => setAttribute(e.target.value)}>{Object.entries(ATTRIBUTES).map(([k,v]) => <option value={k} key={k}>{v}</option>)}</select></label><label>Valore atteso<input disabled={busy} required maxLength={200} value={expected} onChange={e => setExpected(e.target.value)} placeholder="es. destra" /></label></div><label>Fonte del vincolo<input disabled={busy} maxLength={4000} value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="es. storyboard 12B, gesto approvato dal regista" /></label><button disabled={busy || !entity}>Aggiungi, poi approva</button></form>;
}

function TakeReview({ blueprint, shot, constraints, runAi, localAi, model, busy, setBusy, abortRef, onError, onSave }) {
  const [frame, setFrame] = useState(null); const [reference, setReference] = useState(null);
  const [videoFile, setVideoFile] = useState(null); const [takeId, setTakeId] = useState(''); const [observations, setObservations] = useState({});
  const videoRef = useRef(null);
  const checks = constraints.filter(c => c.approved && c.shot_id === shot.shot_id);
  const videoUrl = useRef(null);
  useEffect(() => () => { if (videoUrl.current) URL.revokeObjectURL(videoUrl.current); abortRef.current?.abort(); }, [abortRef]);
  async function loadImage(file, referenceImage = false) {
    try { const data = await readImage(file); if (referenceImage) setReference({ data, name: file.name }); else { setFrame({ data, name: file.name, time: null }); setObservations({}); } } catch(e) { onError(e.message); }
  }
  function loadVideo(file) {
    if (!file) return;
    if (!file.type.startsWith('video/') || file.size > 500 * 1024 * 1024) { onError('Seleziona un video locale fino a 500 MB.'); return; }
    if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
    videoUrl.current = URL.createObjectURL(file); setVideoFile({ name: file.name, url: videoUrl.current }); setFrame(null); setObservations({});
  }
  function captureFrame() {
    try {
      const video = videoRef.current;
      if (!video?.videoWidth || video.readyState < 2) throw new Error('Attendi il caricamento del video e scegli un punto riproducibile.');
      const canvas = document.createElement('canvas'); const ratio = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * ratio); canvas.height = Math.round(video.videoHeight * ratio);
      video.pause(); canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      setFrame({ data: canvas.toDataURL('image/jpeg', 0.85), name: videoFile.name, time: Math.round(video.currentTime * 1000) / 1000 }); setObservations({}); onError('');
    } catch(e) { onError(e.message); }
  }
  function save(rows, source) {
    if (!takeId.trim()) throw new Error('Inserisci un identificativo del take.');
    if (!checks.length) throw new Error('Approva almeno un vincolo.');
    onSave({ id: createContinuityId(), blueprint_id: blueprint.blueprint_id, shot_id: shot.shot_id, take_id: takeId.trim(), created_at: new Date().toISOString(), frame_name: frame?.name || 'Annotazione senza fotogramma', reference_name: reference?.name || null, time_seconds: frame?.time ?? null, source, model: source === 'model' ? model : null, constraints: structuredClone(checks), results: compareObservations(checks, rows, shot.shot_id), decision: 'open' });
  }
  function manual() {
    try {
      const rows = checks.map(c => ({ constraint_id: c.id, visibility: observations[c.id]?.visibility || 'uncertain', value: observations[c.id]?.value || '', evidence: observations[c.id]?.evidence || 'Verifica manuale non documentata.' }));
      save(validateModelObservations({ observations: rows }, constraints, shot.shot_id).map(o => ({ ...o, source: 'manual' })), 'manual'); onError('');
    } catch(e) { onError(e.message); }
  }
  async function aiReview() {
    onError('');
    if (!localAi) { onError('Seleziona LM Studio in Motore AI e carica un modello che supporti immagini.'); return; }
    if (!takeId.trim()) { onError('Inserisci l’identificativo del take prima della richiesta.'); return; }
    setBusy(true); const controller = new AbortController(); abortRef.current = controller;
    try {
      const request = frameReviewRequest(blueprint, constraints, shot.shot_id, frame?.data, reference?.data, controller.signal);
      const result = await runAi(request);
      if (!controller.signal.aborted) save(validateModelObservations(result, constraints, shot.shot_id), 'model');
    } catch(e) { if(e.name !== 'AbortError') onError(e.message); }
    finally { setBusy(false); }
  }
  const update = (id, field, value) => setObservations(p => ({ ...p, [id]: { ...p[id], [field]: value } }));
  return <div className="ct-card"><h3>Confronta un take reale</h3><label>Identificativo take<input disabled={busy} maxLength={120} value={takeId} onChange={e => setTakeId(e.target.value)} placeholder="es. 12C / 02" /></label><div className="ct-fields"><label>Fotogramma corrente<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => loadImage(e.target.files?.[0])} /></label><label>Riferimento approvato (facoltativo)<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => loadImage(e.target.files?.[0], true)} /></label><label>Oppure video locale<input disabled={busy} type="file" accept="video/*" onChange={e => loadVideo(e.target.files?.[0])} /></label></div>{videoFile && <><video ref={videoRef} src={videoFile.url} controls preload="metadata" onError={() => onError('Il browser non può decodificare questo video. Prova MP4/H.264 o importa un fotogramma.')} /><button disabled={busy} onClick={captureFrame}>Usa il fotogramma visualizzato</button></>}<div className="ct-frames">{reference && <figure><img src={reference.data} alt="Riferimento caricato dall’operatore" /><figcaption>Riferimento · {reference.name} <button disabled={busy} onClick={() => setReference(null)}>Rimuovi</button></figcaption></figure>}{frame && <figure><img src={frame.data} alt="Fotogramma corrente del take" /><figcaption>Corrente · {frame.name} {frame.time !== null && `· secondo ${frame.time}`}</figcaption></figure>}</div><p>Immagini e video rimangono nel browser. Solo premendo il pulsante di revisione visiva vengono inviati i fotogrammi e i vincoli all’endpoint LM Studio configurato. Serve un modello visivo; il suo esito non è una misura validata di affidabilità.</p><button className="ct-primary" disabled={busy || !frame || !checks.length || !takeId.trim()} onClick={aiReview}>{busy ? 'Richiesta in corso…' : 'Invia fotogrammi a LM Studio per revisione visiva'}</button><details><summary>Confronto manuale dei valori osservati (nessuna AI richiesta)</summary><p>Registra ciò che hai effettivamente visto. Valori diversi segnalano una possibile discrepanza, non un errore certo. Testi equivalenti scritti diversamente possono richiedere verifica.</p>{checks.map(c => <div className="ct-card" key={c.id}><b>{c.entity_id} · {ATTRIBUTES[c.attribute]} · atteso: {c.expected}</b><div className="ct-fields"><label>Visibilità<select disabled={busy} value={observations[c.id]?.visibility || 'uncertain'} onChange={e => update(c.id, 'visibility', e.target.value)}><option value="uncertain">Incerto</option><option value="visible">Visibile / verificato</option><option value="not_visible">Non visibile</option></select></label><label>Valore osservato<input disabled={busy} maxLength={200} value={observations[c.id]?.value || ''} onChange={e => update(c.id, 'value', e.target.value)} placeholder="es. sinistra" /></label></div><label>Evidenza<input disabled={busy} maxLength={4000} value={observations[c.id]?.evidence || ''} onChange={e => update(c.id, 'evidence', e.target.value)} placeholder="Descrivi il dettaglio verificato" /></label></div>)}<button disabled={busy || !checks.length || !takeId.trim()} onClick={manual}>Confronta e registra osservazioni manuali</button></details></div>;
}
