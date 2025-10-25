/**
 * Series Concept Agent - Type Definitions
 * Structured types for AI-generated series concepts
 */

export type ConceptDialoguePhase =
  | 'discovery'      // Gathering genre, tone, themes
  | 'expansion'      // Building characters, arcs, settings
  | 'refinement'     // Confirming details, resolving ambiguities
  | 'generation'     // Producing final structured output
  | 'complete';      // Ready for persistence

export interface ConceptDialogueState {
  phase: ConceptDialoguePhase;
  exchangeCount: number;
  gatheredInfo: {
    genre?: string;
    tone?: string;
    themes?: string[];
    format?: string;
    characterIdeas?: string[];
    arcIdeas?: string[];
    settingIdeas?: string[];
  };
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

export interface SeriesConceptOutput {
  series: {
    name: string;
    logline: string;
    premise: string;
    genre: string;
    tone: string;
    format: string;
    themes: string[];
  };
  seasons: SeasonArc[];
  characters: SeriesCharacterConcept[];
  settings: SeriesSetting[];
  relationships: CharacterRelationship[];
}

export interface SeasonArc {
  season_number: number;
  title: string;
  arc: string;
  episodes: EpisodeConcept[];
}

export interface EpisodeConcept {
  episode_number: number;
  title: string;
  logline: string;
  plot_summary: string;
  character_focus: string[];
}

export interface SeriesCharacterConcept {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  description: string;
  dramatic_profile: {
    goal: string;
    fear: string;
    flaw: string;
    arc: string;
  };
  visual_fingerprint: {
    age: string;
    ethnicity: string;
    skin_tone: string;
    build: string;
    distinctive_features: string;
    typical_wardrobe: string;
  };
  voice_profile: {
    accent: string;
    speech_pattern: string;
    tone: string;
  };
}

export interface SeriesSetting {
  name: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  first_appearance: string;
}

export interface CharacterRelationship {
  character_a: string;
  character_b: string;
  type: 'ally' | 'rival' | 'family' | 'romantic' | 'mentor';
  description: string;
  evolution: string;
}
