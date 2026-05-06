// Cloudflare Worker for API routes when deploying to workers.dev with static assets.
import { jsonrepair } from "jsonrepair";

const FORMAT_SYSTEM_PROMPT = `Sei un esperto di sceneggiatura cinematografica professionale italiana e internazionale. Il tuo compito è analizzare un testo grezzo non formattato e restituire ESCLUSIVAMENTE un array JSON valido con gli elementi della sceneggiatura classificati e corretti.

REGOLE DI CLASSIFICAZIONE:
- "scene_heading": intestazioni di scena. Iniziano con INT., EST., INT./EST. o equivalenti. Mettile SEMPRE in MAIUSCOLO. Formato: INT./EST. LUOGO - GIORNO/NOTTE/ALBA/TRAMONTO
- "action": descrizioni di azione/ambientazione. Prima lettera maiuscola, testo normale. Scrivi in presente indicativo, stile visivo e cinematografico.
- "character": nome del personaggio prima di un dialogo. SEMPRE in MAIUSCOLO. Solo il nome, senza punteggiatura finale.
- "parenthetical": indicazione recitativa tra parentesi, dopo il nome personaggio o nel mezzo di un dialogo. Formato: (indicazione)
- "dialogue": testo del dialogo detto dal personaggio.
- "transition": transizioni tra scene (es. DISSOLVENZA IN:, TAGLIO A:, FONDUTA AL NERO:, FADE IN:, FADE OUT:, CUT TO:). SEMPRE in MAIUSCOLO, con i due punti dove appropriato.
- "title": titolo del film o del progetto, se presente all'inizio.
- "blank": riga vuota di separazione (content: "")

REGOLE DI CORREZIONE:
- Correggi errori ortografici e grammaticali in italiano
- Mantieni la lingua originale del testo (italiano o inglese)
- Inferisci il tipo di elemento dal contesto anche se non è esplicitamente segnalato
- Se una riga sembra un nome di personaggio prima di un dialogo, classificala come "character"
- Aggiungi intestazioni di scena mancanti se il contesto lo richiede
- Non inventare contenuto narrativo: solo riclassifica e correggi quello esistente

OUTPUT: Restituisci SOLO l'array JSON, senza markdown, senza backtick, senza spiegazioni.`;

const ANALYZE_SYSTEM_PROMPT = `Sei un dramaturg e docente di sceneggiatura cinematografica con 30 anni di esperienza nell'insegnamento e nella produzione. Il tuo compito è analizzare una sceneggiatura in formato JSON (array di elementi tipizzati) e restituire ESCLUSIVAMENTE un oggetto JSON valido con l'analisi drammaturgica completa.

STRUTTURA DELL'OUTPUT — restituisci SEMPRE tutti questi campi:

{
  "struttura": {
    "totale_scene": <numero intero>,
    "atti": [
      {
        "atto": 1,
        "scene_da": <numero prima scena>,
        "scene_a": <numero ultima scena>,
        "percentuale": "<es. 25%>",
        "funzione_narrativa": "<descrizione della funzione drammaturgica dell'atto>",
        "valutazione": "efficace" | "debole" | "assente",
        "note_docente": "<spiegazione didattica del perché l'atto funziona o no>"
      },
      ... (sempre 3 atti, anche se la struttura è sbilanciata)
    ],
    "momenti_chiave": [
      {
        "tipo": "inciting_incident" | "primo_punto_di_svolta" | "midpoint" | "secondo_punto_di_svolta" | "climax",
        "scena_numero": <numero scena o null se assente>,
        "descrizione": "<cosa succede in questo momento>",
        "valutazione": "efficace" | "debole" | "assente",
        "nota_docente": "<spiegazione didattica: perché questo momento è importante e se funziona>"
      }
    ]
  },
  "personaggi": [
    {
      "nome": "<NOME IN MAIUSCOLO>",
      "battute": <numero>,
      "arco": "crescita" | "regressione" | "statico" | "trasformazione_ambigua" | "assente",
      "analisi_arco": "<descrizione dell'arco del personaggio nel testo>",
      "tipi_conflitto": ["interno", "interpersonale", "sociale", "con_ambiente"],
      "presenza_scene": <numero di scene in cui appare>,
      "nota_docente": "<analisi didattica: l'arco funziona? è coerente? cosa manca?>"
    }
  ],
  "analisi_scene": [
    {
      "numero": <progressivo da 1>,
      "titolo": "<intestazione della scena>",
      "conflitto": "alto" | "medio" | "basso" | "assente",
      "funzione": "esposizione" | "sviluppo" | "svolta" | "climax" | "risoluzione" | "transizione",
      "problemi": [],
      "nota": "<breve commento sulla scena, max 2 righe>"
    }
  ],
  "segnalazioni": [
    {
      "tipo": "dialogo_espositivo" | "scena_ridondante" | "squilibrio_showing_telling" | "conflitto_assente" | "arco_incompleto" | "ritmo_irregolare" | "struttura_squilibrata",
      "gravita": "alta" | "media" | "bassa",
      "scena_numero": <numero scena o null se globale>,
      "elemento": "<citazione o riferimento al testo problematico, max 80 caratteri>",
      "spiegazione": "<perché è un problema drammaturgico, in termini didattici>",
      "suggerimento": "<come si potrebbe migliorare, con riferimento a tecniche o esempi>"
    }
  ],
  "valutazione_globale": {
    "punteggio_struttura": <da 1 a 10>,
    "punteggio_personaggi": <da 1 a 10>,
    "punteggio_dialoghi": <da 1 a 10>,
    "punteggio_ritmo": <da 1 a 10>,
    "punti_di_forza": ["<punto 1>", "<punto 2>"],
    "aree_di_miglioramento": ["<area 1>", "<area 2>"],
    "commento_docente": "<paragrafo di commento globale scritto come un docente di sceneggiatura>"
  }
}

REGOLE FONDAMENTALI:
- Conta le scene usando solo gli elementi di tipo "scene_heading"
- Analizza i personaggi usando gli elementi "character" e "dialogue"
- Identifica i momenti chiave dal contenuto narrativo, non solo dalla posizione
- Le segnalazioni devono essere specifiche, utili e didatticamente motivate
- Se la sceneggiatura è molto breve (meno di 5 scene), adatta l'analisi al contesto ma sii ugualmente preciso
- Restituisci SOLO il JSON valido, senza markdown, backtick o testo aggiuntivo`;

const CHARACTER_SHEETS_SYSTEM_PROMPT = `Sei un dramaturg e script analyst con esperienza sia nella produzione cinematografica professionale che nell'insegnamento accademico della scrittura creativa. Il tuo compito è generare schede personaggio dettagliate a partire da una sceneggiatura in formato JSON.

Restituisci ESCLUSIVAMENTE un oggetto JSON valido con questa struttura:

{
  "personaggi": [
    {
      "nome": "<NOME IN MAIUSCOLO, esattamente come appare in sceneggiatura>",
      "ruolo": "protagonista" | "antagonista" | "deuteragonista" | "personaggio_secondario" | "comparsa",
      "genere_presunto": "M" | "F" | "non_specificato",
      "presenza": {
        "scene_totali": <numero di scene in cui appare>,
        "prima_scena": <numero scena>,
        "ultima_scena": <numero scena>,
        "scene_numeri": [<lista numeri scene>],
        "battute_totali": <numero>,
        "percentuale_dialogo": "<es. 34%>"
      },
      "profilo_narrativo": {
        "descrizione_in_una_riga": "<chi è questo personaggio in una frase>",
        "motivazione_principale": "<cosa vuole ottenere nel corso della storia>",
        "bisogno_profondo": "<cosa gli manca davvero, spesso inconscio>",
        "paura_principale": "<cosa teme di più>",
        "difetto_principale": "<il suo limite o vizio drammatico>",
        "pregio_principale": "<la sua qualità più evidente>",
        "arco_narrativo": "<descrizione del cambiamento — o della sua assenza — nel corso della storia>",
        "citazione_rappresentativa": "<la battuta più significativa del personaggio, citata testualmente dalla sceneggiatura>"
      },
      "relazioni": [
        {
          "con": "<NOME PERSONAGGIO>",
          "tipo": "amore" | "amicizia" | "rivalità" | "dipendenza" | "mentore" | "antagonismo" | "parentela" | "professionale" | "ambigua",
          "descrizione": "<come si manifesta questa relazione nella storia, max 2 righe>"
        }
      ],
      "conflitti": {
        "interno": "<conflitto psicologico o morale dentro il personaggio, se presente>",
        "interpersonale": "<conflitto principale con un altro personaggio>",
        "sociale_o_ambientale": "<conflitto con il mondo esterno, la società, le circostanze>"
      },
      "scheda_produzione": {
        "caratteristiche_fisiche_deducibili": "<età approssimativa, aspetto fisico, dettagli deducibili dal testo>",
        "costumi_accessori": "<elementi di costume o accessori menzionati o deducibili>",
        "note_casting": "<suggerimenti per il casting basati sul profilo del personaggio>",
        "complessità_interpretativa": "alta" | "media" | "bassa",
        "presenza_scena_difficile": true | false,
        "note_regia": "<note tecniche utili al regista: posizionamento, dinamiche con altri personaggi, momenti chiave>"
      },
      "scheda_didattica": {
        "funzione_drammaturgica": "<perché questo personaggio esiste nella storia — qual è la sua funzione narrativa>",
        "archetipo": "<archetipo di riferimento: es. eroe, mentore, ombra, impostore, trickster, ecc.>",
        "domande_per_l_autore": ["<domanda 1 per approfondire il personaggio>", "<domanda 2>", "<domanda 3>"],
        "nota_docente": "<commento critico del docente: cosa funziona, cosa manca, come svilupparlo ulteriormente>"
      }
    }
  ],
  "mappa_relazioni": [
    {
      "da": "<PERSONAGGIO A>",
      "a": "<PERSONAGGIO B>",
      "tipo": "<tipo relazione>",
      "intensità": "alta" | "media" | "bassa"
    }
  ],
  "note_ensemble": "<commento globale sull'insieme dei personaggi: equilibrio, dinamiche di gruppo, eventuali squilibri o assenze>"
}

REGOLE:
- Includi TUTTI i personaggi con almeno 2 battute. Escludi le comparse senza nome con meno di 2 battute.
- Ordina i personaggi per numero di battute decrescente.
- La "citazione_rappresentativa" deve essere una battuta reale presente nella sceneggiatura, non inventata.
- Le "domande_per_l_autore" devono essere domande aperte e stimolanti, utili in un workshop di scrittura.
- Se un'informazione non è deducibile dal testo, indica "non specificato" invece di inventare.
- Restituisci SOLO il JSON valido, senza markdown, backtick o testo aggiuntivo.`;

const MAX_INPUT_CHARS = 120000;
const MAX_OUTPUT_ELEMENTS = 5000;
const MAX_ELEMENT_CONTENT_CHARS = 10000;
const ALLOWED_ELEMENT_TYPES = new Set([
  "scene_heading",
  "action",
  "character",
  "parenthetical",
  "dialogue",
  "transition",
  "title",
  "blank",
]);

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const jsonResponse = (payload, status = 200) => (
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders })
);

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractAnthropicError = (payload, statusCode) => {
  if (payload?.error?.message) return payload.error.message;
  if (typeof payload?.error === "string") return payload.error;
  if (typeof payload?.message === "string") return payload.message;
  return `Errore Anthropic (${statusCode}).`;
};

const parseElementsFromTextBlock = (textBlock) => {
  if (!textBlock || typeof textBlock !== "string") return null;

  const cleaned = textBlock.replace(/```json|```/gi, "").trim();
  const parsedDirect = safeJsonParse(cleaned);
  if (Array.isArray(parsedDirect)) return parsedDirect;

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return null;

  const parsedMatched = safeJsonParse(arrayMatch[0]);
  return Array.isArray(parsedMatched) ? parsedMatched : null;
};

const validateElements = (elements) => {
  if (!Array.isArray(elements)) {
    return { error: "La risposta AI deve essere un array JSON." };
  }

  if (!elements.length) {
    return { error: "La risposta AI non contiene elementi." };
  }

  if (elements.length > MAX_OUTPUT_ELEMENTS) {
    return { error: "La risposta AI contiene troppi elementi. Riduci il testo e riprova." };
  }

  const normalizedElements = [];

  for (let index = 0; index < elements.length; index += 1) {
    const el = elements[index];
    const position = index + 1;

    if (!el || typeof el !== "object" || Array.isArray(el)) {
      return { error: `Elemento ${position} non valido: ogni elemento deve essere un oggetto.` };
    }

    if (typeof el.type !== "string" || !el.type.trim()) {
      return { error: `Elemento ${position} non valido: manca il campo "type".` };
    }

    const type = el.type.trim();
    if (!ALLOWED_ELEMENT_TYPES.has(type)) {
      return { error: `Elemento ${position} non valido: tipo "${type}" non supportato.` };
    }

    if (typeof el.content !== "string") {
      return { error: `Elemento ${position} non valido: il campo "content" deve essere testo.` };
    }

    const content = type === "blank" ? "" : el.content.trim();
    if (type !== "blank" && !content) {
      return { error: `Elemento ${position} non valido: il contenuto non può essere vuoto.` };
    }

    if (content.length > MAX_ELEMENT_CONTENT_CHARS) {
      return { error: `Elemento ${position} non valido: contenuto troppo lungo.` };
    }

    normalizedElements.push({ type, content });
  }

  return { elements: normalizedElements };
};

const handleFormat = async (request, env) => {
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: jsonHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await request.text();
    const parsedBody = safeJsonParse(rawBody || "{}");
    const text = typeof parsedBody?.text === "string" ? parsedBody.text : "";

    if (!text || text.trim().length < 10) {
      return jsonResponse({ error: "Testo troppo breve o assente." }, 400);
    }

    if (text.length > MAX_INPUT_CHARS) {
      return jsonResponse({ error: "Testo troppo lungo. Riduci il contenuto e riprova." }, 413);
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return jsonResponse({
        error: "API key non configurata. Imposta ANTHROPIC_API_KEY nei secrets del Worker Cloudflare.",
      }, 502);
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: FORMAT_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Analizza e formatta il seguente testo come sceneggiatura cinematografica professionale:\n\n${text}`,
          },
        ],
      }),
    });

    const rawResponseBody = await response.text();
    const data = safeJsonParse(rawResponseBody);

    if (!response.ok) {
      return jsonResponse({ error: extractAnthropicError(data, response.status) }, 500);
    }

    if (!data) {
      return jsonResponse({ error: "Risposta non valida dal provider AI." }, 502);
    }

    const raw = data.content?.find((block) => block.type === "text")?.text;
    const elements = parseElementsFromTextBlock(raw);
    if (!elements) {
      return jsonResponse({ error: "La risposta AI non è in formato JSON valido." }, 502);
    }

    const validationResult = validateElements(elements);
    if (validationResult.error) {
      return jsonResponse({ error: validationResult.error }, 502);
    }

    return jsonResponse({ elements: validationResult.elements });
  } catch (err) {
    return jsonResponse({ error: `Errore interno: ${err.message}` }, 500);
  }
};

const handleAnalyze = async (request, env) => {
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: jsonHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await request.text();
    const parsedBody = safeJsonParse(rawBody || "{}");
    const elements = parsedBody?.elements;

    if (!Array.isArray(elements) || elements.length < 3) {
      return jsonResponse({ error: "Sceneggiatura non valida o troppo breve per l'analisi." }, 400);
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return jsonResponse({
        error: "API key non configurata. Imposta ANTHROPIC_API_KEY nei secrets del Worker Cloudflare.",
      }, 502);
    }

    const sceneggiatura = elements
      .filter((element) => element?.type !== "blank")
      .map((element) => `[${String(element?.type || "action").toUpperCase()}] ${String(element?.content || "").slice(0, 200)}`)
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 6000,
        system: ANALYZE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Analizza dramaturgicamente questa sceneggiatura e restituisci il JSON di analisi:\n\n${sceneggiatura}`,
          },
        ],
      }),
    });

    const rawResponseBody = await response.text();
    const data = safeJsonParse(rawResponseBody);

    if (!response.ok) {
      return jsonResponse({ error: extractAnthropicError(data, response.status) }, 500);
    }

    const raw = data?.content?.find((block) => block.type === "text")?.text || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(jsonrepair(clean));

    return jsonResponse({ analysis });
  } catch (err) {
    return jsonResponse({ error: `Errore interno: ${err.message}` }, 500);
  }
};

const handleCharacterSheets = async (request, env) => {
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: jsonHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await request.text();
    const parsedBody = safeJsonParse(rawBody || "{}");
    const elements = parsedBody?.elements;

    if (!Array.isArray(elements) || elements.length < 3) {
      return jsonResponse({ error: "Sceneggiatura non valida o troppo breve." }, 400);
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return jsonResponse({
        error: "API key non configurata. Imposta ANTHROPIC_API_KEY nei secrets del Worker Cloudflare.",
      }, 502);
    }

    let sceneCount = 0;
    const sceneggiatura = elements
      .filter((element) => element?.type !== "blank")
      .map((element) => {
        if (element?.type === "scene_heading") sceneCount += 1;
        const type = String(element?.type || "action").toUpperCase();
        const prefix = element?.type === "scene_heading" ? `[SCENA ${sceneCount}][${type}]` : `[${type}]`;
        return `${prefix} ${String(element?.content || "").slice(0, 200)}`;
      })
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 6000,
        system: CHARACTER_SHEETS_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Genera le schede personaggio complete per questa sceneggiatura:\n\n${sceneggiatura}`,
          },
        ],
      }),
    });

    const rawResponseBody = await response.text();
    const data = safeJsonParse(rawResponseBody);

    if (!response.ok) {
      return jsonResponse({ error: extractAnthropicError(data, response.status) }, 500);
    }

    const raw = data?.content?.find((block) => block.type === "text")?.text || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const characterSheets = JSON.parse(jsonrepair(clean));

    return jsonResponse({ characterSheets });
  } catch (err) {
    return jsonResponse({ error: `Errore interno: ${err.message}` }, 500);
  }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/format") {
      return handleFormat(request, env);
    }

    if (url.pathname === "/api/analyze") {
      return handleAnalyze(request, env);
    }

    if (url.pathname === "/api/character-sheets") {
      return handleCharacterSheets(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
