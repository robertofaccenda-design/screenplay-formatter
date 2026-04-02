// netlify/functions/location-sheets.js
// Generazione automatica di schede location complete
// Utile per: scenografo, location manager, direttore di fotografia, docente

const SYSTEM_PROMPT = `Sei un location manager e scenografo cinematografico con 20 anni di esperienza, con una solida formazione nell'insegnamento della produzione audiovisiva. Analizza una sceneggiatura in formato JSON e genera schede location dettagliate, pronte per il location scouting e per uso didattico.

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
      "comparse_max_stimato": <numero, 0 se nessuna>,

      "descrizione_narrativa": "<come viene descritta o percepita la location nella storia, max 3 righe>",
      "atmosfera": "<aggettivi che ne descrivono il tono emotivo e visivo: es. claustrofobica, luminosa, alienante>",
      "funzione_drammaturgica": "<perché questa location esiste nella storia — cosa dice dei personaggi o del tema>",

      "caratteristiche_tecniche": {
        "dimensioni_stimate": "piccola" | "media" | "grande" | "molto_grande",
        "luce_naturale": true | false | "non_specificato",
        "direzione_luce_preferibile": "<es. luce da nord, controluce, luce morbida diffusa — deducibile dall'atmosfera>",
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
        "caratteristiche_fondamentali": "<cosa deve avere assolutamente la location — elementi non negoziabili>",
        "caratteristiche_desiderabili": "<elementi preferibili ma non essenziali>",
        "problemi_potenziali": "<rumore, permessi, accessibilità, meteo, continuità luce>",
        "permessi_necessari": true | false | "probabilmente",
        "alternative_studio": "<come si potrebbe ricostruire in studio se necessario>",
        "note_logistiche": "<parcheggio, carico/scarico, bagni, spazio regia/monitor>"
      },

      "piano_riprese": {
        "giorni_stimati": <numero>,
        "ore_stimate_totali": <numero>,
        "scene_consigliate_nello_stesso_giorno": [<lista numeri scena della stessa location>],
        "note_ottimizzazione": "<perché raggruppare queste scene — stesso set-up luce, stesso cast, ecc.>"
      },

      "fotografia": {
        "stile_suggerito": "<es. mano libera, steadicam, fisso su treppiede — in base all'atmosfera della scena>",
        "sfide_fotografiche": "<controluce, spazi stretti, luce artificiale da gestire ecc.>",
        "riferimenti_visivi": "<riferimenti a film o stili fotografici affini all'atmosfera richiesta>"
      },

      "scheda_didattica": {
        "concetto_chiave": "<il concetto di produzione più rilevante che questa location illustra>",
        "relazione_spazio_personaggio": "<come lo spazio riflette o contrasta i personaggi che lo abitano>",
        "domande_per_studenti": ["<domanda 1>", "<domanda 2>"],
        "nota_docente": "<commento critico per uso in aula: perché questa location funziona o no narrativamente>"
      }
    }
  ],

  "mappa_narrativa_locations": [
    {
      "location_a": "<nome>",
      "location_b": "<nome>",
      "relazione": "<come si relazionano narrativamente: contrasto, progressione, parallelismo, ritorno>",
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
    "note_generali": "<valutazione globale delle location: varietà, coerenza visiva, sfide produttive>"
  }
}

REGOLE:
- Identifica ogni location univoca dal testo, anche se appare con variazioni (es. "INT. UFFICIO - GIORNO" e "INT. UFFICIO - NOTTE" sono la stessa location)
- Assegna identificativi progressivi (LOC-01, LOC-02, ...)
- L'atmosfera deve essere concreta e visiva, non vaga
- I riferimenti visivi nella fotografia devono essere pertinenti e realistici (film esistenti)
- Le domande per studenti devono essere stimolanti e aprire riflessioni sulla relazione spazio-narrazione
- Se una location non è descritta in dettaglio, deduci dalle scene che vi si svolgono
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
            content: `Genera le schede location complete per questa sceneggiatura:\n\n${sceneggiatura}`,
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
    const result = JSON.parse(clean)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ locationSheets: result }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno: ' + err.message }),
    }
  }
}
