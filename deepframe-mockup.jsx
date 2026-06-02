import { useState } from "react";

const SCENES = [
  {
    id: 1,
    slug: "INT",
    location: "STUDIO DI REGISTRAZIONE — NOTTE",
    action: "MARCO entra di corsa, tiene in mano un foglio sgualcito. Il fonico TONI lo guarda stupito.",
    characters: ["MARCO", "TONI"],
    prompt: "cinematic interior, recording studio night, dramatic side lighting, neon reflections, film grain, 35mm, two characters, noir atmosphere",
    status: "generated",
    img: null,
  },
  {
    id: 2,
    slug: "EXT",
    location: "PIAZZA DI SPAGNA — ALBA",
    action: "La piazza è deserta. Una figura solitaria sale lentamente la scalinata.",
    characters: ["FIGURA (non identificata)"],
    prompt: "exterior, Piazza di Spagna Rome, dawn golden hour, empty square, lone figure on stairs, cinematic wide angle, Italian neorealism aesthetic",
    status: "pending",
    img: null,
  },
  {
    id: 3,
    slug: "INT",
    location: "APPARTAMENTO MARCO — GIORNO",
    action: "MARCO guarda fuori dalla finestra. Sul tavolo, la sceneggiatura incompiuta.",
    characters: ["MARCO"],
    prompt: "interior apartment, Rome, daylight through window, man looking outside, screenplay papers on table, shallow depth of field, warm tones",
    status: "idle",
    img: null,
  },
  {
    id: 4,
    slug: "EXT",
    location: "VIA DEL CORSO — SERA",
    action: "MARCO e TONI camminano tra la folla. Si fermano davanti a un negozio di dischi.",
    characters: ["MARCO", "TONI"],
    prompt: "exterior Via del Corso Rome 1960s, evening crowd, two men walking, record shop window, period-accurate details, warm street lights",
    status: "idle",
    img: null,
  },
];

const PIPELINE_STEPS = [
  { id: "parse", label: "Parse", icon: "◈", desc: "Analisi documento" },
  { id: "classify", label: "Classifica", icon: "⬡", desc: "INT/EXT, scene, dialoghi" },
  { id: "format", label: "Formatta", icon: "⬢", desc: "Formato italiano std" },
  { id: "analyze", label: "Analizza", icon: "◉", desc: "Personaggi, props, location" },
  { id: "storyboard", label: "Storyboard", icon: "⬟", desc: "Generazione AI frame" },
  { id: "export", label: "Export", icon: "◈", desc: ".fdx / PDF / ZIP" },
];

function PipelineBar({ activeStep, setActiveStep }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 0,
      padding: "0 2rem",
      marginBottom: "2rem",
      overflowX: "auto",
    }}>
      {PIPELINE_STEPS.map((step, i) => {
        const isActive = step.id === activeStep;
        const isPast = PIPELINE_STEPS.findIndex(s => s.id === activeStep) > i;
        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={() => setActiveStep(step.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 18px",
                background: isActive
                  ? "linear-gradient(135deg, #C8A96E, #E8C98E)"
                  : isPast ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.03)",
                border: isActive
                  ? "1px solid #C8A96E"
                  : isPast ? "1px solid rgba(200,169,110,0.4)" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.2s",
                minWidth: 90,
              }}
            >
              <span style={{
                fontSize: 18,
                color: isActive ? "#1A1410" : isPast ? "#C8A96E" : "#5A5248",
                fontWeight: 700,
              }}>{step.icon}</span>
              <span style={{
                fontSize: 10,
                fontFamily: "'Courier New', monospace",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: isActive ? "#1A1410" : isPast ? "#C8A96E" : "#5A5248",
                fontWeight: isActive ? 700 : 400,
              }}>{step.label}</span>
            </button>
            {i < PIPELINE_STEPS.length - 1 && (
              <div style={{
                width: 24,
                height: 1,
                background: isPast ? "rgba(200,169,110,0.5)" : "rgba(255,255,255,0.06)",
                flexShrink: 0,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ComfyConnector({ connected, setConnected, serverUrl, setServerUrl }) {
  const [checking, setChecking] = useState(false);
  const handleConnect = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setConnected(true);
    }, 1200);
  };
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${connected ? "rgba(100,200,120,0.4)" : "rgba(200,169,110,0.2)"}`,
      borderRadius: 10,
      padding: "14px 20px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      marginBottom: "1.5rem",
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: connected ? "#64C878" : checking ? "#C8A96E" : "#4A4540",
        boxShadow: connected ? "0 0 8px #64C878" : checking ? "0 0 8px #C8A96E" : "none",
        transition: "all 0.3s",
        animation: checking ? "pulse 0.8s infinite" : "none",
        flexShrink: 0,
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", color: "#6A6058", marginBottom: 4 }}>
          COMFYUI SERVER
        </div>
        <input
          value={serverUrl}
          onChange={e => setServerUrl(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            color: "#C8B89E",
            fontSize: 13,
            fontFamily: "'Courier New', monospace",
            width: "100%",
            outline: "none",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {connected && (
          <span style={{ fontSize: 10, color: "#64C878", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em" }}>
            ONLINE
          </span>
        )}
        <button
          onClick={handleConnect}
          disabled={checking || connected}
          style={{
            padding: "6px 14px",
            background: connected ? "rgba(100,200,120,0.1)" : "rgba(200,169,110,0.15)",
            border: `1px solid ${connected ? "rgba(100,200,120,0.3)" : "rgba(200,169,110,0.4)"}`,
            borderRadius: 6,
            color: connected ? "#64C878" : "#C8A96E",
            fontSize: 11,
            fontFamily: "'Courier New', monospace",
            letterSpacing: "0.08em",
            cursor: connected ? "default" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {checking ? "TESTING..." : connected ? "CONNESSO" : "CONNETTI"}
        </button>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

function SceneCard({ scene, connected, onGenerate, generating }) {
  const statusConfig = {
    generated: { color: "#64C878", label: "GEN.", bg: "rgba(100,200,120,0.08)" },
    pending: { color: "#C8A96E", label: "IN CODA", bg: "rgba(200,169,110,0.08)" },
    idle: { color: "#4A4540", label: "ATTESA", bg: "rgba(255,255,255,0.02)" },
    generating: { color: "#E8C98E", label: "GEN...", bg: "rgba(232,201,142,0.1)" },
  };
  const currentStatus = generating ? "generating" : scene.status;
  const cfg = statusConfig[currentStatus] || statusConfig.idle;

  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${currentStatus === "generated" ? "rgba(100,200,120,0.2)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 10,
      overflow: "hidden",
      transition: "all 0.3s",
    }}>
      {/* Frame area */}
      <div style={{
        aspectRatio: "16/9",
        background: currentStatus === "generated"
          ? "linear-gradient(135deg, #0F0D0B 0%, #1E1810 40%, #0A0E1A 100%)"
          : currentStatus === "generating"
            ? "linear-gradient(135deg, #1A1208 0%, #0A0810 100%)"
            : "rgba(255,255,255,0.02)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        {currentStatus === "generated" ? (
          <>
            {/* Simulated cinematic frame */}
            <div style={{
              position: "absolute", inset: 0,
              background: `
                radial-gradient(ellipse at 30% 40%, rgba(200,169,110,0.12) 0%, transparent 60%),
                radial-gradient(ellipse at 70% 60%, rgba(100,130,200,0.08) 0%, transparent 50%)
              `,
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: "30%",
              background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
            }} />
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0,
              height: "15%",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
            }} />
            <span style={{ color: "rgba(200,169,110,0.3)", fontSize: 32, zIndex: 1 }}>◉</span>
          </>
        ) : currentStatus === "generating" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 32, height: 32,
              border: "2px solid rgba(200,169,110,0.2)",
              borderTop: "2px solid #C8A96E",
              borderRadius: "50%",
              margin: "0 auto 8px",
              animation: "spin 1s linear infinite",
            }} />
            <span style={{ fontSize: 10, color: "#C8A96E", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em" }}>
              COMFYUI →
            </span>
          </div>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 24 }}>⬟</span>
        )}

        {/* Scene number badge */}
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: "rgba(0,0,0,0.7)",
          border: "1px solid rgba(200,169,110,0.3)",
          borderRadius: 4,
          padding: "2px 7px",
          fontSize: 10,
          fontFamily: "'Courier New', monospace",
          color: "#C8A96E",
          letterSpacing: "0.1em",
        }}>
          SC.{String(scene.id).padStart(3, "0")}
        </div>

        {/* Status badge */}
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: "rgba(0,0,0,0.7)",
          border: `1px solid ${cfg.color}40`,
          borderRadius: 4,
          padding: "2px 7px",
          fontSize: 9,
          fontFamily: "'Courier New', monospace",
          color: cfg.color,
          letterSpacing: "0.1em",
        }}>
          {cfg.label}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{
          fontSize: 9,
          fontFamily: "'Courier New', monospace",
          letterSpacing: "0.12em",
          color: "#C8A96E",
          marginBottom: 4,
        }}>
          {scene.slug}. {scene.location}
        </div>
        <div style={{
          fontSize: 11,
          color: "#8A8278",
          lineHeight: 1.5,
          marginBottom: 10,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          {scene.action}
        </div>

        {/* Characters */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
          {scene.characters.map(c => (
            <span key={c} style={{
              fontSize: 9,
              fontFamily: "'Courier New', monospace",
              padding: "2px 6px",
              background: "rgba(200,169,110,0.06)",
              border: "1px solid rgba(200,169,110,0.15)",
              borderRadius: 3,
              color: "#9A8A78",
              letterSpacing: "0.08em",
            }}>{c}</span>
          ))}
        </div>

        {/* Prompt AI */}
        <div style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 5,
          padding: "6px 8px",
          fontSize: 9,
          fontFamily: "'Courier New', monospace",
          color: "#5A5248",
          lineHeight: 1.5,
          marginBottom: 10,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          ⌥ {scene.prompt}
        </div>

        <button
          onClick={() => onGenerate(scene.id)}
          disabled={!connected || generating || currentStatus === "generated"}
          style={{
            width: "100%",
            padding: "7px",
            background: currentStatus === "generated"
              ? "rgba(100,200,120,0.05)"
              : connected
                ? "rgba(200,169,110,0.12)"
                : "rgba(255,255,255,0.02)",
            border: `1px solid ${
              currentStatus === "generated" ? "rgba(100,200,120,0.2)"
                : connected ? "rgba(200,169,110,0.3)"
                : "rgba(255,255,255,0.05)"
            }`,
            borderRadius: 5,
            color: currentStatus === "generated" ? "#64C878"
              : connected ? "#C8A96E"
              : "#3A3530",
            fontSize: 10,
            fontFamily: "'Courier New', monospace",
            letterSpacing: "0.1em",
            cursor: connected && currentStatus !== "generated" && !generating ? "pointer" : "default",
            transition: "all 0.2s",
          }}
        >
          {currentStatus === "generated" ? "✓ GENERATO" : generating ? "ELABORAZIONE..." : "GENERA VIA COMFYUI →"}
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function StoryboardModule({ connected }) {
  const [scenes, setScenes] = useState(SCENES);
  const [generatingId, setGeneratingId] = useState(null);
  const [batchMode, setBatchMode] = useState(false);
  const [comfyModel, setComfyModel] = useState("dreamshaper_8.safetensors");
  const [style, setStyle] = useState("cinematic");
  const [steps, setSteps] = useState(30);

  const handleGenerate = (id) => {
    if (!connected) return;
    setGeneratingId(id);
    setTimeout(() => {
      setScenes(prev => prev.map(s => s.id === id ? { ...s, status: "generated" } : s));
      setGeneratingId(null);
    }, 2200);
  };

  const handleBatchGenerate = () => {
    if (!connected) return;
    setBatchMode(true);
    let i = 0;
    const interval = setInterval(() => {
      const pendingScene = scenes.find(s => s.status !== "generated");
      if (!pendingScene || i >= scenes.length) {
        clearInterval(interval);
        setBatchMode(false);
        return;
      }
      setGeneratingId(pendingScene.id);
      setTimeout(() => {
        setScenes(prev => prev.map(s => s.id === pendingScene.id ? { ...s, status: "generated" } : s));
        setGeneratingId(null);
      }, 1800);
      i++;
    }, 2200);
  };

  const generated = scenes.filter(s => s.status === "generated").length;

  return (
    <div>
      {/* ComfyUI Config bar */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: "1.2rem",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 9, fontFamily: "'Courier New', monospace", color: "#5A5248", letterSpacing: "0.1em" }}>MODELLO</span>
          <select
            value={comfyModel}
            onChange={e => setComfyModel(e.target.value)}
            style={{
              background: "rgba(200,169,110,0.08)",
              border: "1px solid rgba(200,169,110,0.2)",
              borderRadius: 4,
              color: "#C8A96E",
              fontSize: 11,
              fontFamily: "'Courier New', monospace",
              padding: "3px 6px",
            }}
          >
            <option>dreamshaper_8.safetensors</option>
            <option>epicrealism_naturalSin.safetensors</option>
            <option>cinematicVision_v1.safetensors</option>
            <option>analogDiffusion_v1.safetensors</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 9, fontFamily: "'Courier New', monospace", color: "#5A5248", letterSpacing: "0.1em" }}>STILE</span>
          <select
            value={style}
            onChange={e => setStyle(e.target.value)}
            style={{
              background: "rgba(200,169,110,0.08)",
              border: "1px solid rgba(200,169,110,0.2)",
              borderRadius: 4,
              color: "#C8A96E",
              fontSize: 11,
              fontFamily: "'Courier New', monospace",
              padding: "3px 6px",
            }}
          >
            <option value="cinematic">Cinematografico</option>
            <option value="sketch">Sketch / B&W</option>
            <option value="realistic">Fotorealistico</option>
            <option value="noir">Noir</option>
            <option value="anime">Anime/Illustrazione</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 9, fontFamily: "'Courier New', monospace", color: "#5A5248", letterSpacing: "0.1em" }}>STEPS</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="range" min="10" max="50" value={steps}
              onChange={e => setSteps(Number(e.target.value))}
              style={{ accentColor: "#C8A96E", width: 80 }}
            />
            <span style={{ fontSize: 11, color: "#C8A96E", fontFamily: "'Courier New', monospace", minWidth: 24 }}>{steps}</span>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#6A6058", fontFamily: "'Courier New', monospace" }}>
            {generated}/{scenes.length} frame
          </span>
          <button
            onClick={handleBatchGenerate}
            disabled={!connected || batchMode || generated === scenes.length}
            style={{
              padding: "7px 16px",
              background: connected && !batchMode ? "linear-gradient(135deg, #C8A96E, #A88A50)" : "rgba(255,255,255,0.03)",
              border: "1px solid rgba(200,169,110,0.3)",
              borderRadius: 6,
              color: connected && !batchMode ? "#1A1410" : "#4A4540",
              fontSize: 10,
              fontFamily: "'Courier New', monospace",
              letterSpacing: "0.1em",
              fontWeight: 700,
              cursor: connected && !batchMode ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            {batchMode ? "⟳ BATCH IN CORSO..." : "⬟ GENERA TUTTO"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {generated > 0 && (
        <div style={{ marginBottom: "1.2rem" }}>
          <div style={{
            height: 2,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 1,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${(generated / scenes.length) * 100}%`,
              background: "linear-gradient(90deg, #C8A96E, #E8C98E)",
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1rem",
      }}>
        {scenes.map((scene, i) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={i}
            connected={connected}
            onGenerate={handleGenerate}
            generating={generatingId === scene.id}
          />
        ))}
      </div>

      {/* Export */}
      {generated === scenes.length && (
        <div style={{
          marginTop: "1.5rem",
          padding: "16px 20px",
          background: "rgba(100,200,120,0.05)",
          border: "1px solid rgba(100,200,120,0.2)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#64C878", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", marginBottom: 2 }}>
              ✓ STORYBOARD COMPLETATO — {scenes.length} FRAME
            </div>
            <div style={{ fontSize: 10, color: "#5A7A5A" }}>
              Tutti i frame sono stati generati via ComfyUI
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["PDF", "ZIP", "FDX+IMG"].map(fmt => (
              <button key={fmt} style={{
                padding: "7px 14px",
                background: "rgba(100,200,120,0.08)",
                border: "1px solid rgba(100,200,120,0.25)",
                borderRadius: 5,
                color: "#64C878",
                fontSize: 10,
                fontFamily: "'Courier New', monospace",
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}>↓ {fmt}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScreenplayPanel() {
  return (
    <div style={{
      fontFamily: "'Courier New', monospace",
      fontSize: 12,
      color: "#8A8278",
      lineHeight: 1.8,
      padding: "1rem",
    }}>
      {[
        { type: "scene", text: "INT. STUDIO DI REGISTRAZIONE — NOTTE" },
        { type: "action", text: "MARCO entra di corsa, tiene in mano un foglio sgualcito. Il fonico TONI lo guarda stupito." },
        { type: "character", text: "MARCO" },
        { type: "dialogue", text: "L'hanno accettata. La sceneggiatura. Cazzo, l'hanno accettata." },
        { type: "character", text: "TONI" },
        { type: "dialogue", text: "Chi? Di cosa stai parlando?" },
        { type: "action", text: "Marco si avvicina al mixer, appoggia il foglio sul vetro." },
        { type: "scene", text: "EXT. PIAZZA DI SPAGNA — ALBA" },
        { type: "action", text: "La piazza è deserta. Una figura solitaria sale lentamente la scalinata." },
      ].map((item, i) => (
        <div key={i} style={{
          padding: item.type === "scene" ? "8px 0 4px" : "2px 0",
          color: item.type === "scene" ? "#C8A96E"
            : item.type === "character" ? "#E8D8B0"
            : item.type === "action" ? "#7A7268"
            : "#AAA090",
          fontWeight: item.type === "scene" ? 700 : 400,
          letterSpacing: item.type === "scene" || item.type === "character" ? "0.08em" : 0,
          textTransform: item.type === "scene" ? "uppercase" : "none",
          borderLeft: item.type === "scene" ? "2px solid rgba(200,169,110,0.4)" : "none",
          paddingLeft: item.type === "scene" ? "8px" : item.type === "dialogue" ? "2.5rem" : item.type === "character" ? "4rem" : 0,
        }}>
          {item.text}
        </div>
      ))}
    </div>
  );
}

export default function DeepFrame() {
  const [activeStep, setActiveStep] = useState("storyboard");
  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState("http://127.0.0.1:8188");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0E0C0A",
      color: "#C8B89E",
      fontFamily: "'Georgia', serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Grain overlay */}
      <div style={{
        position: "fixed",
        inset: 0,
        opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Ambient bg */}
      <div style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse at 15% 10%, rgba(200,169,110,0.04) 0%, transparent 50%), radial-gradient(ellipse at 85% 90%, rgba(80,100,160,0.03) 0%, transparent 50%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.2rem 2rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(10px)",
          background: "rgba(14,12,10,0.7)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 32, height: 32,
              background: "linear-gradient(135deg, #C8A96E, #7A5A30)",
              borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>⬟</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", color: "#E8D8B0" }}>
                DEEPFRAME
              </div>
              <div style={{ fontSize: 9, fontFamily: "'Courier New', monospace", letterSpacing: "0.2em", color: "#6A5A48" }}>
                SCREENPLAY FORMATTER v2.0
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              padding: "5px 12px",
              background: "rgba(200,169,110,0.06)",
              border: "1px solid rgba(200,169,110,0.15)",
              borderRadius: 20,
              fontSize: 9,
              fontFamily: "'Courier New', monospace",
              color: "#7A6A58",
              letterSpacing: "0.1em",
            }}>
              SBANDATI_v3.fdx
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                padding: "5px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                color: "#8A7A68",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {sidebarOpen ? "◂ CHIUDI" : "▸ SCRIPT"}
            </button>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: connected ? "#64C878" : "#3A3530",
              boxShadow: connected ? "0 0 6px #64C878" : "none",
            }} />
          </div>
        </header>

        {/* Main layout */}
        <div style={{ display: "flex" }}>
          {/* Script sidebar */}
          {sidebarOpen && (
            <div style={{
              width: 300,
              borderRight: "1px solid rgba(255,255,255,0.06)",
              height: "calc(100vh - 65px)",
              overflowY: "auto",
              background: "rgba(255,255,255,0.01)",
              animation: "slideIn 0.2s ease",
              flexShrink: 0,
            }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 9, fontFamily: "'Courier New', monospace", letterSpacing: "0.15em", color: "#5A5248" }}>
                  ANTEPRIMA SCRIPT
                </span>
              </div>
              <ScreenplayPanel />
            </div>
          )}

          {/* Main content */}
          <div style={{ flex: 1, padding: "2rem", minWidth: 0 }}>
            {/* Pipeline */}
            <PipelineBar activeStep={activeStep} setActiveStep={setActiveStep} />

            {/* Step title */}
            <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "baseline", gap: 12 }}>
              <h2 style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#E8D8B0",
                margin: 0,
                letterSpacing: "0.03em",
              }}>
                {activeStep === "storyboard" ? "Storyboard AI" : PIPELINE_STEPS.find(s => s.id === activeStep)?.label}
              </h2>
              {activeStep === "storyboard" && (
                <span style={{ fontSize: 11, color: "#5A5248", fontFamily: "'Courier New', monospace" }}>
                  via ComfyUI · generazione frame da scena
                </span>
              )}
            </div>

            {/* ComfyUI connector (only in storyboard step) */}
            {activeStep === "storyboard" && (
              <ComfyConnector
                connected={connected}
                setConnected={setConnected}
                serverUrl={serverUrl}
                setServerUrl={setServerUrl}
              />
            )}

            {/* Step content */}
            {activeStep === "storyboard" ? (
              <StoryboardModule connected={connected} />
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 300,
                color: "#3A3530",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>
                  {PIPELINE_STEPS.find(s => s.id === activeStep)?.icon}
                </div>
                <div style={{ fontSize: 12, fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", color: "#4A4540" }}>
                  MODULO: {PIPELINE_STEPS.find(s => s.id === activeStep)?.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 11, color: "#3A3530", marginTop: 6 }}>
                  {PIPELINE_STEPS.find(s => s.id === activeStep)?.desc}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
