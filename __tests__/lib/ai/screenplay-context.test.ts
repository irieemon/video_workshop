/**
 * Tests for Screenplay Context Builder
 *
 * Tests the context prompt generation for screenplay AI,
 * including series context, character information, and episode context.
 */

import {
  buildEnhancedContextPrompt,
  buildEpisodeContextPrompt,
  EnhancedSeriesContext,
} from '@/lib/ai/screenplay-context'

// ============================================================================
// Test Fixtures
// ============================================================================

function createMinimalContext(): EnhancedSeriesContext {
  return {
    seriesId: 'series-123',
    seriesName: 'Test Series',
    description: null,
    genre: null,
    tone: null,
    characters: [],
    settings: [],
    relationships: [],
    enforce_continuity: false,
    allow_continuity_breaks: false,
    sora_camera_style: null,
    sora_lighting_mood: null,
    sora_color_palette: null,
    sora_overall_tone: null,
    sora_narrative_prefix: null,
  }
}

function createFullContext(): EnhancedSeriesContext {
  return {
    seriesId: 'series-456',
    seriesName: 'Epic Adventure',
    description: 'An epic journey through mystical lands',
    genre: 'Fantasy',
    tone: 'Epic and dramatic',
    screenplay_data: {
      tone: 'Dramatic',
      genre: 'Fantasy',
      logline: 'A young hero discovers their destiny',
      premise: 'In a world of magic, one person must save them all',
      themes: ['Courage', 'Friendship', 'Sacrifice'],
      seasons: [
        {
          season_number: 1,
          title: 'The Awakening',
          arc: 'Hero discovers their powers',
          episodes: [
            {
              episode_number: 1,
              title: 'The Beginning',
              logline: 'A mysterious event changes everything',
              plot_summary: 'The hero\'s ordinary life is disrupted',
              character_focus: ['Hero', 'Mentor'],
            },
          ],
        },
      ],
    },
    characters: [
      {
        id: 'char-1',
        name: 'Hero',
        role: 'Protagonist',
        description: 'Young and brave warrior',
        visual_fingerprint: 'Tall, dark hair, blue eyes',
        voice_profile: 'Determined and hopeful',
        sora_prompt_template: null,
      },
      {
        id: 'char-2',
        name: 'Mentor',
        role: 'Supporting',
        description: 'Wise elder guide',
        visual_fingerprint: 'Gray beard, weathered face',
        voice_profile: 'Calm and mysterious',
        sora_prompt_template: null,
      },
      {
        id: 'char-3',
        name: 'Villain',
        role: 'Antagonist',
        description: 'Dark lord of shadows',
        visual_fingerprint: null,
        voice_profile: null,
        sora_prompt_template: null,
      },
    ],
    settings: [
      {
        id: 'setting-1',
        name: 'The Village',
        description: 'A peaceful mountain village',
        visual_details: 'Wooden houses, cobblestone streets',
        mood: 'Warm and welcoming',
      },
      {
        id: 'setting-2',
        name: 'The Dark Forest',
        description: 'An ominous forest',
        visual_details: null,
        mood: null,
      },
    ],
    relationships: [
      {
        character_a_id: 'char-1',
        character_b_id: 'char-2',
        relationship_type: 'Student-Mentor',
        description: 'The mentor guides the hero on their journey',
      },
      {
        character_a_id: 'char-1',
        character_b_id: 'char-3',
        relationship_type: 'Enemies',
        description: null,
      },
    ],
    visual_assets: [
      {
        id: 'asset-1',
        asset_type: 'reference_image',
        description: 'Hero costume design',
        reference_url: 'https://example.com/hero.jpg',
      },
    ],
    enforce_continuity: true,
    allow_continuity_breaks: true,
    sora_camera_style: 'Cinematic wide shots',
    sora_lighting_mood: 'Dramatic natural lighting',
    sora_color_palette: 'Warm earth tones',
    sora_overall_tone: 'Epic fantasy',
    sora_narrative_prefix: 'In the style of Lord of the Rings',
  }
}

function createEpisodeConcept() {
  return {
    season_number: 1,
    episode_number: 1,
    title: 'The Beginning',
    logline: 'A mysterious event changes everything',
    plot_summary: 'The hero discovers a magical artifact that reveals their true destiny.',
    character_focus: ['Hero', 'Mentor'],
    season_title: 'The Awakening',
    season_arc: 'Hero discovers their powers',
  }
}

// ============================================================================
// buildEnhancedContextPrompt Tests
// ============================================================================

describe('buildEnhancedContextPrompt', () => {
  describe('Series Basics', () => {
    it('includes series name in output', () => {
      const context = createMinimalContext()
      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('# SERIES CONTEXT')
      expect(result).toContain('**Series:** Test Series')
    })

    it('includes description when provided', () => {
      const context = createMinimalContext()
      context.description = 'A thrilling adventure series'

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('**Description:** A thrilling adventure series')
    })

    it('omits description when null', () => {
      const context = createMinimalContext()
      context.description = null

      const result = buildEnhancedContextPrompt(context)

      expect(result).not.toContain('**Description:**')
    })

    it('includes genre when provided', () => {
      const context = createMinimalContext()
      context.genre = 'Sci-Fi'

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('**Genre:** Sci-Fi')
    })

    it('includes tone from context when provided', () => {
      const context = createMinimalContext()
      context.tone = 'Dark and mysterious'

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('**Tone:** Dark and mysterious')
    })

    it('falls back to screenplay_data tone when context tone is null', () => {
      const context = createMinimalContext()
      context.tone = null
      context.screenplay_data = { tone: 'Comedic' }

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('**Tone:** Comedic')
    })
  })

  describe('Screenplay Concept Data', () => {
    it('includes screenplay concept section when screenplay_data provided', () => {
      const context = createMinimalContext()
      context.screenplay_data = {
        logline: 'A hero rises',
        premise: 'Against all odds',
        themes: ['Hope', 'Courage'],
      }

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('## Series Concept')
      expect(result).toContain('**Logline:** A hero rises')
      expect(result).toContain('**Premise:** Against all odds')
      expect(result).toContain('**Themes:** Hope, Courage')
    })

    it('omits themes when empty array', () => {
      const context = createMinimalContext()
      context.screenplay_data = {
        logline: 'A hero rises',
        themes: [],
      }

      const result = buildEnhancedContextPrompt(context)

      expect(result).not.toContain('**Themes:**')
    })

    it('omits screenplay concept section when no screenplay_data', () => {
      const context = createMinimalContext()
      context.screenplay_data = undefined

      const result = buildEnhancedContextPrompt(context)

      expect(result).not.toContain('## Series Concept')
    })
  })

  describe('Characters Section', () => {
    it('includes character section when characters exist', () => {
      const context = createMinimalContext()
      context.characters = [
        {
          id: 'char-1',
          name: 'Alice',
          role: 'Lead',
          description: 'A brave adventurer',
          visual_fingerprint: 'Red hair, green eyes',
          voice_profile: 'Bold and confident',
          sora_prompt_template: null,
        },
      ]

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('# CHARACTERS')
      expect(result).toContain('## Alice')
      expect(result).toContain('**Role:** Lead')
      expect(result).toContain('**Description:** A brave adventurer')
      expect(result).toContain('**Visual Identity:** Red hair, green eyes')
      expect(result).toContain('**Voice/Personality:** Bold and confident')
    })

    it('omits optional character fields when null', () => {
      const context = createMinimalContext()
      context.characters = [
        {
          id: 'char-1',
          name: 'Bob',
          role: null,
          description: null,
          visual_fingerprint: null,
          voice_profile: null,
          sora_prompt_template: null,
        },
      ]

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('## Bob')
      expect(result).not.toContain('**Role:**')
      expect(result).not.toContain('**Description:**')
      expect(result).not.toContain('**Visual Identity:**')
      expect(result).not.toContain('**Voice/Personality:**')
    })

    it('handles multiple characters', () => {
      const context = createMinimalContext()
      context.characters = [
        { id: '1', name: 'First', role: 'Lead', description: null, visual_fingerprint: null, voice_profile: null, sora_prompt_template: null },
        { id: '2', name: 'Second', role: 'Support', description: null, visual_fingerprint: null, voice_profile: null, sora_prompt_template: null },
        { id: '3', name: 'Third', role: 'Extra', description: null, visual_fingerprint: null, voice_profile: null, sora_prompt_template: null },
      ]

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('## First')
      expect(result).toContain('## Second')
      expect(result).toContain('## Third')
    })

    it('omits characters section when empty', () => {
      const context = createMinimalContext()
      context.characters = []

      const result = buildEnhancedContextPrompt(context)

      expect(result).not.toContain('# CHARACTERS')
    })
  })

  describe('Character Relationships', () => {
    it('includes relationships section when relationships exist', () => {
      const context = createMinimalContext()
      context.characters = [
        { id: 'a', name: 'Alice', role: null, description: null, visual_fingerprint: null, voice_profile: null, sora_prompt_template: null },
        { id: 'b', name: 'Bob', role: null, description: null, visual_fingerprint: null, voice_profile: null, sora_prompt_template: null },
      ]
      context.relationships = [
        {
          character_a_id: 'a',
          character_b_id: 'b',
          relationship_type: 'Siblings',
          description: 'They grew up together',
        },
      ]

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('# CHARACTER RELATIONSHIPS')
      expect(result).toContain('**Alice ↔ Bob**')
      expect(result).toContain('Type: Siblings')
      expect(result).toContain('Details: They grew up together')
    })

    it('omits relationship description when null', () => {
      const context = createMinimalContext()
      context.characters = [
        { id: 'a', name: 'Alice', role: null, description: null, visual_fingerprint: null, voice_profile: null, sora_prompt_template: null },
        { id: 'b', name: 'Bob', role: null, description: null, visual_fingerprint: null, voice_profile: null, sora_prompt_template: null },
      ]
      context.relationships = [
        {
          character_a_id: 'a',
          character_b_id: 'b',
          relationship_type: 'Friends',
          description: null,
        },
      ]

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('Type: Friends')
      expect(result).not.toContain('Details:')
    })

    it('skips relationship if character not found', () => {
      const context = createMinimalContext()
      context.characters = [
        { id: 'a', name: 'Alice', role: null, description: null, visual_fingerprint: null, voice_profile: null, sora_prompt_template: null },
      ]
      context.relationships = [
        {
          character_a_id: 'a',
          character_b_id: 'unknown',
          relationship_type: 'Friends',
          description: null,
        },
      ]

      const result = buildEnhancedContextPrompt(context)

      // Should not crash and should not include incomplete relationship
      expect(result).toContain('# CHARACTER RELATIONSHIPS')
      expect(result).not.toContain('Alice ↔')
    })

    it('omits relationships section when empty', () => {
      const context = createMinimalContext()
      context.relationships = []

      const result = buildEnhancedContextPrompt(context)

      expect(result).not.toContain('# CHARACTER RELATIONSHIPS')
    })
  })

  describe('Settings/Locations', () => {
    it('includes settings section when settings exist', () => {
      const context = createMinimalContext()
      context.settings = [
        {
          id: 's1',
          name: 'The Castle',
          description: 'An ancient fortress',
          visual_details: 'Gray stone walls, tall towers',
          mood: 'Mysterious and imposing',
        },
      ]

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('# LOCATIONS & SETTINGS')
      expect(result).toContain('## The Castle')
      expect(result).toContain('**Description:** An ancient fortress')
      expect(result).toContain('**Visual Details:** Gray stone walls, tall towers')
      expect(result).toContain('**Mood/Atmosphere:** Mysterious and imposing')
    })

    it('omits optional setting fields when null', () => {
      const context = createMinimalContext()
      context.settings = [
        {
          id: 's1',
          name: 'The Field',
          description: null,
          visual_details: null,
          mood: null,
        },
      ]

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('## The Field')
      expect(result).not.toContain('**Description:**')
      expect(result).not.toContain('**Visual Details:**')
      expect(result).not.toContain('**Mood/Atmosphere:**')
    })

    it('omits settings section when empty', () => {
      const context = createMinimalContext()
      context.settings = []

      const result = buildEnhancedContextPrompt(context)

      expect(result).not.toContain('# LOCATIONS & SETTINGS')
    })
  })

  describe('Visual Style (Sora Settings)', () => {
    it('includes visual style section when any sora setting provided', () => {
      const context = createMinimalContext()
      context.sora_camera_style = 'Handheld documentary style'

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('# VISUAL STYLE')
      expect(result).toContain('**Camera Style:** Handheld documentary style')
    })

    it('includes all visual settings when provided', () => {
      const context = createMinimalContext()
      context.sora_camera_style = 'Cinematic'
      context.sora_lighting_mood = 'Natural'
      context.sora_color_palette = 'Warm tones'
      context.sora_overall_tone = 'Epic'
      context.sora_narrative_prefix = 'In the style of...'

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('**Camera Style:** Cinematic')
      expect(result).toContain('**Lighting Mood:** Natural')
      expect(result).toContain('**Color Palette:** Warm tones')
      expect(result).toContain('**Overall Tone:** Epic')
      expect(result).toContain('**Narrative Style:** In the style of...')
    })

    it('omits visual style section when no sora settings', () => {
      const context = createMinimalContext()

      const result = buildEnhancedContextPrompt(context)

      expect(result).not.toContain('# VISUAL STYLE')
    })
  })

  describe('Continuity Requirements', () => {
    it('includes strict continuity message when enforce_continuity is true', () => {
      const context = createMinimalContext()
      context.enforce_continuity = true
      context.allow_continuity_breaks = false

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('# CONTINUITY REQUIREMENTS')
      expect(result).toContain('**Strict continuity enforcement**')
      expect(result).toContain('No continuity breaks permitted')
    })

    it('includes continuity breaks allowed message when both flags true', () => {
      const context = createMinimalContext()
      context.enforce_continuity = true
      context.allow_continuity_breaks = true

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('Continuity breaks allowed with explicit justification')
    })

    it('includes flexible continuity message when enforce_continuity is false', () => {
      const context = createMinimalContext()
      context.enforce_continuity = false

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('Flexible continuity - Creative freedom prioritized')
    })
  })

  describe('Instructions Section', () => {
    it('always includes instructions for episode development', () => {
      const context = createMinimalContext()

      const result = buildEnhancedContextPrompt(context)

      expect(result).toContain('# INSTRUCTIONS FOR EPISODE DEVELOPMENT')
      expect(result).toContain('Use the above context to:')
      expect(result).toContain('Ensure all scenes align with established character personalities')
      expect(result).toContain('Maintain consistency with the overall series tone')
    })
  })

  describe('Full Context Integration', () => {
    it('generates complete prompt with all sections for full context', () => {
      const context = createFullContext()

      const result = buildEnhancedContextPrompt(context)

      // Check all major sections are present
      expect(result).toContain('# SERIES CONTEXT')
      expect(result).toContain('## Series Concept')
      expect(result).toContain('# CHARACTERS')
      expect(result).toContain('# CHARACTER RELATIONSHIPS')
      expect(result).toContain('# LOCATIONS & SETTINGS')
      expect(result).toContain('# VISUAL STYLE')
      expect(result).toContain('# CONTINUITY REQUIREMENTS')
      expect(result).toContain('# INSTRUCTIONS FOR EPISODE DEVELOPMENT')

      // Check specific content
      expect(result).toContain('Epic Adventure')
      expect(result).toContain('Hero')
      expect(result).toContain('Mentor')
      expect(result).toContain('The Village')
    })
  })
})

// ============================================================================
// buildEpisodeContextPrompt Tests
// ============================================================================

describe('buildEpisodeContextPrompt', () => {
  describe('Episode Assignment Section', () => {
    it('includes series name and episode details', () => {
      const episode = createEpisodeConcept()
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('# EPISODE ASSIGNMENT')
      expect(result).toContain('**Series:** Epic Adventure')
      expect(result).toContain('**Season 1, Episode 1:** The Beginning')
    })

    it('includes season title when provided', () => {
      const episode = createEpisodeConcept()
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('**Season Arc:** The Awakening')
    })

    it('includes season arc when provided', () => {
      const episode = createEpisodeConcept()
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('**Season Theme:** Hero discovers their powers')
    })

    it('omits season info when not provided', () => {
      const episode = {
        season_number: 1,
        episode_number: 1,
        title: 'Test',
        logline: 'Test logline',
        plot_summary: 'Test summary',
        character_focus: [],
      }
      const context = createMinimalContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).not.toContain('**Season Arc:**')
      expect(result).not.toContain('**Season Theme:**')
    })
  })

  describe('Episode Concept Section', () => {
    it('includes logline and plot summary', () => {
      const episode = createEpisodeConcept()
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('## Episode Concept')
      expect(result).toContain('**Logline:** A mysterious event changes everything')
      expect(result).toContain('**Plot Summary:**')
      expect(result).toContain('The hero discovers a magical artifact')
    })
  })

  describe('Focus Characters', () => {
    it('lists focus characters', () => {
      const episode = createEpisodeConcept()
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('**Focus Characters:** Hero, Mentor')
    })

    it('provides detailed info for matching focus characters', () => {
      const episode = createEpisodeConcept()
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('### Focus Character Details:')
      expect(result).toContain('**Hero:**')
      expect(result).toContain('Young and brave warrior')
      expect(result).toContain('**Mentor:**')
      expect(result).toContain('Wise elder guide')
    })

    it('matches focus characters case-insensitively', () => {
      const episode = {
        ...createEpisodeConcept(),
        character_focus: ['HERO', 'mentor'],
      }
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('**Hero:**')
      expect(result).toContain('**Mentor:**')
    })

    it('matches partial character names', () => {
      const episode = {
        ...createEpisodeConcept(),
        character_focus: ['Her'], // Partial match for "Hero"
      }
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('**Hero:**')
    })

    it('omits focus characters section when empty', () => {
      const episode = {
        ...createEpisodeConcept(),
        character_focus: [],
      }
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).not.toContain('**Focus Characters:**')
    })

    it('handles no matching characters gracefully', () => {
      const episode = {
        ...createEpisodeConcept(),
        character_focus: ['Unknown Character'],
      }
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('**Focus Characters:** Unknown Character')
      expect(result).not.toContain('### Focus Character Details:')
    })
  })

  describe('Task Instructions', () => {
    it('includes task instructions', () => {
      const episode = createEpisodeConcept()
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('**YOUR TASK:**')
      expect(result).toContain('Help develop this episode concept into a complete screenplay')
      expect(result).toContain('Detailed scene breakdown')
      expect(result).toContain('Scene-by-scene story beats')
      expect(result).toContain('Character arcs within the episode')
      expect(result).toContain('Key dialogue moments')
      expect(result).toContain('Visual descriptions aligned with series style')
    })

    it('ends with instruction to use series context', () => {
      const episode = createEpisodeConcept()
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('Use the series context below as your foundation.')
    })
  })

  describe('Character Voice Profile in Focus', () => {
    it('includes voice profile for focus characters', () => {
      const episode = createEpisodeConcept()
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('Personality: Determined and hopeful')
      expect(result).toContain('Personality: Calm and mysterious')
    })

    it('omits voice profile when null', () => {
      const episode = {
        ...createEpisodeConcept(),
        character_focus: ['Villain'],
      }
      const context = createFullContext()

      const result = buildEpisodeContextPrompt(episode, context)

      expect(result).toContain('**Villain:**')
      expect(result).toContain('Dark lord of shadows')
      // Villain has null voice_profile
      expect(result.match(/Villain:[\s\S]*?Personality:/)).toBeNull()
    })
  })
})
