
import type { Character } from '../types';

const API_STORY = '/api/story';
const ANTHROPIC_KEY_STORAGE = 'screenplayFormatter.anthropicApiKey';
const ANTHROPIC_SESSION_KEY_STORAGE = 'screenplayFormatter.anthropicApiKey.session';

const getActSystemInstruction = (act: number, narrativeStructure: string, narrativeTone: string): string => {
  let baseInstruction = `Sei un narratore educativo e creativo per studenti di scuola media (11-14 anni). Le tue storie sono coinvolgenti e inseriscono in modo sottile fatti educativi. Il tuo tono è ${narrativeTone}, incoraggiante e stimolante. Mantieni la coerenza con i personaggi principali definiti nel prompt e assicurati di coinvolgerli attivamente nella narrazione, non solo il protagonista. La parte della storia dovrebbe essere di circa 150 parole.`;
  
  switch (narrativeStructure) {
    case 'pixar':
      baseInstruction += ` Stai seguendo la classica struttura narrativa della Pixar.`;
      switch (act) {
        case 1: return `${baseInstruction} Inizia con "C'era una volta...". Presenta un personaggio nel suo mondo ordinario e la sua routine quotidiana. Termina con tre scelte che introducono un elemento di rottura, in una matrice JSON.`;
        case 2: return `${baseInstruction} Continua con "Un giorno...". Il personaggio affronta l'incidente scatenante che rompe la sua routine. Deve prendere una decisione che lo porta fuori dalla sua zona di comfort. Termina con tre scelte che lo spingono nell'avventura, in una matrice JSON.`;
        case 3: return `${baseInstruction} Prosegui con "A causa di ciò...". Descrivi le prime conseguenze della sua decisione. Il personaggio affronta una serie di prove e difficoltà crescenti, impara nuove regole e incontra alleati o nemici. Aumenta la posta in gioco. Termina con tre scelte difficili, in una matrice JSON.`;
        case 4: return `${baseInstruction} Continua con un altro "A causa di ciò...". La situazione precipita. Il personaggio tocca il fondo, affronta la sua più grande paura o fallisce miseramente. Questo è il momento più buio prima dell'alba. Termina con tre scelte che rappresentano un'ultima, disperata speranza, in una matrice JSON.`;
        case 5: return `${baseInstruction} Concludi con "Finché finalmente...". Il personaggio, grazie a ciò che ha imparato, trova la forza di rialzarsi e affrontare la sfida finale, risolvendo il conflitto. Mostra come è cambiato e qual è la nuova normalità. NON fornire scelte. Termina la narrazione e poi fornisci una matrice JSON vuota: []. NON aggiungere alcun testo dopo la matrice JSON.`;
      }
      break;

    case 'freytag':
      baseInstruction += ` Stai seguendo la struttura della Piramide di Freytag.`;
      switch (act) {
        case 1: return `${baseInstruction} Inizia con l'Atto 1: Esposizione. Introduci i personaggi principali, l'ambientazione e il contesto. Poni le basi per il conflitto imminente. Termina con tre scelte che danno il via all'azione, in una matrice JSON.`;
        case 2: return `${baseInstruction} Continua con l'Atto 2: Azione Ascendente. L'incidente scatenante dà il via a una serie di eventi che aumentano la tensione e complicano la situazione per il protagonista. Introduci ostacoli e conflitti secondari. Termina con tre scelte che intensificano il dramma, in una matrice JSON.`;
        case 3: return `${baseInstruction} È il momento dell'Atto 3: Climax. Questo è il punto di massima tensione, il punto di svolta della storia. Il protagonista affronta direttamente il conflitto principale in uno scontro decisivo il cui esito è incerto. Termina con tre scelte cruciali che determineranno le conseguenze, in una matrice JSON.`;
        case 4: return `${baseInstruction} Procedi con l'Atto 4: Azione Discendente. La tensione inizia a calare. Descrivi le conseguenze dirette del climax. I fili della trama iniziano a districarsi e si vedono gli effetti delle decisioni prese. Termina con tre scelte che portano verso la conclusione, in una matrice JSON.`;
        case 5: return `${baseInstruction} Concludi con l'Atto 5: Dénouement/Risoluzione. Tira le somme della storia. Il conflitto è risolto e viene stabilita una nuova normalità. Mostra il destino finale dei personaggi. NON fornire scelte. Termina la narrazione e poi fornisci una matrice JSON vuota: []. NON aggiungere alcun testo dopo la matrice JSON.`;
      }
      break;
      
    case 'viaggio_eroe': // Viaggio dell'Eroe (Campbell) - default
    default:
      baseInstruction += ` Stai seguendo la struttura narrativa del Viaggio dell'Eroe di Campbell, suddivisa in 5 atti.`;
      switch (act) {
        case 1: return `${baseInstruction} Inizia l'Atto 1: Il Mondo Ordinario e la Chiamata. Presenta il protagonista nel suo mondo quotidiano e l'incidente scatenante che rappresenta la chiamata all'avventura. L'eroe potrebbe essere riluttante. Termina con tre scelte che rappresentano l'accettazione o il rifiuto della chiamata, in una matrice JSON.`;
        case 2: return `${baseInstruction} Continua con l'Atto 2: Il Superamento della Soglia. L'eroe ha accettato la chiamata e entra in un mondo nuovo e sconosciuto. Qui incontra alleati, mentori e nemici, e affronta le prime prove. Termina con tre scelte che rappresentano le sfide da superare, in una matrice JSON.`;
        case 3: return `${baseInstruction} È il momento dell'Atto 3: La Prova Centrale (Ordeal). Questo è il climax. L'eroe affronta la sua più grande paura, uno scontro con la morte o una crisi profonda. Deve usare tutto ciò che ha imparato per sopravvivere e ottenere la "ricompensa". Termina con tre scelte difficili che rappresentano l'apice della crisi, in una matrice JSON.`;
        case 4: return `${baseInstruction} Procedi con l'Atto 4: La Via del Ritorno. Dopo la prova centrale, l'eroe deve tornare al suo mondo ordinario, ma non è facile. Potrebbe essere inseguito o affrontare altre sfide per portare con sé la ricompensa o la nuova saggezza. Termina con tre scelte che riguardano il viaggio di ritorno, in una matrice JSON.`;
        case 5: return `${baseInstruction} Concludi con l'Atto 5: La Resurrezione e il Ritorno con l'Elisir. L'eroe affronta un'ultima prova, purificatrice, e ritorna trasformato. Condivide la sua "ricompensa" o saggezza (l'elisir) con il suo mondo, migliorandolo. Mostra come l'eroe è cambiato. NON fornire scelte. Termina la narrazione e poi fornisci una matrice JSON vuota: []. NON aggiungere alcun testo dopo la matrice JSON.`;
      }
  }
  // Fallback
  return `${baseInstruction} Continua la storia in modo avvincente. Termina con tre scelte in una matrice JSON.`;
};


interface StoryGenerationResult {
  storyText: string;
  choices: string[];
}

const cleanStoryText = (text: string): string => text
  .replace(/```json\s*$/i, '')
  .replace(/```\s*$/i, '')
  .replace(/(?:^|\n)\s*-{3,}\s*(?:\n\s*)?(?:#{1,6}\s*)?(?:\*\*)?\s*(?:scelte|scelte\s*[-:]\s*matrice\s*json|matrice\s*json)(?:\*\*)?\s*:?\s*$/i, '')
  .replace(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(?:ecco le\s+)?scelte(?:\s*[-:]\s*matrice\s*json)?(?:\*\*)?\s*:?\s*$/i, '')
  .replace(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?\s*matrice\s*json(?:\*\*)?\s*:?\s*$/i, '')
  .replace(/json\s*scelte_avventura\s*$/i, '')
  .replace(/json\s*:?\s*$/i, '')
  .trim();

/**
 * Parses the AI response to extract the story text and the choices array.
 * This version is more robust against malformed JSON and model output variations.
 */
const parseStoryResponse = (responseText: string, act: number): StoryGenerationResult => {
  const fencedJsonMatch = responseText.match(/```json\s*([\s\S]*?)```/i);
  const objectStartIndex = responseText.lastIndexOf('{');
  const objectEndIndex = responseText.lastIndexOf('}');
  const arrayStartIndex = responseText.lastIndexOf('[');
  const arrayEndIndex = responseText.lastIndexOf(']');
  const hasChoicesObject = objectStartIndex !== -1
    && objectEndIndex > objectStartIndex
    && objectStartIndex < arrayStartIndex
    && /scelte_critiche|choices|scelte/i.test(responseText.slice(objectStartIndex, objectEndIndex + 1));

  let jsonStartIndex = arrayStartIndex;
  let choicesJson = '';

  if (fencedJsonMatch?.[1]) {
    jsonStartIndex = responseText.indexOf(fencedJsonMatch[0]);
    choicesJson = fencedJsonMatch[1].trim();
  } else if (hasChoicesObject) {
    jsonStartIndex = objectStartIndex;
    choicesJson = responseText.substring(objectStartIndex, objectEndIndex + 1);
  } else if (arrayStartIndex !== -1 && arrayEndIndex !== -1 && arrayEndIndex > arrayStartIndex) {
    jsonStartIndex = arrayStartIndex;
    choicesJson = responseText.substring(arrayStartIndex, arrayEndIndex + 1);
  } else {
    throw new Error("Formato della risposta non valido: non è stata trovata alcuna matrice di scelte.");
  }

  const storyText = cleanStoryText(responseText.substring(0, jsonStartIndex));

  try {
    const parsedChoices = JSON.parse(choicesJson);
    const choicesData = Array.isArray(parsedChoices)
      ? parsedChoices
      : parsedChoices?.scelte_critiche || parsedChoices?.choices || parsedChoices?.scelte;
    if (!Array.isArray(choicesData) || (choicesData.length === 0 && act < 5)) {
      throw new Error("Le scelte non sono una matrice valida o la matrice è vuota prima dell'atto finale.");
    }
    
    // The AI might return an array of strings or an array of objects with different property names.
    // This handles multiple cases to ensure a string array is always returned.
    const choices: string[] = choicesData.map((choice: any): string | null => {
      if (typeof choice === 'string') {
        return choice;
      }
      if (typeof choice === 'object' && choice !== null) {
        // Handle common property names for choice text
        if (typeof choice.text === 'string') return choice.text;
        if (typeof choice.descrizione === 'string') return choice.descrizione;
        
        // Fallback: Find the first string property in the object, assuming it's the choice text.
        // This makes it robust against other property names like "choice", "option", etc.
        const firstStringValue = Object.values(choice).find(value => typeof value === 'string');
        if (firstStringValue) {
          return firstStringValue as string;
        }
      }
      // Return null if no valid string is found, to be filtered out later.
      return null;
    }).filter((c): c is string => c !== null);

    if (choices.length !== choicesData.length) {
        throw new Error("Formato delle scelte non valido all'interno della matrice.");
    }

    return { storyText, choices };
  } catch (error) {
    console.error("Errore nel parsing delle scelte JSON:", choicesJson);
    if (error instanceof Error) {
        throw new Error(`Impossibile analizzare le scelte fornite dall'IA. Dettagli: ${error.message}`);
    }
    throw new Error("Impossibile analizzare le scelte fornite dall'IA.");
  }
};

/**
 * Generates the next part of the story.
 */
export const generateStoryPart = async (prompt: string, storyHistory: string, act: number, narrativeStructure: string, characters: Character[], narrativeTone: string): Promise<StoryGenerationResult> => {
  const characterDescriptions = characters
      .map(c => `- ${c.name} (Ruolo: ${c.role}): ${c.description}`)
      .join('\n');

  const fullPrompt = storyHistory 
    ? `Ecco il riassunto della storia finora:\n"${storyHistory}"\n\nL'utente ha scelto di continuare con: "${prompt}"\n\nQuesti sono i personaggi principali della storia. Assicurati di includerli e farli interagire, non concentrarti solo sul protagonista:\n${characterDescriptions}\n\nOra, scrivi ESCLUSIVAMENTE il paragrafo successivo della storia. Non riassumere nulla. Comincia direttamente con la nuova narrazione.`
    : `Inizia una storia basata su queste indicazioni: ${prompt}. La storia deve essere educativa per studenti di scuola media e seguire la struttura narrativa scelta.`;

  const systemInstruction = getActSystemInstruction(act, narrativeStructure, narrativeTone);
  const savedApiKey = sessionStorage.getItem(ANTHROPIC_SESSION_KEY_STORAGE)
    || localStorage.getItem(ANTHROPIC_KEY_STORAGE)
    || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (savedApiKey.trim()) {
    headers['X-Anthropic-API-Key'] = savedApiKey.trim();
  }

  try {
    const response = await fetch(API_STORY, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: fullPrompt,
        systemInstruction,
        act,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Si è verificato un errore durante la generazione della storia.");
    }

    if (typeof data.storyText === 'string' && Array.isArray(data.choices)) {
      return { storyText: data.storyText, choices: data.choices };
    }

    if (typeof data.text === 'string') {
      return parseStoryResponse(data.text, act);
    }

    throw new Error("Risposta non valida durante la generazione della storia.");
  } catch (error) {
    console.error("Errore API storia:", error);
    throw error instanceof Error
      ? error
      : new Error("Si è verificato un errore durante la generazione della storia. Riprova.");
  }
};

/**
 * Generates an image for a given story part.
 */
export const generateStoryImage = async (storyText: string): Promise<string | null> => {
  void storyText;
  return null;
};
