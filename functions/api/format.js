// Cloudflare Pages Function: /api/format
// Proxy sicuro verso Anthropic API. La chiave resta in Cloudflare, mai nel browser.

const SYSTEM_PROMPT = `Sei un esperto di sceneggiatura cinematografica professionale italiana e internazionale. Il tuo compito è analizzare un testo grezzo non formattato e restituire ESCLUSIVAMENTE un array JSON valido con gli elementi della sceneggiatura classificati e corretti.

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

export const onRequestOptions = () => (
  new Response("", { status: 200, headers: jsonHeaders })
);

export const onRequestPost = async ({ request, env }) => {
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
        error: "API key non configurata. Imposta ANTHROPIC_API_KEY nelle variabili Cloudflare Pages.",
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
        system: SYSTEM_PROMPT,
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

export const onRequest = () => jsonResponse({ error: "Method not allowed" }, 405);
