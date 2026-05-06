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

const BREAKDOWN_SYSTEM_PROMPT = `Sei un direttore di produzione cinematografica con 20 anni di esperienza e una solida base nell'insegnamento della produzione audiovisiva. Analizza una sceneggiatura in formato JSON e genera un breakdown completo per reparti, pronto per la pre-produzione.

Restituisci ESCLUSIVAMENTE un oggetto JSON valido con questa struttura:

{
  "riepilogo": {
    "totale_scene": <numero>,
    "personaggi_parlanti": <numero>,
    "location_uniche": <numero>,
    "scene_interne": <numero>,
    "scene_esterne": <numero>,
    "scene_giorno": <numero>,
    "scene_notte": <numero>,
    "giorni_ripresa_stimati": <numero intero>,
    "complessità_produttiva": "bassa" | "media" | "alta" | "molto_alta",
    "note_produzione": "<valutazione globale della complessità produttiva>"
  },
  "per_scena": [
    {
      "numero": <progressivo da 1>,
      "titolo": "<intestazione scena>",
      "interno_esterno": "INT" | "EST" | "INT/EST",
      "momento": "GIORNO" | "NOTTE" | "ALBA" | "TRAMONTO" | "NON_SPECIFICATO",
      "cast": ["<NOME1>", "<NOME2>"],
      "comparse_stimate": <numero>,
      "props_principali": ["<prop1>", "<prop2>"],
      "location_descrizione": "<descrizione breve della location>",
      "complessità": "bassa" | "media" | "alta",
      "elementi_speciali": [],
      "note_regia": "<note operative per il set>"
    }
  ],
  "reparti": {
    "cast": [],
    "locations": [],
    "props": [],
    "costumi": [],
    "effetti_speciali": [],
    "audio_musica": [],
    "veicoli": []
  },
  "piano_riprese_suggerito": [
    {
      "giorno": <numero>,
      "scene_consigliate": [<lista numeri scena>],
      "motivazione": "<perché raggruppare queste scene>",
      "ore_stimate": <numero>
    }
  ]
}

REGOLE:
- Numera le scene in ordine progressivo usando gli elementi "scene_heading"
- Estrai props solo da ciò che è esplicitamente menzionato nel testo
- Per i costumi, deduci dal testo o dal contesto; se non specificato indica "non specificato"
- Il piano riprese deve essere ottimizzato per ridurre i costi
- Se non ci sono effetti speciali, veicoli o altri elementi opzionali, restituisci array vuoti
- Restituisci SOLO il JSON valido, senza markdown, backtick o testo aggiuntivo.`;

const LOCATION_SHEETS_SYSTEM_PROMPT = `Sei un location manager e scenografo cinematografico con 20 anni di esperienza, con una solida formazione nell'insegnamento della produzione audiovisiva. Analizza una sceneggiatura in formato JSON e genera schede location dettagliate, pronte per il location scouting e per uso didattico.

Restituisci ESCLUSIVAMENTE un oggetto JSON valido con questa struttura:

{
  "locations": [
    {
      "nome": "<nome identificativo della location, chiaro e univoco>",
      "identificativo": "<es. LOC-01>",
      "tipo": "INT" | "EST" | "INT/EST",
      "scene": [<lista numeri scena>],
      "scene_count": <numero>,
      "momenti_giornata": ["GIORNO", "NOTTE", "ALBA", "TRAMONTO"],
      "personaggi_presenti": ["<NOME1>", "<NOME2>"],
      "comparse_max_stimato": <numero>,
      "descrizione_narrativa": "<come viene descritta o percepita la location nella storia>",
      "atmosfera": "<aggettivi che ne descrivono il tono emotivo e visivo>",
      "funzione_drammaturgica": "<perché questa location esiste nella storia>",
      "caratteristiche_tecniche": {
        "dimensioni_stimate": "piccola" | "media" | "grande" | "molto_grande",
        "luce_naturale": true | false | "non_specificato",
        "direzione_luce_preferibile": "<indicazione deducibile>",
        "acustica_stimata": "buona" | "problematica" | "eco" | "non_specificato",
        "accessibilità_attrezzatura": "facile" | "media" | "difficile" | "non_specificato",
        "spazio_per_troupe": "sufficiente" | "limitato" | "molto_limitato" | "non_specificato"
      },
      "allestimento": {
        "livello": "minimo" | "medio" | "importante" | "costruito_in_studio",
        "elementi_scenografia_identificati": ["<elemento1>", "<elemento2>"],
        "elementi_da_aggiungere": ["<elemento da portare in set>"],
        "elementi_da_rimuovere": ["<elemento da eliminare se location reale>"],
        "note_scenografo": "<indicazioni per il production designer>"
      },
      "scouting": {
        "tipo_ricerca": "location_reale" | "studio" | "misto" | "da_valutare",
        "caratteristiche_fondamentali": "<cosa deve avere assolutamente la location>",
        "caratteristiche_desiderabili": "<elementi preferibili ma non essenziali>",
        "problemi_potenziali": "<rumore, permessi, accessibilità, meteo, continuità luce>",
        "permessi_necessari": true | false | "probabilmente",
        "alternative_studio": "<come si potrebbe ricostruire in studio se necessario>",
        "note_logistiche": "<parcheggio, carico/scarico, bagni, spazio regia/monitor>"
      },
      "piano_riprese": {
        "giorni_stimati": <numero>,
        "ore_stimate_totali": <numero>,
        "scene_consigliate_nello_stesso_giorno": [<lista numeri scena>],
        "note_ottimizzazione": "<perché raggruppare queste scene>"
      },
      "fotografia": {
        "stile_suggerito": "<stile fotografico suggerito>",
        "sfide_fotografiche": "<sfide visive e tecniche>",
        "riferimenti_visivi": "<riferimenti a film o stili fotografici affini>"
      },
      "scheda_didattica": {
        "concetto_chiave": "<concetto di produzione rilevante>",
        "relazione_spazio_personaggio": "<come lo spazio riflette o contrasta i personaggi>",
        "domande_per_studenti": ["<domanda 1>", "<domanda 2>"],
        "nota_docente": "<commento critico per uso in aula>"
      }
    }
  ],
  "mappa_narrativa_locations": [
    {
      "location_a": "<nome>",
      "location_b": "<nome>",
      "relazione": "<contrasto, progressione, parallelismo, ritorno>",
      "transizione_scene": "<quale scena o momento connette le due location>"
    }
  ],
  "riepilogo_produzione": {
    "totale_locations": <numero>,
    "locations_interne": <numero>,
    "locations_esterne": <numero>,
    "giorni_totali_stimati": <numero>,
    "location_più_complessa": "<nome>",
    "location_più_ricorrente": "<nome>",
    "budget_scenografia_indicativo": "minimo" | "contenuto" | "medio" | "significativo",
    "note_generali": "<valutazione globale delle location>"
  }
}

REGOLE:
- Identifica ogni location univoca dal testo, anche se appare con variazioni
- Assegna identificativi progressivi (LOC-01, LOC-02, ...)
- L'atmosfera deve essere concreta e visiva, non vaga
- Se una location non è descritta in dettaglio, deduci dalle scene che vi si svolgono
- Restituisci SOLO il JSON valido, senza markdown, backtick o testo aggiuntivo.`;

const MAX_INPUT_CHARS = 120000;
const MAX_OUTPUT_ELEMENTS = 5000;
const MAX_ELEMENT_CONTENT_CHARS = 10000;
const MIN_SCREENPLAY_SCORE = 5;
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
  "Access-Control-Allow-Headers": "Content-Type, X-Anthropic-API-Key",
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

const getAnthropicApiKey = (request, env) => {
  const userApiKey = request.headers.get("X-Anthropic-API-Key")?.trim();
  return userApiKey || env.ANTHROPIC_API_KEY || "";
};

const missingApiKeyResponse = () => jsonResponse({
  error: "API key Anthropic non configurata. Inserisci la tua chiave personale nell'app oppure imposta ANTHROPIC_API_KEY nei secrets del Worker Cloudflare.",
}, 502);

const countMatches = (text, pattern) => (text.match(pattern) || []).length;

const validateScreenplayInput = (text) => {
  const normalized = text.replace(/\r/g, "\n").trim();
  const lower = normalized.toLowerCase();
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sceneHeadingCount = lines.filter((line) => (
    /^(?:int\.\/est\.?|int\.?|est\.?|i\/e|interno|esterno)(?:\s|$|[-–.])/i.test(line)
  )).length;

  const transitionCount = lines.filter((line) => (
    /^(cut to:|fade in:|fade out:|dissolvenza|stacco a:|taglio a:|fonduta|nero\.)$/i.test(line)
  )).length;

  const parentheticalCount = lines.filter((line) => (
    /^\(.{2,80}\)$/.test(line)
  )).length;

  let dialogueCueCount = 0;
  for (let index = 0; index < lines.length - 1; index += 1) {
    const current = lines[index];
    const next = lines[index + 1];
    const looksLikeCharacter = /^[A-ZÀ-ÖØ-Þ0-9][A-ZÀ-ÖØ-Þ0-9 '’.-]{1,34}$/.test(current)
      && !/[.!?;:]$/.test(current)
      && !/^(INT|EST|INTERNO|ESTERNO)\b/i.test(current);
    const looksLikeDialogue = next.length >= 3
      && next.length <= 220
      && !/^(INT|EST|INTERNO|ESTERNO)\b/i.test(next);

    if (looksLikeCharacter && looksLikeDialogue) dialogueCueCount += 1;
  }

  const screenplayTermCount = countMatches(
    lower,
    /\b(sceneggiatura|scena|personaggio|dialogo|voce fuori campo|v\.o\.|o\.s\.|campo|controcampo|dissolvenza|soggettiva|inquadratura)\b/g,
  );

  const administrativeTermCount = countMatches(
    lower,
    /\b(bando|avviso pubblico|capitolato|graduatoria|protocollo|determina|cig|cup|requisiti|domanda di partecipazione|scadenza|finanziamento|amministrazione|procedura|allegato|articolo|comma|ente pubblico|decreto|delibera)\b/g,
  );

  const screenplayScore = (sceneHeadingCount * 3)
    + (dialogueCueCount * 2)
    + transitionCount
    + Math.min(parentheticalCount, 4)
    + Math.min(screenplayTermCount, 4);

  if (administrativeTermCount >= 3 && screenplayScore < 10) {
    return {
      error: "Il documento sembra un bando o un testo amministrativo, non una sceneggiatura. Carica o incolla solo scene, dialoghi o testi narrativi in forma di sceneggiatura.",
    };
  }

  if (screenplayScore < MIN_SCREENPLAY_SCORE) {
    return {
      error: "Il testo non sembra una sceneggiatura. Inserisci un testo con intestazioni di scena, personaggi e dialoghi prima di avviare la formattazione.",
    };
  }

  return { ok: true };
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

    const screenplayValidation = validateScreenplayInput(text);
    if (screenplayValidation.error) {
      return jsonResponse({ error: screenplayValidation.error }, 422);
    }

    const apiKey = getAnthropicApiKey(request, env);
    if (!apiKey) {
      return missingApiKeyResponse();
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

    const apiKey = getAnthropicApiKey(request, env);
    if (!apiKey) {
      return missingApiKeyResponse();
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

    const apiKey = getAnthropicApiKey(request, env);
    if (!apiKey) {
      return missingApiKeyResponse();
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

const serializeElementsWithScenes = (elements) => {
  let sceneCount = 0;

  return elements
    .filter((element) => element?.type !== "blank")
    .map((element) => {
      if (element?.type === "scene_heading") sceneCount += 1;
      const type = String(element?.type || "action").toUpperCase();
      const prefix = element?.type === "scene_heading" ? `[SCENA ${sceneCount}][SCENE_HEADING]` : `[${type}]`;
      return `${prefix} ${String(element?.content || "").slice(0, 200)}`;
    })
    .join("\n");
};

const handleBreakdown = async (request, env) => {
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

    const apiKey = getAnthropicApiKey(request, env);
    if (!apiKey) {
      return missingApiKeyResponse();
    }

    const sceneggiatura = serializeElementsWithScenes(elements);

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
        system: BREAKDOWN_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Genera il breakdown completo per reparti di questa sceneggiatura:\n\n${sceneggiatura}`,
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
    const breakdown = JSON.parse(jsonrepair(clean));

    return jsonResponse({ breakdown });
  } catch (err) {
    return jsonResponse({ error: `Errore interno: ${err.message}` }, 500);
  }
};

const handleLocationSheets = async (request, env) => {
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

    const apiKey = getAnthropicApiKey(request, env);
    if (!apiKey) {
      return missingApiKeyResponse();
    }

    const sceneggiatura = serializeElementsWithScenes(elements);

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
        system: LOCATION_SHEETS_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Genera le schede location complete per questa sceneggiatura:\n\n${sceneggiatura}`,
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
    const locationSheets = JSON.parse(jsonrepair(clean));

    return jsonResponse({ locationSheets });
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

    if (url.pathname === "/api/breakdown") {
      return handleBreakdown(request, env);
    }

    if (url.pathname === "/api/location-sheets") {
      return handleLocationSheets(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
