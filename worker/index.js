// Cloudflare Worker for API routes when deploying to workers.dev with static assets.
import { jsonrepair } from "jsonrepair";

const CREATIVE_FORMAT_SYSTEM_PROMPT = `Sei un esperto sceneggiatore cinematografico, script doctor e story editor. Il tuo compito è trasformare un testo grezzo, una storia generata o un documento sorgente in una sceneggiatura cinematografica piu ricca, drammatizzata e sviluppata. Restituisci ESCLUSIVAMENTE un array JSON valido con gli elementi della sceneggiatura.

REGOLE DI CLASSIFICAZIONE:
- "scene_heading": intestazioni di scena. Iniziano con INT., EST., INT./EST. o equivalenti. Mettile SEMPRE in MAIUSCOLO. Formato: INT./EST. LUOGO - GIORNO/NOTTE/ALBA/TRAMONTO
- "action": descrizioni di azione/ambientazione. Prima lettera maiuscola, testo normale. Scrivi in presente indicativo, stile visivo e cinematografico.
- "character": nome del personaggio prima di un dialogo. SEMPRE in MAIUSCOLO. Solo il nome, senza punteggiatura finale.
- "parenthetical": indicazione recitativa tra parentesi, dopo il nome personaggio o nel mezzo di un dialogo. Formato: (indicazione)
- "dialogue": testo del dialogo detto dal personaggio.
- "transition": transizioni tra scene (es. DISSOLVENZA IN:, TAGLIO A:, FONDUTA AL NERO:, FADE IN:, FADE OUT:, CUT TO:). SEMPRE in MAIUSCOLO, con i due punti dove appropriato.
- "title": titolo del film o del progetto, se presente all'inizio.
- "blank": riga vuota di separazione (content: "")

REGOLE DI ADATTAMENTO CREATIVO:
- Espandi creativamente il materiale di partenza: aggiungi azioni visive, atmosfera, dettagli d'ambiente, micro-conflitti, raccordi e ritmo scenico.
- Crea dialoghi nuovi quando servono a rendere la scena drammatica, comprensibile e cinematografica.
- Se il testo nasce da "Crea la tua storia" o da un PDF narrativo, trasformalo in scene compiute invece di limitarti a riclassificarlo.
- Mantieni la lingua originale e non tradire il nucleo della storia, i personaggi, il tono e il tema.
- Inferisci personaggi, luoghi e scene dal contesto anche se non sono esplicitamente segnalati.
- Aggiungi intestazioni di scena INT./EST. quando servono per costruire una sceneggiatura leggibile.
- Scrivi le azioni in presente indicativo, in stile visivo, concreto e cinematografico.
- Correggi errori ortografici e grammaticali in italiano.

OUTPUT: Restituisci SOLO l'array JSON, senza markdown, senza backtick, senza spiegazioni.`;

const CONSERVATIVE_FORMAT_SYSTEM_PROMPT = `Sei un parser conservativo di sceneggiature. Il tuo compito è trasformare un testo grezzo in un array JSON valido classificando ogni riga o blocco senza aggiungere contenuto e senza migliorare lo stile.

REGOLE DI CLASSIFICAZIONE:
- Usa solo questi tipi: "scene_heading", "action", "character", "parenthetical", "dialogue", "transition", "title", "blank".
- Classifica le intestazioni di scena esistenti come "scene_heading" solo se sono gia presenti o chiaramente esplicite.
- Classifica i nomi dei personaggi come "character" quando precedono una battuta.
- Classifica le battute come "dialogue", le descrizioni come "action", le indicazioni tra parentesi come "parenthetical", le transizioni esistenti come "transition".
- Mantieni le righe vuote come "blank" con content: "" quando servono a preservare la separazione.

REGOLE DI NEUTRALITA:
- Non aggiungere scene, intestazioni, azioni, personaggi, battute, transizioni o dettagli non presenti nel testo originale.
- Non riscrivere in stile piu cinematografico.
- Non correggere grammatica, ortografia, punteggiatura, accenti o tempi verbali, salvo normalizzare maiuscole/minuscole strettamente richieste dal formato per scene heading, character e transition.
- Non completare frasi ambigue e non chiarire cio che il testo lascia implicito.
- Se una riga e ambigua, scegli il tipo piu probabile ma lascia il contenuto invariato.

OUTPUT: Restituisci SOLO l'array JSON, senza markdown, senza backtick, senza spiegazioni.`;

const ORGANIC_FORMAT_SYSTEM_PROMPT = `Sei un esperto sceneggiatore cinematografico, script doctor e story editor. Il tuo compito è rendere un testo grezzo o una sceneggiatura piu organica, coerente e cinematografica, applicando i parametri creativi richiesti dall'utente. Restituisci ESCLUSIVAMENTE un array JSON valido con gli elementi della sceneggiatura.

REGOLE DI CLASSIFICAZIONE:
- Usa solo questi tipi: "scene_heading", "action", "character", "parenthetical", "dialogue", "transition", "title", "blank".
- Le intestazioni di scena devono essere in maiuscolo e in formato INT./EST. LUOGO - GIORNO/NOTTE quando possibile.
- I nomi personaggio devono essere in maiuscolo e senza punteggiatura finale.
- Le azioni devono essere in presente indicativo, visive, concrete e cinematografiche.

REGOLE DI RISCRITTURA ORGANICA:
- Migliora raccordi, motivazioni, progressione causa-effetto, ritmo, conflitto e continuita emotiva.
- Applica solo i parametri creativi richiesti dall'utente: sorpresa, nuovo personaggio, virata di genere, tono o note libere.
- Se aggiungi un personaggio, dagli una funzione drammaturgica chiara e non decorativa.
- Se aggiungi un elemento sorpresa, preparalo con piccoli indizi e integralo nella scena senza effetto casuale.
- Se cambi genere o tono, riscrivi atmosfera, dettagli, conflitto e dialoghi in modo coerente.
- Mantieni lingua originale, nucleo della storia e personaggi gia presenti.
- Non spiegare le modifiche: restituisci direttamente la nuova sceneggiatura strutturata.

OUTPUT: Restituisci SOLO l'array JSON, senza markdown, senza backtick, senza spiegazioni.`;

const getFormatSystemPrompt = (mode) => (
  mode === "conservative"
    ? CONSERVATIVE_FORMAT_SYSTEM_PROMPT
    : mode === "organic"
      ? ORGANIC_FORMAT_SYSTEM_PROMPT
      : CREATIVE_FORMAT_SYSTEM_PROMPT
);

const ORGANIC_GENRE_LABELS = {
  neutral: "piu organica e fluida",
  crime: "piu crime",
  thriller: "piu thriller",
  noir: "piu noir",
  comedy: "piu commedia",
  drama: "piu drammatica",
};

const normalizeOrganicOptions = (options = {}) => ({
  genre: ORGANIC_GENRE_LABELS[options.genre] ? options.genre : "neutral",
  surprise: options.surprise !== false,
  newCharacter: options.newCharacter === true,
  note: typeof options.note === "string" ? options.note.trim().slice(0, 600) : "",
});

const buildOrganicInstructions = (options = {}) => {
  const normalized = normalizeOrganicOptions(options);
  const instructions = [
    `Direzione: rendi lo script ${ORGANIC_GENRE_LABELS[normalized.genre]}.`,
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

  if (normalized.note) {
    instructions.push(`Nota libera dell'autore: ${normalized.note}`);
  }

  return instructions.join("\n- ");
};

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

const BREAKDOWN_SYSTEM_PROMPT = `Sei un direttore di produzione cinematografica con 20 anni di esperienza e una solida base nell'insegnamento della produzione audiovisiva. Analizza una sceneggiatura in formato JSON e genera un breakdown operativo completo per reparti, pronto per la pre-produzione.

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
    "cast": [
      {
        "nome": "<nome personaggio>",
        "ruolo_tipo": "protagonista" | "secondario" | "figurazione" | "non_specificato",
        "scene": [<lista numeri scena>],
        "giorni_lavoro_stimati": <numero>,
        "continuità_costume": "<note di continuità o non_specificato>",
        "note_casting": "<indicazioni operative>"
      }
    ],
    "locations": [
      {
        "nome": "<nome luogo>",
        "tipo": "INT" | "EST" | "INT/EST" | "non_specificato",
        "scene": [<lista numeri scena>],
        "allestimento": "minimo" | "medio" | "importante" | "costruito_in_studio",
        "note_ricerca": "<note per location scouting>",
        "problemi_potenziali": "<permessi, rumore, accessi, sicurezza o non_specificato>"
      }
    ],
    "props": [
      {
        "oggetto": "<nome prop>",
        "tipo": "praticabile" | "decorativo" | "arma" | "veicolo" | "elettronico" | "animale" | "cibo" | "non_specificato",
        "scene": [<lista numeri scena>],
        "note": "<uso in scena o non_specificato>"
      }
    ],
    "costumi": [
      {
        "personaggio": "<nome personaggio>",
        "periodo_stile": "<epoca/stile o non_specificato>",
        "cambi_costume": <numero>,
        "scene": [<lista numeri scena>],
        "capi_identificati": ["<capo/accessorio>"],
        "note_continuità": "<note continuità o non_specificato>"
      }
    ],
    "comparse": [
      {
        "gruppo": "<descrizione gruppo>",
        "quantità_stimata": <numero>,
        "scene": [<lista numeri scena>],
        "note": "<note operative>"
      }
    ],
    "effetti_speciali": [],
    "audio_musica": [],
    "veicoli": []
  },
  "piano_lavoro_suggerito": [
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
- Estrai cast dagli elementi "character" e crea SEMPRE una voce per ogni personaggio parlante.
- Estrai locations dalle intestazioni scena e crea SEMPRE una voce per ogni location unica.
- Estrai props espliciti e deduci quelli produttivamente necessari dal contesto.
- Per i costumi, deduci dal testo o dal contesto; se non specificato indica "non_specificato".
- Stima comparse quando la scena implica folla, passanti, studenti, pubblico, soldati, clienti o gruppi.
- Il piano_lavoro_suggerito deve essere diviso in giornate, ottimizzato per location/cast/complessità.
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
  error: "Per usare le funzioni AI serve una chiave Anthropic. Inserisci la tua chiave personale nel campo dedicato e riprova. Se stai gestendo tu l'app, puoi anche configurare una chiave predefinita sul Worker.",
}, 502);

const getFallbackStoryChoices = (act) => act >= 5 ? [] : [
  "Accettare la sfida e andare avanti",
  "Cercare un aiuto prima di decidere",
  "Seguire una strada inattesa",
];

const cleanStoryText = (text) => text
  .replace(/^\s*#{1,6}\s*/, "")
  .replace(/^\s*\*\*([^\n]+?)\*\*(?=\s*(?:\n|$))/i, "$1")
  .replace(/\*\*/g, "")
  .replace(/\s+#{1,6}\s*titolo\s*:?\s*(?=\n|$)/i, "")
  .replace(/```json\s*$/i, "")
  .replace(/```\s*$/i, "")
  .replace(/(?:^|\n)\s*-{3,}\s*(?:\n\s*)?(?:#{1,6}\s*)?(?:\*\*)?\s*(?:scelte|scelte\s*[-:]\s*matrice\s*json|matrice\s*json)(?:\*\*)?\s*:?.*$/i, "")
  .replace(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(?:ecco le\s+)?scelte(?:\s*[-:]\s*matrice\s*json)?(?:\*\*)?\s*:?.*$/i, "")
  .replace(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?\s*matrice\s*json(?:\*\*)?\s*:?\s*$/i, "")
  .replace(/json\s*scelte_avventura\s*$/i, "")
  .replace(/json\s*:?\s*$/i, "")
  .trim();

const parseStoryResponse = (responseText, act) => {
  const fencedJsonMatch = responseText.match(/```json\s*([\s\S]*?)```/i);
  const objectStartIndex = responseText.lastIndexOf("{");
  const objectEndIndex = responseText.lastIndexOf("}");
  const arrayStartIndex = responseText.lastIndexOf("[");
  const arrayEndIndex = responseText.lastIndexOf("]");
  const hasChoicesObject = objectStartIndex !== -1
    && objectEndIndex > objectStartIndex
    && objectStartIndex < arrayStartIndex
    && /scelte_critiche|choices|scelte/i.test(responseText.slice(objectStartIndex, objectEndIndex + 1));

  let jsonStartIndex = arrayStartIndex;
  let choicesJson = "";

  if (fencedJsonMatch?.[1]) {
    jsonStartIndex = responseText.indexOf(fencedJsonMatch[0]);
    choicesJson = fencedJsonMatch[1].trim();
  } else if (hasChoicesObject) {
    jsonStartIndex = objectStartIndex;
    choicesJson = responseText.slice(objectStartIndex, objectEndIndex + 1);
  } else if (arrayStartIndex !== -1 && arrayEndIndex !== -1 && arrayEndIndex > arrayStartIndex) {
    choicesJson = responseText.slice(arrayStartIndex, arrayEndIndex + 1);
  } else {
    return {
      storyText: cleanStoryText(responseText),
      choices: getFallbackStoryChoices(act),
    };
  }

  const storyText = cleanStoryText(responseText.slice(0, jsonStartIndex));

  let parsedChoices;
  try {
    parsedChoices = JSON.parse(jsonrepair(choicesJson));
  } catch {
    if (act < 5) return { storyText, choices: getFallbackStoryChoices(act) };
    throw new Error("Le scelte non sono valide o sono vuote prima dell'atto finale.");
  }
  const choicesData = Array.isArray(parsedChoices)
    ? parsedChoices
    : parsedChoices?.scelte_critiche || parsedChoices?.choices || parsedChoices?.scelte;
  if (!Array.isArray(choicesData)) {
    if (act < 5) return { storyText, choices: getFallbackStoryChoices(act) };
    throw new Error("Le scelte non sono valide o sono vuote prima dell'atto finale.");
  }

  const choices = choicesData.map((choice) => {
    if (typeof choice === "string") return choice;
    if (choice && typeof choice === "object") {
      if (typeof choice.text === "string") return choice.text;
      if (typeof choice.descrizione === "string") return choice.descrizione;
      const firstStringValue = Object.values(choice).find((value) => typeof value === "string");
      if (firstStringValue) return firstStringValue;
    }
    return null;
  }).filter(Boolean);

  if (choices.length === 0 && act < 5) {
    return { storyText, choices: getFallbackStoryChoices(act) };
  }

  return { storyText, choices };
};

const countMatches = (text, pattern) => (text.match(pattern) || []).length;

const validateScreenplayInput = (text, mode = "creative") => {
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

  if (mode === "creative" || mode === "organic") {
    return { ok: true };
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
    const mode = ["conservative", "creative", "organic"].includes(parsedBody?.mode)
      ? parsedBody.mode
      : "creative";
    const organicInstructions = buildOrganicInstructions(parsedBody?.organicOptions);

    if (!text || text.trim().length < 10) {
      return jsonResponse({ error: "Testo troppo breve o assente." }, 400);
    }

    if (text.length > MAX_INPUT_CHARS) {
      return jsonResponse({ error: "Testo troppo lungo. Riduci il contenuto e riprova." }, 413);
    }

    const screenplayValidation = validateScreenplayInput(text, mode);
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        temperature: mode === "conservative" ? 0 : mode === "organic" ? 0.72 : 0.65,
        system: getFormatSystemPrompt(mode),
        messages: [
          {
            role: "user",
            content: mode === "conservative"
              ? `Classifica in modo conservativo il seguente testo come sceneggiatura cinematografica professionale:\n\n${text}`
              : mode === "organic"
                ? `Rendi piu organico e cinematografico il seguente testo, applicando questi parametri creativi:\n- ${organicInstructions}\n\nRestituisci solo la sceneggiatura strutturata in elementi JSON, senza spiegazioni:\n\n${text}`
              : `Adatta ed espandi creativamente il seguente testo in sceneggiatura cinematografica professionale. Aggiungi materiale nuovo coerente: azioni, dialoghi, dettagli visivi, tensione, raccordi e sviluppo drammaturgico. Non limitarti a riclassificare: costruisci una scena o sequenza piu completa a partire dal documento:\n\n${text}`,
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

const handleStory = async (request, env) => {
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: jsonHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await request.text();
    const parsedBody = safeJsonParse(rawBody || "{}");
    const prompt = typeof parsedBody?.prompt === "string" ? parsedBody.prompt : "";
    const systemInstruction = typeof parsedBody?.systemInstruction === "string" ? parsedBody.systemInstruction : "";
    const act = Number.isFinite(Number(parsedBody?.act)) ? Number(parsedBody.act) : 1;

    if (!prompt.trim() || !systemInstruction.trim()) {
      return jsonResponse({ error: "Dati storia mancanti o non validi." }, 400);
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
        model: "claude-sonnet-5",
        max_tokens: 2200,
        temperature: 0.7,
        system: systemInstruction,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const rawResponseBody = await response.text();
    const data = safeJsonParse(rawResponseBody);

    if (!response.ok) {
      return jsonResponse({ error: extractAnthropicError(data, response.status) }, 500);
    }

    const text = data?.content?.find((block) => block.type === "text")?.text || "";
    if (!text) {
      return jsonResponse({ error: "Risposta vuota dal provider AI." }, 502);
    }

    const story = parseStoryResponse(text, act);
    return jsonResponse(story);
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

    if (url.pathname === "/api/story") {
      return handleStory(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
