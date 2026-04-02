// netlify/functions/analyze.js
// Assistente Drammaturgico AI — analisi strutturale e narrativa della sceneggiatura

const SYSTEM_PROMPT = `Sei un dramaturg e docente di sceneggiatura cinematografica con 30 anni di esperienza nell'insegnamento e nella produzione. Il tuo compito è analizzare una sceneggiatura in formato JSON (array di elementi tipizzati) e restituire ESCLUSIVAMENTE un oggetto JSON valido con l'analisi drammaturgica completa.

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
      "tipi_conflitto": ["interno", "interpersonale", "sociale", "con_ambiente"] (array, uno o più),
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
      "problemi": [] oppure uno o più tra: "dialogo_espositivo", "scena_ridondante", "troppo_telling", "conflitto_assente", "personaggio_piatto", "ritmo_lento",
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
    "punti_di_forza": ["<punto 1>", "<punto 2>", ...],
    "aree_di_miglioramento": ["<area 1>", "<area 2>", ...],
    "commento_docente": "<paragrafo di commento globale scritto come un docente di sceneggiatura, con riferimenti a tecniche narrative (Syd Field, McKee, Vogler ecc.) dove appropriato>"
  }
}

REGOLE FONDAMENTALI:
- Conta le scene usando solo gli elementi di tipo "scene_heading"
- Analizza i personaggi usando gli elementi "character" e "dialogue"
- Identifica i momenti chiave dal contenuto narrativo, non solo dalla posizione
- Le segnalazioni devono essere specifiche, utili e didatticamente motivate
- Il "commento_docente" deve essere professionale, dettagliato (min 3 righe) e utile sia all'autore che a un docente che usa il testo in classe
- Se la sceneggiatura è molto breve (meno di 5 scene), adatta l'analisi al contesto ma sii ugualmente preciso
- Restituisci SOLO il JSON valido, senza markdown, backtick o testo aggiuntivo`;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { elements } = JSON.parse(event.body || '{}')

    if (!elements || !Array.isArray(elements) || elements.length < 3) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Sceneggiatura non valida o troppo breve per l\'analisi.' }),
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key non configurata.' }),
      }
    }

    // Serializza gli elementi in un formato leggibile per il modello
    const sceneggiatura = elements
      .filter(e => e.type !== 'blank')
      .map(e => `[${e.type.toUpperCase()}] ${e.content}`)
      .join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analizza dramaturgicamente questa sceneggiatura e restituisci il JSON di analisi:\n\n${sceneggiatura}`,
          },
        ],
      }),
    })

    const data = await response.json()

    if (data.error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: data.error.message }),
      }
    }

    const raw = data.content?.find((b) => b.type === 'text')?.text || '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(clean)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno: ' + err.message }),
    }
  }
}
