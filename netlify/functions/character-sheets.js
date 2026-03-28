// netlify/functions/character-sheets.js
// Generazione automatica di schede personaggio complete
// Utile per: casting, pre-produzione, analisi didattica, workshop

const SYSTEM_PROMPT = `Sei un dramaturg e script analyst con esperienza sia nella produzione cinematografica professionale che nell'insegnamento accademico della scrittura creativa. Il tuo compito è generare schede personaggio dettagliate a partire da una sceneggiatura in formato JSON.

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
- Ordina i personaggi per numero di battute decrescente (dal protagonista alle figure minori).
- La "citazione_rappresentativa" deve essere una battuta reale presente nella sceneggiatura, non inventata.
- Le "domande_per_l_autore" devono essere domande aperte e stimolanti, utili in un workshop di scrittura.
- La "nota_docente" deve essere professionale e didatticamente motivata.
- Se un'informazione non è deducibile dal testo, indica "non specificato" invece di inventare.
- Restituisci SOLO il JSON valido, senza markdown, backtick o testo aggiuntivo.`;

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

    // Serializza con numerazione scene progressiva
    let sceneCount = 0
    const sceneggiatura = elements
      .filter(e => e.type !== 'blank')
      .map(e => {
        if (e.type === 'scene_heading') sceneCount++
        const prefix = e.type === 'scene_heading' ? `[SCENA ${sceneCount}][${e.type.toUpperCase()}]` : `[${e.type.toUpperCase()}]`
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Genera le schede personaggio complete per questa sceneggiatura:\n\n${sceneggiatura}`,
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
      body: JSON.stringify({ characterSheets: result }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno: ' + err.message }),
    }
  }
}
