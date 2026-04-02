// netlify/functions/breakdown.js
// Breakdown automatico per reparti di produzione cinematografica
// Output usabile da: 1° assistente regia, scenografo, costumista, direttore di produzione, docente

const SYSTEM_PROMPT = `Sei un direttore di produzione cinematografica con 20 anni di esperienza e una solida base nell'insegnamento della produzione audiovisiva. Analizza una sceneggiatura in formato JSON e genera un breakdown completo per reparti, pronto per la pre-produzione.

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
    "giorni_ripresa_stimati": <numero intero, stima realistica per produzione indipendente>,
    "complessità_produttiva": "bassa" | "media" | "alta" | "molto_alta",
    "note_produzione": "<valutazione globale della complessità produttiva, sfide principali, consigli>"
  },

  "per_scena": [
    {
      "numero": <progressivo da 1>,
      "titolo": "<intestazione scena>",
      "interno_esterno": "INT" | "EST" | "INT/EST",
      "momento": "GIORNO" | "NOTTE" | "ALBA" | "TRAMONTO" | "NON_SPECIFICATO",
      "cast": ["<NOME1>", "<NOME2>"],
      "comparse_stimate": <numero, 0 se non necessarie>,
      "props_principali": ["<prop1>", "<prop2>"],
      "location_descrizione": "<descrizione breve della location>,
      "complessità": "bassa" | "media" | "alta",
      "elementi_speciali": [],
      "note_regia": "<note operative per il set di questa scena, max 1 riga>"
    }
  ],

  "reparti": {
    "cast": [
      {
        "nome": "<NOME IN MAIUSCOLO>",
        "ruolo_tipo": "protagonista" | "secondario" | "comparsa_parlante",
        "scene": [<lista numeri scena>],
        "giorni_lavoro_stimati": <numero>,
        "continuità_costume": "<eventuali cambio d'abito o elementi di continuità da gestire>",
        "note_casting": "<note brevi sul tipo di interprete>"
      }
    ],

    "locations": [
      {
        "nome": "<nome identificativo della location>",
        "tipo": "interno" | "esterno" | "misto",
        "scene": [<lista numeri scena>],
        "allestimento": "minimo" | "medio" | "importante" | "costruito_in_studio",
        "note_ricerca": "<cosa cercare in location scouting>",
        "problemi_potenziali": "<rumore, permessi, accessibilità, luce naturale ecc.>"
      }
    ],

    "props": [
      {
        "oggetto": "<nome preciso del prop>",
        "scene": [<lista numeri scena>],
        "tipo": "praticabile" | "decorativo" | "arma" | "veicolo" | "elettronico" | "animale" | "cibo",
        "note": "<eventuali requisiti speciali: funzionante, periodo storico, quantità ecc.>"
      }
    ],

    "costumi": [
      {
        "personaggio": "<NOME>",
        "capi_identificati": ["<capo1>", "<capo2>"],
        "scene": [<lista numeri scena>],
        "cambi_costume": <numero>,
        "note_continuità": "<attenzione alla continuità tra scene non consecutive>",
        "periodo_stile": "<contemporaneo, storico, fantasy, ecc.>"
      }
    ],

    "effetti_speciali": [
      {
        "tipo": "<descrizione effetto>",
        "scena": <numero>,
        "categoria": "SFX_pratico" | "VFX_digitale" | "stunt" | "pirotecnica" | "atmosferico",
        "complessità": "bassa" | "media" | "alta",
        "note": "<requisiti tecnici>"
      }
    ],

    "audio_musica": [
      {
        "elemento": "<descrizione>",
        "scena": <numero>,
        "tipo": "musica_diegietica" | "effetto_sonoro" | "voiceover" | "ambiente",
        "note": "<note per il sound design>"
      }
    ],

    "veicoli": [
      {
        "veicolo": "<descrizione>",
        "scene": [<lista numeri scena>],
        "note": "<requisiti: in movimento, fermo, epoca, ecc.>"
      }
    ]
  },

  "piano_riprese_suggerito": [
    {
      "giorno": <numero>,
      "scene_consigliate": [<lista numeri scena>],
      "motivazione": "<perché raggruppare queste scene: stessa location, stesso cast, stessa luce ecc.>",
      "ore_stimate": <numero>
    }
  ]
}

REGOLE:
- Numera le scene in ordine progressivo usando gli elementi "scene_heading"
- Estrai i props SOLO da ciò che è esplicitamente menzionato nel testo (azioni o dialoghi), non inventare
- Per i costumi, deduci dal testo o dal contesto; se non specificato indica "non specificato"
- Il piano riprese deve essere ottimizzato per ridurre i costi (raggruppare per location, per cast, per luce)
- Se non ci sono effetti speciali, veicoli o altri elementi opzionali, restituisci array vuoti
- Stima i giorni di ripresa considerando una produzione indipendente italiana (8-10 ore/giorno, 3-5 scene/giorno)
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
        body: JSON.stringify({ error: 'Sceneggiatura non valida o troppo breve.' }),
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

    let sceneCount = 0
    const sceneggiatura = elements
      .filter(e => e.type !== 'blank')
      .map(e => {
        if (e.type === 'scene_heading') sceneCount++
        const prefix = e.type === 'scene_heading'
          ? `[SCENA ${sceneCount}][SCENE_HEADING]`
          : `[${e.type.toUpperCase()}]`
        return `${prefix} ${e.content}`
      })
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
            content: `Genera il breakdown completo per reparti di questa sceneggiatura:\n\n${sceneggiatura}`,
          },
        ],
      }),
    })

    const data = await response.json()

    console.log('[breakdown] API status:', response.status, JSON.stringify(data.error || ''))
    if (data.error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: data.error?.message || JSON.stringify(data.error) || 'Errore API Anthropic' }),
      }
    }

    const raw = data.content?.find((b) => b.type === 'text')?.text || '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ breakdown: result }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Errore interno: ${err.message}` }),
    }
  }
}
