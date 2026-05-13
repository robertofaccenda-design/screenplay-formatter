// netlify/functions/format.js
// Proxy sicuro verso Anthropic API
// La ANTHROPIC_API_KEY rimane sul server, mai esposta al browser
import { jsonrepair } from 'jsonrepair'

const CREATIVE_SYSTEM_PROMPT = `Sei un esperto di sceneggiatura cinematografica professionale italiana e internazionale. Il tuo compito è analizzare un testo grezzo non formattato e restituire ESCLUSIVAMENTE un array JSON valido con gli elementi della sceneggiatura classificati e corretti.

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

const CONSERVATIVE_SYSTEM_PROMPT = `Sei un parser conservativo di sceneggiature. Il tuo compito è trasformare un testo grezzo in un array JSON valido classificando ogni riga o blocco senza aggiungere contenuto e senza migliorare lo stile.

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

const getSystemPrompt = (mode) => (
  mode === "conservative" ? CONSERVATIVE_SYSTEM_PROMPT : CREATIVE_SYSTEM_PROMPT
);

export const handler = async (event) => {
  // Solo POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { text, mode: rawMode } = JSON.parse(event.body || '{}')
    const mode = rawMode === 'conservative' ? 'conservative' : 'creative'
    if (!text || text.trim().length < 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Testo troppo breve o assente.' }),
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key non configurata. Imposta ANTHROPIC_API_KEY nelle variabili d\'ambiente Netlify.' }),
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        system: getSystemPrompt(mode),
        messages: [
          {
            role: 'user',
            content: `${mode === 'conservative' ? 'Classifica in modo conservativo' : 'Analizza e formatta'} il seguente testo come sceneggiatura cinematografica professionale:\n\n${text}`,
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

    const raw = data.content?.find((b) => b.type === 'text')?.text || '[]'
    const clean = raw.replace(/```json|```/g, '').trim()
    const elements = JSON.parse(jsonrepair(clean))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ elements }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno: ' + err.message }),
    }
  }
}
