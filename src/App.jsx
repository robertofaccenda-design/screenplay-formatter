import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import * as mammoth from "mammoth";
import { jsonrepair } from "jsonrepair";

const API_FORMAT           = "/api/format";
const API_ANALYZE          = "/api/analyze";
const API_CHARACTER_SHEETS = "/api/character-sheets";
const API_BREAKDOWN        = "/api/breakdown";
const API_LOCATION_SHEETS  = "/api/location-sheets";
const LUMINA_STUDIO_URL    = "https://lumina-studio-1033723633880.us-west1.run.app/";
const ANTHROPIC_KEY_STORAGE = "screenplayFormatter.anthropicApiKey";
const ANTHROPIC_SESSION_KEY_STORAGE = "screenplayFormatter.anthropicApiKey.session";
const STORY_DRAFT_STORAGE = "screenplayFormatter.pendingStoryDraft";
const AI_PROVIDER_STORAGE = "screenplayFormatter.aiProvider";
const LM_STUDIO_ENDPOINT_STORAGE = "screenplayFormatter.lmStudioEndpoint";
const LM_STUDIO_MODEL_STORAGE = "screenplayFormatter.lmStudioModel";
const DIRECT_LM_STUDIO_ENDPOINT = "http://127.0.0.1:1234/v1/chat/completions";
const LOCAL_PROXY_LM_STUDIO_ENDPOINT = "/lmstudio/v1/chat/completions";
const isLocalAppHost = ["localhost", "127.0.0.1"].includes(globalThis.location?.hostname);
const DEFAULT_LM_STUDIO_ENDPOINT = isLocalAppHost ? LOCAL_PROXY_LM_STUDIO_ENDPOINT : DIRECT_LM_STUDIO_ENDPOINT;
const DEFAULT_LM_STUDIO_MODEL = "gemma-4";
const ONBOARDING_STORAGE = "screenplayFormatter.onboardingComplete";
const APP_TOUR_STORAGE = "screenplayFormatter.appTourComplete";
const ONBOARDING_FLOW_VERSION = "landing-before-tour-v1";
const PDFJS_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

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

const LOCAL_FORMAT_PROMPTS = {
  creative: `Sei un esperto sceneggiatore cinematografico e story editor. Trasforma un testo narrativo grezzo, una storia generata o un documento sorgente in una sceneggiatura cinematografica piu ricca e sviluppata. Restituisci ESCLUSIVAMENTE un array JSON valido con elementi di sceneggiatura.

Tipi ammessi: "scene_heading", "action", "character", "parenthetical", "dialogue", "transition", "title", "blank".

Regole:
- Espandi creativamente il materiale: aggiungi azioni visive, atmosfera, dettagli d'ambiente, micro-conflitti e passaggi di raccordo.
- Crea dialoghi nuovi quando aiutano a drammatizzare la scena, mantenendo coerenza con personaggi, tono e tema del testo di partenza.
- Se il testo nasce da "Crea la tua storia" o da un PDF narrativo, adattalo in scene cinematografiche complete invece di limitarti a riclassificarlo.
- Mantieni la lingua originale e non cambiare il nucleo della storia.
- Inferisci personaggi, luoghi e scene dal contesto.
- Aggiungi intestazioni di scena INT./EST. quando servono per costruire una sceneggiatura leggibile.
- Usa il presente indicativo e uno stile visivo, concreto, cinematografico.
- Ogni elemento deve avere: { "type": "<tipo>", "content": "<testo>" }.

Restituisci SOLO l'array JSON, senza markdown, senza spiegazioni.`,
  organic: `Sei un esperto sceneggiatore cinematografico, script doctor e story editor. Trasforma il testo in una sceneggiatura piu organica, coerente e cinematografica, applicando i parametri creativi richiesti dall'utente senza tradire il nucleo della storia.

Tipi ammessi: "scene_heading", "action", "character", "parenthetical", "dialogue", "transition", "title", "blank".

Regole:
- Rendi la sceneggiatura piu organica: migliora raccordi, motivazioni, progressione causa-effetto, ritmo, conflitto e continuita emotiva.
- Applica solo i parametri creativi richiesti: sorpresa, nuovo personaggio, virata di genere, tono, o note libere.
- Se aggiungi un personaggio, dagli una funzione drammaturgica chiara e non decorativa.
- Se aggiungi un elemento sorpresa, preparalo con piccoli indizi e integralo nella scena senza effetto casuale.
- Se cambi genere o tono, riscrivi atmosfera, dettagli, conflitto e dialoghi in modo coerente.
- Mantieni la lingua originale, il nucleo della storia e i personaggi gia presenti.
- Aggiungi intestazioni di scena INT./EST. quando servono.
- Scrivi in presente indicativo e stile visivo, concreto, cinematografico.
- Ogni elemento deve avere: { "type": "<tipo>", "content": "<testo>" }.

Restituisci SOLO l'array JSON, senza markdown, senza spiegazioni.`,
  conservative: `Sei un parser conservativo di sceneggiature. Trasforma il testo in un array JSON classificando ogni riga o blocco senza aggiungere contenuto e senza migliorare lo stile.

Tipi ammessi: "scene_heading", "action", "character", "parenthetical", "dialogue", "transition", "title", "blank".

Regole:
- Non aggiungere scene, intestazioni, azioni, personaggi, battute, transizioni o dettagli non presenti.
- Non correggere grammatica, ortografia, punteggiatura, accenti o tempi verbali.
- Normalizza maiuscole/minuscole solo quando strettamente richiesto dal formato per scene heading, character e transition.
- Se una riga e ambigua, scegli il tipo piu probabile ma lascia il contenuto invariato.
- Ogni elemento deve avere: { "type": "<tipo>", "content": "<testo>" }.

Restituisci SOLO l'array JSON, senza markdown, senza spiegazioni.`,
};

const ORGANIC_GENRE_LABELS = {
  neutral: "piu organica e fluida",
  crime: "piu crime",
  thriller: "piu thriller",
  noir: "piu noir",
  comedy: "piu commedia",
  drama: "piu drammatica",
};

const DEFAULT_ORGANIC_OPTIONS = {
  genre: "neutral",
  surprise: true,
  newCharacter: false,
  note: "",
};

const SCREENPLAY_TEMPLATES = [
  {
    id: "standard-ita",
    label: "ITA standard",
    title: "Sceneggiatura italiana standard",
    text: `TITOLO: Nuovo progetto

INT. CASA - GIORNO

La stanza e ordinata, ma qualcosa stona. Sul tavolo c'e un oggetto che nessuno dovrebbe aver lasciato li.

PERSONAGGIO
Non doveva succedere cosi.

EST. STRADA - NOTTE

Il quartiere e silenzioso. Una luce si accende al terzo piano.`,
  },
  {
    id: "short-film",
    label: "Corto",
    title: "Cortometraggio",
    text: `TITOLO: Cortometraggio

INT. LUOGO PRINCIPALE - GIORNO

Il protagonista entra in un luogo familiare che oggi sembra diverso.

PROTAGONISTA
Avevo detto che sarei tornato solo una volta.

EST. LUOGO PRINCIPALE - TRAMONTO

La scelta finale resta sospesa per un istante, poi il protagonista agisce.`,
  },
  {
    id: "doc",
    label: "Documentario",
    title: "Documentario",
    text: `TITOLO: Documentario

EST. LOCATION REALE - GIORNO

Immagini d'ambiente. Dettagli del luogo, persone al lavoro, suoni naturali.

VOCE NARRANTE
Ogni storia comincia da un gesto che sembra piccolo.

INT. ARCHIVIO - GIORNO

Fotografie, documenti, materiali d'epoca. Una mano sfoglia lentamente le prove.`,
  },
  {
    id: "series",
    label: "Serie TV",
    title: "Episodio serie",
    text: `TITOLO: Episodio pilota

TEASER

EST. LUOGO ICONICO - NOTTE

Un evento inatteso apre la storia e costringe i personaggi a reagire.

ATTO 1

INT. BASE OPERATIVA - GIORNO

I personaggi principali discutono il problema. La posta in gioco diventa chiara.`,
  },
];

const DIRECTOR_STYLES = {
  cinematic: {
    label: "Cinematografico",
    suffix: "cinematic composition, naturalistic lighting, production still, 35mm lens, subtle film grain",
    negative: "flat lighting, amateur framing, distorted faces, unreadable scene, low detail",
  },
  noir: {
    label: "Noir",
    suffix: "high contrast noir lighting, deep shadows, smoke, expressive silhouettes, dramatic black and amber palette",
    negative: "bright sitcom lighting, saturated cartoon colors, clean corporate look, weak shadows",
  },
  realism: {
    label: "Fotorealistico",
    suffix: "photorealistic film still, accurate location texture, natural skin, believable props, balanced depth of field",
    negative: "plastic skin, fantasy costume, overprocessed HDR, unrealistic anatomy, cluttered frame",
  },
  storyboard: {
    label: "Storyboard B/N",
    suffix: "black and white storyboard frame, clear blocking, pencil texture, cinematic shot planning",
    negative: "finished glossy render, color illustration, messy sketch, unreadable layout",
  },
};

const buildOrganicInstructions = (options = DEFAULT_ORGANIC_OPTIONS) => {
  const normalized = { ...DEFAULT_ORGANIC_OPTIONS, ...options };
  const instructions = [
    `Direzione: rendi lo script ${ORGANIC_GENRE_LABELS[normalized.genre] || ORGANIC_GENRE_LABELS.neutral}.`,
    "Rendi la sceneggiatura piu organica: raccorda meglio le scene, rafforza motivazioni, conflitto, ritmo, sottotesto e continuita emotiva.",
  ];

  if (normalized.surprise) {
    instructions.push("Aggiungi un elemento sorpresa integrato nella storia, preparato con piccoli indizi e non come svolta casuale.");
  }

  if (normalized.newCharacter) {
    instructions.push("Aggiungi un nuovo personaggio con funzione drammaturgica precisa, capace di modificare relazioni, conflitto o posta in gioco.");
  }

  if (normalized.genre === "crime") {
    instructions.push("Rendi lo script piu crime: inserisci indizi, ambiguita morale, pressione investigativa, posta in gioco concreta e dettagli di ambiente coerenti.");
  }

  if (normalized.note.trim()) {
    instructions.push(`Nota libera dell'autore: ${normalized.note.trim()}`);
  }

  return instructions.join("\n- ");
};

const LOCAL_ANALYSIS_PROMPTS = {
  analyze: `Sei un dramaturg e docente di sceneggiatura cinematografica. Devi analizzare una sceneggiatura gia trasformata in array JSON di elementi tipizzati.

ISTRUZIONI IMPORTANTI:
- Non restituire campi vuoti se il testo contiene scene, personaggi o dialoghi.
- Compila sempre 3 atti, anche per testi brevi.
- Compila sempre i momenti chiave usando null quando non sono identificabili.
- Compila sempre analisi_scene con una voce per ogni scene_heading.
- Compila personaggi usando gli elementi "character" e "dialogue".
- Le segnalazioni possono essere vuote solo se non trovi problemi reali.
- I punteggi devono essere numeri da 1 a 10, mai 0.
- Restituisci ESCLUSIVAMENTE l'oggetto JSON, senza wrapper "analysis", senza markdown e senza spiegazioni.

SCHEMA ESATTO:
{
  "struttura": {
    "totale_scene": 0,
    "atti": [
      {
        "atto": 1,
        "scene_da": 1,
        "scene_a": 1,
        "percentuale": "33%",
        "funzione_narrativa": "",
        "valutazione": "efficace",
        "note_docente": ""
      }
    ],
    "momenti_chiave": [
      {
        "tipo": "inciting_incident",
        "scena_numero": null,
        "descrizione": "",
        "valutazione": "assente",
        "nota_docente": ""
      }
    ]
  },
  "personaggi": [
    {
      "nome": "",
      "battute": 0,
      "arco": "assente",
      "analisi_arco": "",
      "tipi_conflitto": [],
      "presenza_scene": 0,
      "nota_docente": ""
    }
  ],
  "analisi_scene": [
    {
      "numero": 1,
      "titolo": "",
      "conflitto": "medio",
      "funzione": "esposizione",
      "problemi": [],
      "nota": ""
    }
  ],
  "segnalazioni": [
    {
      "tipo": "conflitto_assente",
      "gravita": "media",
      "scena_numero": null,
      "elemento": "",
      "spiegazione": "",
      "suggerimento": ""
    }
  ],
  "valutazione_globale": {
    "punteggio_struttura": 6,
    "punteggio_personaggi": 6,
    "punteggio_dialoghi": 6,
    "punteggio_ritmo": 6,
    "punti_di_forza": [],
    "aree_di_miglioramento": [],
    "commento_docente": ""
  }
}`,
  characterSheets: `Sei un dramaturg e script analyst. Genera schede personaggio dettagliate a partire da una sceneggiatura in formato JSON.

ISTRUZIONI IMPORTANTI:
- Non restituire "personaggi": [] se nella sceneggiatura ci sono elementi "character".
- Includi tutti i personaggi con almeno una battuta se il testo e breve.
- Usa "non_specificato" quando un dato non e deducibile.
- Restituisci ESCLUSIVAMENTE un oggetto JSON valido, senza markdown e senza spiegazioni.

SCHEMA ESATTO:
{
  "personaggi": [
    {
      "nome": "NOME IN MAIUSCOLO",
      "ruolo": "protagonista",
      "genere_presunto": "non_specificato",
      "presenza": {
        "scene_totali": 1,
        "prima_scena": 1,
        "ultima_scena": 1,
        "scene_numeri": [1],
        "battute_totali": 1,
        "percentuale_dialogo": "0%"
      },
      "profilo_narrativo": {
        "descrizione_in_una_riga": "",
        "motivazione_principale": "non_specificato",
        "bisogno_profondo": "non_specificato",
        "paura_principale": "non_specificato",
        "difetto_principale": "non_specificato",
        "pregio_principale": "non_specificato",
        "arco_narrativo": "non_specificato",
        "citazione_rappresentativa": "non_specificato"
      },
      "relazioni": [],
      "conflitti": {
        "interno": "non_specificato",
        "interpersonale": "non_specificato",
        "sociale_o_ambientale": "non_specificato"
      },
      "scheda_produzione": {
        "caratteristiche_fisiche_deducibili": "non_specificato",
        "costumi_accessori": "non_specificato",
        "note_casting": "non_specificato",
        "complessità_interpretativa": "media",
        "presenza_scena_difficile": false,
        "note_regia": "non_specificato"
      },
      "scheda_didattica": {
        "funzione_drammaturgica": "",
        "archetipo": "non_specificato",
        "domande_per_l_autore": [],
        "nota_docente": ""
      }
    }
  ],
  "mappa_relazioni": [],
  "note_ensemble": ""
}`,
  locationSheets: `Sei un location manager e scenografo cinematografico. Genera schede location dettagliate a partire da una sceneggiatura in formato JSON.

ISTRUZIONI IMPORTANTI:
- Non restituire "locations": [] se nella sceneggiatura ci sono elementi "scene_heading".
- Identifica ogni location univoca dalle intestazioni di scena.
- Usa "non_specificato" quando un dato non e deducibile.
- Restituisci ESCLUSIVAMENTE un oggetto JSON valido, senza markdown e senza spiegazioni.

SCHEMA ESATTO:
{
  "locations": [
    {
      "nome": "",
      "identificativo": "LOC-01",
      "tipo": "INT",
      "scene": [1],
      "scene_count": 1,
      "momenti_giornata": ["GIORNO"],
      "personaggi_presenti": [],
      "comparse_max_stimato": 0,
      "descrizione_narrativa": "",
      "atmosfera": "",
      "funzione_drammaturgica": "",
      "caratteristiche_tecniche": {
        "dimensioni_stimate": "media",
        "luce_naturale": "non_specificato",
        "direzione_luce_preferibile": "non_specificato",
        "acustica_stimata": "non_specificato",
        "accessibilità_attrezzatura": "non_specificato",
        "spazio_per_troupe": "non_specificato"
      },
      "allestimento": {
        "livello": "minimo",
        "elementi_scenografia_identificati": [],
        "elementi_da_aggiungere": [],
        "elementi_da_rimuovere": [],
        "note_scenografo": "non_specificato"
      },
      "scouting": {
        "tipo_ricerca": "da_valutare",
        "caratteristiche_fondamentali": "",
        "caratteristiche_desiderabili": "",
        "problemi_potenziali": "",
        "permessi_necessari": "probabilmente",
        "alternative_studio": "non_specificato",
        "note_logistiche": "non_specificato"
      },
      "piano_riprese": {
        "giorni_stimati": 1,
        "ore_stimate_totali": 4,
        "scene_consigliate_nello_stesso_giorno": [1],
        "note_ottimizzazione": ""
      },
      "fotografia": {
        "stile_suggerito": "",
        "sfide_fotografiche": "",
        "riferimenti_visivi": "non_specificato"
      },
      "scheda_didattica": {
        "concetto_chiave": "",
        "relazione_spazio_personaggio": "",
        "domande_per_studenti": [],
        "nota_docente": ""
      }
    }
  ],
  "mappa_narrativa_locations": [],
  "riepilogo_produzione": {
    "totale_locations": 1,
    "locations_interne": 1,
    "locations_esterne": 0,
    "giorni_totali_stimati": 1,
    "location_più_complessa": "",
    "location_più_ricorrente": "",
    "budget_scenografia_indicativo": "contenuto",
    "note_generali": ""
  }
}`,
  breakdown: `Sei un direttore di produzione cinematografica. Genera un breakdown operativo per reparti da una sceneggiatura JSON.

ISTRUZIONI IMPORTANTI:
- Non restituire array vuoti se nella sceneggiatura ci sono scene, personaggi, props o location deducibili.
- Numera le scene in ordine progressivo usando "scene_heading".
- Estrai cast dagli elementi "character" e crea una scheda per ogni personaggio.
- Estrai locations dalle intestazioni di scena e crea una scheda per ogni luogo.
- Estrai o deduci props, costumi, comparse, audio, veicoli ed effetti da azioni/dialoghi/contesto.
- Usa "non_specificato" quando un dato non e deducibile.
- Restituisci ESCLUSIVAMENTE un oggetto JSON valido, senza markdown e senza spiegazioni.

SCHEMA ESATTO:
{
  "riepilogo": {
    "totale_scene": 0,
    "personaggi_parlanti": 0,
    "location_uniche": 0,
    "scene_interne": 0,
    "scene_esterne": 0,
    "scene_giorno": 0,
    "scene_notte": 0,
    "giorni_ripresa_stimati": 1,
    "complessità_produttiva": "bassa",
    "note_produzione": ""
  },
  "per_scena": [
    {
      "numero": 1,
      "titolo": "",
      "interno_esterno": "INT",
      "momento": "NON_SPECIFICATO",
      "cast": [],
      "comparse_stimate": 0,
      "props_principali": [],
      "location_descrizione": "",
      "complessità": "bassa",
      "elementi_speciali": [],
      "note_regia": ""
    }
  ],
  "reparti": {
    "cast": [
      {
        "nome": "",
        "ruolo_tipo": "protagonista|secondario|figurazione|non_specificato",
        "scene": [1],
        "giorni_lavoro_stimati": 1,
        "continuità_costume": "non_specificato",
        "note_casting": "non_specificato"
      }
    ],
    "locations": [
      {
        "nome": "",
        "tipo": "INT|EST|INT/EST|non_specificato",
        "scene": [1],
        "allestimento": "minimo|medio|importante|costruito_in_studio",
        "note_ricerca": "non_specificato",
        "problemi_potenziali": "non_specificato"
      }
    ],
    "props": [
      {
        "oggetto": "",
        "tipo": "praticabile|decorativo|arma|veicolo|elettronico|animale|cibo|non_specificato",
        "scene": [1],
        "note": "non_specificato"
      }
    ],
    "costumi": [
      {
        "personaggio": "",
        "periodo_stile": "non_specificato",
        "cambi_costume": 1,
        "scene": [1],
        "capi_identificati": [],
        "note_continuità": "non_specificato"
      }
    ],
    "comparse": [
      {
        "gruppo": "",
        "quantità_stimata": 0,
        "scene": [1],
        "note": "non_specificato"
      }
    ],
    "effetti_speciali": [],
    "audio_musica": [],
    "veicoli": []
  },
  "piano_lavoro_suggerito": [
    {
      "giorno": 1,
      "scene_consigliate": [1],
      "motivazione": "",
      "ore_stimate": 4
    }
  ]
}`,
};

const cleanAiJson = (value) => {
  const text = String(value || "").trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const firstArray = text.indexOf("[");
  const firstObject = text.indexOf("{");
  const starts = [firstArray, firstObject].filter((index) => index >= 0);
  if (!starts.length) throw new Error("La risposta del modello locale non contiene JSON.");
  const start = Math.min(...starts);
  const endArray = text.lastIndexOf("]");
  const endObject = text.lastIndexOf("}");
  const end = Math.max(endArray, endObject);
  if (end < start) throw new Error("La risposta del modello locale non contiene JSON completo.");
  return JSON.parse(jsonrepair(text.slice(start, end + 1)));
};

const unwrapLocalPayload = (payload, keys) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const candidates = Array.isArray(keys) ? keys : [keys];
  const match = candidates.find((key) => key in payload);
  return match ? payload[match] : payload;
};

const extractLmStudioContent = (data) => (
  data.choices?.[0]?.message?.content || data.choices?.[0]?.text || ""
);

const LOCAL_FORMAT_CHUNK_LIMIT = 2800;
const LOCAL_FORMAT_MIN_RETRY_CHARS = 900;

const splitTextForLocalFormatting = (text, limit = LOCAL_FORMAT_CHUNK_LIMIT) => {
  const normalized = String(text || "").trim();
  if (normalized.length <= limit) return [normalized].filter(Boolean);

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const paragraph of paragraphs) {
    const block = paragraph.trim();
    if (!block) continue;

    if (block.length > limit) {
      pushCurrent();
      for (let index = 0; index < block.length; index += limit) {
        chunks.push(block.slice(index, index + limit).trim());
      }
      continue;
    }

    const next = current ? `${current}\n\n${block}` : block;
    if (next.length > limit) {
      pushCurrent();
      current = block;
    } else {
      current = next;
    }
  }

  pushCurrent();
  return chunks;
};

const splitTextAtNearestBoundary = (text) => {
  const value = String(text || "").trim();
  const midpoint = Math.floor(value.length / 2);
  const boundaryPatterns = [/\n{2,}/g, /\n/g, /[.!?]\s+/g];
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  boundaryPatterns.forEach((pattern) => {
    [...value.matchAll(pattern)].forEach((match) => {
      const index = match.index + match[0].length;
      const distance = Math.abs(index - midpoint);
      if (index > 0 && index < value.length && distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    });
  });

  const splitIndex = bestIndex > 0 ? bestIndex : midpoint;
  return [
    value.slice(0, splitIndex).trim(),
    value.slice(splitIndex).trim(),
  ].filter(Boolean);
};

const normalizeElementsPayload = (data, isLocal) => {
  const payload = isLocal ? unwrapLocalPayload(data, ["elements", "elementi"]) : data?.elements;
  return Array.isArray(payload) ? payload : [];
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

const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const humanizeReportKey = (key) => String(key || "")
  .replace(/_/g, " ")
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/\s+/g, " ")
  .trim()
  .replace(/^./, (char) => char.toUpperCase());

const isPlainReportObject = (value) => (
  value && typeof value === "object" && !Array.isArray(value)
);

const renderReportValue = (value, depth = 0) => {
  if (value === null || value === undefined || value === "" || value === "non_specificato") {
    return "<span class=\"muted\">non specificato</span>";
  }
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (typeof value !== "object") return escapeHtml(value);

  if (Array.isArray(value)) {
    if (!value.length) return "<span class=\"muted\">nessuna voce</span>";
    if (value.every((item) => !isPlainReportObject(item) && !Array.isArray(item))) {
      return `<div class="chips">${value.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
    }
    if (value.every(isPlainReportObject)) {
      const keys = [...new Set(value.flatMap((item) => Object.keys(item)).filter((key) => !isPlainReportObject(value.find((item) => item?.[key])?.[key])))].slice(0, 8);
      if (keys.length && value.length <= 80) {
        return `<table><thead><tr>${keys.map((key) => `<th>${escapeHtml(humanizeReportKey(key))}</th>`).join("")}</tr></thead><tbody>${value.map((item) => (
          `<tr>${keys.map((key) => `<td>${renderReportValue(item[key], depth + 1)}</td>`).join("")}</tr>`
        )).join("")}</tbody></table>`;
      }
    }
    return value.map((item, index) => (
      `<div class="card"><h${Math.min(4, depth + 3)}>Voce ${index + 1}</h${Math.min(4, depth + 3)}>${renderReportValue(item, depth + 1)}</div>`
    )).join("");
  }

  return Object.entries(value).map(([key, item]) => {
    const nested = isPlainReportObject(item) || Array.isArray(item);
    return nested
      ? `<section class="subsection"><h${Math.min(4, depth + 3)}>${escapeHtml(humanizeReportKey(key))}</h${Math.min(4, depth + 3)}>${renderReportValue(item, depth + 1)}</section>`
      : `<div class="row"><strong>${escapeHtml(humanizeReportKey(key))}</strong><span>${renderReportValue(item, depth + 1)}</span></div>`;
  }).join("");
};

const buildReportPrintHtml = (title, data) => `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
<style>
  @page{size:A4;margin:16mm 14mm}
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#151515;background:#fff;font-size:10.5pt;line-height:1.45;margin:0}
  h1{font-size:22pt;margin:0 0 4mm;border-bottom:2px solid #111;padding-bottom:4mm}
  h2{font-size:15pt;margin:8mm 0 3mm;break-after:avoid}
  h3{font-size:12pt;margin:5mm 0 2mm;color:#333;break-after:avoid}
  h4{font-size:10.5pt;margin:4mm 0 2mm;color:#555;break-after:avoid}
  .meta{font-size:8.5pt;color:#666;margin-bottom:8mm}
  section{break-inside:avoid-page}
  .subsection{margin:3mm 0 5mm}
  .card{border:1px solid #d7d7d7;border-radius:5px;padding:4mm;margin:3mm 0;break-inside:avoid}
  .row{display:grid;grid-template-columns:42mm 1fr;gap:4mm;border-bottom:1px solid #eee;padding:2mm 0}
  .row strong{font-size:8.5pt;color:#555}
  .muted{color:#999;font-style:italic}
  .chips{display:flex;gap:2mm;flex-wrap:wrap}
  .chips span{border:1px solid #ddd;border-radius:10px;padding:1mm 2.4mm;background:#f7f7f7}
  table{width:100%;border-collapse:collapse;margin:3mm 0;break-inside:auto}
  th,td{border:1px solid #ddd;padding:2mm;vertical-align:top;text-align:left}
  th{background:#f0f0f0;font-size:8pt;text-transform:uppercase;letter-spacing:.03em}
  td{font-size:8.5pt}
  tr{break-inside:avoid}
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">Esportato da DeepFrame · ${new Date().toLocaleString("it-IT")}</div>
${renderReportValue(data)}
<script>window.addEventListener("load",()=>{window.focus();window.print();});</script>
</body></html>`;

const estimateElementLines = (element) => {
  const content = String(element?.content || "");
  const lineWidth = element?.type === "dialogue" || element?.type === "parenthetical" ? 34 : 58;
  const wrappedLines = content.split(/\n+/).reduce((sum, line) => (
    sum + Math.max(1, Math.ceil(line.trim().length / lineWidth))
  ), 0);

  if (element?.type === "scene_heading") return wrappedLines + 1;
  if (element?.type === "character") return 1;
  if (element?.type === "blank") return 1;
  return wrappedLines;
};

const isRealSceneHeading = (element) => (
  element?.type === "scene_heading"
  && /^(?:\d+[A-Z]?[\s.]*)?(?:INT|EST|INT\/EST|INT\.\/EST|INT-EST|I\/E|EXT)\.?\b/i.test(String(element?.content || "").trim())
);

const SCENE_HEADING_RE = /^(?:\d+[A-Z]?[\s.]*)?(?:INT|EST|INT\/EST|INT\.\/EST|INT-EST|I\/E|EXT)\.?(?:\s+|$)/i;
const TRANSITION_RE = /^(?:FADE IN|FADE OUT|CUT TO|TAGLIO A|DISSOLVENZA(?:\s+A|\s+IN|\s+OUT)?|FONDUTA(?:\s+AL\s+NERO)?|SMASH CUT TO|MATCH CUT TO|JUMP CUT TO|STACCO A)\s*:?\s*$/i;
const CHARACTER_SUFFIX_RE = /\s+\((?:V\.O\.|O\.S\.|O\.C\.|F\.C\.|CONT'D|CONTINUED|FUORI CAMPO|VOCE OFF)\)$/i;
const MAX_LOCAL_ANALYSIS_CHARS = 14000;
const LOCAL_LM_STUDIO_TIMEOUT_MS = 90000;
const LOCAL_ANALYSIS_TIMEOUT_MS = 35000;
const LOCAL_ANALYSIS_TOTAL_BUDGET_MS = 120000;

const stripInlineSceneNumber = (line) => (
  line.replace(/^\s*\d+[A-Z]?[\s.]*((?:INT|EST|INT\/EST|INT\.\/EST|INT-EST|I\/E|EXT)\.?(?:\s+|$).*?)(?:\s+\d+[A-Z]?)?\s*$/i, "$1").trim()
);

const isSceneHeadingLine = (line) => SCENE_HEADING_RE.test(stripInlineSceneNumber(line));
const isTransitionLine = (line) => TRANSITION_RE.test(line.trim());
const isParentheticalLine = (line) => /^\(.+\)$/.test(line.trim());

const isCharacterCueLine = (line, nextLine = "") => {
  const text = line.trim();
  const next = nextLine.trim();
  if (!text || !next || text.length > 42) return false;
  if (isSceneHeadingLine(text) || isTransitionLine(text) || isParentheticalLine(text)) return false;
  if (/[.!?]$/.test(text)) return false;
  const withoutSuffix = text.replace(CHARACTER_SUFFIX_RE, "");
  if (!/^[\p{Lu}0-9][\p{Lu}0-9 .'’_-]*$/u.test(withoutSuffix)) return false;
  if (/\b(?:INT|EST|EXT|GIORNO|NOTTE|SCENA|ATTO)\b/i.test(withoutSuffix) && withoutSuffix.split(/\s+/).length > 2) return false;
  return !isSceneHeadingLine(next) && !isTransitionLine(next);
};

const parseFormattedScreenplayLocally = (text) => {
  const lines = String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\t/g, "    ").replace(/\s+$/g, ""));

  const elements = [];
  let hasSeenScene = false;
  let inDialogue = false;
  let firstContentAdded = false;

  const nextNonBlankLine = (startIndex) => {
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      if (lines[index].trim()) return lines[index];
    }
    return "";
  };

  lines.forEach((line, index) => {
    const content = line.trim();
    const nextLine = nextNonBlankLine(index);

    if (!content) {
      if (elements.length && elements[elements.length - 1].type !== "blank") {
        elements.push({ type: "blank", content: "" });
      }
      inDialogue = false;
      return;
    }

    if (!firstContentAdded && /^tit(?:olo|le)\s*:/i.test(content)) {
      elements.push({ type: "title", content: content.replace(/^tit(?:olo|le)\s*:\s*/i, "").trim() || content });
      firstContentAdded = true;
      inDialogue = false;
      return;
    }

    if (isSceneHeadingLine(content)) {
      elements.push({ type: "scene_heading", content: stripInlineSceneNumber(content) });
      hasSeenScene = true;
      firstContentAdded = true;
      inDialogue = false;
      return;
    }

    if (isTransitionLine(content)) {
      elements.push({ type: "transition", content });
      firstContentAdded = true;
      inDialogue = false;
      return;
    }

    if (!hasSeenScene && !firstContentAdded && content.length <= 90) {
      elements.push({ type: "title", content });
      firstContentAdded = true;
      inDialogue = false;
      return;
    }

    if (isCharacterCueLine(content, nextLine)) {
      elements.push({ type: "character", content });
      firstContentAdded = true;
      inDialogue = true;
      return;
    }

    if (isParentheticalLine(content) && inDialogue) {
      elements.push({ type: "parenthetical", content });
      firstContentAdded = true;
      return;
    }

    elements.push({ type: inDialogue ? "dialogue" : "action", content });
    firstContentAdded = true;
  });

  while (elements[0]?.type === "blank") elements.shift();
  while (elements[elements.length - 1]?.type === "blank") elements.pop();

  return elements;
};

const compactElementsForAnalysis = (elements = []) => (
  elements
    .filter((element) => element?.type !== "blank")
    .map((element) => ({
      type: element.type,
      content: String(element.content || "").trim(),
    }))
    .filter((element) => element.type && element.content)
);

const splitElementsForLocalAnalysis = (elements = [], maxChars = MAX_LOCAL_ANALYSIS_CHARS) => {
  const chunks = [];
  let current = [];
  let currentChars = 0;
  let sceneOffset = 0;
  let currentSceneOffset = 0;

  const flush = () => {
    if (!current.length) return;
    chunks.push({ elements: current, sceneOffset: currentSceneOffset });
    current = [];
    currentChars = 0;
    currentSceneOffset = sceneOffset;
  };

  elements.forEach((element) => {
    const serializedLength = JSON.stringify(element).length + 1;
    const startsScene = isRealSceneHeading(element);
    if (current.length && (currentChars + serializedLength > maxChars) && startsScene) {
      flush();
    } else if (current.length && currentChars + serializedLength > maxChars) {
      flush();
    }

    current.push(element);
    currentChars += serializedLength;
    if (startsScene) sceneOffset += 1;
  });

  flush();
  return chunks;
};

const clampScore = (score) => {
  const number = Number(score);
  if (!Number.isFinite(number)) return 6;
  return Math.min(10, Math.max(1, Math.round(number)));
};

const averageScores = (partials, key) => {
  const scores = partials
    .map((item) => Number(item?.analysis?.valutazione_globale?.[key]))
    .filter(Number.isFinite);
  if (!scores.length) return 6;
  return clampScore(scores.reduce((sum, score) => sum + score, 0) / scores.length);
};

const buildMergedStructure = (totalScenes) => {
  const safeTotal = Math.max(0, totalScenes);
  const rangeForAct = (act) => {
    if (!safeTotal) return { scene_da: 0, scene_a: 0 };
    const start = Math.floor((safeTotal * (act - 1)) / 3) + 1;
    const end = act === 3 ? safeTotal : Math.max(start, Math.floor((safeTotal * act) / 3));
    return { scene_da: start, scene_a: end };
  };

  return {
    totale_scene: safeTotal,
    atti: [1, 2, 3].map((atto) => ({
      atto,
      ...rangeForAct(atto),
      percentuale: atto === 1 ? "33%" : atto === 2 ? "34%" : "33%",
      funzione_narrativa: atto === 1 ? "impostazione" : atto === 2 ? "sviluppo e complicazioni" : "climax e risoluzione",
      valutazione: "efficace",
      note_docente: "Sintesi generata da analisi a blocchi per compatibilita con LM Studio.",
    })),
    momenti_chiave: [
      { tipo: "inciting_incident", scena_numero: safeTotal ? Math.max(1, Math.round(safeTotal * 0.12)) : null, descrizione: "", valutazione: "debole", nota_docente: "Individuare nel dettaglio nella lettura delle scene." },
      { tipo: "primo_punto_di_svolta", scena_numero: safeTotal ? Math.max(1, Math.round(safeTotal * 0.25)) : null, descrizione: "", valutazione: "debole", nota_docente: "Stima posizionale da affinare." },
      { tipo: "midpoint", scena_numero: safeTotal ? Math.max(1, Math.round(safeTotal * 0.5)) : null, descrizione: "", valutazione: "debole", nota_docente: "Stima posizionale da affinare." },
      { tipo: "secondo_punto_di_svolta", scena_numero: safeTotal ? Math.max(1, Math.round(safeTotal * 0.75)) : null, descrizione: "", valutazione: "debole", nota_docente: "Stima posizionale da affinare." },
      { tipo: "climax", scena_numero: safeTotal || null, descrizione: "", valutazione: "debole", nota_docente: "Stima posizionale da affinare." },
    ],
  };
};

const buildFallbackAnalysis = (elements = [], note = "Analisi locale generata senza risposta JSON valida del modello.") => {
  const scenes = [];
  const characterStats = new Map();
  let currentScene = null;
  let currentCharacter = "";

  elements.forEach((element) => {
    if (isRealSceneHeading(element)) {
      currentScene = {
        numero: scenes.length + 1,
        titolo: element.content,
        conflitto: "medio",
        funzione: scenes.length === 0 ? "esposizione" : "sviluppo",
        problemi: [],
        nota: "Voce generata localmente per mantenere attiva la dashboard quando LM Studio restituisce JSON non valido.",
      };
      scenes.push(currentScene);
      currentCharacter = "";
      return;
    }

    if (element?.type === "character") {
      currentCharacter = String(element.content || "").trim().toUpperCase();
      if (!currentCharacter) return;
      const stats = characterStats.get(currentCharacter) || {
        nome: currentCharacter,
        battute: 0,
        arco: "assente",
        analisi_arco: "Da approfondire con una nuova analisi AI o revisione manuale.",
        tipi_conflitto: [],
        presenza_scene: 0,
        nota_docente: "Personaggio rilevato localmente dagli elementi character.",
        scene: new Set(),
      };
      if (currentScene) stats.scene.add(currentScene.numero);
      characterStats.set(currentCharacter, stats);
      return;
    }

    if (element?.type === "dialogue" && currentCharacter) {
      const stats = characterStats.get(currentCharacter);
      if (stats) stats.battute += 1;
    }
  });

  const personaggi = [...characterStats.values()].map(({ scene, ...character }) => ({
    ...character,
    presenza_scene: scene.size || character.presenza_scene,
  }));

  return {
    struttura: buildMergedStructure(scenes.length),
    personaggi,
    analisi_scene: scenes,
    segnalazioni: [
      {
        tipo: "ritmo_irregolare",
        gravita: "bassa",
        scena_numero: null,
        elemento: "LM Studio JSON non valido",
        spiegazione: note,
        suggerimento: "Riduci il testo, usa un modello locale piu istruito sul JSON, oppure riprova l'analisi.",
      },
    ],
    valutazione_globale: {
      punteggio_struttura: 6,
      punteggio_personaggi: 6,
      punteggio_dialoghi: 6,
      punteggio_ritmo: 6,
      punti_di_forza: ["La sceneggiatura e stata importata e segmentata in scene riconoscibili."],
      aree_di_miglioramento: ["Analisi qualitativa da rigenerare con un modello che restituisca JSON valido."],
      commento_docente: note,
    },
  };
};

const buildFallbackCharacterSheets = (elements = [], note = "Schede generate localmente perché LM Studio non ha risposto in tempo utile.") => {
  const characterMap = new Map();
  let sceneNumber = 0;
  let currentCharacter = "";

  elements.forEach((element) => {
    if (isRealSceneHeading(element)) {
      sceneNumber += 1;
      currentCharacter = "";
      return;
    }

    if (element?.type === "character") {
      currentCharacter = String(element.content || "").trim().toUpperCase();
      if (!currentCharacter) return;
      const stats = characterMap.get(currentCharacter) || {
        nome: currentCharacter,
        scene: new Set(),
        battute: [],
      };
      if (sceneNumber) stats.scene.add(sceneNumber);
      characterMap.set(currentCharacter, stats);
      return;
    }

    if (element?.type === "dialogue" && currentCharacter) {
      const stats = characterMap.get(currentCharacter);
      if (stats) stats.battute.push(String(element.content || "").trim());
    }
  });

  const totalDialogues = [...characterMap.values()].reduce((sum, item) => sum + item.battute.length, 0) || 1;
  const personaggi = [...characterMap.values()]
    .sort((a, b) => b.battute.length - a.battute.length)
    .map((item, index) => {
      const sceneNumbers = [...item.scene].sort((a, b) => a - b);
      const role = index === 0 ? "protagonista" : index === 1 ? "deuteragonista" : "personaggio_secondario";
      const quote = item.battute.find((line) => line.length > 12) || item.battute[0] || "non_specificato";
      return {
        nome: item.nome,
        ruolo: role,
        genere_presunto: "non_specificato",
        presenza: {
          scene_totali: sceneNumbers.length,
          prima_scena: sceneNumbers[0] || null,
          ultima_scena: sceneNumbers[sceneNumbers.length - 1] || null,
          scene_numeri: sceneNumbers,
          battute_totali: item.battute.length,
          percentuale_dialogo: `${Math.round((item.battute.length / totalDialogues) * 100)}%`,
        },
        profilo_narrativo: {
          descrizione_in_una_riga: `${item.nome} compare in ${sceneNumbers.length || 0} scene e ha ${item.battute.length} battute rilevate.`,
          motivazione_principale: "non_specificato",
          bisogno_profondo: "non_specificato",
          paura_principale: "non_specificato",
          difetto_principale: "non_specificato",
          pregio_principale: "non_specificato",
          arco_narrativo: "Da approfondire con analisi AI o revisione manuale.",
          citazione_rappresentativa: quote,
        },
        relazioni: [],
        conflitti: {
          interno: "non_specificato",
          interpersonale: "non_specificato",
          sociale_o_ambientale: "non_specificato",
        },
        scheda_produzione: {
          caratteristiche_fisiche_deducibili: "non_specificato",
          costumi_accessori: "non_specificato",
          note_casting: "Da definire in casting.",
          complessità_interpretativa: item.battute.length > 20 ? "alta" : item.battute.length > 6 ? "media" : "bassa",
          presenza_scena_difficile: false,
          note_regia: "Scheda locale generata dai cue personaggio e dai dialoghi riconosciuti.",
        },
        scheda_didattica: {
          funzione_drammaturgica: "Da verificare nella lettura complessiva della sceneggiatura.",
          archetipo: "non_specificato",
          domande_per_l_autore: [
            `Quale desiderio guida ${item.nome}?`,
            `Come cambia ${item.nome} tra prima e ultima apparizione?`,
          ],
          nota_docente: note,
        },
      };
    });

  return {
    personaggi,
    mappa_relazioni: [],
    note_ensemble: note,
  };
};

const normalizeMergedAnalysisSignals = (signals = []) => {
  const normalized = [];
  let fallbackCount = 0;
  let fallbackReason = "";
  const seen = new Set();

  signals.forEach((signal) => {
    const isFallbackSignal = String(signal?.elemento || "").includes("LM Studio")
      || String(signal?.spiegazione || "").includes("LM Studio");

    if (isFallbackSignal) {
      fallbackCount += 1;
      if (!fallbackReason && signal?.spiegazione) fallbackReason = signal.spiegazione;
      return;
    }

    const key = [
      signal?.tipo || "",
      signal?.gravita || "",
      signal?.scena_numero || "",
      signal?.elemento || "",
      signal?.spiegazione || "",
    ].join("|");
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(signal);
  });

  if (fallbackCount > 0) {
    normalized.unshift({
      tipo: "limite_modello_locale",
      gravita: "bassa",
      scena_numero: null,
      elemento: "LM Studio fallback",
      spiegazione: fallbackCount === 1
        ? fallbackReason || "Una parte dell'analisi è stata generata localmente perché LM Studio non ha restituito JSON valido."
        : `${fallbackCount} blocchi dell'analisi sono stati gestiti con fallback locale perché LM Studio non ha restituito JSON valido o ha superato il timeout.`,
      suggerimento: "Per un'analisi più precisa prova un modello locale più stabile sul JSON, riduci il testo, oppure usa Anthropic.",
    });
  }

  return normalized.slice(0, 60);
};

const mergeLocalAnalysisChunks = (partials, sourceElements = []) => {
  const sceneHeadings = sourceElements.filter(isRealSceneHeading).map((element) => element.content);
  const mergedScenes = [];
  const mergedSignals = [];
  const characterMap = new Map();

  partials.forEach(({ analysis, sceneOffset }) => {
    const scenes = Array.isArray(analysis?.analisi_scene) ? analysis.analisi_scene : [];
    scenes.forEach((scene, index) => {
      const localNumber = Number(scene?.numero) || index + 1;
      const globalNumber = sceneOffset + localNumber;
      mergedScenes.push({
        ...scene,
        numero: globalNumber,
        titolo: scene?.titolo || sceneHeadings[globalNumber - 1] || `Scena ${globalNumber}`,
      });
    });

    const signals = Array.isArray(analysis?.segnalazioni) ? analysis.segnalazioni : [];
    signals.forEach((signal) => {
      const localSceneNumber = Number(signal?.scena_numero);
      mergedSignals.push({
        ...signal,
        scena_numero: Number.isFinite(localSceneNumber) ? sceneOffset + localSceneNumber : signal?.scena_numero ?? null,
      });
    });

    const characters = Array.isArray(analysis?.personaggi) ? analysis.personaggi : [];
    characters.forEach((character) => {
      const name = String(character?.nome || "").trim().toUpperCase();
      if (!name) return;
      const existing = characterMap.get(name) || {
        nome: name,
        battute: 0,
        arco: "assente",
        analisi_arco: "",
        tipi_conflitto: [],
        presenza_scene: 0,
        nota_docente: "",
      };
      existing.battute += Number(character?.battute) || 0;
      existing.presenza_scene += Number(character?.presenza_scene) || 0;
      if (existing.arco === "assente" && character?.arco) existing.arco = character.arco;
      if (!existing.analisi_arco && character?.analisi_arco) existing.analisi_arco = character.analisi_arco;
      existing.tipi_conflitto = [...new Set([
        ...existing.tipi_conflitto,
        ...(Array.isArray(character?.tipi_conflitto) ? character.tipi_conflitto : []),
      ])];
      if (!existing.nota_docente && character?.nota_docente) existing.nota_docente = character.nota_docente;
      characterMap.set(name, existing);
    });
  });

  return {
    struttura: buildMergedStructure(sceneHeadings.length),
    personaggi: [...characterMap.values()],
    analisi_scene: mergedScenes
      .sort((a, b) => Number(a.numero) - Number(b.numero))
      .map((scene, index) => ({
        ...scene,
        numero: index + 1,
        titolo: scene.titolo || sceneHeadings[index] || `Scena ${index + 1}`,
      })),
    segnalazioni: normalizeMergedAnalysisSignals(mergedSignals),
    valutazione_globale: {
      punteggio_struttura: averageScores(partials, "punteggio_struttura"),
      punteggio_personaggi: averageScores(partials, "punteggio_personaggi"),
      punteggio_dialoghi: averageScores(partials, "punteggio_dialoghi"),
      punteggio_ritmo: averageScores(partials, "punteggio_ritmo"),
      punti_di_forza: [...new Set(partials.flatMap((item) => (
        Array.isArray(item?.analysis?.valutazione_globale?.punti_di_forza) ? item.analysis.valutazione_globale.punti_di_forza : []
      )))].slice(0, 8),
      aree_di_miglioramento: [...new Set(partials.flatMap((item) => (
        Array.isArray(item?.analysis?.valutazione_globale?.aree_di_miglioramento) ? item.analysis.valutazione_globale.aree_di_miglioramento : []
      )))].slice(0, 8),
      commento_docente: "Analisi ricomposta da piu blocchi per evitare il limite di contesto del modello locale LM Studio.",
    },
  };
};

const parseSceneHeadingMeta = (heading) => {
  const text = String(heading || "").trim().toUpperCase();
  const internoEsterno = text.startsWith("INT./EST") || text.startsWith("INT/EST") ? "INT/EST"
    : text.startsWith("EST") || text.startsWith("EXT") ? "EST"
      : "INT";
  const momento = ["GIORNO", "NOTTE", "ALBA", "TRAMONTO"].find((part) => text.includes(part)) || "NON_SPECIFICATO";
  const location = text
    .replace(/^(?:\d+\s+)?(?:INT\.\/EST\.?|INT\/EST\.?|INT\.?|EST\.?|EXT\.?|I\/E)\s*/i, "")
    .split(/\s+-\s+/)[0]
    .trim() || heading;
  return { internoEsterno, momento, location };
};

const buildFallbackBreakdown = (elements = []) => {
  const scenes = [];
  let current = null;

  elements.forEach((element) => {
    if (isRealSceneHeading(element)) {
      const meta = parseSceneHeadingMeta(element.content);
      current = {
        numero: scenes.length + 1,
        titolo: element.content,
        interno_esterno: meta.internoEsterno,
        momento: meta.momento,
        cast: [],
        comparse_stimate: 0,
        props_principali: [],
        location_descrizione: meta.location,
        complessità: "media",
        elementi_speciali: [],
        note_regia: "Breakdown base generato automaticamente dai dati formattati.",
      };
      scenes.push(current);
      return;
    }

    if (!current) return;
    if (element.type === "character") {
      const name = String(element.content || "").trim().replace(/[()]/g, "").toUpperCase();
      if (name && !current.cast.includes(name)) current.cast.push(name);
    }
  });

  const cast = uniq(scenes.flatMap((scene) => scene.cast)).map((nome) => ({
    nome,
    ruolo_tipo: "non_specificato",
    scene: scenes.filter((scene) => scene.cast.includes(nome)).map((scene) => scene.numero),
    giorni_lavoro_stimati: 1,
    continuità_costume: "non_specificato",
    note_casting: "Da dettagliare manualmente o rigenerare con un modello più stabile.",
  }));

  const locations = uniq(scenes.map((scene) => scene.location_descrizione)).map((nome) => {
    const locationScenes = scenes.filter((scene) => scene.location_descrizione === nome);
    return {
      nome,
      tipo: locationScenes[0]?.interno_esterno || "non_specificato",
      scene: locationScenes.map((scene) => scene.numero),
      allestimento: "medio",
      note_ricerca: "Da verificare con location scouting.",
      problemi_potenziali: "non_specificato",
    };
  });

  const workDays = [];
  for (let index = 0; index < scenes.length; index += 4) {
    workDays.push({
      giorno: workDays.length + 1,
      scene_consigliate: scenes.slice(index, index + 4).map((scene) => scene.numero),
      motivazione: "Raggruppamento automatico di base. Puoi cambiare l'ordine delle giornate dalla vista Piano di lavoro.",
      ore_stimate: Math.min(8, Math.max(4, scenes.slice(index, index + 4).length * 2)),
    });
  }

  return {
    riepilogo: {
      totale_scene: scenes.length,
      personaggi_parlanti: cast.length,
      location_uniche: locations.length,
      scene_interne: scenes.filter((scene) => scene.interno_esterno === "INT").length,
      scene_esterne: scenes.filter((scene) => scene.interno_esterno === "EST").length,
      scene_giorno: scenes.filter((scene) => scene.momento === "GIORNO").length,
      scene_notte: scenes.filter((scene) => scene.momento === "NOTTE").length,
      giorni_ripresa_stimati: workDays.length || 1,
      complessità_produttiva: "media",
      note_produzione: "Breakdown base generato automaticamente perché LM Studio ha prodotto JSON non valido.",
    },
    per_scena: scenes,
    reparti: {
      cast,
      locations,
      props: [],
      costumi: cast.map((item) => ({
        personaggio: item.nome,
        periodo_stile: "non_specificato",
        cambi_costume: 1,
        scene: item.scene,
        capi_identificati: [],
        note_continuità: "non_specificato",
      })),
      comparse: [],
      effetti_speciali: [],
      audio_musica: [],
      veicoli: [],
    },
    piano_lavoro_suggerito: workDays,
  };
};

const formatPageEighths = (eighths) => {
  const pages = Math.floor(eighths / 8);
  const remainder = eighths % 8;
  if (pages === 0) return `${remainder}/8 pag.`;
  if (remainder === 0) return pages === 1 ? "1 pag." : `${pages} pag.`;
  return `${pages} ${remainder}/8 pag.`;
};

function getScenePageEighths(elements) {
  const sceneData = new Map();
  let currentScene = null;
  let sceneNumber = 0;

  const closeScene = () => {
    if (!currentScene) return;
    const eighths = Math.max(1, Math.ceil((currentScene.lines / 55) * 8));
    sceneData.set(currentScene.headingIndex, {
      sceneNumber: currentScene.sceneNumber,
      eighths,
      label: `${formatPageEighths(eighths)}`,
    });
  };

  elements.forEach((element, index) => {
    if (isRealSceneHeading(element)) {
      closeScene();
      sceneNumber += 1;
      currentScene = {
        headingIndex: index,
        sceneNumber,
        lines: estimateElementLines(element),
      };
      return;
    }

    if (currentScene) {
      currentScene.lines += estimateElementLines(element);
    }
  });

  closeScene();
  return sceneData;
}

const hashText = (value) => {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
};

const getSceneExcerpt = (scene) => (
  scene.actions.join(" ").replace(/\s+/g, " ").trim().slice(0, 420)
);

const extractDirectorScenes = (elements = []) => {
  const scenes = [];
  let current = null;
  let currentCharacter = "";

  const closeScene = () => {
    if (!current) return;
    const signatureSource = [
      current.heading,
      current.actions.join(" "),
      current.characters.join(","),
      current.dialogue.join(" "),
    ].join("|");
    scenes.push({
      ...current,
      excerpt: getSceneExcerpt(current),
      signature: hashText(signatureSource),
    });
  };

  elements.forEach((element) => {
    if (isRealSceneHeading(element)) {
      closeScene();
      const meta = parseSceneHeadingMeta(element.content);
      current = {
        number: scenes.length + 1,
        heading: element.content,
        meta,
        actions: [],
        characters: [],
        dialogue: [],
      };
      currentCharacter = "";
      return;
    }

    if (!current) return;
    if (element.type === "action") current.actions.push(element.content);
    if (element.type === "character") {
      currentCharacter = String(element.content || "").trim().toUpperCase();
      if (currentCharacter && !current.characters.includes(currentCharacter)) current.characters.push(currentCharacter);
    }
    if (element.type === "dialogue" && currentCharacter) {
      current.dialogue.push(`${currentCharacter}: ${element.content}`);
    }
  });

  closeScene();
  return scenes;
};

const buildDirectorPrompt = (scene, config) => {
  const style = DIRECTOR_STYLES[config.style] || DIRECTOR_STYLES.cinematic;
  const cast = scene.characters.length ? `characters: ${scene.characters.join(", ")}` : "no clearly identified speaking characters";
  const camera = config.camera === "wide" ? "wide establishing shot"
    : config.camera === "medium" ? "medium shot"
      : config.camera === "close" ? "close-up with emotional detail"
        : "dynamic director's view";
  const period = config.period.trim() ? `period and production design: ${config.period.trim()}` : "contemporary production design unless the screenplay implies otherwise";
  return [
    `${camera}, ${scene.meta.internoEsterno} ${scene.meta.location}, ${scene.meta.momento.toLowerCase()}`,
    cast,
    `scene action: ${scene.excerpt || scene.heading}`,
    period,
    style.suffix,
  ].join(", ");
};

const buildDirectorShot = (scene, config, previousShot) => {
  const prompt = buildDirectorPrompt(scene, config);
  const negativePrompt = DIRECTOR_STYLES[config.style]?.negative || DIRECTOR_STYLES.cinematic.negative;
  return {
    sceneNumber: scene.number,
    heading: scene.heading,
    location: scene.meta.location,
    environment: scene.meta.internoEsterno,
    moment: scene.meta.momento,
    cast: scene.characters,
    excerpt: scene.excerpt,
    signature: scene.signature,
    prompt,
    negativePrompt,
    status: previousShot?.signature === scene.signature && previousShot?.prompt === prompt ? previousShot.status : "ready",
    frameSeed: previousShot?.signature === scene.signature ? previousShot.frameSeed : hashText(`${scene.signature}-${prompt}`),
    generatedAt: previousShot?.signature === scene.signature ? previousShot.generatedAt : null,
  };
};

const buildDirectorSidecar = ({ shots, config, comfyUrl }) => ({
  deepframe_module: "director_storyboard",
  version: 1,
  generated_at: new Date().toISOString(),
  comfyui: {
    endpoint: comfyUrl,
    workflow_hint: "Inject prompt and negativePrompt into a text-to-image workflow, then map each result back by sceneNumber.",
  },
  config,
  shots: shots.map((shot) => ({
    sceneNumber: shot.sceneNumber,
    heading: shot.heading,
    location: shot.location,
    environment: shot.environment,
    moment: shot.moment,
    cast: shot.cast,
    prompt: shot.prompt,
    negativePrompt: shot.negativePrompt,
    signature: shot.signature,
    status: shot.status,
  })),
});

function DirectorFrame({ shot }) {
  const hue = parseInt(shot.frameSeed.slice(0, 2), 36) % 360;
  const accent = `hsl(${hue}, 55%, 48%)`;
  const warm = shot.status === "generated" ? "rgba(200,169,110,.22)" : "rgba(255,255,255,.06)";
  return (
    <div style={{
      aspectRatio: "16/9",
      background: `
        linear-gradient(135deg, rgba(4,5,8,.96), rgba(22,18,14,.94)),
        radial-gradient(circle at 28% 34%, ${warm}, transparent 36%),
        radial-gradient(circle at 76% 62%, ${accent}66, transparent 34%)
      `,
      borderBottom: "1px solid rgba(255,255,255,.06)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: "11% 9%", border: "1px solid rgba(255,255,255,.12)", borderRadius: "4px" }} />
      <div style={{ position: "absolute", left: "12%", right: "12%", bottom: "16%", height: "28%", background: "linear-gradient(180deg, transparent, rgba(0,0,0,.45))", borderRadius: "50%" }} />
      <div style={{ position: "absolute", left: "16%", bottom: "20%", width: "16%", height: "38%", borderRadius: "48% 48% 10% 10%", background: "rgba(232,201,142,.18)", boxShadow: `0 0 34px ${accent}44` }} />
      {shot.cast.length > 1 && (
        <div style={{ position: "absolute", right: "18%", bottom: "20%", width: "14%", height: "32%", borderRadius: "48% 48% 10% 10%", background: "rgba(79,195,247,.14)" }} />
      )}
      <div style={{ position: "absolute", left: 12, top: 10, fontSize: "10px", color: "#c8a96e", fontFamily: "monospace", letterSpacing: "1px" }}>SC.{shot.sceneNumber}</div>
      <div style={{ position: "absolute", right: 12, top: 10, fontSize: "10px", color: shot.status === "generated" ? "#64C878" : "#777", fontFamily: "monospace", letterSpacing: "1px" }}>
        {shot.status === "generated" ? "FRAME" : "PROMPT"}
      </div>
    </div>
  );
}

function DeepFrameDirectorPanel({ elements }) {
  const scenes = useMemo(() => extractDirectorScenes(elements), [elements]);
  const [config, setConfig] = useState({
    style: "cinematic",
    camera: "wide",
    model: "cinematicVision_v1.safetensors",
    steps: 28,
    period: "",
  });
  const [comfyUrl, setComfyUrl] = useState("http://127.0.0.1:8188");
  const [shotStates, setShotStates] = useState({});
  const [selectedSceneState, setSelectedScene] = useState(null);
  const shots = useMemo(() => scenes.map((scene) => (
    buildDirectorShot(scene, config, shotStates[scene.number])
  )), [scenes, config, shotStates]);
  const selectedScene = selectedSceneState || scenes[0]?.number || null;
  const selectedShot = shots.find((shot) => shot.sceneNumber === selectedScene) || shots[0];
  const generatedCount = shots.filter((shot) => shot.status === "generated").length;
  const changedCount = shots.filter((shot) => shot.status !== "generated").length;

  const updateConfig = (key, value) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const markSceneGenerated = (sceneNumber) => {
    const shot = shots.find((item) => item.sceneNumber === sceneNumber);
    if (!shot) return;
    setShotStates((current) => ({
      ...current,
      [sceneNumber]: { ...shot, status: "generated", generatedAt: new Date().toISOString() },
    }));
  };

  const generateChanged = () => {
    const generatedAt = new Date().toISOString();
    setShotStates((current) => ({
      ...current,
      ...Object.fromEntries(shots.map((shot) => [
        shot.sceneNumber,
        shot.status === "generated" ? shot : { ...shot, status: "generated", generatedAt },
      ])),
    }));
  };

  const resetScene = (sceneNumber) => {
    setShotStates((current) => {
      const next = { ...current };
      delete next[sceneNumber];
      return next;
    });
  };

  const exportSidecar = () => {
    const sidecar = buildDirectorSidecar({ shots, config, comfyUrl });
    const blob = new Blob([JSON.stringify(sidecar, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "deepframe-director-sidecar.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!scenes.length) {
    return (
      <div style={{ flex: 1, display: "grid", placeItems: "center", color: "#666", fontFamily: "sans-serif" }}>
        Nessuna scena rilevata. Aggiungi intestazioni INT./EST. e riapri Director.
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(260px, 320px) 1fr", minHeight: 0 }}>
      <aside style={{ borderRight: "1px solid rgba(255,255,255,.06)", padding: "18px", overflowY: "auto", background: "rgba(255,255,255,.015)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
          <div>
            <div style={{ color: "#f0ead8", fontFamily: "sans-serif", fontWeight: "bold", fontSize: "14px" }}>DeepFrame Director</div>
            <div style={{ color: "#777", fontFamily: "sans-serif", fontSize: "11px", marginTop: "3px" }}>{generatedCount}/{shots.length} frame pronti · {changedCount} da aggiornare</div>
          </div>
          <button onClick={generateChanged} style={{ border: "1px solid rgba(200,169,110,.35)", background: "rgba(200,169,110,.12)", color: "#c8a96e", borderRadius: "6px", padding: "7px 9px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
            Batch
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "10px", color: "#777", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>
            Server ComfyUI
            <input value={comfyUrl} onChange={(event) => setComfyUrl(event.target.value)} style={{ background: "#11131a", border: "1px solid rgba(255,255,255,.1)", borderRadius: "6px", color: "#bbb", padding: "8px 9px", fontSize: "12px", fontFamily: "monospace", textTransform: "none", letterSpacing: 0 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "10px", color: "#777", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>
            Stile
            <select value={config.style} onChange={(event) => updateConfig("style", event.target.value)} style={{ background: "#11131a", border: "1px solid rgba(255,255,255,.1)", borderRadius: "6px", color: "#ddd", padding: "8px 9px", fontSize: "12px", fontFamily: "sans-serif" }}>
              {Object.entries(DIRECTOR_STYLES).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "10px", color: "#777", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>
            Camera
            <select value={config.camera} onChange={(event) => updateConfig("camera", event.target.value)} style={{ background: "#11131a", border: "1px solid rgba(255,255,255,.1)", borderRadius: "6px", color: "#ddd", padding: "8px 9px", fontSize: "12px", fontFamily: "sans-serif" }}>
              <option value="wide">Campo largo</option>
              <option value="medium">Piano medio</option>
              <option value="close">Primo piano</option>
              <option value="dynamic">Dinamica</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "10px", color: "#777", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>
            Periodo / look
            <input value={config.period} onChange={(event) => updateConfig("period", event.target.value)} placeholder="es. Roma anni '60, thriller urbano..." style={{ background: "#11131a", border: "1px solid rgba(255,255,255,.1)", borderRadius: "6px", color: "#bbb", padding: "8px 9px", fontSize: "12px", fontFamily: "sans-serif", textTransform: "none", letterSpacing: 0 }} />
          </label>
          <button onClick={exportSidecar} style={{ border: "1px solid rgba(79,195,247,.28)", background: "rgba(79,195,247,.08)", color: "#4FC3F7", borderRadius: "6px", padding: "8px 10px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
            Esporta sidecar JSON
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {shots.map((shot) => (
            <button key={shot.sceneNumber} onClick={() => setSelectedScene(shot.sceneNumber)} style={{
              textAlign: "left",
              border: `1px solid ${selectedShot?.sceneNumber === shot.sceneNumber ? "rgba(200,169,110,.35)" : "rgba(255,255,255,.06)"}`,
              background: selectedShot?.sceneNumber === shot.sceneNumber ? "rgba(200,169,110,.09)" : "rgba(255,255,255,.025)",
              borderRadius: "7px",
              padding: "9px 10px",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", gap: "7px", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", color: "#c8a96e", fontFamily: "monospace" }}>SC.{shot.sceneNumber}</span>
                <span style={{ fontSize: "10px", color: shot.status === "generated" ? "#64C878" : "#777", fontFamily: "sans-serif", marginLeft: "auto" }}>{shot.status === "generated" ? "GENERATA" : "DA FARE"}</span>
              </div>
              <div style={{ color: "#bbb", fontSize: "11px", fontFamily: "sans-serif", lineHeight: "1.35", overflowWrap: "anywhere" }}>{shot.heading}</div>
            </button>
          ))}
        </div>
      </aside>

      <main style={{ overflowY: "auto", padding: "20px 24px" }}>
        {selectedShot && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 520px) minmax(260px, 1fr)", gap: "18px", alignItems: "start" }}>
            <section style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", overflow: "hidden" }}>
              <DirectorFrame shot={selectedShot} />
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <Badge label={selectedShot.environment} color="#4FC3F7" small />
                  <Badge label={selectedShot.moment} color={selectedShot.moment === "NOTTE" ? "#CE93D8" : "#FFD54F"} small />
                  <Badge label={DIRECTOR_STYLES[config.style]?.label} color="#c8a96e" small />
                </div>
                <div style={{ color: "#f0ead8", fontFamily: "sans-serif", fontWeight: "bold", fontSize: "15px", lineHeight: "1.4" }}>{selectedShot.heading}</div>
                {selectedShot.excerpt && <div style={{ color: "#999", fontFamily: "Georgia, serif", fontSize: "13px", lineHeight: "1.65" }}>{selectedShot.excerpt}</div>}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => markSceneGenerated(selectedShot.sceneNumber)} style={{ border: "1px solid rgba(100,200,120,.32)", background: "rgba(100,200,120,.09)", color: "#64C878", borderRadius: "6px", padding: "8px 10px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                    Segna generata
                  </button>
                  <button onClick={() => resetScene(selectedShot.sceneNumber)} style={{ border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#aaa", borderRadius: "6px", padding: "8px 10px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                    Invalida scena
                  </button>
                </div>
              </div>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "rgba(200,169,110,.055)", border: "1px solid rgba(200,169,110,.18)", borderRadius: "8px", padding: "14px 16px" }}>
                <div style={{ color: "#c8a96e", fontFamily: "sans-serif", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold", marginBottom: "8px" }}>Prompt ComfyUI</div>
                <div style={{ color: "#ddd", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.65", overflowWrap: "anywhere" }}>{selectedShot.prompt}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", padding: "14px 16px" }}>
                <div style={{ color: "#888", fontFamily: "sans-serif", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold", marginBottom: "8px" }}>Negative prompt</div>
                <div style={{ color: "#aaa", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.65", overflowWrap: "anywhere" }}>{selectedShot.negativePrompt}</div>
              </div>
              {selectedShot.cast.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {selectedShot.cast.map((name) => <Badge key={name} label={name} color="#FFD54F" small />)}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function buildScreenplayHtml(elements, { scenePageBreaks = false } = {}) {
  const scenePageEighths = getScenePageEighths(elements);

  return elements.map((el, index) => {
    const content = escapeHtml(el.content);
    if (el.type === "blank") return `<div class="blank"></div>`;
    if (el.type === "title") return `<div class="title">${content}</div>`;
    if (el.type === "transition") return `<div class="transition">${content}</div>`;
    if (el.type === "scene_heading") {
      const sceneInfo = scenePageEighths.get(index);
      if (!sceneInfo) return `<div class="action">${content}</div>`;
      const badge = sceneInfo ? `<span class="scene-eighth">Scena ${sceneInfo.sceneNumber} · ${sceneInfo.label}</span>` : "";
      const pageBreakClass = scenePageBreaks && sceneInfo?.sceneNumber > 1 ? " page-break-before" : "";
      return `<div class="scene-heading${pageBreakClass}"><span>${content}</span>${badge}</div>`;
    }
    if (el.type === "action") return `<div class="action">${content}</div>`;
    if (el.type === "character") return `<div class="character">${content}</div>`;
    if (el.type === "parenthetical") return `<div class="parenthetical">${content}</div>`;
    if (el.type === "dialogue") return `<div class="dialogue">${content}</div>`;
    return `<div>${content}</div>`;
  }).join("\n");
}

// ─── Preview cinematografica ──────────────────────────────────────────────────
function ScreenplayPreview({ elements }) {
  const scenePageEighths = getScenePageEighths(elements);

  return (
    <div style={{ fontFamily: "'Courier Prime','Courier New',Courier,monospace", fontSize: "13px", lineHeight: "1.7", background: "#fff", color: "#111", padding: "60px 80px", maxWidth: "680px", margin: "0 auto", minHeight: "400px" }}>
      {elements.map((el, i) => {
        if (el.type === "blank") return <div key={i} style={{ height: "1em" }} />;
        if (el.type === "title") return <div key={i} style={{ textAlign: "center", fontWeight: "bold", fontSize: "15px", marginBottom: "32px" }}>{el.content}</div>;
        if (el.type === "transition") return <div key={i} style={{ textAlign: "right", textTransform: "uppercase", marginTop: "12px", marginBottom: "4px" }}>{el.content}</div>;
        if (el.type === "scene_heading") {
          const sceneInfo = scenePageEighths.get(i);
          if (!sceneInfo) {
            return <div key={i} style={{ marginTop: "8px", marginBottom: "8px" }}>{el.content}</div>;
          }
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px", fontWeight: "bold", textTransform: "uppercase", marginTop: "20px", marginBottom: "4px", textDecoration: "underline" }}>
              <span>{el.content}</span>
              {sceneInfo && <span style={{ fontFamily: "Arial,sans-serif", fontSize: "10px", color: "#666", textDecoration: "none", whiteSpace: "nowrap", textTransform: "none" }}>Scena {sceneInfo.sceneNumber} · {sceneInfo.label}</span>}
            </div>
          );
        }
        if (el.type === "action") return <div key={i} style={{ marginTop: "8px", marginBottom: "8px" }}>{el.content}</div>;
        if (el.type === "character") return <div key={i} style={{ marginLeft: "200px", marginTop: "14px", textTransform: "uppercase", fontWeight: "bold" }}>{el.content}</div>;
        if (el.type === "parenthetical") return <div key={i} style={{ marginLeft: "140px", marginRight: "160px", fontStyle: "italic" }}>{el.content}</div>;
        if (el.type === "dialogue") return <div key={i} style={{ marginLeft: "100px", marginRight: "100px", marginBottom: "4px" }}>{el.content}</div>;
        return <div key={i}>{el.content}</div>;
      })}
    </div>
  );
}

function LuminaStudioPanel() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#09090b" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.35)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "sans-serif", color: "#f0ead8", fontWeight: "bold", fontSize: "13px" }}>Lumina Studio</div>
          <div style={{ fontFamily: "sans-serif", color: "#777", fontSize: "11px", marginTop: "2px" }}>Simulazione luci 3D per setup di scena</div>
        </div>
        <button
          type="button"
          onClick={() => window.open(LUMINA_STUDIO_URL, "_blank", "noopener,noreferrer")}
          style={{ background: "rgba(255,255,255,.06)", color: "#ccc", border: "1px solid rgba(255,255,255,.12)", borderRadius: "7px", padding: "8px 12px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", fontFamily: "sans-serif" }}
        >
          Apri esterno
        </button>
      </div>
      <iframe
        title="Lumina Studio"
        src={LUMINA_STUDIO_URL}
        allow="fullscreen; clipboard-read; clipboard-write"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ flex: 1, width: "100%", border: "0", background: "#09090b" }}
      />
    </div>
  );
}

function OnboardingLanding({ onStart }) {
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const featureRows = [
    ["Crea la tua storia", "Generatore narrativo integrato: crea una storia per atti, esportala in PDF/TXT o mandala alla formattazione creativa."],
    ["Formattazione creativa", "Trasforma bozze, PDF narrativi e storie generate in sceneggiature piu ricche, con parsing scene corretto e ottavi pagina."],
    ["AI flessibile", "Lavora con Anthropic Claude Sonnet o con LM Studio locale usando la stessa configurazione del parsing."],
    ["Breakdown reparti", "Cast, location, props, costumi, comparse, effetti, audio, veicoli e riepilogo sempre ricostruito dai dati disponibili."],
    ["Piano di lavoro", "Accorpa scene per location, INT/EST, cast o complessita; sposta manualmente scene e riordina le giornate."],
    ["Calendario riprese", "Definisci data inizio/fine, orari di lavoro e date specifiche per ogni giornata di produzione."],
    ["Export professionali", "Esporta sceneggiatura, schede personaggio, schede location e breakdown reparti in PDF stampabile."],
    ["Luci 3D", "Accedi a Lumina Studio direttamente dentro DeepFrame per simulare setup luce e ragionare visivamente sulle scene."],
  ];

  const sideItems = [
    "Crea la tua storia",
    "Parsing conservativo",
    "Formattazione creativa",
    "Schede personaggio",
    "Schede location",
    "Breakdown reparti",
    "Piano di lavoro",
    "Export PDF",
  ];

  const s = {
    page: { minHeight: "100vh", margin: 0, background: "#0b0b0b", color: "#f2f2f2", fontFamily: "Arial, Helvetica, sans-serif", overflowX: "hidden" },
    hero: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: isNarrow ? "56px 18px 44px" : "72px 40px 80px", boxSizing: "border-box", background: "linear-gradient(180deg,#0b0b0b,#151515)" },
    logo: { width: "min(86vw, 980px)", maxHeight: isNarrow ? "210px" : "350px", objectFit: "contain", display: "block", margin: "0 auto" },
    subtitle: { marginTop: isNarrow ? "10px" : "22px", maxWidth: "850px", fontSize: isNarrow ? "18px" : "22px", lineHeight: 1.6, color: "#b0b0b0" },
    ctaRow: { marginTop: isNarrow ? "28px" : "40px", display: "flex", gap: "14px", justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
    cta: { textDecoration: "none", color: "#fff", background: "#58a6ff", padding: isNarrow ? "14px 18px" : "16px 28px", borderRadius: "10px", border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "48px", fontWeight: 800, cursor: "pointer", fontSize: "15px" },
    ghostCta: { textDecoration: "none", color: "#f2f2f2", background: "rgba(255,255,255,.08)", border: "1px solid #2a2a2a", padding: isNarrow ? "13px 18px" : "15px 28px", borderRadius: "10px", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "48px", fontWeight: 800, cursor: "pointer", fontSize: "15px" },
    mock: { marginTop: isNarrow ? "44px" : "60px", width: "100%", maxWidth: "1200px", background: "#161616", borderRadius: isNarrow ? "16px" : "22px", border: "1px solid #2a2a2a", overflow: "hidden", boxShadow: "0 0 60px rgba(0,0,0,0.6)", textAlign: "left" },
    mockTop: { height: isNarrow ? "44px" : "52px", background: "#1f1f1f", display: "flex", alignItems: "center", padding: "0 20px", borderBottom: "1px solid #2c2c2c" },
    dot: { width: isNarrow ? "10px" : "12px", height: isNarrow ? "10px" : "12px", borderRadius: "50%", marginRight: "8px" },
    mockBody: { display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "280px 1fr", minHeight: isNarrow ? "auto" : "620px" },
    sidebar: { background: "#131313", borderRight: isNarrow ? "none" : "1px solid #262626", borderBottom: isNarrow ? "1px solid #262626" : "none", padding: isNarrow ? "18px" : "24px" },
    sideTitle: { color: "#58a6ff", margin: "0 0 20px", fontSize: "20px" },
    sideItem: { background: "#1e1e1e", padding: "14px", borderRadius: "10px", marginBottom: "12px", color: "#d8d8d8", fontSize: "14px" },
    main: { padding: isNarrow ? "18px" : "30px" },
    scene: { background: "#1b1b1b", border: "1px solid #2d2d2d", borderRadius: "14px", padding: isNarrow ? "18px" : "24px", marginBottom: "20px" },
    sceneTitle: { color: "#58a6ff", margin: "0 0 14px", fontSize: isNarrow ? "20px" : "24px", lineHeight: 1.2 },
    sceneText: { color: "#d0d0d0", lineHeight: 1.65, margin: 0, fontSize: isNarrow ? "15px" : "16px" },
    badges: { marginTop: "15px", display: "flex", gap: "10px", flexWrap: "wrap" },
    badge: { display: "inline-block", background: "#262626", color: "#cccccc", padding: "8px 12px", borderRadius: "999px", fontSize: "14px" },
    metricGrid: { display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: "14px", marginTop: "20px" },
    metric: { background: "#111", border: "1px solid #2a2a2a", borderRadius: "14px", padding: "16px" },
    metricValue: { color: "#58a6ff", fontSize: "22px", fontWeight: 800, marginBottom: "4px" },
    metricText: { color: "#aaa", fontSize: "13px", lineHeight: 1.45 },
    section: { maxWidth: "1200px", margin: "0 auto", padding: isNarrow ? "70px 18px" : "100px 40px" },
    sectionTitle: { margin: 0, fontSize: isNarrow ? "32px" : "42px", lineHeight: 1.1 },
    sectionLead: { margin: "18px 0 0", maxWidth: "820px", color: "#b0b0b0", lineHeight: 1.65, fontSize: isNarrow ? "17px" : "19px" },
    grid: { display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: "24px", marginTop: "40px" },
    card: { background: "#161616", border: "1px solid #2a2a2a", borderRadius: "18px", padding: "28px" },
    cardTitle: { color: "#58a6ff", margin: "0 0 14px", fontSize: "19px" },
    cardText: { color: "#c9c9c9", margin: 0, lineHeight: 1.6 },
    footer: { borderTop: "1px solid #222", padding: isNarrow ? "44px 20px" : "60px 20px", textAlign: "center", color: "#888" },
  };

  return (
    <div style={s.page}>
      <section style={s.hero}>
        <img src="/deepframe_logo_concept.png" alt="DeepFrame - Beyond Screenwriting." style={s.logo} />
        <div style={s.subtitle}>
          Un ecosistema creativo per sviluppare, analizzare e trasformare storie in esperienze audiovisive.
          Ora con generatore storie, LM Studio locale, breakdown produzione, calendario riprese ed export PDF operativi.
        </div>

        <div style={s.ctaRow}>
          <button type="button" style={s.cta} onClick={onStart}>Apri DeepFrame Script</button>
          <a href="/crea-la-tua-storia/" style={s.ghostCta}>Crea la tua storia</a>
          <button
            type="button"
            style={s.ghostCta}
            onClick={() => document.getElementById("deepframe-ecosystem")?.scrollIntoView({ behavior: "smooth" })}
          >
            Esplora la visione
          </button>
        </div>

        <div style={s.mock}>
          <div style={s.mockTop}>
            <span style={{ ...s.dot, background: "#ff5f57" }} />
            <span style={{ ...s.dot, background: "#febc2e" }} />
            <span style={{ ...s.dot, background: "#28c840" }} />
          </div>
          <div style={s.mockBody}>
            <aside style={s.sidebar}>
              <h3 style={s.sideTitle}>DeepFrame</h3>
              {sideItems.map((item) => (
                <div key={item} style={s.sideItem}>{item}</div>
              ))}
            </aside>
            <main style={s.main}>
              <article style={s.scene}>
                <h2 style={s.sceneTitle}>Breakdown Reparti</h2>
                <p style={s.sceneText}>
                  Dal testo alla produzione: cast numerato, location, props, costumi, comparse, effetti,
                  audio e piano di lavoro con giornate modificabili.
                </p>
                <div style={s.badges}>
                  {["Cast ID", "Location grouping", "INT/EST", "Production complexity"].map((badge) => (
                    <span key={badge} style={s.badge}>{badge}</span>
                  ))}
                </div>
                <div style={s.metricGrid}>
                  {[
                    ["01", "Giornate riordinabili e modificabili"],
                    ["8/8", "Ottavi pagina stimati per scena"],
                    ["PDF", "Export report per reparti"],
                  ].map(([value, text]) => (
                    <div key={text} style={s.metric}>
                      <div style={s.metricValue}>{value}</div>
                      <div style={s.metricText}>{text}</div>
                    </div>
                  ))}
                </div>
              </article>

              <article style={s.scene}>
                <h2 style={s.sceneTitle}>Piano di lavoro</h2>
                <p style={s.sceneText}>
                  Imposta date di ripresa, orari di inizio e fine, accorpa scene per location,
                  interno/esterno, cast o complessita produttiva.
                </p>
                <div style={s.badges}>
                  {["Calendario riprese", "Accorpa per location", "Export PDF", "LM Studio ready"].map((badge) => (
                    <span key={badge} style={s.badge}>{badge}</span>
                  ))}
                </div>
              </article>
            </main>
          </div>
        </div>
      </section>

      <section id="deepframe-ecosystem" style={s.section}>
        <h2 style={s.sectionTitle}>Creative Workflow Ecosystem</h2>
        <p style={s.sectionLead}>
          DeepFrame parte dalla sceneggiatura e prepara un percorso modulare per regia,
          produzione, formazione e nuove esperienze audiovisive. Le funzioni aggiunte portano il modulo Script
          da semplice formatter a strumento operativo per sviluppo narrativo e preparazione produttiva.
        </p>
        <div style={s.grid}>
          {featureRows.map(([title, text]) => (
            <div key={title} style={s.card}>
              <h3 style={s.cardTitle}>{title}</h3>
              <p style={s.cardText}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={s.footer}>
        <div>DeepFrame - Beyond Screenwriting.</div>
        <div style={{ marginTop: "10px" }}>Creative Workflow Ecosystem for Filmmakers</div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          body { margin: 0; }
          button { min-height: 42px; }
        }
      `}</style>
    </div>
  );
}

const APP_GUIDED_STEP_COPY = [
  {
    title: "Benvenuto in DeepFrame Script",
    text: "Questo è il primo modulo dell'ecosistema: qui trasformi una bozza in sceneggiatura, analisi e schede operative.",
    color: "#8B5CF6",
    target: "onboarding",
  },
  {
    title: "Carica il tuo file",
      text: "Trascina qui TXT, DOCX o PDF. I vecchi DOC vanno prima convertiti in DOCX.",
    color: "#8B5CF6",
    target: "dropzone",
  },
  {
    title: "Configura la tua API",
    text: "Inserisci la tua chiave Anthropic personale. Se scegli di ricordarla, resta solo nel tuo browser.",
    color: "#22C55E",
    target: "apiKey",
  },
  {
    title: "Incolla il testo",
    text: "Puoi anche lavorare senza file: incolla direttamente qui una scena o una bozza.",
    color: "#FACC15",
    target: "rawText",
  },
  {
    title: "Formatta e analizza",
    text: "Una volta inserito il testo, avvia la formattazione. Dopo compariranno analisi, schede e breakdown.",
    color: "#38BDF8",
    target: "formatButton",
  },
];

function AppGuidedOnboarding({ onClose, targets }) {
  const [activeStep, setActiveStep] = useState(0);
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= 900);
  const [desktopSteps, setDesktopSteps] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(window.innerWidth <= 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const cardWidth = 286;
    const cardGap = 44;
    const margin = 18;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const getRect = (key) => targets?.[key]?.current?.getBoundingClientRect();

    const measure = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const measured = APP_GUIDED_STEP_COPY.map((step, index) => {
        const rect = getRect(step.target);
        if (!rect) return null;

        const highlight = {
          left: rect.left - 2,
          top: rect.top - 2,
          width: rect.width + 4,
          height: rect.height + 4,
        };

        const cardLeft = index === 0
          ? clamp(rect.left - cardWidth - 34, margin, viewportWidth - cardWidth - margin)
          : clamp(rect.right + cardGap, margin, viewportWidth - cardWidth - margin);
        const cardTop = index === 0
          ? clamp(rect.bottom + 16, margin, viewportHeight - 172)
          : clamp(rect.top + (rect.height / 2) - 66, 108, viewportHeight - 172);

        return {
          ...step,
          top: cardTop,
          left: cardLeft,
          highlight,
          line: index === 0
            ? {
                x1: cardLeft + cardWidth,
                y1: rect.bottom + 2,
                x2: rect.left - 2,
                y2: rect.bottom + 2,
              }
            : {
                x1: cardLeft,
                y1: cardTop + 44,
                x2: rect.right + 2,
                y2: rect.top + (rect.height / 2),
              },
        };
      }).filter(Boolean);

      setDesktopSteps(measured);
    };

    measure();
    const id = window.setTimeout(measure, 80);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", measure);
    };
  }, [targets]);

  const finishTour = () => {
    window.localStorage.setItem(APP_TOUR_STORAGE, "true");
    onClose();
  };

  const steps = desktopSteps.length === APP_GUIDED_STEP_COPY.length ? desktopSteps : APP_GUIDED_STEP_COPY;
  const active = steps[activeStep];

  if (isNarrow) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(5,5,10,.78)", display: "flex", alignItems: "flex-end", pointerEvents: "auto" }}>
        <div style={{ width: "100%", background: "#111118", borderTop: `2px solid ${active.color}`, padding: "18px", boxSizing: "border-box", boxShadow: "0 -18px 40px rgba(0,0,0,.45)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: active.color, color: "#08080d", display: "grid", placeItems: "center", fontWeight: "bold", fontFamily: "sans-serif", fontSize: "13px" }}>{activeStep + 1}</span>
            <strong style={{ color: "#fff", fontFamily: "sans-serif", fontSize: "14px" }}>{active.title}</strong>
          </div>
          <div style={{ color: "#b8bdca", fontFamily: "sans-serif", fontSize: "13px", lineHeight: 1.55, marginBottom: "14px" }}>{active.text}</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={() => setActiveStep(Math.max(0, activeStep - 1))} disabled={activeStep === 0} style={{ flex: 1, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#ddd", borderRadius: "7px", padding: "10px", opacity: activeStep === 0 ? .45 : 1 }}>Indietro</button>
            {activeStep < steps.length - 1 ? (
              <button type="button" onClick={() => setActiveStep(activeStep + 1)} style={{ flex: 1, border: "none", background: active.color, color: "#08080d", borderRadius: "7px", padding: "10px", fontWeight: "bold" }}>Avanti</button>
            ) : (
              <button type="button" onClick={finishTour} style={{ flex: 1, border: "none", background: active.color, color: "#08080d", borderRadius: "7px", padding: "10px", fontWeight: "bold" }}>Ho capito</button>
            )}
            <button type="button" onClick={finishTour} style={{ border: "1px solid rgba(255,255,255,.14)", background: "transparent", color: "#aaa", borderRadius: "7px", padding: "10px 12px" }}>Salta</button>
          </div>
        </div>
      </div>
    );
  }

  if (desktopSteps.length !== APP_GUIDED_STEP_COPY.length) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line
          x1={active.line.x1}
          y1={active.line.y1}
          x2={active.line.x2}
          y2={active.line.y2}
          stroke={active.color}
          strokeWidth={3}
          opacity={1}
        />
      </svg>

      <div style={{ position: "absolute", left: active.highlight.left, top: active.highlight.top, width: active.highlight.width, height: active.highlight.height, border: `2px solid ${active.color}`, borderRadius: "8px", boxShadow: `0 0 0 1px ${active.color}44, 0 0 30px ${active.color}44`, background: "rgba(255,255,255,.02)" }} />

      <div style={{ position: "absolute", top: active.top, left: active.left, width: 212, background: "rgba(13,13,22,.96)", border: `2px solid ${active.color}`, borderRadius: "8px", padding: "12px 12px 10px", boxShadow: `0 18px 42px rgba(0,0,0,.42), 0 0 22px ${active.color}44`, pointerEvents: "auto" }}>
        <div style={{ position: "absolute", left: -12, top: -12, width: 24, height: 24, borderRadius: "50%", background: active.color, color: "#08080d", display: "grid", placeItems: "center", fontFamily: "sans-serif", fontSize: "12px", fontWeight: "bold" }}>{activeStep + 1}</div>
        <div style={{ color: "#fff", fontFamily: "sans-serif", fontSize: "12px", fontWeight: "bold", marginBottom: "6px" }}>{active.title}</div>
        <div style={{ color: "#aeb4c4", fontFamily: "sans-serif", fontSize: "11px", lineHeight: 1.45, marginBottom: "10px" }}>{active.text}</div>
        <div style={{ display: "flex", gap: "6px" }}>
          {activeStep > 0 && (
            <button type="button" onClick={() => setActiveStep(activeStep - 1)} style={{ border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.07)", color: "#ddd", borderRadius: "5px", padding: "6px 8px", fontSize: "11px", cursor: "pointer" }}>Indietro</button>
          )}
          {activeStep < steps.length - 1 ? (
            <button type="button" onClick={() => setActiveStep(activeStep + 1)} style={{ border: "none", background: active.color, color: "#08080d", borderRadius: "5px", padding: "6px 10px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Avanti</button>
          ) : (
            <button type="button" onClick={finishTour} style={{ border: "none", background: active.color, color: "#08080d", borderRadius: "5px", padding: "6px 10px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Ho capito</button>
          )}
        </div>
      </div>

      <div style={{ position: "absolute", right: 22, bottom: 22, width: 178, background: "rgba(16,16,24,.94)", border: "1px solid rgba(255,255,255,.12)", borderRadius: "8px", padding: "12px", pointerEvents: "auto", fontFamily: "sans-serif", boxShadow: "0 16px 42px rgba(0,0,0,.35)" }}>
        <div style={{ color: "#fff", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Consiglio</div>
        <div style={{ color: "#9da4b3", fontSize: "11px", lineHeight: 1.45, marginBottom: "10px" }}>Puoi riaprire questa guida dal pulsante Onboarding in alto.</div>
        <button type="button" onClick={finishTour} style={{ width: "100%", border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#ddd", borderRadius: "6px", padding: "7px 8px", fontSize: "11px", cursor: "pointer" }}>Salta tour</button>
      </div>
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
          {secBtn("narrativo", "Profilo narrativo", activeSection === "narrativo")}
          {secBtn("relazioni", "Relazioni", activeSection === "relazioni")}
          {secBtn("produzione", "Produzione", activeSection === "produzione")}
          {secBtn("didattica", "Didattica", activeSection === "didattica")}
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

function LocationDetailRow({ label, val }) {
  return val && val !== "non_specificato" && val !== "non specificato" ? (
    <div style={{ display: "flex", gap: "10px", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
      <span style={{ fontSize: "11px", color: "#666", fontFamily: "sans-serif", minWidth: "170px", paddingTop: "2px" }}>{label}</span>
      <span style={{ fontSize: "12px", color: "#ccc", fontFamily: "sans-serif", lineHeight: "1.5" }}>{String(val)}</span>
    </div>
  ) : null;
}

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
          {secBtn("narrativa",   "Narrativa",   activeSection === "narrativa")}
          {secBtn("tecnica",     "Tecnica",      activeSection === "tecnica")}
          {secBtn("scouting",    "Scouting",     activeSection === "scouting")}
          {secBtn("fotografia",  "Fotografia",   activeSection === "fotografia")}
          {secBtn("didattica",   "Didattica",    activeSection === "didattica")}
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
                <LocationDetailRow label="Giorni stimati" val={`${loc.piano_riprese.giorni_stimati} giorni · ${loc.piano_riprese.ore_stimate_totali}h totali`} />
                <LocationDetailRow label="Scene nello stesso giorno" val={loc.piano_riprese.scene_consigliate_nello_stesso_giorno?.join(", ")} />
                <LocationDetailRow label="Ottimizzazione" val={loc.piano_riprese.note_ottimizzazione} />
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

const asArray = (value) => Array.isArray(value) ? value : [];
const sceneList = (value) => asArray(value).filter((item) => item !== undefined && item !== null);
const uniq = (items) => [...new Set(items.filter(Boolean))];

const normalizeBreakdownCast = (reparti, perScena) => {
  const explicit = asArray(reparti?.cast).map((item) => (
    typeof item === "string"
      ? { nome: item, ruolo_tipo: "non_specificato", scene: [], giorni_lavoro_stimati: 1 }
      : item
  )).filter((item) => item?.nome);
  if (explicit.length) return explicit;

  return uniq(asArray(perScena).flatMap((sc) => asArray(sc.cast))).map((nome) => ({
    nome,
    ruolo_tipo: "non_specificato",
    scene: asArray(perScena).filter((sc) => asArray(sc.cast).includes(nome)).map((sc) => sc.numero),
    giorni_lavoro_stimati: 1,
    continuità_costume: "non_specificato",
    note_casting: "Da verificare in casting.",
  }));
};

const normalizeBreakdownLocations = (reparti, perScena) => {
  const explicit = asArray(reparti?.locations).map((item) => (
    typeof item === "string"
      ? { nome: item, tipo: "non_specificato", scene: [] }
      : item
  )).filter((item) => item?.nome);
  if (explicit.length) return explicit;

  return uniq(asArray(perScena).map((sc) => sc.location_descrizione || sc.titolo)).map((nome) => ({
    nome,
    tipo: asArray(perScena).find((sc) => (sc.location_descrizione || sc.titolo) === nome)?.interno_esterno || "non_specificato",
    scene: asArray(perScena).filter((sc) => (sc.location_descrizione || sc.titolo) === nome).map((sc) => sc.numero),
    allestimento: "medio",
    note_ricerca: "Da verificare con location scouting.",
    problemi_potenziali: "non_specificato",
  }));
};

const normalizeBreakdownProps = (reparti, perScena) => {
  const explicit = asArray(reparti?.props).map((item) => (
    typeof item === "string"
      ? { oggetto: item, tipo: "non_specificato", scene: [] }
      : item
  )).filter((item) => item?.oggetto);
  if (explicit.length) return explicit;

  return uniq(asArray(perScena).flatMap((sc) => asArray(sc.props_principali))).map((oggetto) => ({
    oggetto,
    tipo: "non_specificato",
    scene: asArray(perScena).filter((sc) => asArray(sc.props_principali).includes(oggetto)).map((sc) => sc.numero),
    note: "Da confermare con scenografia/attrezzeria.",
  }));
};

const normalizeBreakdownCostumes = (reparti, castItems) => {
  const explicit = asArray(reparti?.costumi).map((item) => (
    typeof item === "string"
      ? { personaggio: item, periodo_stile: "non_specificato", cambi_costume: 1, scene: [] }
      : item
  )).filter((item) => item?.personaggio);
  if (explicit.length) return explicit;

  return castItems.map((cast) => ({
    personaggio: cast.nome,
    periodo_stile: "non_specificato",
    cambi_costume: 1,
    scene: sceneList(cast.scene),
    capi_identificati: [],
    note_continuità: cast.continuità_costume || "non_specificato",
  }));
};

const normalizeBreakdownExtras = (reparti, perScena) => {
  const explicitComparse = asArray(reparti?.comparse).map((item) => (
    typeof item === "string"
      ? { gruppo: item, quantità_stimata: 0, scene: [] }
      : item
  )).filter((item) => item?.gruppo || item?.quantità_stimata > 0);
  const inferredComparse = explicitComparse.length ? [] : asArray(perScena)
    .filter((sc) => Number(sc.comparse_stimate) > 0)
    .map((sc) => ({
      gruppo: `Comparse scena ${sc.numero}`,
      quantità_stimata: sc.comparse_stimate,
      scene: [sc.numero],
      note: sc.titolo || "Da dettagliare con aiuto regia.",
    }));

  return {
    comparse: [...explicitComparse, ...inferredComparse],
    effetti: asArray(reparti?.effetti_speciali),
    veicoli: asArray(reparti?.veicoli),
    audio: asArray(reparti?.audio_musica),
  };
};

const normalizeBreakdownSummary = (summary, perScena, castItems, locationItems, workPlan) => {
  const scenes = asArray(perScena);
  const environments = scenes.map((scene) => getSceneEnvironment(scene));
  const moments = scenes.map((scene) => String(scene?.momento || "").toUpperCase());
  const pickCount = (value, fallback) => {
    const number = Number(value);
    return number > 0 ? number : fallback;
  };

  const dayCount = pickCount(summary?.giorni_ripresa_stimati || summary?.giorni_lavoro_stimati, asArray(workPlan).length || Math.max(1, Math.ceil(scenes.length / 4)));
  const productionComplexity = summary?.complessità_produttiva || strongestComplexity(scenes);

  return {
    totale_scene: pickCount(summary?.totale_scene, scenes.length),
    personaggi_parlanti: pickCount(summary?.personaggi_parlanti || summary?.cast_totale, castItems.length),
    location_uniche: pickCount(summary?.location_uniche, locationItems.length),
    giorni_ripresa_stimati: dayCount,
    scene_interne: pickCount(summary?.scene_interne, environments.filter((value) => value.includes("INT")).length),
    scene_esterne: pickCount(summary?.scene_esterne, environments.filter((value) => value.includes("EST") || value.includes("EXT")).length),
    scene_giorno: pickCount(summary?.scene_giorno, moments.filter((value) => value.includes("GIORNO") || value.includes("DAY")).length),
    scene_notte: pickCount(summary?.scene_notte, moments.filter((value) => value.includes("NOTTE") || value.includes("NIGHT")).length),
    complessità_produttiva: normalizeComplexity(productionComplexity),
    note_produzione: summary?.note_produzione || summary?.note || "Riepilogo ricostruito automaticamente dai dati del breakdown.",
  };
};

const complexityRank = { bassa: 1, media: 2, alta: 3, molto_alta: 4 };
const complexityHours = { bassa: 2, media: 3, alta: 4, molto_alta: 5 };

const normalizeComplexity = (value) => {
  const key = String(value || "media").toLowerCase().replace(/\s+/g, "_");
  return complexityRank[key] ? key : "media";
};

const estimateSceneHours = (scene) => {
  if (!scene) return 0;
  const complexity = normalizeComplexity(scene.complessità);
  let hours = complexityHours[complexity] || 3;
  if (asArray(scene.cast).length >= 5) hours += 0.5;
  if (Number(scene.comparse_stimate) > 0) hours += 0.5;
  if (asArray(scene.props_principali).length >= 4) hours += 0.5;
  if (asArray(scene.elementi_speciali).length > 0) hours += 1;
  return Math.round(hours * 2) / 2;
};

const getSceneLocation = (scene) => (
  String(scene?.location_descrizione || scene?.titolo || "Location da definire").trim()
);

const getSceneEnvironment = (scene) => (
  String(scene?.interno_esterno || "non_specificato").trim().toUpperCase()
);

const getSceneCastKey = (scene) => {
  const cast = asArray(scene?.cast).map((name) => String(name).trim()).filter(Boolean).sort();
  return cast.length ? cast.join(", ") : "Scene senza cast indicato";
};

const estimateSceneEighths = (scene) => {
  const explicit = Number(scene?.ottavi_pagina || scene?.eighths || scene?.page_eighths);
  if (explicit > 0) return Math.max(1, Math.round(explicit));
  const pages = Number(scene?.pagine || scene?.pages);
  if (pages > 0) return Math.max(1, Math.round(pages * 8));
  const complexity = normalizeComplexity(scene?.complessità);
  const base = { bassa: 2, media: 3, alta: 4, molto_alta: 5 }[complexity] || 3;
  const castExtra = asArray(scene?.cast).length >= 5 ? 1 : 0;
  const specialExtra = asArray(scene?.elementi_speciali).length > 0 ? 1 : 0;
  return Math.min(8, base + castExtra + specialExtra);
};

const sceneNumbersFromDay = (day) => (
  uniq(sceneList(day?.scene_consigliate || day?.scene).map((value) => Number(value)).filter(Boolean))
);

const strongestComplexity = (scenes) => scenes.reduce((current, scene) => {
  const next = normalizeComplexity(scene?.complessità);
  return complexityRank[next] > complexityRank[current] ? next : current;
}, "bassa");

const describeWorkPlanGroup = (strategy, label, scenes, hours) => {
  const complexity = strongestComplexity(scenes).replace(/_/g, " ");
  const count = scenes.length === 1 ? "1 scena" : `${scenes.length} scene`;
  if (strategy === "location") return `${count} nella stessa location: ${label}. Complessità massima: ${complexity}.`;
  if (strategy === "int_est") return `${count} accorpate per ${label}. Complessità massima: ${complexity}.`;
  if (strategy === "cast") return `${count} con lo stesso gruppo attori. Complessità massima: ${complexity}.`;
  if (strategy === "complexity") return `${count} ordinate per complessità produttiva. Stima giornata: ${hours}h.`;
  return `${count} accorpate manualmente. Complessità massima: ${complexity}.`;
};

const buildWorkPlanFromScenes = (perScena, strategy) => {
  const scenes = asArray(perScena).filter((scene) => scene?.numero);
  if (!scenes.length) return [];

  const orderedScenes = strategy === "complexity"
    ? [...scenes].sort((a, b) => complexityRank[normalizeComplexity(b.complessità)] - complexityRank[normalizeComplexity(a.complessità)])
    : scenes;

  const groups = new Map();
  orderedScenes.forEach((scene) => {
    const key = strategy === "location" ? getSceneLocation(scene)
      : strategy === "int_est" ? getSceneEnvironment(scene)
        : strategy === "cast" ? getSceneCastKey(scene)
          : "Complessità produttiva";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(scene);
  });

  const days = [];
  groups.forEach((groupScenes, label) => {
    let current = [];
    let currentHours = 0;

    const closeDay = () => {
      if (!current.length) return;
      const hours = Math.round(currentHours * 2) / 2;
      days.push({
        giorno: days.length + 1,
        scene_consigliate: current.map((scene) => scene.numero),
        motivazione: describeWorkPlanGroup(strategy, label, current, hours),
        ore_stimate: hours,
        criterio: strategy,
      });
      current = [];
      currentHours = 0;
    };

    groupScenes.forEach((scene) => {
      const sceneHours = estimateSceneHours(scene);
      if (current.length && currentHours + sceneHours > 8) closeDay();
      current.push(scene);
      currentHours += sceneHours;
    });
    closeDay();
  });

  return days;
};

const normalizeInitialWorkPlan = (workPlanSource, perScena) => {
  const scenes = asArray(perScena).filter((scene) => scene?.numero);
  const source = asArray(workPlanSource)
    .map((day, index) => ({
      ...day,
      giorno: index + 1,
      scene_consigliate: sceneNumbersFromDay(day),
    }))
    .filter((day) => day.scene_consigliate.length > 0);

  if (!scenes.length) return source;

  const maxReasonableDays = Math.max(5, Math.ceil(scenes.length / 2));
  if (!source.length || source.length > maxReasonableDays) {
    return buildWorkPlanFromScenes(scenes, "location").map((day) => ({
      ...day,
      motivazione: `${day.motivazione} Piano iniziale ricalcolato perché quello AI era troppo frammentato.`,
      ricalcolato_da_app: true,
    }));
  }

  return source;
};

const dateInputToDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatShootDate = (date) => (
  date instanceof Date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })
    : ""
);

const addCalendarDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

function EmptyBreakdownSection({ label }) {
  return (
    <div style={{ padding: "18px", border: "1px dashed rgba(255,255,255,.12)", borderRadius: "8px", color: "#777", fontSize: "12px", fontFamily: "sans-serif" }}>
      Nessuna voce disponibile per {label}. Rigenera il breakdown dopo aver completato la formattazione creativa.
    </div>
  );
}

function BreakdownPanel({ data }) {
  if (!data) return null;
  const workPlanSource = data.piano_lavoro_suggerito || data.piano_riprese_suggerito;
  const initialWorkPlan = normalizeInitialWorkPlan(workPlanSource, data.per_scena);
  const panelKey = JSON.stringify({
    sceneNumbers: asArray(data.per_scena).map((scene) => scene.numero),
    workPlanSource: initialWorkPlan,
  });

  return (
    <BreakdownPanelContent
      key={panelKey}
      data={data}
      initialWorkPlan={initialWorkPlan}
    />
  );
}

function BreakdownPanelContent({ data, initialWorkPlan }) {
  const [activeTab, setActiveTab] = useState("riepilogo");
  const [workPlan, setWorkPlan] = useState(initialWorkPlan);
  const [manualScene, setManualScene] = useState("");
  const [manualTargetDay, setManualTargetDay] = useState("");
  const [shootStartDate, setShootStartDate] = useState("");
  const [shootEndDate, setShootEndDate] = useState("");
  const [shootStartTime, setShootStartTime] = useState("10:00");
  const [shootEndTime, setShootEndTime] = useState("18:00");
  const { riepilogo, per_scena, reparti } = data;
  const sceneByNumber = new Map(asArray(per_scena).map((scene) => [Number(scene.numero), scene]));
  const castItems = normalizeBreakdownCast(reparti, per_scena);
  const castIdByName = new Map(castItems.map((cast, index) => [String(cast.nome || "").trim().toUpperCase(), index + 1]));
  const locationItems = normalizeBreakdownLocations(reparti, per_scena);
  const propItems = normalizeBreakdownProps(reparti, per_scena);
  const costumeItems = normalizeBreakdownCostumes(reparti, castItems);
  const extraItems = normalizeBreakdownExtras(reparti, per_scena);
  const extraCount = extraItems.comparse.length + extraItems.effetti.length + extraItems.veicoli.length + extraItems.audio.length;
  const riepilogoData = normalizeBreakdownSummary(riepilogo, per_scena, castItems, locationItems, workPlan);

  const moveWorkDay = (index, direction) => {
    setWorkPlan((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((day, dayIndex) => ({ ...day, giorno: dayIndex + 1 }));
    });
  };

  const updateWorkDayMetrics = (day, override = {}) => {
    const numbers = sceneNumbersFromDay({ ...day, ...override });
    const scenes = numbers.map((number) => sceneByNumber.get(number)).filter(Boolean);
    const hours = Math.round(scenes.reduce((sum, scene) => sum + estimateSceneHours(scene), 0) * 2) / 2;
    return {
      ...day,
      ...override,
      scene_consigliate: numbers,
      ore_stimate: hours,
      complessità_massima: scenes.length ? strongestComplexity(scenes) : "media",
    };
  };

  const compactWorkPlan = (days) => asArray(days)
    .filter((day) => sceneNumbersFromDay(day).length > 0)
    .map((day, dayIndex) => ({ ...day, giorno: dayIndex + 1 }));

  const getWorkDayComplexity = (day) => (
    day.complessità_massima || strongestComplexity(sceneNumbersFromDay(day).map((number) => sceneByNumber.get(number)).filter(Boolean))
  );

  const getWorkDayScenes = (day) => sceneNumbersFromDay(day).map((number) => sceneByNumber.get(number)).filter(Boolean);

  const getSceneCastIds = (scene) => asArray(scene?.cast)
    .map((name) => castIdByName.get(String(name || "").trim().toUpperCase()))
    .filter(Boolean);

  const getWorkDayCastIds = (day) => uniq(getWorkDayScenes(day).flatMap((scene) => getSceneCastIds(scene)));

  const getWorkDayPageEighths = (day) => getWorkDayScenes(day)
    .reduce((sum, scene) => sum + estimateSceneEighths(scene), 0);

  const getWorkDayLocations = (day) => uniq(getWorkDayScenes(day).map((scene) => getSceneLocation(scene))).join(", ") || "Location da definire";

  const getWorkDayTime = (day) => day.orario || [day.ora_inizio, day.ora_fine].filter(Boolean).join(" - ") || "10:00 - 18:00";

  const shootStart = dateInputToDate(shootStartDate);
  const shootEnd = dateInputToDate(shootEndDate);
  const shootingWindowDays = shootStart && shootEnd
    ? Math.floor((shootEnd.getTime() - shootStart.getTime()) / 86400000) + 1
    : 0;
  const scheduleExceedsWindow = shootingWindowDays > 0 && workPlan.length > shootingWindowDays;

  const applyShootCalendar = () => {
    const firstDate = dateInputToDate(shootStartDate);
    if (!firstDate) return;
    setWorkPlan((current) => current.map((day, index) => {
      const shootDate = addCalendarDays(firstDate, index);
      return {
        ...day,
        data: formatShootDate(shootDate),
        data_iso: shootDate.toISOString().slice(0, 10),
        ora_inizio: shootStartTime,
        ora_fine: shootEndTime,
        orario: `${shootStartTime} - ${shootEndTime}`,
      };
    }));
  };

  const updateWorkDaySchedule = (index, field, value) => {
    setWorkPlan((current) => current.map((day, dayIndex) => {
      if (dayIndex !== index) return day;
      const next = { ...day, [field]: value };
      if (field === "data_iso") next.data = formatShootDate(dateInputToDate(value)) || value;
      const start = field === "ora_inizio" ? value : next.ora_inizio;
      const end = field === "ora_fine" ? value : next.ora_fine;
      if (start || end) next.orario = [start, end].filter(Boolean).join(" - ");
      return next;
    }));
  };

  const applyWorkPlanStrategy = (strategy) => {
    setWorkPlan(buildWorkPlanFromScenes(per_scena, strategy));
    setManualTargetDay("1");
    setActiveTab("piano");
  };

  const addWorkDay = () => {
    setWorkPlan((current) => ([
      ...current,
      {
        giorno: current.length + 1,
        scene_consigliate: [],
        motivazione: "Giornata aggiunta manualmente. Sposta qui le scene che vuoi accorpare.",
        ore_stimate: 0,
        criterio: "manuale",
        manuale: true,
      },
    ]));
    setManualTargetDay(String(workPlan.length + 1));
  };

  const removeWorkDay = (index) => {
    setWorkPlan((current) => current
      .filter((_, dayIndex) => dayIndex !== index)
      .map((day, dayIndex) => ({ ...day, giorno: dayIndex + 1 })));
  };

  const moveSceneToDay = (sceneNumber, targetDayNumber) => {
    const number = Number(sceneNumber);
    const target = Number(targetDayNumber);
    if (!number || !target) return;

    setWorkPlan((current) => {
      const basePlan = current.length ? current : buildWorkPlanFromScenes(per_scena, "complexity");
      const nextPlan = basePlan.map((day) => {
        const numbers = sceneNumbersFromDay(day).filter((item) => item !== number);
        const nextNumbers = Number(day.giorno) === target ? uniq([...numbers, number]) : numbers;
        const motivazione = Number(day.giorno) === target
          ? "Giornata modificata manualmente. La stima tiene conto della complessità delle scene inserite."
          : day.motivazione;
        return updateWorkDayMetrics(day, { scene_consigliate: nextNumbers, motivazione, criterio: Number(day.giorno) === target ? "manuale" : day.criterio });
      });
      return compactWorkPlan(nextPlan);
    });
  };

  const removeSceneFromDay = (dayIndex, sceneNumber) => {
    const number = Number(sceneNumber);
    setWorkPlan((current) => compactWorkPlan(current.map((day, index) => {
      if (index !== dayIndex) return day;
      return updateWorkDayMetrics(day, {
        scene_consigliate: sceneNumbersFromDay(day).filter((item) => item !== number),
        motivazione: "Giornata modificata manualmente. La stima tiene conto della complessità delle scene rimaste.",
        criterio: "manuale",
      });
    })));
  };

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
        {tabBtn("riepilogo", "Riepilogo", 0)}
        {tabBtn("scene",     "Per scena", per_scena?.length || 0)}
        {tabBtn("cast",      "Cast",      castItems.length)}
        {tabBtn("locations", "Location",  locationItems.length)}
        {tabBtn("props",     "Props",     propItems.length)}
        {tabBtn("costumi",   "Costumi",   costumeItems.length)}
        {extraCount > 0 && tabBtn("extra", "Extra", extraCount)}
        {asArray(per_scena).length > 0 && tabBtn("piano", "Piano di lavoro", workPlan.length)}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

        {/* RIEPILOGO */}
        {activeTab === "riepilogo" && riepilogoData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              {[
                ["🎬", "Scene totali", riepilogoData.totale_scene],
                ["👤", "Personaggi", riepilogoData.personaggi_parlanti],
                ["📍", "Location", riepilogoData.location_uniche],
                ["📅", "Giorni stimati", riepilogoData.giorni_ripresa_stimati],
                ["🏠", "INT", riepilogoData.scene_interne],
                ["🌿", "EST", riepilogoData.scene_esterne],
                ["☀️", "Giorno", riepilogoData.scene_giorno],
                ["🌙", "Notte", riepilogoData.scene_notte],
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
              <Badge label={riepilogoData.complessità_produttiva.replace(/_/g, " ").toUpperCase()} color={complessitàProdColors[riepilogoData.complessità_produttiva]} />
            </div>
            {riepilogoData.note_produzione && (
              <div style={{ background: "rgba(255,143,101,.06)", border: "1px solid rgba(255,143,101,.2)", borderRadius: "8px", padding: "14px 16px" }}>
                <div style={{ fontSize: "10px", color: "#FF8A65", fontFamily: "sans-serif", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>📋 Note di produzione</div>
                <div style={{ fontSize: "13px", color: "#ccc", fontFamily: "Georgia, serif", lineHeight: "1.8" }}>{riepilogoData.note_produzione}</div>
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
        {activeTab === "cast" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {!castItems.length && <EmptyBreakdownSection label="il cast" />}
            {castItems.map((c) => (
              <div key={c.nome} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "monospace", color: "#FFD54F" }}>{c.nome}</span>
                  <Badge label={c.ruolo_tipo?.replace(/_/g, " ")} color={ruoloColors?.[c.ruolo_tipo] || "#888"} small />
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#888", fontFamily: "sans-serif" }}>{c.giorni_lavoro_stimati || 1} gg · scene {sceneList(c.scene).join(", ") || "n/d"}</span>
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
        {activeTab === "locations" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {!locationItems.length && <EmptyBreakdownSection label="le location" />}
            {locationItems.map((l, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#f0ead8", fontFamily: "sans-serif" }}>📍 {l.nome}</span>
                  <Badge label={l.tipo} color="#4FC3F7" small />
                  <Badge label={l.allestimento?.replace(/_/g, " ")} color={allestimentoColors[l.allestimento] || "#888"} small />
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#666", fontFamily: "sans-serif" }}>scene {sceneList(l.scene).join(", ") || "n/d"}</span>
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
        {activeTab === "props" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {!propItems.length && <EmptyBreakdownSection label="i props" />}
            {propItems.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px 14px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: "6px" }}>
                <Badge label={p.tipo} color={propTipoColors[p.tipo] || "#888"} small />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", color: "#ddd", fontFamily: "sans-serif", fontWeight: "500" }}>{p.oggetto}</div>
                  {p.note && <div style={{ fontSize: "11px", color: "#666", fontFamily: "sans-serif", marginTop: "2px" }}>{p.note}</div>}
                </div>
                <div style={{ fontSize: "10px", color: "#555", fontFamily: "monospace", whiteSpace: "nowrap" }}>sc. {sceneList(p.scene).join(", ") || "n/d"}</div>
              </div>
            ))}
          </div>
        )}

        {/* COSTUMI */}
        {activeTab === "costumi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {!costumeItems.length && <EmptyBreakdownSection label="i costumi" />}
            {costumeItems.map((c, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#FFD54F", fontFamily: "monospace" }}>{c.personaggio}</span>
                  {c.periodo_stile && <Badge label={c.periodo_stile} color="#CE93D8" small />}
                  <span style={{ fontSize: "11px", color: "#666", fontFamily: "sans-serif" }}>{c.cambi_costume || 1} cambi · scene {sceneList(c.scene).join(", ") || "n/d"}</span>
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
            {extraItems.comparse.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Comparse / figurazioni</div>
                {extraItems.comparse.map((e, i) => (
                  <div key={i} style={{ padding: "8px 14px", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "6px", marginBottom: "6px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "#ddd", fontFamily: "sans-serif", flex: 1 }}>{e.gruppo}</span>
                    <Badge label={`${e.quantità_stimata || 0} persone`} color="#888" small />
                    <span style={{ fontSize: "10px", color: "#666", fontFamily: "monospace" }}>sc. {sceneList(e.scene).join(", ") || "n/d"}</span>
                    {e.note && <div style={{ width: "100%", fontSize: "11px", color: "#777", fontFamily: "sans-serif" }}>{e.note}</div>}
                  </div>
                ))}
              </div>
            )}
            {extraItems.effetti.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Effetti speciali</div>
                {extraItems.effetti.map((e, i) => (
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
            {extraItems.veicoli.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Veicoli</div>
                {extraItems.veicoli.map((v, i) => (
                  <div key={i} style={{ padding: "8px 14px", background: "rgba(255,213,79,.05)", border: "1px solid rgba(255,213,79,.15)", borderRadius: "6px", marginBottom: "6px", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#ddd", fontFamily: "sans-serif", flex: 1 }}>{v.veicolo}</span>
                    <span style={{ fontSize: "10px", color: "#666", fontFamily: "monospace" }}>sc. {sceneList(v.scene).join(", ") || "n/d"}</span>
                  </div>
                ))}
              </div>
            )}
            {extraItems.audio.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Audio / Sound design</div>
                {extraItems.audio.map((a, i) => (
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
            {extraCount === 0 && <EmptyBreakdownSection label="extra e comparse" />}
          </div>
        )}

        {/* PIANO DI LAVORO */}
        {activeTab === "piano" && workPlan && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "12px", color: "#aaa", fontFamily: "sans-serif", lineHeight: "1.5" }}>
                Accorpa automaticamente le scene per criterio produttivo, poi rifinisci a mano le giornate. Ogni stima considera la complessità della scena, cast, comparse, props ed elementi speciali.
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", padding: "10px", background: "rgba(79,195,247,.045)", border: "1px solid rgba(79,195,247,.12)", borderRadius: "6px" }}>
                <span style={{ fontSize: "11px", color: "#4FC3F7", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>Calendario riprese</span>
                <label style={{ display: "flex", gap: "5px", alignItems: "center", fontSize: "11px", color: "#777", fontFamily: "sans-serif" }}>
                  Inizio
                  <input type="date" value={shootStartDate} onChange={(event) => setShootStartDate(event.target.value)} style={{ background: "#11131a", color: "#ddd", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", padding: "5px 7px", fontSize: "12px", fontFamily: "sans-serif" }} />
                </label>
                <label style={{ display: "flex", gap: "5px", alignItems: "center", fontSize: "11px", color: "#777", fontFamily: "sans-serif" }}>
                  Fine
                  <input type="date" value={shootEndDate} onChange={(event) => setShootEndDate(event.target.value)} style={{ background: "#11131a", color: "#ddd", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", padding: "5px 7px", fontSize: "12px", fontFamily: "sans-serif" }} />
                </label>
                <label style={{ display: "flex", gap: "5px", alignItems: "center", fontSize: "11px", color: "#777", fontFamily: "sans-serif" }}>
                  Da
                  <input type="time" value={shootStartTime} onChange={(event) => setShootStartTime(event.target.value)} style={{ background: "#11131a", color: "#ddd", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", padding: "5px 7px", fontSize: "12px", fontFamily: "sans-serif" }} />
                </label>
                <label style={{ display: "flex", gap: "5px", alignItems: "center", fontSize: "11px", color: "#777", fontFamily: "sans-serif" }}>
                  A
                  <input type="time" value={shootEndTime} onChange={(event) => setShootEndTime(event.target.value)} style={{ background: "#11131a", color: "#ddd", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", padding: "5px 7px", fontSize: "12px", fontFamily: "sans-serif" }} />
                </label>
                <button onClick={applyShootCalendar} disabled={!shootStartDate || !workPlan.length} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(79,195,247,.28)", background: "rgba(79,195,247,.08)", color: !shootStartDate || !workPlan.length ? "#456" : "#4FC3F7", cursor: !shootStartDate || !workPlan.length ? "not-allowed" : "pointer", fontSize: "11px", fontFamily: "sans-serif", fontWeight: "bold" }}>
                  Applica date
                </button>
                {shootStartDate && shootEndDate && (
                  <span style={{ fontSize: "11px", color: scheduleExceedsWindow ? "#FF8A65" : "#888", fontFamily: "sans-serif" }}>
                    {scheduleExceedsWindow ? "Le giornate superano la finestra impostata." : `${shootingWindowDays} giorni disponibili.`}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#777", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>Accorpa per</span>
                {[
                  ["location", "Location"],
                  ["int_est", "INT/EST"],
                  ["cast", "Attori"],
                  ["complexity", "Complessità"],
                ].map(([strategy, label]) => (
                  <button key={strategy} onClick={() => applyWorkPlanStrategy(strategy)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(200,169,110,.28)", background: "rgba(200,169,110,.08)", color: "#c8a96e", cursor: "pointer", fontSize: "11px", fontFamily: "sans-serif", fontWeight: "bold" }}>
                    {label}
                  </button>
                ))}
                <button onClick={addWorkDay} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(79,195,247,.28)", background: "rgba(79,195,247,.08)", color: "#4FC3F7", cursor: "pointer", fontSize: "11px", fontFamily: "sans-serif", fontWeight: "bold" }}>
                  + Giornata
                </button>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#777", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>Manuale</span>
                <select value={manualScene || String(asArray(per_scena)[0]?.numero || "")} onChange={(event) => setManualScene(event.target.value)} style={{ background: "#11131a", color: "#ddd", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", fontFamily: "sans-serif" }}>
                  {asArray(per_scena).map((scene) => (
                    <option key={scene.numero} value={scene.numero}>Sc.{scene.numero} - {scene.titolo || getSceneLocation(scene)}</option>
                  ))}
                </select>
                <select value={manualTargetDay || String(workPlan[0]?.giorno || 1)} onChange={(event) => setManualTargetDay(event.target.value)} style={{ background: "#11131a", color: "#ddd", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", fontFamily: "sans-serif" }}>
                  {(workPlan.length ? workPlan : [{ giorno: 1 }]).map((day) => (
                    <option key={day.giorno} value={day.giorno}>Giorno {day.giorno}</option>
                  ))}
                </select>
                <button onClick={() => moveSceneToDay(manualScene || asArray(per_scena)[0]?.numero, manualTargetDay || workPlan[0]?.giorno || 1)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#ddd", cursor: "pointer", fontSize: "11px", fontFamily: "sans-serif", fontWeight: "bold" }}>
                  Sposta nella giornata
                </button>
              </div>
            </div>
            {workPlan.length === 0 && (
              <EmptyBreakdownSection label="piano di lavoro. Usa un criterio di accorpamento o aggiungi una giornata manuale" />
            )}
            {castItems.length > 0 && (
              <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Legenda cast</div>
                <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                  {castItems.map((cast, castIndex) => (
                    <span key={`${cast.nome}-${castIndex}`} style={{ display: "inline-flex", gap: "6px", alignItems: "center", padding: "3px 8px", borderRadius: "16px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: "10px", fontFamily: "sans-serif", color: "#aaa" }}>
                      <strong style={{ color: "#ddd" }}>{castIndex + 1}</strong>
                      {cast.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {workPlan.map((g, index) => (
              <div key={`${g.giorno}-${index}`} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ background: "rgba(13,15,25,.92)", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "12px 16px", display: "grid", gridTemplateColumns: "86px 1fr auto", gap: "14px", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(200,169,110,.12)", border: "1px solid rgba(200,169,110,.25)", borderRadius: "6px", minHeight: "58px" }}>
                    <span style={{ fontSize: "10px", color: "#c8a96e", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>Giorno</span>
                    <span style={{ fontSize: "24px", color: "#f2dfb8", fontFamily: "sans-serif", fontWeight: "bold", lineHeight: 1 }}>{g.giorno}</span>
                    <span style={{ fontSize: "9px", color: "#777", fontFamily: "sans-serif" }}>di {workPlan.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px", minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", color: "#ddd", fontFamily: "sans-serif", fontWeight: "bold" }}>{g.data || g.date || "Data da definire"}</span>
                      <Badge label={getWorkDayTime(g)} color="#4FC3F7" small />
                      <Badge label={`${sceneNumbersFromDay(g).length} scene`} color="#c8a96e" small />
                      <Badge label={formatPageEighths(getWorkDayPageEighths(g))} color="#FFD54F" small />
                      <Badge label={`Cast ${getWorkDayCastIds(g).join(", ") || "n/d"}`} color="#CE93D8" small />
                      <Badge label={getWorkDayComplexity(g).replace(/_/g, " ")} color={complessitàProdColors[getWorkDayComplexity(g)] || "#888"} small />
                    </div>
                    <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", overflowWrap: "anywhere" }}>
                      Location riprese: <span style={{ color: "#bbb" }}>{getWorkDayLocations(g)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => moveWorkDay(index, -1)} disabled={index === 0} style={{ padding: "4px 8px", borderRadius: "5px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: index === 0 ? "#444" : "#ddd", cursor: index === 0 ? "not-allowed" : "pointer" }}>↑</button>
                    <button onClick={() => moveWorkDay(index, 1)} disabled={index === workPlan.length - 1} style={{ padding: "4px 8px", borderRadius: "5px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: index === workPlan.length - 1 ? "#444" : "#ddd", cursor: index === workPlan.length - 1 ? "not-allowed" : "pointer" }}>↓</button>
                    <button onClick={() => removeWorkDay(index)} style={{ padding: "4px 8px", borderRadius: "5px", border: "1px solid rgba(255,107,107,.18)", background: "rgba(255,107,107,.06)", color: "#FF6B6B", cursor: "pointer", fontSize: "11px", fontFamily: "sans-serif" }}>Elimina</button>
                  </div>
                </div>
                <div style={{ padding: "12px 16px 14px" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "10px", padding: "8px 10px", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.055)", borderRadius: "6px" }}>
                    <span style={{ fontSize: "10px", color: "#777", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>Orario giornata</span>
                    <input type="date" value={g.data_iso || ""} onChange={(event) => updateWorkDaySchedule(index, "data_iso", event.target.value)} style={{ background: "#11131a", color: "#ddd", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", padding: "5px 7px", fontSize: "12px", fontFamily: "sans-serif" }} />
                    <input type="time" value={g.ora_inizio || shootStartTime} onChange={(event) => updateWorkDaySchedule(index, "ora_inizio", event.target.value)} style={{ background: "#11131a", color: "#ddd", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", padding: "5px 7px", fontSize: "12px", fontFamily: "sans-serif" }} />
                    <input type="time" value={g.ora_fine || shootEndTime} onChange={(event) => updateWorkDaySchedule(index, "ora_fine", event.target.value)} style={{ background: "#11131a", color: "#ddd", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", padding: "5px 7px", fontSize: "12px", fontFamily: "sans-serif" }} />
                  </div>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {sceneNumbersFromDay(g).map(sc => (
                      <span key={sc} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "1px 6px", borderRadius: "20px", fontSize: "10px", fontFamily: "sans-serif", background: "rgba(200,169,110,.13)", color: "#c8a96e", border: "1px solid rgba(200,169,110,.28)", whiteSpace: "nowrap" }}>
                        Sc.{sc}
                        <button onClick={() => removeSceneFromDay(index, sc)} title="Rimuovi dalla giornata" style={{ border: "none", background: "transparent", color: "#c8a96e", cursor: "pointer", padding: 0, fontSize: "11px", lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#888", fontFamily: "sans-serif" }}>~{g.ore_stimate}h</span>
                </div>
                <div style={{ fontSize: "12px", color: "#aaa", fontFamily: "sans-serif", lineHeight: "1.5", fontStyle: "italic" }}>{g.motivazione}</div>
                <div style={{ marginTop: "12px", border: "1px solid rgba(255,255,255,.06)", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "52px minmax(160px, 1.2fr) 70px 90px minmax(120px, 1fr) 72px 86px", gap: "8px", alignItems: "center", padding: "7px 10px", background: "rgba(255,255,255,.055)", fontSize: "10px", color: "#777", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: ".8px" }}>
                    <span>Sc.</span>
                    <span>Set</span>
                    <span>I/E</span>
                    <span>Cast ID</span>
                    <span>Shoot location</span>
                    <span>Pages</span>
                    <span>Complessità</span>
                  </div>
                  {sceneNumbersFromDay(g).map((number) => {
                    const scene = sceneByNumber.get(number);
                    if (!scene) return null;
                    return (
                      <div key={number} style={{ display: "grid", gridTemplateColumns: "52px minmax(160px, 1.2fr) 70px 90px minmax(120px, 1fr) 72px 86px", gap: "8px", alignItems: "center", padding: "8px 10px", background: "rgba(255,255,255,.025)", borderTop: "1px solid rgba(255,255,255,.045)" }}>
                        <span style={{ fontSize: "11px", color: "#c8a96e", fontFamily: "monospace" }}>Sc.{number}</span>
                        <span style={{ fontSize: "12px", color: "#ddd", fontFamily: "sans-serif", overflowWrap: "anywhere" }}>
                          <strong style={{ display: "block", color: "#ddd", fontSize: "12px", marginBottom: "2px" }}>{getSceneLocation(scene)}</strong>
                          <span style={{ color: "#777", fontSize: "10px", lineHeight: "1.35" }}>{scene.note_regia || scene.titolo || "Descrizione da definire"}</span>
                        </span>
                        <Badge label={getSceneEnvironment(scene)} color="#4FC3F7" small />
                        <span style={{ fontSize: "11px", color: "#CE93D8", fontFamily: "monospace" }}>{getSceneCastIds(scene).join(", ") || "n/d"}</span>
                        <span style={{ fontSize: "11px", color: "#aaa", fontFamily: "sans-serif", overflowWrap: "anywhere" }}>{getSceneLocation(scene)}</span>
                        <span style={{ fontSize: "11px", color: "#FFD54F", fontFamily: "monospace" }}>{formatPageEighths(estimateSceneEighths(scene))}</span>
                        <Badge label={normalizeComplexity(scene.complessità).replace(/_/g, " ")} color={complessitàProdColors[normalizeComplexity(scene.complessità)] || "#888"} small />
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── App principale ───────────────────────────────────────────────────────────
let pdfJsPromise = null;

const loadPdfJs = async () => {
  if (globalThis.pdfjsLib?.getDocument) {
    globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return globalThis.pdfjsLib;
  }

  if (!pdfJsPromise) {
    pdfJsPromise = import(/* @vite-ignore */ PDFJS_CDN_URL).then((module) => {
      const pdfjsLib = module.default?.getDocument ? module.default : module;
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return pdfjsLib;
    });
  }

  return pdfJsPromise;
};

const readPdfInputFile = async (f) => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await f.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const rows = new Map();
    textContent.items.forEach((item) => {
      const str = "str" in item ? item.str : "";
      if (!str.trim()) return;
      const [, , , , x = 0, y = 0] = item.transform || [];
      const rowKey = Math.round(y);
      const row = rows.get(rowKey) || [];
      row.push({ x, str });
      rows.set(rowKey, row);
    });
    const pageText = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, row]) => row
        .sort((a, b) => a.x - b.x)
        .map((item) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    if (pageText) pages.push(pageText);
  }

  const text = pages.join("\n\n").trim();
  if (!text) {
    throw new Error("Il PDF non contiene testo selezionabile. Se è una scansione, serve prima un passaggio OCR.");
  }

  return text;
};

const readInputFile = async (f) => {
  const ext = f.name.split(".").pop().toLowerCase();
  if (ext === "txt") return await f.text();
  if (ext === "doc") {
    throw new Error("I vecchi file .doc non sono leggibili direttamente. Apri il documento in Word/LibreOffice e salvalo come .docx, oppure esportalo in PDF con testo selezionabile o TXT.");
  }
  if (ext === "docx") {
    try {
      const buf = await f.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      return result.value;
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("central directory") || message.includes("zip")) {
        throw new Error("Questo file non sembra un .docx valido. Se è un vecchio .doc o un file rinominato, convertilo prima in .docx, PDF con testo selezionabile o TXT.");
      }
      throw new Error(`Non riesco a leggere il DOCX: ${message || "file non valido"}`);
    }
  }
  if (ext === "pdf" || f.type === "application/pdf") return await readPdfInputFile(f);
  throw new Error("Formato non supportato. Usa TXT, DOCX o PDF con testo selezionabile.");
};

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(() => (
    window.localStorage.getItem(ONBOARDING_STORAGE) === ONBOARDING_FLOW_VERSION
  ));
  const [showAppTour, setShowAppTour] = useState(() => (
    window.localStorage.getItem(ONBOARDING_STORAGE) === ONBOARDING_FLOW_VERSION
    && window.localStorage.getItem(APP_TOUR_STORAGE) !== "true"
  ));
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
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [rememberApiKey, setRememberApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiProvider, setAiProvider] = useState("anthropic");
  const [lmStudioEndpoint, setLmStudioEndpoint] = useState(DEFAULT_LM_STUDIO_ENDPOINT);
  const [lmStudioModel, setLmStudioModel] = useState(DEFAULT_LM_STUDIO_MODEL);
  const [organicOptions, setOrganicOptions] = useState(DEFAULT_ORGANIC_OPTIONS);
  const fileInputRef = useRef();
  const onboardingButtonRef = useRef();
  const dropzoneRef = useRef();
  const apiKeyBoxRef = useRef();
  const rawTextBoxRef = useRef();
  const formatButtonRef = useRef();
  const tourTargets = useMemo(() => ({
    onboarding: onboardingButtonRef,
    dropzone: dropzoneRef,
    apiKey: apiKeyBoxRef,
    rawText: rawTextBoxRef,
    formatButton: formatButtonRef,
  }), []);

  const completeOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_STORAGE, ONBOARDING_FLOW_VERSION);
    window.localStorage.removeItem(APP_TOUR_STORAGE);
    setOnboardingComplete(true);
    setShowAppTour(true);
  };

  const openOnboarding = () => {
    window.localStorage.removeItem(ONBOARDING_STORAGE);
    window.localStorage.removeItem(APP_TOUR_STORAGE);
    setShowAppTour(false);
    setOnboardingComplete(false);
  };

  useEffect(() => {
    const pendingStoryDraft = window.localStorage.getItem(STORY_DRAFT_STORAGE);
    if (pendingStoryDraft) {
      try {
        const parsedDraft = JSON.parse(pendingStoryDraft);
        const draftText = typeof parsedDraft?.text === "string" ? parsedDraft.text : "";
        if (draftText.trim()) {
          setRawText(draftText);
          setFile(null);
          setElements(null);
          setAnalysis(null);
          setCharacterSheets(null);
          setBreakdown(null);
          setLocationSheets(null);
          setActiveTab("preview");
          window.localStorage.setItem(ONBOARDING_STORAGE, ONBOARDING_FLOW_VERSION);
          window.localStorage.setItem(APP_TOUR_STORAGE, "true");
          setOnboardingComplete(true);
          setShowAppTour(false);
        }
      } catch {
        if (pendingStoryDraft.trim()) {
          setRawText(pendingStoryDraft);
          window.localStorage.setItem(ONBOARDING_STORAGE, ONBOARDING_FLOW_VERSION);
          window.localStorage.setItem(APP_TOUR_STORAGE, "true");
          setOnboardingComplete(true);
          setShowAppTour(false);
        }
      } finally {
        window.localStorage.removeItem(STORY_DRAFT_STORAGE);
      }
    }

    const savedKey = window.localStorage.getItem(ANTHROPIC_KEY_STORAGE) || "";
    if (savedKey) {
      setAnthropicApiKey(savedKey);
      setRememberApiKey(true);
    }
    setAiProvider(window.localStorage.getItem(AI_PROVIDER_STORAGE) || "anthropic");
    const savedEndpoint = window.localStorage.getItem(LM_STUDIO_ENDPOINT_STORAGE) || "";
    setLmStudioEndpoint(
      isLocalAppHost && savedEndpoint === DIRECT_LM_STUDIO_ENDPOINT
        ? DEFAULT_LM_STUDIO_ENDPOINT
        : savedEndpoint || DEFAULT_LM_STUDIO_ENDPOINT
    );
    setLmStudioModel(window.localStorage.getItem(LM_STUDIO_MODEL_STORAGE) || DEFAULT_LM_STUDIO_MODEL);
  }, []);

  useEffect(() => {
    const trimmedKey = anthropicApiKey.trim();
    if (trimmedKey) {
      window.sessionStorage.setItem(ANTHROPIC_SESSION_KEY_STORAGE, trimmedKey);
    } else {
      window.sessionStorage.removeItem(ANTHROPIC_SESSION_KEY_STORAGE);
    }

    if (rememberApiKey && anthropicApiKey.trim()) {
      window.localStorage.setItem(ANTHROPIC_KEY_STORAGE, trimmedKey);
      return;
    }
    window.localStorage.removeItem(ANTHROPIC_KEY_STORAGE);
  }, [anthropicApiKey, rememberApiKey]);

  useEffect(() => {
    window.localStorage.setItem(AI_PROVIDER_STORAGE, aiProvider);
  }, [aiProvider]);

  useEffect(() => {
    window.localStorage.setItem(LM_STUDIO_ENDPOINT_STORAGE, lmStudioEndpoint.trim() || DEFAULT_LM_STUDIO_ENDPOINT);
  }, [lmStudioEndpoint]);

  useEffect(() => {
    window.localStorage.setItem(LM_STUDIO_MODEL_STORAGE, lmStudioModel.trim() || DEFAULT_LM_STUDIO_MODEL);
  }, [lmStudioModel]);

  const apiHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    const trimmedKey = anthropicApiKey.trim();
    if (trimmedKey) headers["X-Anthropic-API-Key"] = trimmedKey;
    return headers;
  };

  const isLocalAi = aiProvider === "lmstudio";

  const runLocalLmStudio = async ({ system, user, temperature = 0.1, output = "object", timeoutMs = LOCAL_LM_STUDIO_TIMEOUT_MS }) => {
    const endpoint = lmStudioEndpoint.trim() || DEFAULT_LM_STUDIO_ENDPOINT;
    const model = lmStudioModel.trim() || DEFAULT_LM_STUDIO_MODEL;
    const buildBody = (messages, temp = temperature, useJsonMode = true) => ({
      model,
      messages,
      temperature: temp,
      stream: false,
      ...(useJsonMode && output === "object" ? { response_format: { type: "json_object" } } : {}),
    });
    const sendRequest = async (messages, temp = temperature, useJsonMode = true) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBody(messages, temp, useJsonMode)),
          signal: controller.signal,
        });
        const payload = await res.json().catch(() => ({}));
        return { res, payload };
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new Error(`LM Studio ha impiegato più di ${Math.round(timeoutMs / 1000)} secondi per rispondere.`);
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
      }
    };
    let response;
    let data;
    try {
      ({ res: response, payload: data } = await sendRequest([
        { role: "system", content: system },
        { role: "user", content: user },
      ], temperature, true));
      if (!response.ok && output === "object") {
        ({ res: response, payload: data } = await sendRequest([
          { role: "system", content: system },
          { role: "user", content: user },
        ], temperature, false));
      }
    } catch (error) {
      if (error?.message?.includes("LM Studio ha impiegato")) throw error;
      throw new Error(
        "Non riesco a raggiungere LM Studio. Avvia il server locale OpenAI-compatible, controlla la porta 1234 e, se usi il sito pubblicato, abilita CORS in LM Studio."
      );
    }
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || "LM Studio ha rifiutato la richiesta. Controlla che il modello sia caricato e prova a ridurre la lunghezza del testo.");
    }
    const content = extractLmStudioContent(data);
    if (!content) throw new Error("LM Studio ha risposto senza contenuto.");
    try {
      return cleanAiJson(content);
    } catch (parseError) {
      const { res: repairResponse, payload: repairData } = await sendRequest([
          {
            role: "system",
            content: output === "array"
              ? "Sei un validatore JSON. Correggi la sintassi del testo ricevuto e restituisci SOLO un array JSON valido, senza markdown e senza spiegazioni. Non aggiungere nuove informazioni: ripara solo virgolette, virgole, due punti, parentesi quadre/graffe e wrapper. Ogni elemento deve essere un oggetto con type e content."
              : "Sei un validatore JSON. Correggi la sintassi del testo ricevuto e restituisci SOLO un oggetto JSON valido, senza markdown e senza spiegazioni. Non aggiungere nuove informazioni: ripara solo virgolette, virgole, due punti, parentesi e wrapper.",
          },
          {
            role: "user",
            content: `Errore parser: ${parseError.message}\n\nJSON da riparare:\n${content}`,
          },
        ], 0, false);
      if (!repairResponse.ok) {
        throw new Error(`LM Studio ha generato JSON non valido e la riparazione automatica non e riuscita: ${parseError.message}`);
      }
      const repairedContent = extractLmStudioContent(repairData);
      if (!repairedContent) throw new Error(`LM Studio ha generato JSON non valido: ${parseError.message}`);
      try {
        return cleanAiJson(repairedContent);
      } catch (repairError) {
        throw new Error(`LM Studio ha generato JSON non valido anche dopo il secondo tentativo: ${repairError.message}`);
      }
    }
  };

  const postAiJson = async (url, payload, localConfig) => {
    if (isLocalAi) return await runLocalLmStudio(localConfig);
    const response = await fetch(url, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Errore server");
    return data;
  };

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setError("");
    setElements(null);
    setAnalysis(null);
    setCharacterSheets(null);
    setBreakdown(null);
    setLocationSheets(null);
    setFile(f);
    try {
      const text = await readInputFile(f);
      setRawText(text);
    } catch (e) { setError(e.message); }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const applyTemplate = (template) => {
    setRawText(template.text);
    setFile(null);
    setElements(null);
    setAnalysis(null);
    setCharacterSheets(null);
    setBreakdown(null);
    setLocationSheets(null);
    setError("");
    setActiveTab("preview");
  };

  const importFormattedScreenplay = () => {
    const text = rawText.trim();
    if (!text) return;

    const parsedElements = parseFormattedScreenplayLocally(text);
    const sceneCount = parsedElements.filter(isRealSceneHeading).length;
    if (!parsedElements.length || sceneCount === 0) {
      setError("Non riconosco intestazioni scena tipo INT., EST. o EXT. nel testo. Per una bozza non formattata usa Formattazione Creativa.");
      return;
    }

    setError("");
    setElements(parsedElements);
    setAnalysis(null);
    setCharacterSheets(null);
    setBreakdown(null);
    setLocationSheets(null);
    setActiveTab("preview");
  };

  const runFormatter = async (mode = "creative") => {
    if (!rawText.trim()) return;
    setLoading(true); setError(""); setElements(null); setAnalysis(null); setCharacterSheets(null); setBreakdown(null); setLocationSheets(null);
    try {
      const organicInstructions = buildOrganicInstructions(organicOptions);
      const modeLabel = mode === "conservative"
        ? "Parsing conservativo"
        : mode === "organic"
          ? "Riscrittura organica"
          : "Formattazione creativa";

      setLoadingMsg(`${modeLabel} in corso...`);
      const formatChunk = async (text, index = 0, total = 1) => {
        if (isLocalAi && total > 1) {
          setLoadingMsg(`${modeLabel} con LM Studio: blocco ${index + 1}/${total}...`);
        }
        const data = await postAiJson(API_FORMAT, { text, mode, organicOptions }, {
          system: LOCAL_FORMAT_PROMPTS[mode] || LOCAL_FORMAT_PROMPTS.creative,
          user: mode === "conservative"
            ? `Classifica in modo conservativo il seguente frammento come sceneggiatura cinematografica professionale. Restituisci solo gli elementi ricavati da questo frammento, senza riassumere i frammenti precedenti o successivi:\n\n${text}`
            : mode === "organic"
              ? `Rendi piu organico e cinematografico il seguente frammento di sceneggiatura, applicando questi parametri creativi:\n- ${organicInstructions}\n\nRestituisci solo gli elementi della sceneggiatura generati da questo frammento, senza spiegazioni:\n\n${text}`
            : `Adatta ed espandi creativamente il seguente frammento in sceneggiatura cinematografica professionale. Aggiungi materiale nuovo coerente: azioni, dialoghi, dettagli visivi, tensione e raccordi. Restituisci solo gli elementi della sceneggiatura generati da questo frammento, senza spiegazioni:\n\n${text}`,
          temperature: mode === "conservative" ? 0 : mode === "organic" ? 0.72 : 0.65,
          output: "array",
        });
        return normalizeElementsPayload(data, isLocalAi);
      };

      const formatChunkAdaptive = async (text, index = 0, total = 1, depth = 0) => {
        try {
          return await formatChunk(text, index, total);
        } catch (error) {
          if (!isLocalAi || text.length <= LOCAL_FORMAT_MIN_RETRY_CHARS || depth >= 3) {
            throw error;
          }
          const parts = splitTextAtNearestBoundary(text);
          if (parts.length < 2) throw error;
          setLoadingMsg(`${modeLabel} con LM Studio: riduco il blocco ${index + 1}/${total}...`);
          const results = [];
          for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
            results.push(...await formatChunkAdaptive(parts[partIndex], partIndex, parts.length, depth + 1));
          }
          return results;
        }
      };

      const chunks = isLocalAi ? splitTextForLocalFormatting(rawText) : [rawText];
      const formattedChunks = [];
      for (let index = 0; index < chunks.length; index += 1) {
        formattedChunks.push(...await formatChunkAdaptive(chunks[index], index, chunks.length));
      }

      if (!formattedChunks.length) {
        throw new Error("La formattazione non ha prodotto elementi validi.");
      }

      setElements(formattedChunks);
      setActiveTab("preview");
    } catch (e) {
      setError("Errore: " + e.message);
    } finally {
      setLoading(false); setLoadingMsg("");
    }
  };

  const runAnalysis = async () => {
    if (!elements) return;
    if (analysis) {
      setActiveTab("analisi");
      setAnalyTab("struttura");
      return;
    }
    setAnalyzing(true); setError(""); setLoadingMsg("Analisi drammaturgica in corso...");
    try {
      const analysisElements = isLocalAi ? compactElementsForAnalysis(elements) : elements;
      const localChunks = isLocalAi ? splitElementsForLocalAnalysis(analysisElements) : [];

      if (isLocalAi && localChunks.length > 1) {
        const partials = [];
        const startedAt = Date.now();
        for (let index = 0; index < localChunks.length; index += 1) {
          const chunk = localChunks[index];
          setLoadingMsg(`Analisi LM Studio: blocco ${index + 1}/${localChunks.length}...`);
          if (Date.now() - startedAt > LOCAL_ANALYSIS_TOTAL_BUDGET_MS) {
            partials.push({
              sceneOffset: chunk.sceneOffset,
              analysis: buildFallbackAnalysis(chunk.elements, `Budget massimo di ${Math.round(LOCAL_ANALYSIS_TOTAL_BUDGET_MS / 1000)} secondi raggiunto: blocco ${index + 1}/${localChunks.length} gestito localmente.`),
            });
            continue;
          }
          try {
            const data = await postAiJson(API_ANALYZE, { elements: chunk.elements }, {
              system: LOCAL_ANALYSIS_PROMPTS.analyze,
              user: `Analizza questo blocco ${index + 1}/${localChunks.length} di una sceneggiatura lunga in formato JSON. Il risultato deve popolare la dashboard per le sole scene presenti in questo blocco. Non lasciare vuoti struttura.atti, analisi_scene, personaggi o valutazione_globale se nel testo ci sono dati disponibili:\n\n${JSON.stringify(chunk.elements)}`,
              temperature: 0.2,
              timeoutMs: LOCAL_ANALYSIS_TIMEOUT_MS,
            });
            partials.push({
              sceneOffset: chunk.sceneOffset,
              analysis: unwrapLocalPayload(data, ["analysis", "analisi"]) || data,
            });
          } catch (chunkError) {
            console.warn(`Analisi LM Studio non valida sul blocco ${index + 1}, uso fallback locale:`, chunkError);
            partials.push({
              sceneOffset: chunk.sceneOffset,
              analysis: buildFallbackAnalysis(chunk.elements, `LM Studio ha prodotto JSON non valido sul blocco ${index + 1}/${localChunks.length}: ${chunkError.message}`),
            });
          }
        }
        setAnalysis(mergeLocalAnalysisChunks(partials, elements));
        setActiveTab("analisi");
        setAnalyTab("struttura");
        return;
      }

      const data = await postAiJson(API_ANALYZE, { elements: analysisElements }, {
        system: LOCAL_ANALYSIS_PROMPTS.analyze,
        user: `Analizza questa sceneggiatura in formato JSON. Il risultato deve popolare la dashboard, quindi non lasciare vuoti struttura.atti, analisi_scene, personaggi o valutazione_globale se nel testo ci sono dati disponibili:\n\n${JSON.stringify(analysisElements)}`,
        temperature: 0.2,
        timeoutMs: isLocalAi ? LOCAL_ANALYSIS_TIMEOUT_MS : undefined,
      });
      setAnalysis(isLocalAi ? unwrapLocalPayload(data, ["analysis", "analisi"]) : data.analysis);
      setActiveTab("analisi");
      setAnalyTab("struttura");
    } catch (e) {
      if (isLocalAi) {
        console.warn("Analisi LM Studio non valida, uso fallback locale:", e);
        setAnalysis(buildFallbackAnalysis(elements, `LM Studio non ha restituito JSON valido: ${e.message}`));
        setActiveTab("analisi");
        setAnalyTab("struttura");
        return;
      }
      setError("Errore analisi: " + e.message);
    } finally {
      setAnalyzing(false); setLoadingMsg("");
    }
  };

  const runCharacterSheets = async () => {
    if (!elements) return;
    if (characterSheets) {
      setActiveTab("schede");
      return;
    }
    setLoadingSheets(true); setError(""); setLoadingMsg("Generazione schede personaggio...");
    try {
      const sheetElements = isLocalAi ? compactElementsForAnalysis(elements) : elements;
      const data = await postAiJson(API_CHARACTER_SHEETS, { elements: sheetElements }, {
        system: LOCAL_ANALYSIS_PROMPTS.characterSheets,
        user: `Genera le schede personaggio complete per questa sceneggiatura:\n\n${JSON.stringify(sheetElements)}`,
        temperature: 0.2,
        timeoutMs: isLocalAi ? 45000 : undefined,
      });
      setCharacterSheets(isLocalAi ? unwrapLocalPayload(data, ["characterSheets", "character_sheets", "schede_personaggio", "schedePersonaggio"]) : data.characterSheets);
      setActiveTab("schede");
    } catch (e) {
      if (isLocalAi) {
        console.warn("Schede personaggio LM Studio non disponibili, uso fallback locale:", e);
        setCharacterSheets(buildFallbackCharacterSheets(elements, `LM Studio non ha generato schede personaggio entro il tempo utile: ${e.message}`));
        setActiveTab("schede");
        return;
      }
      setError("Errore schede: " + e.message);
    } finally {
      setLoadingSheets(false); setLoadingMsg("");
    }
  };

  const runLocationSheets = async () => {
    if (!elements) return;
    if (locationSheets) {
      setActiveTab("locations");
      return;
    }
    setLoadingLocations(true); setError("");
    try {
      const data = await postAiJson(API_LOCATION_SHEETS, { elements }, {
        system: LOCAL_ANALYSIS_PROMPTS.locationSheets,
        user: `Genera le schede location complete per questa sceneggiatura:\n\n${JSON.stringify(elements)}`,
        temperature: 0.2,
      });
      setLocationSheets(isLocalAi ? unwrapLocalPayload(data, ["locationSheets", "location_sheets", "schede_location", "schedeLocation"]) : data.locationSheets);
      setActiveTab("locations");
    } catch (e) {
      setError("Errore schede location: " + e.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  const runBreakdown = async () => {
    if (!elements) return;
    if (breakdown) {
      setActiveTab("breakdown");
      return;
    }
    setLoadingBreakdown(true); setError("");
    try {
      const data = await postAiJson(API_BREAKDOWN, { elements }, {
        system: LOCAL_ANALYSIS_PROMPTS.breakdown,
        user: `Genera il breakdown completo per reparti di questa sceneggiatura:\n\n${JSON.stringify(elements)}`,
        temperature: 0.2,
      });
      setBreakdown(isLocalAi ? unwrapLocalPayload(data, ["breakdown", "breakdown_reparti"]) : data.breakdown);
      setActiveTab("breakdown");
    } catch (e) {
      if (isLocalAi) {
        console.warn("Breakdown LM Studio non valido, genero fallback locale:", e);
        setBreakdown(buildFallbackBreakdown(elements));
        setActiveTab("breakdown");
        return;
      }
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
  @page{size:A4;margin:25mm 30mm 25mm 35mm}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:25mm 30mm 25mm 35mm;box-sizing:border-box}
  .title{text-align:center;font-weight:bold;font-size:14pt;margin-bottom:30px}
  .transition{text-align:right;text-transform:uppercase;margin:12px 0 4px}
  .scene-heading{display:flex;align-items:baseline;justify-content:space-between;gap:16px;font-weight:bold;text-transform:uppercase;text-decoration:underline;margin:20px 0 4px;break-inside:avoid}
  .scene-eighth{font-family:Arial,sans-serif;font-size:8pt;color:#666;text-transform:none;text-decoration:none;white-space:nowrap;font-weight:normal}
  .action{margin:8px 0}
  .character{margin-left:200px;text-transform:uppercase;font-weight:bold;margin-top:14px}
  .parenthetical{margin-left:140px;margin-right:160px;font-style:italic}
  .dialogue{margin-left:100px;margin-right:100px;margin-bottom:4px}
  .blank{height:1em}
  @media print{body{margin:0}.page{width:100%;padding:0}}
</style></head><body><div class="page">
${buildScreenplayHtml(elements)}
</div></body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${file ? file.name.replace(/\.[^.]+$/, "") : "sceneggiatura"}_sceneggiatura.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const openPdfPrint = ({ scenePageBreaks = false } = {}) => {
    if (!elements) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("Il browser ha bloccato l'apertura della finestra PDF. Abilita i popup per esportare in PDF.");
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><title>Sceneggiatura PDF</title>
<style>
  @page{size:A4;margin:25mm 30mm 25mm 35mm}
  body{font-family:'Courier New',monospace;font-size:12pt;margin:0;background:white;color:#111}
  .page{box-sizing:border-box}
  .title{text-align:center;font-weight:bold;font-size:14pt;margin-bottom:30px}
  .transition{text-align:right;text-transform:uppercase;margin:12px 0 4px}
  .scene-heading{display:flex;align-items:baseline;justify-content:space-between;gap:16px;font-weight:bold;text-transform:uppercase;text-decoration:underline;margin:20px 0 4px;break-inside:avoid}
  .scene-eighth{font-family:Arial,sans-serif;font-size:8pt;color:#666;text-transform:none;text-decoration:none;white-space:nowrap;font-weight:normal}
  .action{margin:8px 0}
  .character{margin-left:200px;text-transform:uppercase;font-weight:bold;margin-top:14px}
  .parenthetical{margin-left:140px;margin-right:160px;font-style:italic}
  .dialogue{margin-left:100px;margin-right:100px;margin-bottom:4px}
  .blank{height:1em}
  .page-break-before{break-before:page;page-break-before:always;margin-top:0}
</style></head><body><div class="page">
${buildScreenplayHtml(elements, { scenePageBreaks })}
</div><script>window.addEventListener("load",()=>{window.focus();window.print();});</script></body></html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const downloadPdf = () => {
    openPdfPrint();
  };

  const downloadPdfByScene = () => {
    openPdfPrint({ scenePageBreaks: true });
  };

  const exportReportPdf = (title, data) => {
    if (!data) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("Il browser ha bloccato l'apertura della finestra PDF. Abilita i popup per esportare in PDF.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildReportPrintHtml(title, data));
    printWindow.document.close();
  };

  const busy            = loading || analyzing || loadingSheets || loadingBreakdown || loadingLocations;
  const canFormat       = rawText.trim().length > 10 && !busy;
  const canImportDirect = rawText.trim().length > 10 && !busy;
  const canAnalyze      = !!elements && !busy;
  const canRunSheets    = !!elements && !busy;
  const canRunBreakdown = !!elements && !busy;
  const updateOrganicOption = (key, value) => {
    setOrganicOptions((current) => ({ ...current, [key]: value }));
  };

  const stats = elements ? {
    scene:     elements.filter(isRealSceneHeading).length,
    character: [...new Set(elements.filter((e) => e.type === "character").map((e) => e.content))].length,
    dialogue:  elements.filter((e) => e.type === "dialogue").length,
    action:    elements.filter((e) => e.type === "action").length,
  } : null;
  const scenePageEighths = useMemo(() => (
    elements ? getScenePageEighths(elements) : new Map()
  ), [elements]);

  const segnalazioniCount = analysis?.segnalazioni?.length || 0;
  const segnCritiche = analysis?.segnalazioni?.filter(s => s.gravita === "alta").length || 0;

  const s = {
    app:        { minHeight: "100vh", background: "linear-gradient(135deg,#0a0a0f,#111118,#0d0d15)", color: "#e8e8f0", fontFamily: "Georgia,serif", display: "flex", flexDirection: "column" },
    header:     { padding: "28px 40px 20px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", gap: "16px" },
    logo:       { width: "36px", height: "36px", background: "linear-gradient(135deg,#c8a96e,#e8c98e)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 },
    headerActions: { marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
    storyLink:  { background: "rgba(78,195,247,.12)", color: "#9adfff", border: "1px solid rgba(78,195,247,.35)", borderRadius: "8px", padding: "10px 14px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", fontFamily: "sans-serif", textDecoration: "none", whiteSpace: "nowrap" },
    homeActions: { display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" },
    homeStoryLink: { background: "linear-gradient(135deg,#4FC3F7,#0277BD)", color: "#fff", border: "1px solid rgba(79,195,247,.5)", borderRadius: "8px", padding: "12px 18px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", fontFamily: "sans-serif", textDecoration: "none", boxShadow: "0 12px 30px rgba(2,119,189,.2)" },
    main:       { display: "flex", flex: 1, overflow: "hidden" },
    sidebar:    { width: "340px", flexShrink: 0, padding: "24px", borderRight: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", gap: "18px", overflowY: "auto" },
    dropzone:   { border: `2px dashed ${dragOver ? "#c8a96e" : "rgba(200,169,110,.3)"}`, borderRadius: "10px", padding: "28px 20px", textAlign: "center", cursor: "pointer", transition: "all .2s", background: dragOver ? "rgba(200,169,110,.05)" : "rgba(255,255,255,.02)" },
    keyBox:     { background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" },
    keyInput:   { width: "100%", background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", color: "#ddd", fontFamily: "monospace", fontSize: "12px", padding: "10px", boxSizing: "border-box" },
    btn:        { background: "linear-gradient(135deg,#c8a96e,#b8994e)", color: "#0a0a0f", border: "none", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: canFormat ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: canFormat ? 1 : 0.4 },
    btnConservative: { background: canFormat ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.03)", color: canFormat ? "#e8e8f0" : "#777", border: "1px solid rgba(255,255,255,.14)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: canFormat ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: canFormat ? 1 : 0.45 },
    btnDirectImport: { background: canImportDirect ? "rgba(165,214,167,.1)" : "rgba(165,214,167,.04)", color: canImportDirect ? "#b8e6ba" : "#6e8d70", border: "1px solid rgba(165,214,167,.28)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: canImportDirect ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: canImportDirect ? 1 : 0.5 },
    btnOrganic: { background: canFormat ? "linear-gradient(135deg,#4FC3F7,#087EA4)" : "rgba(79,195,247,.12)", color: canFormat ? "#041016" : "#4FC3F7", border: "1px solid rgba(79,195,247,.42)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: canFormat ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: canFormat ? 1 : 0.5 },
    btnAnalyze: { background: canAnalyze ? "linear-gradient(135deg,#7C4DFF,#651FFF)" : "rgba(124,77,255,.15)", color: canAnalyze ? "#fff" : "#7C4DFF", border: "1px solid rgba(124,77,255,.4)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: canAnalyze ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: canAnalyze ? 1 : 0.5 },
    btnSheets:    { background: canRunSheets ? "linear-gradient(135deg,#00897B,#00695C)" : "rgba(0,137,123,.15)", color: canRunSheets ? "#fff" : "#00897B", border: "1px solid rgba(0,137,123,.4)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: canRunSheets ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: canRunSheets ? 1 : 0.5 },
    btnBreakdown: { background: canRunBreakdown ? "linear-gradient(135deg,#E65100,#BF360C)" : "rgba(230,81,0,.15)", color: canRunBreakdown ? "#fff" : "#E65100", border: "1px solid rgba(230,81,0,.4)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: canRunBreakdown ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: canRunBreakdown ? 1 : 0.5 },
    btnLocations: { background: !busy ? "linear-gradient(135deg,#0277BD,#01579B)" : "rgba(2,119,189,.15)", color: !busy ? "#fff" : "#0277BD", border: "1px solid rgba(2,119,189,.4)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: !busy ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: !busy ? 1 : 0.5 },
    btnDirector: { background: !busy ? "linear-gradient(135deg,#263238,#c8a96e)" : "rgba(200,169,110,.1)", color: !busy ? "#fff" : "#8a7650", border: "1px solid rgba(200,169,110,.35)", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", fontSize: "14px", cursor: !busy ? "pointer" : "not-allowed", width: "100%", fontFamily: "sans-serif", opacity: !busy ? 1 : 0.5 },
    btnSec:     { background: "rgba(255,255,255,.06)", color: "#ccc", border: "1px solid rgba(255,255,255,.12)", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", cursor: "pointer", fontFamily: "sans-serif", flex: 1 },
    organicPanel: { background: "rgba(79,195,247,.055)", border: "1px solid rgba(79,195,247,.18)", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" },
    organicSelect: { width: "100%", background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", color: "#ddd", fontFamily: "sans-serif", fontSize: "12px", padding: "9px", boxSizing: "border-box" },
    organicCheck: { display: "flex", alignItems: "center", gap: "7px", color: "#bbb", fontFamily: "sans-serif", fontSize: "12px", lineHeight: "1.35" },
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

  if (!onboardingComplete) {
    return <OnboardingLanding onStart={completeOnboarding} />;
  }

  return (
    <div style={s.app}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={s.logo}>DF</div>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "bold", letterSpacing: ".5px", color: "#f0ead8" }}>DeepFrame Script</div>
          <div style={{ fontSize: "12px", color: "#888", marginTop: "2px", fontFamily: "sans-serif", letterSpacing: "1px", textTransform: "uppercase" }}>Beyond Screenwriting · Script · Analisi · Produzione</div>
        </div>
        <div style={s.headerActions}>
          <a href="/crea-la-tua-storia/" style={s.storyLink}>
            Crea la tua storia
          </a>
          <button ref={onboardingButtonRef} type="button" onClick={openOnboarding} style={{ background: "rgba(255,255,255,.06)", color: "#ccc", border: "1px solid rgba(255,255,255,.12)", borderRadius: "7px", padding: "8px 12px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", fontFamily: "sans-serif" }}>
            Onboarding
          </button>
        </div>
      </div>

      <div style={s.main}>
        {/* SIDEBAR */}
        <div style={s.sidebar}>
          <div ref={dropzoneRef} style={s.dropzone} onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => fileInputRef.current?.click()}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📄</div>
            <div style={{ fontSize: "13px", color: "#aaa", fontFamily: "sans-serif", lineHeight: "1.6" }}>
              Trascina qui il tuo file<br />
              <strong style={{ color: "#c8a96e" }}>TXT · DOCX · PDF</strong><br />
              <span style={{ fontSize: "11px", opacity: .6 }}>oppure clicca per sfogliare</span>
            </div>
            <input ref={fileInputRef} type="file" accept=".txt,.docx,.doc,.pdf,application/pdf" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          {file && (
            <div style={{ background: "rgba(200,169,110,.15)", border: "1px solid rgba(200,169,110,.3)", borderRadius: "6px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontFamily: "sans-serif" }}>
              <span>📎</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "12px" }}>{file.name}</span>
              <span style={{ color: "#888", fontSize: "11px" }}>{(file.size / 1024).toFixed(0)} KB</span>
            </div>
          )}

          <div ref={apiKeyBoxRef} style={s.keyBox}>
            <div>
              <div style={s.label}>Motore AI</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setAiProvider("anthropic")}
                  style={{
                    ...s.btnSec,
                    flex: "initial",
                    padding: "9px 10px",
                    background: aiProvider === "anthropic" ? "rgba(200,169,110,.18)" : "rgba(255,255,255,.06)",
                    color: aiProvider === "anthropic" ? "#f0dba8" : "#ccc",
                    borderColor: aiProvider === "anthropic" ? "rgba(200,169,110,.45)" : "rgba(255,255,255,.12)",
                  }}
                >
                  Anthropic
                </button>
                <button
                  type="button"
                  onClick={() => setAiProvider("lmstudio")}
                  style={{
                    ...s.btnSec,
                    flex: "initial",
                    padding: "9px 10px",
                    background: aiProvider === "lmstudio" ? "rgba(79,195,247,.16)" : "rgba(255,255,255,.06)",
                    color: aiProvider === "lmstudio" ? "#9ee7ff" : "#ccc",
                    borderColor: aiProvider === "lmstudio" ? "rgba(79,195,247,.4)" : "rgba(255,255,255,.12)",
                  }}
                >
                  LM Studio locale
                </button>
              </div>
            </div>

            {aiProvider === "lmstudio" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <div style={s.label}>Endpoint locale</div>
                  <input
                    type="text"
                    value={lmStudioEndpoint}
                    onChange={(e) => setLmStudioEndpoint(e.target.value)}
                    placeholder={DEFAULT_LM_STUDIO_ENDPOINT}
                    spellCheck={false}
                    style={s.keyInput}
                  />
                </div>
                <div>
                  <div style={s.label}>Modello</div>
                  <input
                    type="text"
                    value={lmStudioModel}
                    onChange={(e) => setLmStudioModel(e.target.value)}
                    placeholder={DEFAULT_LM_STUDIO_MODEL}
                    spellCheck={false}
                    style={s.keyInput}
                  />
                </div>
                <div style={{ color: "#777", fontFamily: "sans-serif", fontSize: "11px", lineHeight: "1.5" }}>
                  Avvia LM Studio in locale, carica il modello e abilita il server OpenAI-compatible. La chiamata parte dal browser, non da Cloudflare.
                </div>
              </div>
            )}

            {aiProvider === "anthropic" && (
              <>
            <div>
              <div style={s.label}>API Anthropic personale</div>
              <input
                type={showApiKey ? "text" : "password"}
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
                spellCheck={false}
                style={s.keyInput}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", color: "#aaa", fontFamily: "sans-serif", fontSize: "12px", flex: 1, minWidth: "160px" }}>
                <input
                  type="checkbox"
                  checked={rememberApiKey}
                  onChange={(e) => setRememberApiKey(e.target.checked)}
                />
                Ricorda su questo browser
              </label>
              <button type="button" style={{ ...s.btnSec, flex: "0 0 auto", padding: "7px 10px", fontSize: "12px" }} onClick={() => setShowApiKey((value) => !value)}>
                {showApiKey ? "Nascondi" : "Mostra"}
              </button>
              {anthropicApiKey && (
                <button type="button" style={{ ...s.btnSec, flex: "0 0 auto", padding: "7px 10px", fontSize: "12px" }} onClick={() => { setAnthropicApiKey(""); setRememberApiKey(false); }}>
                  Cancella
                </button>
              )}
            </div>
            <div style={{ color: "#777", fontFamily: "sans-serif", fontSize: "11px", lineHeight: "1.5" }}>
              Se lasci vuoto questo campo, l'app userà la chiave configurata sul Worker, se presente.
            </div>
              </>
            )}
          </div>

          <div>
            <div style={s.label}>Template sceneggiatura</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "7px" }}>
              {SCREENPLAY_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  title={template.title}
                  style={{
                    border: "1px solid rgba(200,169,110,.22)",
                    background: "rgba(200,169,110,.07)",
                    color: "#c8a96e",
                    borderRadius: "7px",
                    padding: "8px 9px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    fontFamily: "sans-serif",
                    cursor: "pointer",
                    minHeight: "34px",
                  }}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={rawTextBoxRef}>
            <div style={s.label}>Testo grezzo</div>
            <textarea
              style={{ width: "100%", height: "160px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "8px", color: "#ccc", fontFamily: "monospace", fontSize: "12px", padding: "12px", resize: "vertical", boxSizing: "border-box", lineHeight: "1.5" }}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Oppure incolla direttamente il testo qui..."
            />
          </div>

          {error && <div style={s.error}>⚠️ {error}</div>}

          {/* Pulsanti Formatta */}
          <div ref={formatButtonRef} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button style={s.btnDirectImport} disabled={!canImportDirect} onClick={importFormattedScreenplay}>
              Carica già formattata senza AI
            </button>
            <div style={{ color: "#777", fontFamily: "sans-serif", fontSize: "11px", lineHeight: "1.5", marginTop: "-2px" }}>
              Usa questo se la sceneggiatura ha gia intestazioni INT./EST., personaggi e dialoghi. Dopo puoi avviare analisi, schede e breakdown.
            </div>
            <button style={s.btnConservative} disabled={!canFormat} onClick={() => runFormatter("conservative")}>
              {loading ? "Parsing in corso..." : "Parsing Conservativo"}
            </button>
            <button style={s.btn} disabled={!canFormat} onClick={() => runFormatter("creative")}>
              {loading ? "Formattazione in corso..." : "Formattazione Creativa"}
            </button>
            <div style={s.organicPanel}>
              <div style={s.label}>Intervento creativo</div>
              <select
                value={organicOptions.genre}
                onChange={(e) => updateOrganicOption("genre", e.target.value)}
                style={s.organicSelect}
              >
                <option value="neutral">Rendi piu organica</option>
                <option value="crime">Rendi piu crime</option>
                <option value="thriller">Rendi piu thriller</option>
                <option value="noir">Rendi piu noir</option>
                <option value="drama">Rendi piu drammatica</option>
                <option value="comedy">Rendi piu commedia</option>
              </select>
              <label style={s.organicCheck}>
                <input
                  type="checkbox"
                  checked={organicOptions.surprise}
                  onChange={(e) => updateOrganicOption("surprise", e.target.checked)}
                />
                Aggiungi un elemento sorpresa
              </label>
              <label style={s.organicCheck}>
                <input
                  type="checkbox"
                  checked={organicOptions.newCharacter}
                  onChange={(e) => updateOrganicOption("newCharacter", e.target.checked)}
                />
                Aggiungi un personaggio
              </label>
              <textarea
                value={organicOptions.note}
                onChange={(e) => updateOrganicOption("note", e.target.value)}
                placeholder="Nota libera: es. piu tensione tra madre e figlio, finale meno esplicito..."
                style={{ ...s.keyInput, minHeight: "62px", resize: "vertical", fontFamily: "sans-serif" }}
              />
              <button style={s.btnOrganic} disabled={!canFormat} onClick={() => runFormatter("organic")}>
                {loading ? "Riscrittura in corso..." : "Rendi più organica"}
              </button>
            </div>
          </div>

          {/* Pulsanti AI — appaiono solo dopo la formattazione */}
          {elements && (
            <button style={s.btnAnalyze} disabled={!canAnalyze} onClick={runAnalysis}>
              {analyzing ? "Analisi in corso..." : analysis ? "Apri Analisi Drammaturgica" : "Analisi Drammaturgica"}
            </button>
          )}
          {elements && (
            <button style={s.btnSheets} disabled={!canRunSheets} onClick={runCharacterSheets}>
              {loadingSheets ? "Generazione schede..." : characterSheets ? "Apri Schede Personaggio" : "Schede Personaggio"}
            </button>
          )}
          {elements && (
            <button style={s.btnBreakdown} disabled={!canRunBreakdown} onClick={runBreakdown}>
              {loadingBreakdown ? "Breakdown in corso..." : breakdown ? "Apri Breakdown Reparti" : "Breakdown Reparti"}
            </button>
          )}
          {elements && (
            <button style={s.btnLocations} disabled={busy} onClick={runLocationSheets}>
              {loadingLocations ? "Schede location..." : locationSheets ? "Apri Schede Location" : "Schede Location"}
            </button>
          )}
          {elements && (
            <button style={s.btnDirector} disabled={busy} onClick={() => setActiveTab("director")}>
              Director / Storyboard
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
                <button style={s.btnSec} onClick={downloadFountain}>.fountain</button>
                <button style={s.btnSec} onClick={downloadHtml}>.html</button>
                <button style={s.btnSec} onClick={downloadPdf}>.pdf</button>
                <button style={s.btnSec} onClick={downloadPdfByScene}>pdf/page</button>
              </div>
              <div style={{ fontSize: "10px", color: "#555", fontFamily: "sans-serif", marginTop: "6px" }}>
                .fountain → Final Draft, Fade In · .html → stampa · .pdf continuo · pdf/page → una scena per pagina
              </div>
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div style={s.content}>
          {/* Tab bar principale */}
          <div style={s.tabs}>
            {elements && (
              <>
              {tabBtn("preview", "Anteprima", activeTab === "preview")}
              {tabBtn("struttura", "Struttura", activeTab === "struttura")}
              {tabBtn("fountain", "Fountain", activeTab === "fountain")}
              </>
            )}
              {analysis && tabBtn("analisi", "Analisi", activeTab === "analisi")}
              {characterSheets && tabBtn("schede", "Schede", activeTab === "schede")}
              {breakdown && tabBtn("breakdown", "Breakdown", activeTab === "breakdown")}
              {locationSheets && tabBtn("locations", "Location", activeTab === "locations")}
              {elements && tabBtn("director", "Director", activeTab === "director")}
            {tabBtn("lumina", "Luci 3D", activeTab === "lumina")}
          </div>

          {!busy && (
            <>
              {activeTab === "schede" && characterSheets && (
                <div style={{ padding: "10px 24px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "flex-end" }}>
                  <button style={s.btnSec} onClick={() => exportReportPdf("Schede personaggio", characterSheets)}>Esporta PDF</button>
                </div>
              )}
              {activeTab === "breakdown" && breakdown && (
                <div style={{ padding: "10px 24px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "flex-end" }}>
                  <button style={s.btnSec} onClick={() => exportReportPdf("Breakdown reparti", breakdown)}>Esporta PDF</button>
                </div>
              )}
              {activeTab === "locations" && locationSheets && (
                <div style={{ padding: "10px 24px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "flex-end" }}>
                  <button style={s.btnSec} onClick={() => exportReportPdf("Schede location", locationSheets)}>Esporta PDF</button>
                </div>
              )}
            </>
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
                <div style={{ fontFamily: "monospace", color: "#555", fontSize: "11px" }}>Cast · Location · Props · Costumi · Piano di lavoro</div>
              </div>
            )}

            {/* Loading schede personaggio */}
            {loadingSheets && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", border: "3px solid rgba(0,137,123,.2)", borderTop: "3px solid #00897B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <div style={{ fontFamily: "sans-serif", color: "#80CBC4", fontSize: "14px" }}>{loadingMsg || "Generazione schede personaggio..."}</div>
                <div style={{ fontFamily: "monospace", color: "#555", fontSize: "11px" }}>Profilo · Relazioni · Produzione · Didattica</div>
              </div>
            )}

            {/* Loading analisi */}
            {analyzing && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", border: "3px solid rgba(124,77,255,.2)", borderTop: "3px solid #7C4DFF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <div style={{ fontFamily: "sans-serif", color: "#b39dff", fontSize: "14px" }}>{loadingMsg || "Analisi drammaturgica in corso..."}</div>
                <div style={{ fontFamily: "monospace", color: "#555", fontSize: "11px" }}>Struttura in 3 atti · Archi personaggi · Segnalazioni</div>
              </div>
            )}

            {/* Stato vuoto */}
            {!loading && !analyzing && !elements && activeTab !== "lumina" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px", color: "#666", fontFamily: "sans-serif" }}>
                <div style={{ fontSize: "48px" }}>🎞️</div>
                <div style={{ fontSize: "16px", color: "#555" }}>Carica un file e avvia la formattazione</div>
                <div style={{ fontSize: "13px", color: "#444", maxWidth: "340px", textAlign: "center", lineHeight: "1.6" }}>Dopo la formattazione potrai avviare l'analisi drammaturgica completa: struttura, personaggi, segnalazioni, valutazione.</div>
                <div style={s.homeActions}>
                  <a href="/crea-la-tua-storia/" style={s.homeStoryLink}>
                    Crea la tua storia
                  </a>
                </div>
              </div>
            )}

            {/* Tab: Lumina Studio */}
            {!busy && activeTab === "lumina" && (
              <LuminaStudioPanel />
            )}

            {/* Tab: DeepFrame Director */}
            {!busy && elements && activeTab === "director" && (
              <DeepFrameDirectorPanel elements={elements} />
            )}

            {/* Tab: Anteprima */}
            {!busy && elements && activeTab === "preview" && (
              <div style={s.previewWrap}><ScreenplayPreview elements={elements} /></div>
            )}

            {/* Tab: Struttura elementi */}
            {!busy && elements && activeTab === "struttura" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                {elements.map((el, i) => el.type !== "blank" && (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", fontFamily: "sans-serif", background: `${typeColors[el.type]}22`, color: typeColors[el.type], border: `1px solid ${typeColors[el.type]}44`, whiteSpace: "nowrap", minWidth: "90px", textAlign: "center" }}>
                      {typeLabels[el.type] || el.type}
                    </span>
                    <span style={{ fontFamily: "monospace", fontSize: "13px", color: "#ccc", lineHeight: "1.5" }}>{el.content}</span>
                    {isRealSceneHeading(el) && scenePageEighths.get(i) && (
                      <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontFamily: "sans-serif", background: "rgba(200,169,110,.12)", color: "#c8a96e", border: "1px solid rgba(200,169,110,.25)", whiteSpace: "nowrap" }}>
                        Scena {scenePageEighths.get(i).sceneNumber} · {scenePageEighths.get(i).label}
                      </span>
                    )}
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
                  {analyTabBtn("struttura", "Struttura", analyTab === "struttura", 0)}
                  {analyTabBtn("personaggi", "Personaggi", analyTab === "personaggi", 0)}
                  {analyTabBtn("scene", "Scene", analyTab === "scene", analysis.analisi_scene?.filter(s => s.problemi?.length > 0).length)}
                  {analyTabBtn("segnalazioni", "Segnalazioni", analyTab === "segnalazioni", segnalazioniCount)}
                  {analyTabBtn("valutazione", "Valutazione", analyTab === "valutazione", 0)}
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

      {showAppTour && (
        <AppGuidedOnboarding
          onClose={() => setShowAppTour(false)}
          targets={tourTargets}
        />
      )}
    </div>
  );
}
