export interface StoryPart {
  id: number;
  text: string;
  image: string | null;
  choices: string[];
  parentId: number | null;
  choiceThatLedHere: string | null;
}

export type CharacterRole = 'protagonista' | 'antagonista' | 'aiutante';

export interface Character {
  id: string;
  name: string;
  role: CharacterRole;
  description: string;
}

export type NarrativeStructureType = 'viaggio_eroe' | 'pixar' | 'freytag';

export interface SavedStoryState {
  incipit: string;
  contexto: string;
  genere: string;
  narrativeTone: string;
  characters: Character[];
  narrativeStructure: NarrativeStructureType;
  storyParts: StoryPart[]; // Contiene tutti i nodi della storia generati
  currentPath: number[]; // Array di ID che rappresenta il ramo corrente
  storyTopic: string;
}

export interface SavedStory {
  id: string;
  title: string;
  savedAt: string;
  state: SavedStoryState;
}