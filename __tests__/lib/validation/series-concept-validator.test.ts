/**
 * Tests for Series Concept Validator
 *
 * Tests the Zod schema validation and business rule validation
 * for AI-generated series concepts.
 */

import {
  SeriesConceptSchema,
  validateSeriesConcept,
  validateBusinessRules,
} from '@/lib/validation/series-concept-validator'
import type { SeriesConceptOutput } from '@/lib/types/series-concept.types'

describe('Series Concept Validator', () => {
  // Helper to create a valid series concept
  function createValidSeriesConcept(): SeriesConceptOutput {
    return {
      series: {
        name: 'The Adventure Chronicles',
        logline: 'A group of unlikely heroes must save their world from ancient evil',
        premise:
          'In a world where magic is fading, three companions from different walks of life discover they are the last hope against a rising darkness. This epic tale follows their journey across treacherous lands as they uncover secrets about their past and the true nature of the evil threatening their world.',
        genre: 'Fantasy Adventure',
        tone: 'Epic with moments of humor',
        format: '45-minute episodes',
        themes: ['Friendship', 'Sacrifice', 'Redemption'],
      },
      seasons: [
        {
          season_number: 1,
          title: 'The Awakening',
          arc: 'The heroes discover their destiny and begin their journey. They learn to work together despite their differences and face their first major challenge against the forces of darkness.',
          episodes: [
            {
              episode_number: 1,
              title: 'The Beginning',
              logline: 'Three strangers discover they share a mysterious connection',
              plot_summary:
                'When a mysterious event brings together a warrior, a mage, and a thief, they discover they all possess fragments of an ancient power. They must decide whether to embrace their destiny or flee.',
              character_focus: ['Hero', 'Sidekick', 'Mentor'],
            },
            {
              episode_number: 2,
              title: 'The Journey Begins',
              logline: 'The heroes set out on their quest to find the ancient temple',
              plot_summary:
                'Armed with new knowledge, our heroes leave their homes behind. They face their first test as a team when bandits attack their camp. The experience forces them to trust each other.',
              character_focus: ['Hero', 'Sidekick'],
            },
          ],
        },
      ],
      characters: [
        {
          name: 'Hero',
          role: 'protagonist',
          description:
            'A skilled warrior haunted by past failures, seeking redemption. Once a celebrated knight, they now wander the land seeking purpose after their kingdom fell.',
          dramatic_profile: {
            goal: 'To protect the innocent and find redemption',
            fear: 'Failing those who depend on them again',
            flaw: 'Tendency to take on too much responsibility alone',
            arc: 'Learns to trust others and share the burden of leadership',
          },
          visual_fingerprint: {
            age: 'Mid-30s',
            ethnicity: 'East Asian',
            skin_tone: 'Fair',
            build: 'Athletic and battle-scarred',
            distinctive_features: 'Scar across left eye, silver streak in dark hair',
            typical_wardrobe: 'Worn leather armor over simple clothes',
          },
          voice_profile: {
            accent: 'Neutral with occasional formal speech',
            speech_pattern: 'Measured and thoughtful',
            tone: 'Calm but commanding when needed',
          },
        },
        {
          name: 'Sidekick',
          role: 'supporting',
          description:
            'A clever thief with a heart of gold, using humor to mask deep insecurities. Grew up on the streets and learned to survive by their wits.',
          dramatic_profile: {
            goal: 'To find a place where they truly belong',
            fear: 'Being abandoned by those they care about',
            flaw: 'Difficulty trusting others completely',
            arc: 'Learns that true family is the one you choose',
          },
          visual_fingerprint: {
            age: 'Early 20s',
            ethnicity: 'Mixed heritage',
            skin_tone: 'Olive',
            build: 'Lithe and agile',
            distinctive_features: 'Quick smile, nimble fingers',
            typical_wardrobe: 'Hooded cloak with many hidden pockets',
          },
          voice_profile: {
            accent: 'Street-smart urban accent',
            speech_pattern: 'Quick and witty with frequent jokes',
            tone: 'Light-hearted, serious when it counts',
          },
        },
        {
          name: 'Mentor',
          role: 'supporting',
          description:
            'An elderly mage who knows more than they reveal. Has lived for centuries and carries the weight of many mistakes.',
          dramatic_profile: {
            goal: 'To guide the next generation and atone for past errors',
            fear: 'History repeating itself',
            flaw: 'Tendency to manipulate rather than communicate',
            arc: 'Learns to be honest with the heroes about the challenges ahead',
          },
          visual_fingerprint: {
            age: 'Appears elderly but ageless',
            ethnicity: 'Unknown, ethereal',
            skin_tone: 'Pale with faint luminescence',
            build: 'Thin and frail-looking but deceptively strong',
            distinctive_features: 'Eyes that change color with mood',
            typical_wardrobe: 'Ancient robes covered in mystical symbols',
          },
          voice_profile: {
            accent: 'Formal, old-fashioned pronunciation',
            speech_pattern: 'Speaks in riddles and metaphors',
            tone: 'Wise and mysterious',
          },
        },
      ],
      settings: [
        {
          name: 'The Forgotten Temple',
          description:
            'An ancient temple hidden in the mountains, last bastion of the old magic. Its halls are filled with traps and secrets waiting to be discovered.',
          importance: 'high',
          first_appearance: 'Episode 1',
        },
      ],
      relationships: [
        {
          character_a: 'Hero',
          character_b: 'Sidekick',
          type: 'ally',
          description: 'A partnership forged in necessity that grows into genuine friendship',
          evolution: 'From distrust to unshakeable loyalty',
        },
        {
          character_a: 'Hero',
          character_b: 'Mentor',
          type: 'mentor',
          description: 'The Mentor guides Hero in understanding their power',
          evolution: 'From student-teacher to equals who respect each other',
        },
      ],
    }
  }

  describe('SeriesConceptSchema', () => {
    describe('Series Validation', () => {
      it('accepts valid series data', () => {
        const concept = createValidSeriesConcept()
        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(true)
      })

      it('rejects series with empty name', () => {
        const concept = createValidSeriesConcept()
        concept.series.name = ''

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects series with too long name (>200 chars)', () => {
        const concept = createValidSeriesConcept()
        concept.series.name = 'A'.repeat(201)

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects logline shorter than 10 characters', () => {
        const concept = createValidSeriesConcept()
        concept.series.logline = 'Short'

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects premise shorter than 50 characters', () => {
        const concept = createValidSeriesConcept()
        concept.series.premise = 'This premise is too short to be valid.'

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects empty themes array', () => {
        const concept = createValidSeriesConcept()
        concept.series.themes = []

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects themes array with more than 10 items', () => {
        const concept = createValidSeriesConcept()
        concept.series.themes = Array(11).fill('Theme')

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })
    })

    describe('Seasons Validation', () => {
      it('rejects empty seasons array', () => {
        const concept = createValidSeriesConcept()
        concept.seasons = []

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects more than 10 seasons', () => {
        const concept = createValidSeriesConcept()
        concept.seasons = Array(11)
          .fill(null)
          .map((_, i) => ({
            season_number: i + 1,
            title: `Season ${i + 1}`,
            arc: 'A'.repeat(50),
            episodes: [
              {
                episode_number: 1,
                title: 'Episode',
                logline: 'A'.repeat(10),
                plot_summary: 'A'.repeat(20),
                character_focus: ['Hero'],
              },
            ],
          }))

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects season with non-positive season number', () => {
        const concept = createValidSeriesConcept()
        concept.seasons[0].season_number = 0

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects season arc shorter than 50 characters', () => {
        const concept = createValidSeriesConcept()
        concept.seasons[0].arc = 'Too short'

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects season with empty episodes array', () => {
        const concept = createValidSeriesConcept()
        concept.seasons[0].episodes = []

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects episode with empty character_focus', () => {
        const concept = createValidSeriesConcept()
        concept.seasons[0].episodes[0].character_focus = []

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })
    })

    describe('Characters Validation', () => {
      it('rejects fewer than 3 characters', () => {
        const concept = createValidSeriesConcept()
        concept.characters = concept.characters.slice(0, 2)

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects more than 30 characters', () => {
        const concept = createValidSeriesConcept()
        concept.characters = Array(31)
          .fill(null)
          .map((_, i) => ({
            ...concept.characters[0],
            name: `Character ${i + 1}`,
          }))

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects invalid role enum', () => {
        const concept = createValidSeriesConcept()
        ;(concept.characters[0] as any).role = 'hero' // Invalid role

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects character description shorter than 50 chars', () => {
        const concept = createValidSeriesConcept()
        concept.characters[0].description = 'Short description'

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects dramatic_profile goal shorter than 10 chars', () => {
        const concept = createValidSeriesConcept()
        concept.characters[0].dramatic_profile.goal = 'Short'

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })
    })

    describe('Settings Validation', () => {
      it('rejects empty settings array', () => {
        const concept = createValidSeriesConcept()
        concept.settings = []

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects more than 30 settings', () => {
        const concept = createValidSeriesConcept()
        concept.settings = Array(31)
          .fill(null)
          .map((_, i) => ({
            name: `Setting ${i + 1}`,
            description: 'A'.repeat(50),
            importance: 'high' as const,
            first_appearance: 'Episode 1',
          }))

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects invalid importance enum', () => {
        const concept = createValidSeriesConcept()
        ;(concept.settings[0] as any).importance = 'critical'

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })
    })

    describe('Relationships Validation', () => {
      it('rejects empty relationships array', () => {
        const concept = createValidSeriesConcept()
        concept.relationships = []

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects invalid relationship type', () => {
        const concept = createValidSeriesConcept()
        ;(concept.relationships[0] as any).type = 'enemies'

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })

      it('rejects relationship description shorter than 10 chars', () => {
        const concept = createValidSeriesConcept()
        concept.relationships[0].description = 'Short'

        const result = SeriesConceptSchema.safeParse(concept)

        expect(result.success).toBe(false)
      })
    })
  })

  describe('validateSeriesConcept', () => {
    it('returns success true for valid concept', () => {
      const concept = createValidSeriesConcept()

      const result = validateSeriesConcept(concept)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.errors).toBeUndefined()
    })

    it('returns success false for invalid concept', () => {
      const concept = createValidSeriesConcept()
      concept.series.name = ''

      const result = validateSeriesConcept(concept)

      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.errors).toBeDefined()
    })

    it('handles null input', () => {
      const result = validateSeriesConcept(null)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('handles undefined input', () => {
      const result = validateSeriesConcept(undefined)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('handles completely invalid input', () => {
      const result = validateSeriesConcept({ random: 'data' })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('validateBusinessRules', () => {
    describe('Character Focus References', () => {
      it('passes when all character references are valid', () => {
        const concept = createValidSeriesConcept()

        const result = validateBusinessRules(concept)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('fails when episode references undefined character', () => {
        const concept = createValidSeriesConcept()
        concept.seasons[0].episodes[0].character_focus = ['Hero', 'NonexistentCharacter']

        const result = validateBusinessRules(concept)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain(
          'Episode "The Beginning" references undefined character "NonexistentCharacter"'
        )
      })

      it('reports all undefined character references', () => {
        const concept = createValidSeriesConcept()
        concept.seasons[0].episodes[0].character_focus = ['Invalid1', 'Invalid2']

        const result = validateBusinessRules(concept)

        expect(result.errors.length).toBeGreaterThanOrEqual(2)
      })
    })

    describe('Relationship References', () => {
      it('fails when relationship references undefined character_a', () => {
        const concept = createValidSeriesConcept()
        concept.relationships[0].character_a = 'NonexistentCharacter'

        const result = validateBusinessRules(concept)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain(
          'Relationship references undefined character "NonexistentCharacter"'
        )
      })

      it('fails when relationship references undefined character_b', () => {
        const concept = createValidSeriesConcept()
        concept.relationships[0].character_b = 'AnotherNonexistent'

        const result = validateBusinessRules(concept)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain(
          'Relationship references undefined character "AnotherNonexistent"'
        )
      })
    })

    describe('Protagonist Requirement', () => {
      it('fails when no protagonist exists', () => {
        const concept = createValidSeriesConcept()
        // Change all characters to non-protagonist roles
        concept.characters.forEach((char) => {
          char.role = 'supporting'
        })

        const result = validateBusinessRules(concept)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Series must have at least one protagonist')
      })

      it('passes with at least one protagonist', () => {
        const concept = createValidSeriesConcept()
        // Ensure at least one protagonist (should already exist)

        const result = validateBusinessRules(concept)

        const protagonistError = result.errors.find((e) => e.includes('protagonist'))
        expect(protagonistError).toBeUndefined()
      })
    })

    describe('Episode Number Sequence', () => {
      it('passes with sequential episode numbers starting at 1', () => {
        const concept = createValidSeriesConcept()

        const result = validateBusinessRules(concept)

        const sequenceError = result.errors.find((e) => e.includes('non-sequential'))
        expect(sequenceError).toBeUndefined()
      })

      it('fails with non-sequential episode numbers', () => {
        const concept = createValidSeriesConcept()
        // Set episode numbers to 1, 3 (skipping 2)
        concept.seasons[0].episodes[1].episode_number = 3

        const result = validateBusinessRules(concept)

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Season 1 has non-sequential episode numbers')
      })

      it('fails with episode numbers not starting at 1', () => {
        const concept = createValidSeriesConcept()
        concept.seasons[0].episodes[0].episode_number = 2
        concept.seasons[0].episodes[1].episode_number = 3

        const result = validateBusinessRules(concept)

        expect(result.valid).toBe(false)
      })

      it('handles unordered episode numbers (sorts before checking)', () => {
        const concept = createValidSeriesConcept()
        // Episodes are 2, 1 but should be sorted to 1, 2 and be valid
        concept.seasons[0].episodes[0].episode_number = 2
        concept.seasons[0].episodes[1].episode_number = 1

        const result = validateBusinessRules(concept)

        const sequenceError = result.errors.find((e) => e.includes('non-sequential'))
        expect(sequenceError).toBeUndefined()
      })
    })

    describe('Multiple Errors', () => {
      it('reports all business rule violations', () => {
        const concept = createValidSeriesConcept()
        // Introduce multiple errors
        concept.seasons[0].episodes[0].character_focus = ['NonexistentChar']
        concept.relationships[0].character_a = 'InvalidChar'
        concept.characters.forEach((c) => (c.role = 'supporting')) // No protagonist

        const result = validateBusinessRules(concept)

        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThanOrEqual(3)
      })
    })
  })
})
