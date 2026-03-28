import { useState, useCallback, useRef } from "react";
import * as mammoth from "mammoth";

const API_FORMAT           = "/api/format";
const API_ANALYZE          = "/api/analyze";
const API_CHARACTER_SHEETS = "/api/character-sheets";
const API_BREAKDOWN        = "/api/breakdown";
const API_LOCATION_SHEETS  = "/api/location-sheets";

// ─── Colori per tipi elemento ───────────────────────────────────────────────
const typeLabels = {
  scene_heading: "INT./EST.", action: "Azione", character: "Personaggio",
  parenthetical: "Parentetica", dialogue: "Dialogo", transition: "Transizione",
  title: "Titolo", blank: "",
};
const typeColors = {
  scene_heading: "#4FC3F7", action: "#A5D6A7", character: "#FFD54F",
  parenthetical: "#CE93D8", dialogue: "#FFFFFF", transition: "#FF8A65",
  title: "#F48FB1", blank: "transparent",
};

// ─── Colori e icone per l'analisi ───────────────────────────────────────────
const valColors  = { efficace: "#A5D6A7", debole: "#FFD54F", assente: "#FF8A65" };
const valLabels  = { efficace: "✓ Efficace", debole: "⚠ Debole", assente: "✗ Assente" };
const conflittoColors = { alto: "#4FC3F7", medio: "#FFD54F", basso: "#FF8A65", assente: "#555" };
const gravColors = { alta: "#FF6B6B", media: "#FFD54F", bassa: "#A5D6A7" };
const arcoIcons  = { crescita: "📈", regressione: "📉", statico: "➡️", trasformazione_ambigua: "🌀", assente: "—" };
const segnIcons  = {
  dialogo_espositivo: "💬", scena_ridondante: "🔁", squilibrio_showing_telling: "⚖️",
  conflitto_assente: "😶", arco_incompleto: "🔓", ritmo_irregolare: "⏱", struttura_squilibrata: "🏗",
};
const momentoLabels = {
  inciting_incident: "Inciting Incident", primo_punto_di_svolta: "1° Punto di svolta",
  midpoint: "Midpoint", secondo_punto_di_svolta: "2° Punto di svolta", climax: "Climax",
};

// ─── Fountain export ─────────────────────────────────────────────────────────
function toFountain(elements) {
  return elements.map((el) => {
    switch (el.type) {
      case "title": return `Title: ${el.content}\n`;
      case "scene_heading": return `\n${el.content}\n`;
      case "action": return `\n${el.content}\n`;
      case "character": return `\n${el.content}`;
      case "parenthetical": return `${el.content}`;
      case "dialogue": return `${el.content}\n`;
      case "transition": return `\n${el.content}\n`;
      case "blank": return "";
      default: return el.content;
    }
  }).join("\n").trim();
}

// ─── Preview cinematografica ──────────────────────────────────────────────────
function ScreenplayPreview({ elements }) {
  return (
    <div style={{ fontFamily: "'Courier Prime','Courier New',Courier,monospace", fontSize: "13px", lineHeight: "1.7", background: "#fff", color: "#111", padding: "60px 80px", maxWidth: "680px", margin: "0 auto", minHeight: "400px" }}>
      {elements.map((el, i) => {
        if (el.type === "blank") return <div key={i} style={{ height: "1em" }} />;
        if (el.type === "title") return <div key={i} style={{ textAlign: "center", fontWeight: "bold", fontSize: "15px", marginBottom: "32px" }}>{el.content}</div>;
        if (el.type === "transition") return <div key={i} style={{ textAlign: "right", textTransform: "uppercase", marginTop: "12px", marginBottom: "4px" }}>{el.content}</div>;
        if (el.type === "scene_heading") return <div key={i} style={{ fontWeight: "bold", textTransform: "uppercase", marginTop: "20px", marginBottom: "4px", textDecoration: "underline" }}>{el.content}</div>;
        if (el.type === "action") return <div key={i} style={{ marginTop: "8px", marginBottom: "8px" }}>{el.content}</div>;
        if (el.type === "character") return <div key={i} style={{ marginLeft: "200px", marginTop: "14px", textTransform: "uppercase", fontWeight: "bold" }}>{el.content}</div>;
        if (el.type === "parenthetical") return <div key={i} style={{ marginLeft: "140px", marginRight: "160px", fontStyle: "italic" }}>{el.content}</div>;
        if (el.type === "dialogue") return <div key={i} style={{ marginLeft: "100px", marginRight: "100px", marginBottom: "4px" }}>{el.content}</div>;
        return <div key={i}>{el.content}</div>;
      })}
    </div>
  );
}

// ─── Scheda: Struttura in 3 atti ─────────────────────────────────────────────
function StrutturaAtti({ struttura }) {
  if (!struttura) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Barra grafica 3 atti */}
      <div>
        <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Distribuzione atti</div>
        <div style={{ display: "flex", height: "32px", borderRadius: "6px", overflow: "hidden", gap: "2px" }}>
          {struttura.atti.map((a) => (
            <div key={a.atto} style={{ flex: parseFloat(a.percentuale), background: a.atto === 1 ? "#4FC3F7" : a.atto === 2 ? "#CE93D8" : "#FFD54F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontFamily: "sans-serif", fontWeight: "bold", color: "#111" }}>
              A{a.atto} · {a.percentuale}
            </div>
          ))}
        </div>
      </div>

      {/* Atti */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {struttura.atti.map((a) => (
          <div key={a.atto} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "8px", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ fontWeight: "bold", color: "#f0ead8", fontFamily: "sans-serif", fontSize: "13px" }}>Atto {a.atto}</span>
              <span style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif" }}>Scene {a.scene_da}–{a.scene_a} · {a.percentuale}</span>
              <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontFamily: "sans-serif", fontWeight: "bold", background: `${valColors[a.valutazione]}22`, color: valColors[a.valutazione], border: `1px solid ${valColors[a.valutazione]}44` }}>
                {valLabels[a.valutazione]}
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#aaa", fontFamily: "sans-serif", lineHeight: "1.5", marginBottom: "6px" }}>{a.funzione_narrativa}</div>
            <div style={{ fontSize: "11px", color: "#777", fontFamily: "sans-serif", fontStyle: "italic", lineHeight: "1.5", borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: "8px" }}>🎓 {a.note_docente}</div>
          </div>
        ))}
      </div>

      {/* Momenti chiave */}
      <div>
        <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Momenti chiave</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {struttura.momenti_chiave.map((m) => (
            <div key={m.tipo} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px 14px", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px" }}>
              <div style={{ minWidth: "160px" }}>
                <div style={{ fontSize: "11px", fontWeight: "bold", fontFamily: "sans-serif", color: "#c8a96e" }}>{momentoLabels[m.tipo]}</div>
                <div style={{ fontSize: "10px", color: "#666", fontFamily: "sans-serif" }}>{m.scena_numero ? `Scena ${m.scena_numero}` : "Non identificato"}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", color: "#ccc", fontFamily: "sans-serif", lineHeight: "1.5" }}>{m.descrizione}</div>
                <div style={{ fontSize: "11px", color: "#666", fontFamily: "sans-serif", fontStyle: "italic", marginTop: "4px" }}>🎓 {m.nota_docente}</div>
              </div>
              <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontFamily: "sans-serif", fontWeight: "bold", background: `${valColors[m.valutazione]}22`, color: valColors[m.valutazione], border: `1px solid ${valColors[m.valutazione]}44`, whiteSpace: "nowrap" }}>
                {valLabels[m.valutazione]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Scheda: Personaggi ───────────────────────────────────────────────────────
function PersonaggiPanel({ personaggi }) {
  if (!personaggi?.length) return <div style={{ color: "#666", fontFamily: "sans-serif", padding: "20px" }}>Nessun personaggio rilevato.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {personaggi.map((p) => (
        <div key={p.nome} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "8px", padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#FFD54F", fontFamily: "monospace" }}>{p.nome}</span>
            <span style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif" }}>{p.battute} battute · {p.presenza_scene} scene</span>
            <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "sans-serif", background: "rgba(255,255,255,.06)", color: "#ccc", border: "1px solid rgba(255,255,255,.1)" }}>
              {arcoIcons[p.arco]} {p.arco?.replace(/_/g, " ")}
            </span>
            {p.tipi_conflitto?.map((c) => (
              <span key={c} style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontFamily: "sans-serif", background: "rgba(200,169,110,.1)", color: "#c8a96e", border: "1px solid rgba(200,169,110,.2)" }}>{c}</span>
            ))}
          </div>
          <div style={{ fontSize: "12px", color: "#aaa", fontFamily: "sans-serif", lineHeight: "1.5", marginBottom: "8px" }}>{p.analisi_arco}</div>
          <div style={{ fontSize: "11px", color: "#777", fontFamily: "sans-serif", fontStyle: "italic", lineHeight: "1.5", borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: "8px" }}>🎓 {p.nota_docente}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Scheda: Analisi scene ────────────────────────────────────────────────────
function ScenePanel({ analisi_scene }) {
  if (!analisi_scene?.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {analisi_scene.map((s) => (
        <div key={s.numero} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 14px", background: s.problemi?.length ? "rgba(255,100,100,.04)" : "rgba(255,255,255,.02)", border: `1px solid ${s.problemi?.length ? "rgba(255,100,100,.15)" : "rgba(255,255,255,.06)"}`, borderRadius: "6px" }}>
          <div style={{ minWidth: "28px", fontSize: "11px", color: "#555", fontFamily: "monospace", paddingTop: "2px" }}>#{s.numero}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#c8a96e", fontFamily: "monospace", marginBottom: "4px" }}>{s.titolo}</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
              <span style={{ padding: "1px 8px", borderRadius: "4px", fontSize: "10px", fontFamily: "sans-serif", background: `${conflittoColors[s.conflitto]}22`, color: conflittoColors[s.conflitto], border: `1px solid ${conflittoColors[s.conflitto]}44` }}>
                Conflitto: {s.conflitto}
              </span>
              <span style={{ padding: "1px 8px", borderRadius: "4px", fontSize: "10px", fontFamily: "sans-serif", background: "rgba(255,255,255,.04)", color: "#aaa", border: "1px solid rgba(255,255,255,.08)" }}>
                {s.funzione}
              </span>
              {s.problemi?.map((pr) => (
                <span key={pr} style={{ padding: "1px 8px", borderRadius: "4px", fontSize: "10px", fontFamily: "sans-serif", background: "rgba(255,100,100,.12)", color: "#ff9999", border: "1px solid rgba(255,100,100,.2)" }}>
                  ⚠ {pr.replace(/_/g, " ")}
                </span>
              ))}
            </div>
            {s.nota && <div style={{ fontSize: "11px", color: "#777", fontFamily: "sans-serif", fontStyle: "italic" }}>{s.nota}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Scheda: Segnalazioni ─────────────────────────────────────────────────────
function SegnalazioniPanel({ segnalazioni }) {
  if (!segnalazioni?.length) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "60px 20px", color: "#666", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: "32px" }}>✅</div>
      <div style={{ fontSize: "14px" }}>Nessuna segnalazione critica rilevata.</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {segnalazioni.map((sg, i) => (
        <div key={i} style={{ background: "rgba(255,255,255,.025)", border: `1px solid ${gravColors[sg.gravita]}33`, borderLeft: `3px solid ${gravColors[sg.gravita]}`, borderRadius: "6px", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "16px" }}>{segnIcons[sg.tipo] || "⚠️"}</span>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "#f0ead8", fontFamily: "sans-serif" }}>{sg.tipo?.replace(/_/g, " ")}</span>
            {sg.scena_numero && <span style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif" }}>Scena {sg.scena_numero}</span>}
            <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontFamily: "sans-serif", fontWeight: "bold", background: `${gravColors[sg.gravita]}22`, color: gravColors[sg.gravita], border: `1px solid ${gravColors[sg.gravita]}44` }}>
              {sg.gravita?.toUpperCase()}
            </span>
          </div>
          {sg.elemento && (
            <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#888", background: "rgba(0,0,0,.3)", borderRadius: "4px", padding: "6px 10px", marginBottom: "8px", borderLeft: "2px solid rgba(255,255,255,.1)" }}>
              «{sg.elemento}»
            </div>
          )}
          <div style={{ fontSize: "12px", color: "#bbb", fontFamily: "sans-serif", lineHeight: "1.5", marginBottom: "6px" }}>{sg.spiegazione}</div>
          <div style={{ fontSize: "11px", color: "#c8a96e", fontFamily: "sans-serif", lineHeight: "1.5" }}>💡 {sg.suggerimento}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Scheda: Valutazione globale ──────────────────────────────────────────────
function ValutazionePanel({ valutazione }) {
  if (!valutazione) return null;
  const scores = [
    ["Struttura", valutazione.punteggio_struttura],
    ["Personaggi", valutazione.punteggio_personaggi],
    ["Dialoghi", valutazione.punteggio_dialoghi],
    ["Ritmo", valutazione.punteggio_ritmo],
  ];
  const media = scores.reduce((s, [, v]) => s + v, 0) / scores.length;
  const mediaColor = media >= 7 ? "#A5D6A7" : media >= 5 ? "#FFD54F" : "#FF8A65";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Punteggi */}
      <div>
        <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Punteggi</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {scores.map(([label, val]) => {
            const barColor = val >= 7 ? "#A5D6A7" : val >= 5 ? "#FFD54F" : "#FF8A65";
            return (
              <div key={label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontFamily: "sans-serif", color: "#aaa" }}>{label}</span>
                  <span style={{ fontSize: "16px", fontWeight: "bold", fontFamily: "sans-serif", color: barColor }}>{val}<span style={{ fontSize: "11px", color: "#666" }}>/10</span></span>
                </div>
                <div style={{ height: "4px", background: "rgba(255,255,255,.06)", borderRadius: "2px" }}>
                  <div style={{ height: "4px", width: `${val * 10}%`, background: barColor, borderRadius: "2px", transition: "width .5s" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "10px", textAlign: "right", fontSize: "13px", fontFamily: "sans-serif", color: mediaColor }}>
          Media: <strong>{media.toFixed(1)}/10</strong>
        </div>
      </div>

      {/* Punti di forza / miglioramento */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ background: "rgba(165,214,167,.05)", border: "1px solid rgba(165,214,167,.2)", borderRadius: "8px", padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "#A5D6A7", fontFamily: "sans-serif", fontWeight: "bold", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>✓ Punti di forza</div>
          {valutazione.punti_di_forza?.map((p, i) => (
            <div key={i} style={{ fontSize: "12px", color: "#ccc", fontFamily: "sans-serif", lineHeight: "1.5", marginBottom: "6px", paddingLeft: "10px", borderLeft: "2px solid rgba(165,214,167,.3)" }}>{p}</div>
          ))}
        </div>
        <div style={{ background: "rgba(255,180,100,.05)", border: "1px solid rgba(255,180,100,.2)", borderRadius: "8px", padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "#FFD54F", fontFamily: "sans-serif", fontWeight: "bold", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>⚡ Aree di miglioramento</div>
          {valutazione.aree_di_miglioramento?.map((a, i) => (
            <div key={i} style={{ fontSize: "12px", color: "#ccc", fontFamily: "sans-serif", lineHeight: "1.5", marginBottom: "6px", paddingLeft: "10px", borderLeft: "2px solid rgba(255,213,79,.3)" }}>{a}</div>
          ))}
        </div>
      </div>

      {/* Commento docente */}
      <div style={{ background: "rgba(200,169,110,.06)", border: "1px solid rgba(200,169,110,.2)", borderRadius: "8px", padding: "16px" }}>
        <div style={{ fontSize: "11px", color: "#c8a96e", fontFamily: "sans-serif", fontWeight: "bold", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>🎓 Commento del docente</div>
        <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "Georgia, serif", lineHeight: "1.8", fontStyle: "italic" }}>{valutazione.commento_docente}</div>
      </div>
    </div>
  );
}

// ─── Schede Personaggio ───────────────────────────────────────────────────────
const ruoloColors = {
  protagonista: "#4FC3F7", antagonista: "#FF6B6B", deuteragonista: "#CE93D8",
  personaggio_secondario: "#FFD54F", comparsa: "#888",
};
const complessitàColors = { alta: "#FF6B6B", media: "#FFD54F", bassa: "#A5D6A7" };
const intensitàColors   = { alta: "#4FC3F7", media: "#CE93D8", bassa: "#888" };

function SchedePersonaggio({ data }) {
  const [selected, setSelected] = useState(0);
  const [activeSection, setActiveSection] = useState("narrativo");
  if (!data?.personaggi?.length) return null;
  const p = data.personaggi[selected];

  const secBtn = (id, label, active) => (
    <button key={id} onClick={() => setActiveSection(id)} style={{
      padding: "5px 14px", fontSize: "11px", fontFamily: "sans-serif", cursor: "pointer",
      border: "none", borderRadius: "20px",
      background: active ? "rgba(200,169,110,.2)" : "transparent",
      color: active ? "#c8a96e" : "#666", transition: "all .2s",
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", gap: "0", height: "100%" }}>
      {/* Lista personaggi — colonna sinistra */}
      <div style={{ width: "200px", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,.06)", overflowY: "auto", padding: "12px 0" }}>
        {data.personaggi.map((per, i) => (
          <div key={per.nome} onClick={() => { setSelected(i); setActiveSection("narrativo"); }} style={{
            padding: "10px 16px", cursor: "pointer", borderLeft: `3px solid ${i === selected ? ruoloColors[per.ruolo] : "transparent"}`,
            background: i === selected ? "rgba(255,255,255,.04)" : "transparent", transition: "all .15s",
          }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", fontFamily: "monospace", color: i === selected ? "#f0ead8" : "#aaa" }}>{per.nome}</div>
            <div style={{ fontSize: "10px", fontFamily: "sans-serif", marginTop: "2px" }}>
              <span style={{ color: ruoloColors[per.ruolo] }}>{per.ruolo?.replace(/_/g, " ")}</span>
              <span style={{ color: "#555", marginLeft: "6px" }}>{per.presenza?.battute_totali} bat.</span>
            </div>
          </div>
        ))}
        {data.note_ensemble && (
          <div style={{ margin: "12px", padding: "10px", background: "rgba(200,169,110,.05)", border: "1px solid rgba(200,169,110,.15)", borderRadius: "6px" }}>
            <div style={{ fontSize: "10px", color: "#c8a96e", fontFamily: "sans-serif", fontWeight: "bold", marginBottom: "4px" }}>ENSEMBLE</div>
            <div style={{ fontSize: "11px", color: "#777", fontFamily: "sans-serif", lineHeight: "1.5", fontStyle: "italic" }}>{data.note_ensemble}</div>
          </div>
        )}
      </div>

      {/* Dettaglio personaggio — colonna destra */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {/* Header scheda */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: "bold", fontFamily: "monospace", color: "#f0ead8", letterSpacing: "1px" }}>{p.nome}</div>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "sans-serif", background: `${ruoloColors[p.ruolo]}22`, color: ruoloColors[p.ruolo], border: `1px solid ${ruoloColors[p.ruolo]}44` }}>
                {p.ruolo?.replace(/_/g, " ")}
              </span>
              {p.genere_presunto !== "non_specificato" && (
                <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "sans-serif", background: "rgba(255,255,255,.04)", color: "#888", border: "1px solid rgba(255,255,255,.1)" }}>{p.genere_presunto}</span>
              )}
              <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontFamily: "sans-serif", background: "rgba(255,255,255,.04)", color: "#888", border: "1px solid rgba(255,255,255,.1)" }}>
                {p.presenza?.scene_totali} scene · {p.presenza?.battute_totali} battute · {p.presenza?.percentuale_dialogo}
              </span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: "11px", color: "#555", textAlign: "right", lineHeight: "1.8" }}>
            Prima: sc. {p.presenza?.prima_scena}<br />
            Ultima: sc. {p.presenza?.ultima_scena}<br />
            Scene: {p.presenza?.scene_numeri?.join(", ")}
          </div>
        </div>

        {/* Citazione rappresentativa */}
        {p.profilo_narrativo?.citazione_rappresentativa && (
          <div style={{ background: "rgba(200,169,110,.06)", border: "1px solid rgba(200,169,110,.2)", borderLeft: "3px solid #c8a96e", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: "#c8a96e", fontFamily: "sans-serif", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Citazione rappresentativa</div>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: "13px", color: "#ddd", fontStyle: "italic", lineHeight: "1.6" }}>«{p.profilo_narrativo.citazione_rappresentativa}»</div>
          </div>
        )}

        {/* Sub-sezioni */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", flexWrap: "wrap" }}>
          {secBtn("narrativo", "📖 Profilo narrativo", activeSection === "narrativo")}
          {secBtn("relazioni", "🔗 Relazioni", activeSection === "relazioni")}
          {secBtn("produzione", "🎬 Produzione", activeSection === "produzione")}
          {secBtn("didattica", "🎓 Didattica", activeSection === "didattica")}
        </div>

        {/* Profilo narrativo */}
        {activeSection === "narrativo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {p.profilo_narrativo?.descrizione_in_una_riga && (
              <div style={{ fontSize: "14px", color: "#ccc", fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: "1.6", padding: "0 0 12px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                {p.profilo_narrativo.descrizione_in_una_riga}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                ["🎯 Motivazione", p.profilo_narrativo?.motivazione_principale],
                ["💡 Bisogno profondo", p.profilo_narrativo?.bisogno_profondo],
                ["😨 Paura principale", p.profilo_narrativo?.paura_principale],
                ["⚡ Difetto", p.profilo_narrativo?.difetto_principale],
                ["✨ Pregio", p.profilo_narrativo?.pregio_principale],
              ].map(([label, val]) => val && val !== "non specificato" ? (
                <div key={label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "4px" }}>{label}</div>
                  <div style={{ fontSize: "12px", color: "#ccc", fontFamily: "sans-serif", lineHeight: "1.5" }}>{val}</div>
                </div>
              ) : null)}
            </div>
            {p.profilo_narrativo?.arco_narrativo && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "6px" }}>📈 Arco narrativo</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "Georgia, serif", lineHeight: "1.6" }}>{p.profilo_narrativo.arco_narrativo}</div>
              </div>
            )}
            {p.conflitti && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "8px" }}>⚔️ Conflitti</div>
                {[["Interno", p.conflitti.interno], ["Interpersonale", p.conflitti.interpersonale], ["Sociale/Ambientale", p.conflitti.sociale_o_ambientale]].map(([label, val]) =>
                  val && val !== "non specificato" ? (
                    <div key={label} style={{ marginBottom: "6px", display: "flex", gap: "10px" }}>
                      <span style={{ fontSize: "10px", color: "#666", fontFamily: "sans-serif", minWidth: "110px", paddingTop: "2px" }}>{label}</span>
                      <span style={{ fontSize: "12px", color: "#bbb", fontFamily: "sans-serif", lineHeight: "1.5" }}>{val}</span>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
        )}

        {/* Relazioni */}
        {activeSection === "relazioni" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {p.relazioni?.length ? p.relazioni.map((r, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "10px 14px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ minWidth: "90px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "bold", fontFamily: "monospace", color: "#FFD54F" }}>{r.con}</div>
                  <div style={{ fontSize: "10px", color: "#888", fontFamily: "sans-serif", marginTop: "2px" }}>{r.tipo}</div>
                </div>
                <div style={{ fontSize: "12px", color: "#bbb", fontFamily: "sans-serif", lineHeight: "1.5" }}>{r.descrizione}</div>
              </div>
            )) : <div style={{ color: "#555", fontFamily: "sans-serif", fontSize: "13px" }}>Nessuna relazione rilevante rilevata.</div>}

            {/* Mappa relazioni globale */}
            {data.mappa_relazioni?.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Mappa relazioni — tutti i personaggi</div>
                {data.mappa_relazioni.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#FFD54F", minWidth: "80px" }}>{r.da}</span>
                    <span style={{ fontSize: "10px", color: intensitàColors[r.intensità] }}>→</span>
                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#FFD54F", minWidth: "80px" }}>{r.a}</span>
                    <span style={{ fontSize: "10px", color: "#666", fontFamily: "sans-serif" }}>{r.tipo}</span>
                    <span style={{ marginLeft: "auto", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontFamily: "sans-serif", background: `${intensitàColors[r.intensità]}22`, color: intensitàColors[r.intensità] }}>{r.intensità}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scheda produzione */}
        {activeSection === "produzione" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              ["👤 Caratteristiche fisiche", p.scheda_produzione?.caratteristiche_fisiche_deducibili],
              ["👔 Costumi/accessori", p.scheda_produzione?.costumi_accessori],
              ["🎭 Note casting", p.scheda_produzione?.note_casting],
              ["🎬 Note regia", p.scheda_produzione?.note_regia],
            ].map(([label, val]) => val && val !== "non specificato" ? (
              <div key={label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "6px" }}>{label}</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "sans-serif", lineHeight: "1.6" }}>{val}</div>
              </div>
            ) : null)}
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "10px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "4px" }}>Complessità interpretativa</div>
                <div style={{ fontSize: "13px", fontFamily: "sans-serif", fontWeight: "bold", color: complessitàColors[p.scheda_produzione?.complessità_interpretativa] }}>
                  {p.scheda_produzione?.complessità_interpretativa?.toUpperCase()}
                </div>
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "10px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "4px" }}>Scena difficile</div>
                <div style={{ fontSize: "13px", fontFamily: "sans-serif", fontWeight: "bold", color: p.scheda_produzione?.presenza_scena_difficile ? "#FF6B6B" : "#A5D6A7" }}>
                  {p.scheda_produzione?.presenza_scena_difficile ? "SÌ" : "NO"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scheda didattica */}
        {activeSection === "didattica" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {p.scheda_didattica?.funzione_drammaturgica && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "6px" }}>🎯 Funzione drammaturgica</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "sans-serif", lineHeight: "1.6" }}>{p.scheda_didattica.funzione_drammaturgica}</div>
              </div>
            )}
            {p.scheda_didattica?.archetipo && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "10px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif" }}>🔮 Archetipo</div>
                <div style={{ fontSize: "13px", color: "#c8a96e", fontFamily: "sans-serif", fontWeight: "bold" }}>{p.scheda_didattica.archetipo}</div>
              </div>
            )}
            {p.scheda_didattica?.domande_per_l_autore?.length > 0 && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "10px" }}>❓ Domande per l'autore</div>
                {p.scheda_didattica.domande_per_l_autore.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#555", fontFamily: "monospace", paddingTop: "2px" }}>{i + 1}.</span>
                    <span style={{ fontSize: "12px", color: "#bbb", fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: "1.5" }}>{d}</span>
                  </div>
                ))}
              </div>
            )}
            {p.scheda_didattica?.nota_docente && (
              <div style={{ background: "rgba(200,169,110,.06)", border: "1px solid rgba(200,169,110,.2)", borderRadius: "8px", padding: "14px 16px" }}>
                <div style={{ fontSize: "10px", color: "#c8a96e", fontFamily: "sans-serif", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>🎓 Nota del docente</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "Georgia, serif", lineHeight: "1.8", fontStyle: "italic" }}>{p.scheda_didattica.nota_docente}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Schede Location ─────────────────────────────────────────────────────────
const tipoLocColors   = { INT: "#4FC3F7", EST: "#A5D6A7", "INT/EST": "#FFD54F" };
const allestLocColors = { minimo: "#A5D6A7", medio: "#FFD54F", importante: "#FF8A65", costruito_in_studio: "#FF6B6B" };
const budgetColors    = { minimo: "#A5D6A7", contenuto: "#4FC3F7", medio: "#FFD54F", significativo: "#FF8A65" };

function SchedeLocation({ data }) {
  const [selected, setSelected] = useState(0);
  const [activeSection, setActiveSection] = useState("narrativa");
  if (!data?.locations?.length) return null;
  const loc = data.locations[selected];

  const secBtn = (id, label, active) => (
    <button key={id} onClick={() => setActiveSection(id)} style={{
      padding: "5px 14px", fontSize: "11px", fontFamily: "sans-serif", cursor: "pointer",
      border: "none", borderRadius: "20px",
      background: active ? "rgba(78,195,247,.15)" : "transparent",
      color: active ? "#4FC3F7" : "#666", transition: "all .2s",
    }}>{label}</button>
  );

  const Row = ({ label, val }) => val && val !== "non_specificato" && val !== "non specificato" ? (
    <div style={{ display: "flex", gap: "10px", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
      <span style={{ fontSize: "11px", color: "#666", fontFamily: "sans-serif", minWidth: "170px", paddingTop: "2px" }}>{label}</span>
      <span style={{ fontSize: "12px", color: "#ccc", fontFamily: "sans-serif", lineHeight: "1.5" }}>{String(val)}</span>
    </div>
  ) : null;

  return (
    <div style={{ display: "flex", gap: "0", height: "100%" }}>
      {/* Lista location */}
      <div style={{ width: "210px", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,.06)", overflowY: "auto", padding: "12px 0" }}>
        {data.locations.map((l, i) => (
          <div key={l.identificativo} onClick={() => { setSelected(i); setActiveSection("narrativa"); }} style={{
            padding: "10px 14px", cursor: "pointer",
            borderLeft: `3px solid ${i === selected ? tipoLocColors[l.tipo] || "#4FC3F7" : "transparent"}`,
            background: i === selected ? "rgba(255,255,255,.04)" : "transparent", transition: "all .15s",
          }}>
            <div style={{ fontSize: "10px", color: "#555", fontFamily: "monospace", marginBottom: "2px" }}>{l.identificativo}</div>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: i === selected ? "#f0ead8" : "#aaa", fontFamily: "sans-serif", lineHeight: "1.4" }}>{l.nome}</div>
            <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "10px", color: tipoLocColors[l.tipo] || "#4FC3F7" }}>{l.tipo}</span>
              <span style={{ fontSize: "10px", color: "#555" }}>{l.scene_count} sc.</span>
            </div>
          </div>
        ))}

        {/* Riepilogo */}
        {data.riepilogo_produzione && (
          <div style={{ margin: "12px", padding: "10px", background: "rgba(78,195,247,.05)", border: "1px solid rgba(78,195,247,.15)", borderRadius: "6px" }}>
            <div style={{ fontSize: "10px", color: "#4FC3F7", fontFamily: "sans-serif", fontWeight: "bold", marginBottom: "6px" }}>TOTALI</div>
            {[
              ["Location", data.riepilogo_produzione.totale_locations],
              ["INT", data.riepilogo_produzione.locations_interne],
              ["EST", data.riepilogo_produzione.locations_esterne],
              ["Giorni", data.riepilogo_produzione.giorni_totali_stimati],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "sans-serif", marginBottom: "3px" }}>
                <span style={{ color: "#666" }}>{l}</span>
                <span style={{ color: "#aaa", fontWeight: "bold" }}>{v}</span>
              </div>
            ))}
            {data.riepilogo_produzione.budget_scenografia_indicativo && (
              <div style={{ marginTop: "6px" }}>
                <Badge label={`Budget: ${data.riepilogo_produzione.budget_scenografia_indicativo}`} color={budgetColors[data.riepilogo_produzione.budget_scenografia_indicativo]} small />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dettaglio location */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "10px", color: "#555", fontFamily: "monospace" }}>{loc.identificativo}</span>
            <Badge label={loc.tipo} color={tipoLocColors[loc.tipo] || "#4FC3F7"} />
            <Badge label={loc.allestimento?.livello?.replace(/_/g, " ")} color={allestLocColors[loc.allestimento?.livello] || "#888"} />
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "#666", fontFamily: "monospace" }}>
              {loc.scene_count} scene · sc. {loc.scene?.join(", ")}
            </span>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f0ead8", fontFamily: "sans-serif", marginBottom: "4px" }}>{loc.nome}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {loc.momenti_giornata?.map(m => <Badge key={m} label={m} color={m === "NOTTE" ? "#CE93D8" : "#FFD54F"} small />)}
            {loc.personaggi_presenti?.map(p => <Badge key={p} label={p} color="#FFD54F" small />)}
            {loc.comparse_max_stimato > 0 && <Badge label={`+${loc.comparse_max_stimato} comparse`} color="#888" small />}
          </div>
        </div>

        {/* Atmosfera */}
        {loc.atmosfera && (
          <div style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#888", fontStyle: "italic", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
            {loc.atmosfera}
          </div>
        )}

        {/* Sub-sezioni */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", flexWrap: "wrap" }}>
          {secBtn("narrativa",   "📖 Narrativa",   activeSection === "narrativa")}
          {secBtn("tecnica",     "⚙️ Tecnica",      activeSection === "tecnica")}
          {secBtn("scouting",    "🔍 Scouting",     activeSection === "scouting")}
          {secBtn("fotografia",  "📷 Fotografia",   activeSection === "fotografia")}
          {secBtn("didattica",   "🎓 Didattica",    activeSection === "didattica")}
        </div>

        {/* Narrativa */}
        {activeSection === "narrativa" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {loc.descrizione_narrativa && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "6px" }}>📍 Descrizione narrativa</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "Georgia, serif", lineHeight: "1.7" }}>{loc.descrizione_narrativa}</div>
              </div>
            )}
            {loc.funzione_drammaturgica && (
              <div style={{ background: "rgba(200,169,110,.06)", border: "1px solid rgba(200,169,110,.2)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#c8a96e", fontFamily: "sans-serif", marginBottom: "6px" }}>🎯 Funzione drammaturgica</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "sans-serif", lineHeight: "1.6" }}>{loc.funzione_drammaturgica}</div>
              </div>
            )}
            {loc.piano_riprese && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "8px" }}>📅 Piano riprese</div>
                <Row label="Giorni stimati" val={`${loc.piano_riprese.giorni_stimati} giorni · ${loc.piano_riprese.ore_stimate_totali}h totali`} />
                <Row label="Scene nello stesso giorno" val={loc.piano_riprese.scene_consigliate_nello_stesso_giorno?.join(", ")} />
                <Row label="Ottimizzazione" val={loc.piano_riprese.note_ottimizzazione} />
              </div>
            )}
          </div>
        )}

        {/* Tecnica */}
        {activeSection === "tecnica" && loc.caratteristiche_tecniche && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                ["Dimensioni", loc.caratteristiche_tecniche.dimensioni_stimate],
                ["Luce naturale", loc.caratteristiche_tecniche.luce_naturale === true ? "Sì" : loc.caratteristiche_tecniche.luce_naturale === false ? "No" : null],
                ["Acustica", loc.caratteristiche_tecniche.acustica_stimata],
                ["Accesso attrezzatura", loc.caratteristiche_tecniche.accessibilità_attrezzatura],
                ["Spazio troupe", loc.caratteristiche_tecniche.spazio_per_troupe],
                ["Direzione luce", loc.caratteristiche_tecniche.direzione_luce_preferibile],
              ].map(([label, val]) => val ? (
                <div key={label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "10px", color: "#666", fontFamily: "sans-serif", marginBottom: "4px" }}>{label}</div>
                  <div style={{ fontSize: "12px", color: "#ccc", fontFamily: "sans-serif" }}>{val}</div>
                </div>
              ) : null)}
            </div>
            {loc.allestimento && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "8px" }}>🎨 Allestimento scenografico</div>
                {loc.allestimento.elementi_scenografia_identificati?.length > 0 && (
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ fontSize: "10px", color: "#555", fontFamily: "sans-serif", marginBottom: "4px" }}>Elementi identificati</div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {loc.allestimento.elementi_scenografia_identificati.map(e => (
                        <span key={e} style={{ padding: "2px 8px", background: "rgba(78,195,247,.1)", border: "1px solid rgba(78,195,247,.2)", borderRadius: "4px", fontSize: "11px", color: "#4FC3F7", fontFamily: "sans-serif" }}>{e}</span>
                      ))}
                    </div>
                  </div>
                )}
                {loc.allestimento.elementi_da_aggiungere?.length > 0 && (
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ fontSize: "10px", color: "#555", fontFamily: "sans-serif", marginBottom: "4px" }}>Da aggiungere</div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {loc.allestimento.elementi_da_aggiungere.map(e => (
                        <span key={e} style={{ padding: "2px 8px", background: "rgba(165,214,167,.1)", border: "1px solid rgba(165,214,167,.2)", borderRadius: "4px", fontSize: "11px", color: "#A5D6A7", fontFamily: "sans-serif" }}>{e}</span>
                      ))}
                    </div>
                  </div>
                )}
                {loc.allestimento.elementi_da_rimuovere?.length > 0 && (
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ fontSize: "10px", color: "#555", fontFamily: "sans-serif", marginBottom: "4px" }}>Da rimuovere</div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {loc.allestimento.elementi_da_rimuovere.map(e => (
                        <span key={e} style={{ padding: "2px 8px", background: "rgba(255,107,107,.1)", border: "1px solid rgba(255,107,107,.2)", borderRadius: "4px", fontSize: "11px", color: "#FF9999", fontFamily: "sans-serif" }}>{e}</span>
                      ))}
                    </div>
                  </div>
                )}
                {loc.allestimento.note_scenografo && (
                  <div style={{ fontSize: "12px", color: "#888", fontFamily: "sans-serif", fontStyle: "italic", borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: "8px" }}>🎨 {loc.allestimento.note_scenografo}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scouting */}
        {activeSection === "scouting" && loc.scouting && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
              <Badge label={`Ricerca: ${loc.scouting.tipo_ricerca?.replace(/_/g, " ")}`} color="#4FC3F7" />
              <Badge label={`Permessi: ${loc.scouting.permessi_necessari === true ? "Sì" : loc.scouting.permessi_necessari === false ? "No" : "Probabilmente"}`} color={loc.scouting.permessi_necessari === true ? "#FF8A65" : "#A5D6A7"} />
            </div>
            {[
              ["✅ Caratteristiche fondamentali", loc.scouting.caratteristiche_fondamentali],
              ["⭐ Caratteristiche desiderabili", loc.scouting.caratteristiche_desiderabili],
              ["⚠ Problemi potenziali", loc.scouting.problemi_potenziali],
              ["🏗 Alternative studio", loc.scouting.alternative_studio],
              ["🚚 Note logistiche", loc.scouting.note_logistiche],
            ].map(([label, val]) => val && val !== "non specificato" ? (
              <div key={label} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "10px 14px" }}>
                <div style={{ fontSize: "10px", color: "#666", fontFamily: "sans-serif", marginBottom: "5px" }}>{label}</div>
                <div style={{ fontSize: "12px", color: "#ccc", fontFamily: "sans-serif", lineHeight: "1.5" }}>{val}</div>
              </div>
            ) : null)}
          </div>
        )}

        {/* Fotografia */}
        {activeSection === "fotografia" && loc.fotografia && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              ["🎥 Stile suggerito", loc.fotografia.stile_suggerito],
              ["⚡ Sfide fotografiche", loc.fotografia.sfide_fotografiche],
              ["🎬 Riferimenti visivi", loc.fotografia.riferimenti_visivi],
            ].map(([label, val]) => val && val !== "non specificato" ? (
              <div key={label} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "6px" }}>{label}</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "Georgia, serif", lineHeight: "1.6", fontStyle: label.includes("Riferimenti") ? "italic" : "normal" }}>{val}</div>
              </div>
            ) : null)}
          </div>
        )}

        {/* Didattica */}
        {activeSection === "didattica" && loc.scheda_didattica && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {loc.scheda_didattica.concetto_chiave && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "6px" }}>💡 Concetto chiave</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "sans-serif", lineHeight: "1.6", fontWeight: "500" }}>{loc.scheda_didattica.concetto_chiave}</div>
              </div>
            )}
            {loc.scheda_didattica.relazione_spazio_personaggio && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "6px" }}>🔗 Spazio e personaggio</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "Georgia, serif", lineHeight: "1.7", fontStyle: "italic" }}>{loc.scheda_didattica.relazione_spazio_personaggio}</div>
              </div>
            )}
            {loc.scheda_didattica.domande_per_studenti?.length > 0 && (
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", marginBottom: "8px" }}>❓ Domande per gli studenti</div>
                {loc.scheda_didattica.domande_per_studenti.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#555", fontFamily: "monospace", paddingTop: "2px" }}>{i + 1}.</span>
                    <span style={{ fontSize: "12px", color: "#bbb", fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: "1.5" }}>{d}</span>
                  </div>
                ))}
              </div>
            )}
            {loc.scheda_didattica.nota_docente && (
              <div style={{ background: "rgba(200,169,110,.06)", border: "1px solid rgba(200,169,110,.2)", borderRadius: "8px", padding: "14px 16px" }}>
                <div style={{ fontSize: "10px", color: "#c8a96e", fontFamily: "sans-serif", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>🎓 Nota del docente</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "Georgia, serif", lineHeight: "1.8", fontStyle: "italic" }}>{loc.scheda_didattica.nota_docente}</div>
              </div>
            )}
          </div>
        )}

        {/* Mappa narrativa (visibile da tutte le sezioni, in fondo) */}
        {data.mappa_narrativa_locations?.length > 0 && activeSection === "narrativa" && (
          <div style={{ marginTop: "20px" }}>
            <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Relazioni tra location</div>
            {data.mappa_narrativa_locations
              .filter(m => m.location_a === loc.nome || m.location_b === loc.nome)
              .map((m, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: "6px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", fontFamily: "sans-serif", color: "#4FC3F7" }}>{m.location_a}</span>
                  <span style={{ color: "#555" }}>↔</span>
                  <span style={{ fontSize: "11px", fontFamily: "sans-serif", color: "#4FC3F7" }}>{m.location_b}</span>
                  <div style={{ flex: 1, fontSize: "11px", color: "#777", fontFamily: "sans-serif", fontStyle: "italic" }}>{m.relazione}</div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Breakdown reparti ────────────────────────────────────────────────────────
const complessitàProdColors = { bassa: "#A5D6A7", media: "#FFD54F", alta: "#FF8A65", molto_alta: "#FF6B6B" };
const allestimentoColors    = { minimo: "#A5D6A7", medio: "#FFD54F", importante: "#FF8A65", costruito_in_studio: "#FF6B6B" };
const propTipoColors        = { praticabile: "#4FC3F7", decorativo: "#888", arma: "#FF6B6B", veicolo: "#FFD54F", elettronico: "#CE93D8", animale: "#A5D6A7", cibo: "#FF8A65" };

function Badge({ label, color, small }) {
  return (
    <span style={{
      padding: small ? "1px 6px" : "2px 10px",
      borderRadius: "20px",
      fontSize: small ? "10px" : "11px",
      fontFamily: "sans-serif",
      background: `${color}22`,
      color: color,
      border: `1px solid ${color}44`,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function BreakdownPanel({ data }) {
  const [activeTab, setActiveTab] = useState("riepilogo");
  if (!data) return null;
  const { riepilogo, per_scena, reparti, piano_riprese_suggerito } = data;

  const tabBtn = (id, label, count) => (
    <button key={id} onClick={() => setActiveTab(id)} style={{
      padding: "6px 14px", fontSize: "12px", fontFamily: "sans-serif", cursor: "pointer",
      border: "none", borderRadius: "6px",
      background: activeTab === id ? "rgba(255,143,101,.15)" : "transparent",
      color: activeTab === id ? "#FF8A65" : "#777", transition: "all .2s",
      display: "flex", alignItems: "center", gap: "5px",
    }}>
      {label}
      {count > 0 && <span style={{ padding: "1px 5px", borderRadius: "8px", fontSize: "10px", background: "rgba(255,255,255,.08)", color: "#666" }}>{count}</span>}
    </button>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Sub-tab */}
      <div style={{ display: "flex", padding: "10px 20px 0", gap: "4px", borderBottom: "1px solid rgba(255,255,255,.05)", flexWrap: "wrap" }}>
        {tabBtn("riepilogo", "📊 Riepilogo", 0)}
        {tabBtn("scene",     "🎬 Per scena", per_scena?.length || 0)}
        {tabBtn("cast",      "👥 Cast",      reparti?.cast?.length || 0)}
        {tabBtn("locations", "📍 Location",  reparti?.locations?.length || 0)}
        {tabBtn("props",     "🎭 Props",     reparti?.props?.length || 0)}
        {tabBtn("costumi",   "👔 Costumi",   reparti?.costumi?.length || 0)}
        {(reparti?.effetti_speciali?.length > 0 || reparti?.veicoli?.length > 0) &&
          tabBtn("extra", "⚡ Extra", (reparti?.effetti_speciali?.length || 0) + (reparti?.veicoli?.length || 0))}
        {piano_riprese_suggerito?.length > 0 && tabBtn("piano", "📅 Piano riprese", piano_riprese_suggerito?.length || 0)}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

        {/* RIEPILOGO */}
        {activeTab === "riepilogo" && riepilogo && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              {[
                ["🎬", "Scene totali", riepilogo.totale_scene],
                ["👤", "Personaggi", riepilogo.personaggi_parlanti],
                ["📍", "Location", riepilogo.location_uniche],
                ["📅", "Giorni stimati", riepilogo.giorni_ripresa_stimati],
                ["🏠", "INT", riepilogo.scene_interne],
                ["🌿", "EST", riepilogo.scene_esterne],
                ["☀️", "Giorno", riepilogo.scene_giorno],
                ["🌙", "Notte", riepilogo.scene_notte],
              ].map(([icon, label, val]) => (
                <div key={label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "20px", marginBottom: "4px" }}>{icon}</div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", fontFamily: "sans-serif", color: "#f0ead8" }}>{val}</div>
                  <div style={{ fontSize: "10px", color: "#666", fontFamily: "sans-serif", marginTop: "2px" }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#888", fontFamily: "sans-serif" }}>Complessità produttiva</span>
              <Badge label={riepilogo.complessità_produttiva?.replace(/_/g, " ").toUpperCase()} color={complessitàProdColors[riepilogo.complessità_produttiva]} />
            </div>
            {riepilogo.note_produzione && (
              <div style={{ background: "rgba(255,143,101,.06)", border: "1px solid rgba(255,143,101,.2)", borderRadius: "8px", padding: "14px 16px" }}>
                <div style={{ fontSize: "10px", color: "#FF8A65", fontFamily: "sans-serif", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>📋 Note di produzione</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "Georgia, serif", lineHeight: "1.8" }}>{riepilogo.note_produzione}</div>
              </div>
            )}
          </div>
        )}

        {/* PER SCENA */}
        {activeTab === "scene" && per_scena && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {per_scena.map((sc) => (
              <div key={sc.numero} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "8px", padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", color: "#555", fontFamily: "monospace", minWidth: "28px" }}>#{sc.numero}</span>
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "#c8a96e", fontFamily: "monospace", flex: 1 }}>{sc.titolo}</span>
                  <Badge label={sc.interno_esterno} color="#4FC3F7" small />
                  <Badge label={sc.momento} color={sc.momento === "NOTTE" ? "#CE93D8" : "#FFD54F"} small />
                  <Badge label={sc.complessità} color={complessitàProdColors[sc.complessità] || "#888"} small />
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "11px", fontFamily: "sans-serif" }}>
                  {sc.cast?.length > 0 && (
                    <div><span style={{ color: "#555" }}>Cast: </span><span style={{ color: "#FFD54F" }}>{sc.cast.join(", ")}</span></div>
                  )}
                  {sc.comparse_stimate > 0 && (
                    <div><span style={{ color: "#555" }}>Comparse: </span><span style={{ color: "#aaa" }}>{sc.comparse_stimate}</span></div>
                  )}
                  {sc.props_principali?.length > 0 && (
                    <div><span style={{ color: "#555" }}>Props: </span><span style={{ color: "#aaa" }}>{sc.props_principali.join(", ")}</span></div>
                  )}
                </div>
                {sc.note_regia && <div style={{ fontSize: "11px", color: "#666", fontFamily: "sans-serif", fontStyle: "italic", marginTop: "6px" }}>{sc.note_regia}</div>}
                {sc.elementi_speciali?.length > 0 && (
                  <div style={{ marginTop: "6px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {sc.elementi_speciali.map(e => <Badge key={e} label={e} color="#FF6B6B" small />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CAST */}
        {activeTab === "cast" && reparti?.cast && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {reparti.cast.map((c) => (
              <div key={c.nome} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "monospace", color: "#FFD54F" }}>{c.nome}</span>
                  <Badge label={c.ruolo_tipo?.replace(/_/g, " ")} color={ruoloColors?.[c.ruolo_tipo] || "#888"} small />
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#888", fontFamily: "sans-serif" }}>{c.giorni_lavoro_stimati} gg · scene {c.scene?.join(", ")}</span>
                </div>
                {c.continuità_costume && c.continuità_costume !== "non specificato" && (
                  <div style={{ fontSize: "11px", color: "#aaa", fontFamily: "sans-serif" }}>👔 Continuità: {c.continuità_costume}</div>
                )}
                {c.note_casting && <div style={{ fontSize: "11px", color: "#666", fontStyle: "italic", fontFamily: "sans-serif", marginTop: "4px" }}>🎭 {c.note_casting}</div>}
              </div>
            ))}
          </div>
        )}

        {/* LOCATIONS */}
        {activeTab === "locations" && reparti?.locations && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {reparti.locations.map((l, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#f0ead8", fontFamily: "sans-serif" }}>📍 {l.nome}</span>
                  <Badge label={l.tipo} color="#4FC3F7" small />
                  <Badge label={l.allestimento?.replace(/_/g, " ")} color={allestimentoColors[l.allestimento] || "#888"} small />
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#666", fontFamily: "sans-serif" }}>scene {l.scene?.join(", ")}</span>
                </div>
                {l.note_ricerca && <div style={{ fontSize: "12px", color: "#aaa", fontFamily: "sans-serif", lineHeight: "1.5" }}>🔍 {l.note_ricerca}</div>}
                {l.problemi_potenziali && l.problemi_potenziali !== "non specificato" && (
                  <div style={{ fontSize: "11px", color: "#FF8A65", fontFamily: "sans-serif", marginTop: "4px" }}>⚠ {l.problemi_potenziali}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PROPS */}
        {activeTab === "props" && reparti?.props && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {reparti.props.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px 14px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: "6px" }}>
                <Badge label={p.tipo} color={propTipoColors[p.tipo] || "#888"} small />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", color: "#ddd", fontFamily: "sans-serif", fontWeight: "500" }}>{p.oggetto}</div>
                  {p.note && <div style={{ fontSize: "11px", color: "#666", fontFamily: "sans-serif", marginTop: "2px" }}>{p.note}</div>}
                </div>
                <div style={{ fontSize: "10px", color: "#555", fontFamily: "monospace", whiteSpace: "nowrap" }}>sc. {p.scene?.join(", ")}</div>
              </div>
            ))}
          </div>
        )}

        {/* COSTUMI */}
        {activeTab === "costumi" && reparti?.costumi && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {reparti.costumi.map((c, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#FFD54F", fontFamily: "monospace" }}>{c.personaggio}</span>
                  {c.periodo_stile && <Badge label={c.periodo_stile} color="#CE93D8" small />}
                  <span style={{ fontSize: "11px", color: "#666", fontFamily: "sans-serif" }}>{c.cambi_costume} cambi · scene {c.scene?.join(", ")}</span>
                </div>
                {c.capi_identificati?.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
                    {c.capi_identificati.map(capo => (
                      <span key={capo} style={{ padding: "2px 8px", background: "rgba(206,147,216,.1)", border: "1px solid rgba(206,147,216,.2)", borderRadius: "4px", fontSize: "11px", color: "#CE93D8", fontFamily: "sans-serif" }}>{capo}</span>
                    ))}
                  </div>
                )}
                {c.note_continuità && c.note_continuità !== "non specificato" && (
                  <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", fontStyle: "italic" }}>⚠ Continuità: {c.note_continuità}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* EXTRA: SFX + Veicoli + Audio */}
        {activeTab === "extra" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {reparti?.effetti_speciali?.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>⚡ Effetti speciali</div>
                {reparti.effetti_speciali.map((e, i) => (
                  <div key={i} style={{ padding: "8px 14px", background: "rgba(255,107,107,.05)", border: "1px solid rgba(255,107,107,.15)", borderRadius: "6px", marginBottom: "6px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "12px", color: "#ddd", fontFamily: "sans-serif" }}>{e.tipo}</span>
                      <Badge label={e.categoria} color="#FF6B6B" small />
                      <Badge label={e.complessità} color={complessitàProdColors[e.complessità]} small />
                      <span style={{ fontSize: "10px", color: "#666", fontFamily: "monospace" }}>sc. {e.scena}</span>
                    </div>
                    {e.note && <div style={{ fontSize: "11px", color: "#777", fontFamily: "sans-serif", marginTop: "4px" }}>{e.note}</div>}
                  </div>
                ))}
              </div>
            )}
            {reparti?.veicoli?.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>🚗 Veicoli</div>
                {reparti.veicoli.map((v, i) => (
                  <div key={i} style={{ padding: "8px 14px", background: "rgba(255,213,79,.05)", border: "1px solid rgba(255,213,79,.15)", borderRadius: "6px", marginBottom: "6px", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#ddd", fontFamily: "sans-serif", flex: 1 }}>{v.veicolo}</span>
                    <span style={{ fontSize: "10px", color: "#666", fontFamily: "monospace" }}>sc. {v.scene?.join(", ")}</span>
                  </div>
                ))}
              </div>
            )}
            {reparti?.audio_musica?.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>🎵 Audio / Sound design</div>
                {reparti.audio_musica.map((a, i) => (
                  <div key={i} style={{ padding: "8px 14px", background: "rgba(78,195,247,.05)", border: "1px solid rgba(78,195,247,.15)", borderRadius: "6px", marginBottom: "6px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "12px", color: "#ddd", fontFamily: "sans-serif", flex: 1 }}>{a.elemento}</span>
                      <Badge label={a.tipo?.replace(/_/g, " ")} color="#4FC3F7" small />
                      <span style={{ fontSize: "10px", color: "#666", fontFamily: "monospace" }}>sc. {a.scena}</span>
                    </div>
                    {a.note && <div style={{ fontSize: "11px", color: "#777", fontFamily: "sans-serif", marginTop: "4px" }}>{a.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PIANO RIPRESE */}
        {activeTab === "piano" && piano_riprese_suggerito && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {piano_riprese_suggerito.map((g) => (
              <div key={g.giorno} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", padding: "14px 16px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
                  <div style={{ background: "linear-gradient(135deg,#c8a96e,#b8994e)", borderRadius: "6px", padding: "6px 12px", fontSize: "13px", fontWeight: "bold", fontFamily: "sans-serif", color: "#0a0a0f" }}>
                    Giorno {g.giorno}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {g.scene_consigliate?.map(sc => (
                      <Badge key={sc} label={`Sc.${sc}`} color="#c8a96e" small />
                    ))}
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#888", fontFamily: "sans-serif" }}>~{g.ore_stimate}h</span>
                </div>
                <div style={{ fontSize: "12px", color: "#aaa", fontFamily: "sans-serif", lineHeight: "1.5", fontStyle: "italic" }}>{g.motivazione}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── App principale ───────────────────────────────────────────────────────────
export default function App() {
  const [file, setFile]           = useState(null);
  const [rawText, setRawText]     = useState("");
  const [elements, setElements]   = useState(null);
  const [analysis, setAnalysis]         = useState(null);
  const [characterSheets, setCharacterSheets] = useState(null);
  const [breakdown, setBreakdown]               = useState(null);
  const [locationSheets, setLocationSheets]     = useState(null);
  const [loading, setLoading]                   = useState(false);
  const [analyzing, setAnalyzing]               = useState(false);
  const [loadingSheets, setLoadingSheets]       = useState(false);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState("preview");
  const [analyTab, setAnalyTab]   = useState("struttura");
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef = useRef();

  const readFile = async (f) => {
    const ext = f.name.split(".").pop().toLowerCase();
    if (ext === "txt") return await f.text();
    if (ext === "docx" || ext === "doc") {
      const buf = await f.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      return result.value;
    }
    throw new Error("Formato non supportato. Usa TXT, DOCX o DOC.");
  };

  const handleFile = async (f) => {
    if (!f) return;
    setError(""); setElements(null); setAnalysis(null); setFile(f);
    try {
      const text = await readFile(f);
      setRawText(text);
    } catch (e) { setError(e.message); }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const runFormatter = async () => {
    if (!rawText.trim()) return;
    setLoading(true); setError(""); setElements(null); setAnalysis(null); setCharacterSheets(null); setBreakdown(null); setLocationSheets(null);
    try {
      setLoadingMsg("Analisi del testo in corso...");
      const response = await fetch(API_FORMAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore server");
      setElements(data.elements);
      setActiveTab("preview");
    } catch (e) {
      setError("Errore: " + e.message);
    } finally {
      setLoading(false); setLoadingMsg("");
    }
  };

  const runAnalysis = async () => {
    if (!elements) return;
    setAnalyzing(true); setError("");
    try {
      const response = await fetch(API_ANALYZE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore server");
      setAnalysis(data.analysis);
      setActiveTab("analisi");
      setAnalyTab("struttura");
    } catch (e) {
      setError("Errore analisi: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const runCharacterSheets = async () => {
    if (!elements) return;
    setLoadingSheets(true); setError("");
    try {
      const response = await fetch(API_CHARACTER_SHEETS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore server");
      setCharacterSheets(data.characterSheets);
      setActiveTab("schede");
    } catch (e) {
      setError("Errore schede: " + e.message);
    } finally {
      setLoadingSheets(false);
    }
  };

  const runLocationSheets = async () => {
    if (!elements) return;
    setLoadingLocations(true); setError("");
    try {
      const response = await fetch(API_LOCATION_SHEETS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore server");
      setLocationSheets(data.locationSheets);
      setActiveTab("locations");
    } catch (e) {
      setError("Errore schede location: " + e.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  const runBreakdown = async () => {
    if (!elements) return;
    setLoadingBreakdown(true); setError("");
    try {
      const response = await fetch(API_BREAKDOWN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore server");
      setBreakdown(data.breakdown);
      setActiveTab("breakdown");
    } catch (e) {
      setError("Errore breakdown: " + e.message);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const downloadFountain = () => {
    if (!elements) return;
    const content = toFountain(elements);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${file ? file.name.replace(/\.[^.]+$/, "") : "sceneggiatura"}_formatted.fountain`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadHtml = () => {
    if (!elements) return;
    const htmlContent = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><title>Sceneggiatura</title>
<style>
  body{font-family:'Courier New',monospace;font-size:12pt;margin:0;padding:0;background:white}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:25mm 30mm 25mm 35mm;box-sizing:border-box}
  .title{text-align:center;font-weight:bold;font-size:14pt;margin-bottom:30px}
  .transition{text-align:right;text-transform:uppercase;margin:12px 0 4px}
  .scene-heading{font-weight:bold;text-transform:uppercase;text-decoration:underline;margin:20px 0 4px}
  .action{margin:8px 0}
  .character{margin-left:200px;text-transform:uppercase;font-weight:bold;margin-top:14px}
  .parenthetical{margin-left:140px;margin-right:160px;font-style:italic}
  .dialogue{margin-left:100px;margin-right:100px;margin-bottom:4px}
  .blank{height:1em}
  @media print{body{margin:0}.page{width:100%}}
</style></head><body><div class="page">
${elements.map((el) => {
  if (el.type === "blank") return `<div class="blank"></div>`;
  if (el.type === "title") return `<div class="title">${el.content}</div>`;
  if (el.type === "transition") return `<div class="transition">${el.content}</div>`;
  if (el.type === "scene_heading") return `<div class="scene-heading">${el.content}</div>`;
  if (el.type === "action") return `<div class="action">${el.content}</div>`;
  if (el.type === "character") return `<div class="character">${el.content}</div>`;
  if (el.type === "parenthetical") return `<div class="parenthetical">${el.content}</div>`;
  if (el.type === "dialogue") return `<div class="dialogue">${el.content}</div>`;
  return `<div>${el.content}</div>`;
}).join("\n")}
</div></body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${file ? file.name.replace(/\.[^.]+$/, "") : "sceneggiatura"}_sceneggiatura.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const busy            = loading || analyzing || loadingSheets || loadingBreakdown || loadingLocations;
  const canFormat       = rawText.trim().length > 10 && !busy;
  const canAnalyze      = !!elements && !busy;
  const canRunSheets    = !!elements && !busy;
  const canRunBreakdown = !!elements && !busy;

  const stats = elements ? {
    scene:     elements.filter((e) => e.type === "scene_heading").length,
    character: [...new Set(elements.filter((e) => e.type === "character").map((e) => e.content))].length,
    dialogue:  elements.filter((e) => e.type === "dialogue").length,
    action:    elements.filter((e) => e.type === "action").length,
  } : null;

  const segnalazioniCount = analysis?.segnalazioni?.length || 0;
  const segnCritiche = analysis?.segnalazioni?.filter(s => s.gravita === "alta").length || 0;

  const s = {
    app:        { minHeight: "100vh", background: "linear-gradient(135deg,#0a0a0f,#111118,#0d0d15)", color: "#e8e8f0", fontFamily: "Georgia,serif", display: "flex", flexDirection: "column" },
    header:     { padding: "28px 40px 20px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", gap: "16px" },
    logo:       { width: "36px", height: "36px", background: "linear-gradient(135deg,#c8a96e,#e8c98e)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 },
    main:       { display: "flex", flex: 1, overflow: "hidden" },
    sidebar:    { width: "340px", flexShrink: 0, padding: "24px", borderRight: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", gap: "18px", overflowY: "auto" },
    dropzone:   { border: `2px dashed ${dragOver ? "#c8a96e" : "rgba(200,169,110,.3)"}`, borderRadius: "10px", padding: "28px 20px", textAlign: "center", cursor: "pointer", transition: "all .2s", background: dragOver ? "rgba(200,169,110,.05)" : "rgba(255,255,255,.02)" },
    btn:        { background: "linear-gradient(135deg,#c8a96e,#b8994e)", color: "#0a0a0f", border: "none", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: canFormat ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: canFormat ? 1 : 0.4 },
    btnAnalyze: { background: canAnalyze ? "linear-gradient(135deg,#7C4DFF,#651FFF)" : "rgba(124,77,255,.15)", color: canAnalyze ? "#fff" : "#7C4DFF", border: "1px solid rgba(124,77,255,.4)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: canAnalyze ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: canAnalyze ? 1 : 0.5 },
    btnSheets:    { background: canRunSheets ? "linear-gradient(135deg,#00897B,#00695C)" : "rgba(0,137,123,.15)", color: canRunSheets ? "#fff" : "#00897B", border: "1px solid rgba(0,137,123,.4)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: canRunSheets ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: canRunSheets ? 1 : 0.5 },
    btnBreakdown: { background: canRunBreakdown ? "linear-gradient(135deg,#E65100,#BF360C)" : "rgba(230,81,0,.15)", color: canRunBreakdown ? "#fff" : "#E65100", border: "1px solid rgba(230,81,0,.4)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: canRunBreakdown ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: canRunBreakdown ? 1 : 0.5 },
    btnLocations: { background: !busy ? "linear-gradient(135deg,#0277BD,#01579B)" : "rgba(2,119,189,.15)", color: !busy ? "#fff" : "#0277BD", border: "1px solid rgba(2,119,189,.4)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: !busy ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: !busy ? 1 : 0.5 },
    btnSec:     { background: "rgba(255,255,255,.06)", color: "#ccc", border: "1px solid rgba(255,255,255,.12)", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", cursor: "pointer", fontFamily: "sans-serif", flex: 1 },
    content:    { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
    tabs:       { display: "flex", padding: "16px 24px 0", borderBottom: "1px solid rgba(255,255,255,.06)", gap: "4px" },
    previewWrap:{ flex: 1, overflowY: "auto", background: "#f5f5f0" },
    label:      { fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" },
    error:      { background: "rgba(255,80,80,.1)", border: "1px solid rgba(255,80,80,.3)", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", fontFamily: "sans-serif", color: "#ff9999" },
  };

  const tabBtn = (id, label, active) => (
    <button key={id} onClick={() => setActiveTab(id)} style={{
      padding: "8px 18px", fontSize: "13px", fontFamily: "sans-serif", cursor: "pointer", border: "none",
      background: "transparent", borderBottom: `2px solid ${active ? "#c8a96e" : "transparent"}`,
      color: active ? "#c8a96e" : "#888", transition: "all .2s",
    }}>{label}</button>
  );

  const analyTabBtn = (id, label, active, badge) => (
    <button key={id} onClick={() => setAnalyTab(id)} style={{
      padding: "6px 14px", fontSize: "12px", fontFamily: "sans-serif", cursor: "pointer", border: "none",
      background: active ? "rgba(124,77,255,.15)" : "transparent",
      borderRadius: "6px", color: active ? "#b39dff" : "#888", transition: "all .2s", display: "flex", alignItems: "center", gap: "6px",
    }}>
      {label}
      {badge > 0 && <span style={{ padding: "1px 6px", borderRadius: "10px", fontSize: "10px", fontWeight: "bold", background: "rgba(255,100,100,.2)", color: "#ff9999" }}>{badge}</span>}
    </button>
  );

  return (
    <div style={s.app}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={s.logo}>🎬</div>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "bold", letterSpacing: ".5px", color: "#f0ead8" }}>Screenplay Formatter AI</div>
          <div style={{ fontSize: "12px", color: "#888", marginTop: "2px", fontFamily: "sans-serif", letterSpacing: "1px", textTransform: "uppercase" }}>Formattazione · Analisi drammaturgica · Standard cinematografico</div>
        </div>
      </div>

      <div style={s.main}>
        {/* SIDEBAR */}
        <div style={s.sidebar}>
          <div style={s.dropzone} onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => fileInputRef.current?.click()}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📄</div>
            <div style={{ fontSize: "13px", color: "#aaa", fontFamily: "sans-serif", lineHeight: "1.6" }}>
              Trascina qui il tuo file<br />
              <strong style={{ color: "#c8a96e" }}>TXT · DOCX · DOC</strong><br />
              <span style={{ fontSize: "11px", opacity: .6 }}>oppure clicca per sfogliare</span>
            </div>
            <input ref={fileInputRef} type="file" accept=".txt,.docx,.doc" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          {file && (
            <div style={{ background: "rgba(200,169,110,.15)", border: "1px solid rgba(200,169,110,.3)", borderRadius: "6px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontFamily: "sans-serif" }}>
              <span>📎</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "12px" }}>{file.name}</span>
              <span style={{ color: "#888", fontSize: "11px" }}>{(file.size / 1024).toFixed(0)} KB</span>
            </div>
          )}

          <div>
            <div style={s.label}>Testo grezzo</div>
            <textarea
              style={{ width: "100%", height: "160px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "8px", color: "#ccc", fontFamily: "monospace", fontSize: "12px", padding: "12px", resize: "vertical", boxSizing: "border-box", lineHeight: "1.5" }}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Oppure incolla direttamente il testo qui..."
            />
          </div>

          {error && <div style={s.error}>⚠️ {error}</div>}

          {/* Pulsante Formatta */}
          <button style={s.btn} disabled={!canFormat} onClick={runFormatter}>
            {loading ? "⏳ Formattazione in corso..." : "✨ Formatta Sceneggiatura"}
          </button>

          {/* Pulsanti AI — appaiono solo dopo la formattazione */}
          {elements && (
            <button style={s.btnAnalyze} disabled={!canAnalyze} onClick={runAnalysis}>
              {analyzing ? "🔍 Analisi in corso..." : "🎭 Analisi Drammaturgica"}
            </button>
          )}
          {elements && (
            <button style={s.btnSheets} disabled={!canRunSheets} onClick={runCharacterSheets}>
              {loadingSheets ? "⏳ Generazione schede..." : "📋 Schede Personaggio"}
            </button>
          )}
          {elements && (
            <button style={s.btnBreakdown} disabled={!canRunBreakdown} onClick={runBreakdown}>
              {loadingBreakdown ? "⏳ Breakdown in corso..." : "🎬 Breakdown Reparti"}
            </button>
          )}
          {elements && (
            <button style={s.btnLocations} disabled={busy} onClick={runLocationSheets}>
              {loadingLocations ? "⏳ Schede location..." : "📍 Schede Location"}
            </button>
          )}

          {stats && (
            <div>
              <div style={{ ...s.label, marginBottom: "8px" }}>Statistiche</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[["🎬", `${stats.scene} scene`], ["👤", `${stats.character} personaggi`], ["💬", `${stats.dialogue} battute`], ["📝", `${stats.action} azioni`]].map(([icon, label]) => (
                  <div key={label} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", fontFamily: "sans-serif", color: "#aaa" }}>{icon} {label}</div>
                ))}
              </div>
            </div>
          )}

          {analysis && (
            <div style={{ background: "rgba(124,77,255,.06)", border: "1px solid rgba(124,77,255,.2)", borderRadius: "6px", padding: "10px 14px" }}>
              <div style={{ ...s.label, color: "#b39dff", marginBottom: "8px" }}>Analisi completata</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {segnalazioniCount > 0 && <div style={{ background: "rgba(255,100,100,.12)", border: "1px solid rgba(255,100,100,.2)", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", fontFamily: "sans-serif", color: "#ff9999" }}>⚠ {segnCritiche} critiche</div>}
                {analysis.valutazione_globale && <div style={{ background: "rgba(124,77,255,.1)", border: "1px solid rgba(124,77,255,.2)", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", fontFamily: "sans-serif", color: "#b39dff" }}>
                  Media: {((analysis.valutazione_globale.punteggio_struttura + analysis.valutazione_globale.punteggio_personaggi + analysis.valutazione_globale.punteggio_dialoghi + analysis.valutazione_globale.punteggio_ritmo) / 4).toFixed(1)}/10
                </div>}
              </div>
            </div>
          )}

          {elements && (
            <div>
              <div style={{ ...s.label, marginBottom: "8px" }}>Esporta</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={s.btnSec} onClick={downloadFountain}>⬇ .fountain</button>
                <button style={s.btnSec} onClick={downloadHtml}>⬇ .html</button>
              </div>
              <div style={{ fontSize: "10px", color: "#555", fontFamily: "sans-serif", marginTop: "6px" }}>
                .fountain → Final Draft, Fade In · .html → stampa/PDF
              </div>
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div style={s.content}>
          {/* Tab bar principale */}
          {elements && (
            <div style={s.tabs}>
              {tabBtn("preview", "📄 Anteprima", activeTab === "preview")}
              {tabBtn("struttura", "🏗 Struttura", activeTab === "struttura")}
              {tabBtn("fountain", "📝 Fountain", activeTab === "fountain")}
              {analysis && tabBtn("analisi", "🎭 Analisi", activeTab === "analisi")}
              {characterSheets && tabBtn("schede", "📋 Schede", activeTab === "schede")}
              {breakdown && tabBtn("breakdown", "🎬 Breakdown", activeTab === "breakdown")}
              {locationSheets && tabBtn("locations", "📍 Location", activeTab === "locations")}
            </div>
          )}

          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Loading formattazione */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", border: "3px solid rgba(200,169,110,.2)", borderTop: "3px solid #c8a96e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <div style={{ fontFamily: "sans-serif", color: "#888", fontSize: "14px" }}>{loadingMsg}</div>
                <div style={{ fontFamily: "monospace", color: "#555", fontSize: "11px" }}>Analisi struttura drammaturgica...</div>
              </div>
            )}

            {/* Loading location sheets */}
            {loadingLocations && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", border: "3px solid rgba(2,119,189,.2)", borderTop: "3px solid #0277BD", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <div style={{ fontFamily: "sans-serif", color: "#81D4FA", fontSize: "14px" }}>Generazione schede location...</div>
                <div style={{ fontFamily: "monospace", color: "#555", fontSize: "11px" }}>Scouting · Tecnica · Fotografia · Didattica</div>
              </div>
            )}

            {/* Loading breakdown */}
            {loadingBreakdown && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", border: "3px solid rgba(230,81,0,.2)", borderTop: "3px solid #E65100", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <div style={{ fontFamily: "sans-serif", color: "#FFAB91", fontSize: "14px" }}>Breakdown per reparti in corso...</div>
                <div style={{ fontFamily: "monospace", color: "#555", fontSize: "11px" }}>Cast · Location · Props · Costumi · Piano riprese</div>
              </div>
            )}

            {/* Loading schede personaggio */}
            {loadingSheets && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", border: "3px solid rgba(0,137,123,.2)", borderTop: "3px solid #00897B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <div style={{ fontFamily: "sans-serif", color: "#80CBC4", fontSize: "14px" }}>Generazione schede personaggio...</div>
                <div style={{ fontFamily: "monospace", color: "#555", fontSize: "11px" }}>Profilo · Relazioni · Produzione · Didattica</div>
              </div>
            )}

            {/* Loading analisi */}
            {analyzing && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", border: "3px solid rgba(124,77,255,.2)", borderTop: "3px solid #7C4DFF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <div style={{ fontFamily: "sans-serif", color: "#b39dff", fontSize: "14px" }}>Analisi drammaturgica in corso...</div>
                <div style={{ fontFamily: "monospace", color: "#555", fontSize: "11px" }}>Struttura in 3 atti · Archi personaggi · Segnalazioni</div>
              </div>
            )}

            {/* Stato vuoto */}
            {!loading && !analyzing && !elements && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px", color: "#666", fontFamily: "sans-serif" }}>
                <div style={{ fontSize: "48px" }}>🎞️</div>
                <div style={{ fontSize: "16px", color: "#555" }}>Carica un file e avvia la formattazione</div>
                <div style={{ fontSize: "13px", color: "#444", maxWidth: "340px", textAlign: "center", lineHeight: "1.6" }}>Dopo la formattazione potrai avviare l'analisi drammaturgica completa: struttura, personaggi, segnalazioni, valutazione.</div>
              </div>
            )}

            {/* Tab: Anteprima */}
            {!busy && elements && activeTab === "preview" && (
              <div style={s.previewWrap}><ScreenplayPreview elements={elements} /></div>
            )}

            {/* Tab: Struttura elementi */}
            {!busy && elements && activeTab === "struttura" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                {elements.filter((e) => e.type !== "blank").map((el, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", fontFamily: "sans-serif", background: `${typeColors[el.type]}22`, color: typeColors[el.type], border: `1px solid ${typeColors[el.type]}44`, whiteSpace: "nowrap", minWidth: "90px", textAlign: "center" }}>
                      {typeLabels[el.type] || el.type}
                    </span>
                    <span style={{ fontFamily: "monospace", fontSize: "13px", color: "#ccc", lineHeight: "1.5" }}>{el.content}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Fountain */}
            {!busy && elements && activeTab === "fountain" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                <pre style={{ fontFamily: "'Courier New',monospace", fontSize: "12px", color: "#bbb", whiteSpace: "pre-wrap", lineHeight: "1.7", background: "rgba(255,255,255,.02)", padding: "20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,.06)" }}>
                  {toFountain(elements)}
                </pre>
              </div>
            )}

            {/* Tab: Schede location */}
            {!busy && locationSheets && activeTab === "locations" && (
              <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
                <SchedeLocation data={locationSheets} />
              </div>
            )}

            {/* Tab: Breakdown reparti */}
            {!busy && breakdown && activeTab === "breakdown" && (
              <BreakdownPanel data={breakdown} />
            )}

            {/* Tab: Schede personaggio */}
            {!loading && !analyzing && !loadingSheets && characterSheets && activeTab === "schede" && (
              <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
                <SchedePersonaggio data={characterSheets} />
              </div>
            )}

            {/* Tab: Analisi drammaturgica */}
            {!loading && !analyzing && !loadingSheets && analysis && activeTab === "analisi" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Sub-tab analisi */}
                <div style={{ display: "flex", padding: "12px 24px 0", gap: "4px", borderBottom: "1px solid rgba(255,255,255,.04)", flexWrap: "wrap" }}>
                  {analyTabBtn("struttura", "🏛 Struttura", analyTab === "struttura", 0)}
                  {analyTabBtn("personaggi", "👤 Personaggi", analyTab === "personaggi", 0)}
                  {analyTabBtn("scene", "🎬 Scene", analyTab === "scene", analysis.analisi_scene?.filter(s => s.problemi?.length > 0).length)}
                  {analyTabBtn("segnalazioni", "⚠ Segnalazioni", analyTab === "segnalazioni", segnalazioniCount)}
                  {analyTabBtn("valutazione", "📊 Valutazione", analyTab === "valutazione", 0)}
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                  {analyTab === "struttura"   && <StrutturaAtti struttura={analysis.struttura} />}
                  {analyTab === "personaggi"  && <PersonaggiPanel personaggi={analysis.personaggi} />}
                  {analyTab === "scene"       && <ScenePanel analisi_scene={analysis.analisi_scene} />}
                  {analyTab === "segnalazioni"&& <SegnalazioniPanel segnalazioni={analysis.segnalazioni} />}
                  {analyTab === "valutazione" && <ValutazionePanel valutazione={analysis.valutazione_globale} />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 3px; }
      `}</style>
    </div>
  );
}
