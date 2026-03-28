import { useState, useCallback, useRef } from "react";
import * as mammoth from "mammoth";

const API_FORMAT   = "/api/format";
const API_ANALYZE  = "/api/analyze";

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

// ─── App principale ───────────────────────────────────────────────────────────
export default function App() {
  const [file, setFile]           = useState(null);
  const [rawText, setRawText]     = useState("");
  const [elements, setElements]   = useState(null);
  const [analysis, setAnalysis]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
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
    setLoading(true); setError(""); setElements(null); setAnalysis(null);
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

  const canFormat  = rawText.trim().length > 10 && !loading && !analyzing;
  const canAnalyze = !!elements && !analyzing && !loading;

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

          {/* Pulsante Analisi — appare solo dopo la formattazione */}
          {elements && (
            <button style={s.btnAnalyze} disabled={!canAnalyze} onClick={runAnalysis}>
              {analyzing ? "🔍 Analisi in corso..." : "🎭 Analisi Drammaturgica"}
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
            {!loading && !analyzing && elements && activeTab === "preview" && (
              <div style={s.previewWrap}><ScreenplayPreview elements={elements} /></div>
            )}

            {/* Tab: Struttura elementi */}
            {!loading && !analyzing && elements && activeTab === "struttura" && (
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
            {!loading && !analyzing && elements && activeTab === "fountain" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                <pre style={{ fontFamily: "'Courier New',monospace", fontSize: "12px", color: "#bbb", whiteSpace: "pre-wrap", lineHeight: "1.7", background: "rgba(255,255,255,.02)", padding: "20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,.06)" }}>
                  {toFountain(elements)}
                </pre>
              </div>
            )}

            {/* Tab: Analisi drammaturgica */}
            {!loading && !analyzing && analysis && activeTab === "analisi" && (
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
