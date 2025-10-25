import { createClient } from '@/lib/supabase/server';
import type { SeriesConceptOutput } from '@/lib/types/series-concept.types';

type DatabaseGenre = 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other';

export class SeriesConceptPersister {
  /**
   * Map AI-generated relationship type to database enum values
   */
  private mapRelationshipTypeToDatabase(type: string): string {
    const typeMap: Record<string, string> = {
      'ally': 'allies',
      'rival': 'rivals',
      'family': 'family',
      'romantic': 'romantic',
      'mentor': 'mentor_student',
    };
    return typeMap[type] || 'custom';
  }

  /**
   * Map AI-generated genre text to database enum values
   */
  private mapGenreToDatabase(genreText: string): DatabaseGenre {
    const lowerGenre = genreText.toLowerCase();

    // Map common narrative genres
    if (
      lowerGenre.includes('drama') ||
      lowerGenre.includes('fiction') ||
      lowerGenre.includes('thriller') ||
      lowerGenre.includes('mystery') ||
      lowerGenre.includes('romance') ||
      lowerGenre.includes('adventure') ||
      lowerGenre.includes('fantasy') ||
      lowerGenre.includes('sci-fi') ||
      lowerGenre.includes('science fiction') ||
      lowerGenre.includes('horror') ||
      lowerGenre.includes('comedy') ||
      lowerGenre.includes('action')
    ) {
      return 'narrative';
    }

    // Map educational content
    if (
      lowerGenre.includes('educational') ||
      lowerGenre.includes('documentary') ||
      lowerGenre.includes('tutorial') ||
      lowerGenre.includes('how-to')
    ) {
      return 'educational';
    }

    // Map product/brand content
    if (
      lowerGenre.includes('product') ||
      lowerGenre.includes('brand') ||
      lowerGenre.includes('commercial') ||
      lowerGenre.includes('advertisement')
    ) {
      return 'product-showcase';
    }

    // Default to narrative for story-based content, other for everything else
    return 'narrative';
  }
  /**
   * Persist a complete series concept to the database.
   * Creates series, episodes, characters, settings, and relationships.
   */
  async persistConcept(
    concept: SeriesConceptOutput,
    userId: string,
    projectId?: string
  ): Promise<{ success: boolean; seriesId?: string; error?: string }> {
    const supabase = await createClient();

    try {
      // Step 1: Insert series record
      const { data: seriesData, error: seriesError } = await supabase
        .from('series')
        .insert({
          user_id: userId,
          project_id: projectId || null,
          name: concept.series.name,
          description: concept.series.premise,
          genre: this.mapGenreToDatabase(concept.series.genre),
          screenplay_data: {
            logline: concept.series.logline,
            premise: concept.series.premise,
            tone: concept.series.tone,
            themes: concept.series.themes,
            format: concept.series.format,
            genre: concept.series.genre, // Store original AI genre in screenplay_data
            seasons: concept.seasons, // Store complete season/episode structure
          },
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (seriesError) throw new Error(`Series insert failed: ${seriesError.message}`);

      const seriesId = seriesData.id;

      // Note: Episode concepts are stored in screenplay_data.seasons
      // series_episodes table is for linking actual video productions to the series

      // Step 2: Insert characters
      const characters = this.mapCharacters(concept.characters, seriesId);
      const { data: characterData, error: charactersError } = await supabase
        .from('series_characters')
        .insert(characters)
        .select('id, name');

      if (charactersError) throw new Error(`Characters insert failed: ${charactersError.message}`);

      // Step 3: Insert relationships (map character names to IDs)
      const characterMap = new Map(characterData.map((c: any) => [c.name, c.id]));
      const relationships = this.mapRelationships(concept.relationships, characterMap, seriesId);
      if (relationships.length > 0) {
        const { error: relationshipsError } = await supabase
          .from('character_relationships')
          .insert(relationships);
        if (relationshipsError)
          throw new Error(`Relationships insert failed: ${relationshipsError.message}`);
      }

      // Step 4: Insert settings
      const settings = this.mapSettings(concept.settings, seriesId);
      const { error: settingsError } = await supabase.from('series_settings').insert(settings);
      if (settingsError) throw new Error(`Settings insert failed: ${settingsError.message}`);

      return { success: true, seriesId };
    } catch (error) {
      console.error('Series concept persistence failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private mapCharacters(characters: any[], seriesId: string) {
    return characters.map((char) => ({
      series_id: seriesId,
      name: char.name,
      description: char.description,
      dramatic_profile: char.dramatic_profile,
      visual_fingerprint: char.visual_fingerprint,
      voice_profile: char.voice_profile,
      sora_prompt_template: this.generateSoraPromptTemplate(char),
    }));
  }

  private mapRelationships(relationships: any[], characterMap: Map<string, string>, seriesId: string) {
    return relationships
      .map((rel) => ({
        series_id: seriesId,
        character_a_id: characterMap.get(rel.character_a),
        character_b_id: characterMap.get(rel.character_b),
        relationship_type: this.mapRelationshipTypeToDatabase(rel.type),
        description: rel.description,
        evolution_notes: rel.evolution,
        attributes: {},
      }))
      .filter((rel) => rel.character_a_id && rel.character_b_id);
  }

  private mapSettings(settings: any[], seriesId: string) {
    return settings.map((setting) => ({
      series_id: seriesId,
      name: setting.name,
      description: setting.description,
      is_primary: setting.importance === 'high',
      details: {
        importance: setting.importance,
        first_appearance: setting.first_appearance
      },
    }));
  }

  private generateSoraPromptTemplate(char: any): string {
    const { visual_fingerprint: vf } = char;
    return `A ${vf.age} ${vf.ethnicity} person with ${vf.skin_tone} skin tone, ${vf.build} build. ${vf.distinctive_features}. Wearing ${vf.typical_wardrobe}.`;
  }
}
