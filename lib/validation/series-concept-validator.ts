import { z } from 'zod';
import type { SeriesConceptOutput } from '@/lib/types/series-concept.types';

export const SeriesConceptSchema = z.object({
  series: z.object({
    name: z.string().min(1).max(200),
    logline: z.string().min(10).max(200),
    premise: z.string().min(50).max(3000),
    genre: z.string().min(1),
    tone: z.string().min(1),
    format: z.string().min(1),
    themes: z.array(z.string()).min(1).max(10),
  }),
  seasons: z
    .array(
      z.object({
        season_number: z.number().int().positive(),
        title: z.string().min(1),
        arc: z.string().min(50),
        episodes: z
          .array(
            z.object({
              episode_number: z.number().int().positive(),
              title: z.string().min(1),
              logline: z.string().min(10).max(200),
              plot_summary: z.string().min(20),
              character_focus: z.array(z.string()).min(1),
            })
          )
          .min(1),
      })
    )
    .min(1)
    .max(10),
  characters: z
    .array(
      z.object({
        name: z.string().min(1),
        role: z.enum(['protagonist', 'antagonist', 'supporting']),
        description: z.string().min(50),
        dramatic_profile: z.object({
          goal: z.string().min(10),
          fear: z.string().min(10),
          flaw: z.string().min(10),
          arc: z.string().min(20),
        }),
        visual_fingerprint: z.object({
          age: z.string(),
          ethnicity: z.string(),
          skin_tone: z.string(),
          build: z.string(),
          distinctive_features: z.string(),
          typical_wardrobe: z.string(),
        }),
        voice_profile: z.object({
          accent: z.string(),
          speech_pattern: z.string(),
          tone: z.string(),
        }),
      })
    )
    .min(3)
    .max(30),
  settings: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(50),
        importance: z.enum(['high', 'medium', 'low']),
        first_appearance: z.string(),
      })
    )
    .min(1)
    .max(30),
  relationships: z
    .array(
      z.object({
        character_a: z.string().min(1),
        character_b: z.string().min(1),
        type: z.enum(['ally', 'rival', 'family', 'romantic', 'mentor']),
        description: z.string().min(10),
        evolution: z.string().min(10),
      })
    )
    .min(1),
});

export function validateSeriesConcept(data: unknown): {
  success: boolean;
  data?: SeriesConceptOutput;
  errors?: z.ZodError;
} {
  const result = SeriesConceptSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as SeriesConceptOutput };
  } else {
    return { success: false, errors: result.error };
  }
}

// Business rule validators
export function validateBusinessRules(concept: SeriesConceptOutput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Rule 1: Character focus in episodes must reference defined characters
  const characterNames = new Set(concept.characters.map((c) => c.name));
  concept.seasons.forEach((season) => {
    season.episodes.forEach((ep) => {
      ep.character_focus.forEach((name) => {
        if (!characterNames.has(name)) {
          errors.push(
            `Episode "${ep.title}" references undefined character "${name}"`
          );
        }
      });
    });
  });

  // Rule 2: Relationships must reference defined characters
  concept.relationships.forEach((rel) => {
    if (!characterNames.has(rel.character_a)) {
      errors.push(
        `Relationship references undefined character "${rel.character_a}"`
      );
    }
    if (!characterNames.has(rel.character_b)) {
      errors.push(
        `Relationship references undefined character "${rel.character_b}"`
      );
    }
  });

  // Rule 3: Must have at least one protagonist
  const hasProtagonist = concept.characters.some((c) => c.role === 'protagonist');
  if (!hasProtagonist) {
    errors.push('Series must have at least one protagonist');
  }

  // Rule 4: Episode numbers should be sequential within seasons
  concept.seasons.forEach((season) => {
    const episodeNumbers = season.episodes
      .map((e) => e.episode_number)
      .sort((a, b) => a - b);
    const expectedSequence = Array.from(
      { length: episodeNumbers.length },
      (_, i) => i + 1
    );
    const isSequential = episodeNumbers.every(
      (num, idx) => num === expectedSequence[idx]
    );
    if (!isSequential) {
      errors.push(
        `Season ${season.season_number} has non-sequential episode numbers`
      );
    }
  });

  return { valid: errors.length === 0, errors };
}
