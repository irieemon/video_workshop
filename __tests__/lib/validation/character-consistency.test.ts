/**
 * Tests for Character Consistency Validation
 *
 * Tests the validation system that ensures character specifications
 * from the database are preserved in AI-generated Sora prompts.
 */

import {
  validateCharacterConsistency,
  getQualityTier,
  getQualityAssessment,
  ValidationResult,
} from '@/lib/validation/character-consistency'
import type { CharacterWithConsistency } from '@/lib/types/character-consistency'

describe('Character Consistency Validation', () => {
  // Helper to create mock character with visual fingerprint
  function createMockCharacter(
    name: string,
    visualFingerprint: Partial<{
      hair: string
      ethnicity: string
      skin_tone: string
      eyes: string
      default_clothing: string
      age: string
    }> | null
  ): CharacterWithConsistency {
    return {
      id: `char-${name.toLowerCase()}`,
      name,
      series_id: 'series-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: null,
      visual_fingerprint: visualFingerprint,
      consistency_priority: 'high',
      character_type: 'main',
    } as CharacterWithConsistency
  }

  describe('validateCharacterConsistency', () => {
    describe('Hair Validation', () => {
      it('detects preserved hair specification', () => {
        const characters = [
          createMockCharacter('Hero', { hair: 'short black hair' }),
        ]
        const prompt = 'A hero with short black hair walks through the forest'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
        expect(result.violations).toHaveLength(0)
        expect(result.details.preservedAttributes).toBe(1)
      })

      it('detects missing hair specification', () => {
        const characters = [
          createMockCharacter('Hero', { hair: 'long blonde hair' }),
        ]
        const prompt = 'A hero walks through the forest'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(false)
        expect(result.violations).toHaveLength(1)
        expect(result.violations[0]).toEqual({
          characterName: 'Hero',
          attribute: 'hair',
          expected: 'long blonde hair',
          issue: 'Hair specification "long blonde hair" not found in prompt',
        })
      })

      it('matches partial hair terms', () => {
        const characters = [
          createMockCharacter('Hero', { hair: 'curly brown hair with highlights' }),
        ]
        // Only "curly" is in the prompt, but that should be enough
        const prompt = 'A hero with curly locks standing in sunlight'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
        expect(result.details.preservedAttributes).toBe(1)
      })
    })

    describe('Ethnicity Validation', () => {
      it('detects preserved ethnicity', () => {
        const characters = [
          createMockCharacter('Hero', { ethnicity: 'East Asian' }),
        ]
        const prompt = 'An East Asian hero stands proudly'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
        expect(result.violations).toHaveLength(0)
      })

      it('is case-insensitive for ethnicity matching', () => {
        const characters = [
          createMockCharacter('Hero', { ethnicity: 'Hispanic' }),
        ]
        const prompt = 'A HISPANIC woman walks down the street'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
      })

      it('detects missing ethnicity', () => {
        const characters = [
          createMockCharacter('Hero', { ethnicity: 'Middle Eastern' }),
        ]
        const prompt = 'A person walks through the market'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(false)
        expect(result.violations[0].attribute).toBe('ethnicity')
        expect(result.violations[0].expected).toBe('Middle Eastern')
      })
    })

    describe('Skin Tone Validation', () => {
      it('detects exact skin tone match', () => {
        const characters = [
          createMockCharacter('Hero', { skin_tone: 'olive' }),
        ]
        const prompt = 'A hero with olive complexion gazes into the distance'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
      })

      it('detects generic "skin tone" mention as valid', () => {
        const characters = [
          createMockCharacter('Hero', { skin_tone: 'dark brown' }),
        ]
        const prompt = 'A hero with matching skin tone to her environment'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
      })

      it('detects missing skin tone', () => {
        const characters = [
          createMockCharacter('Hero', { skin_tone: 'pale' }),
        ]
        const prompt = 'A hero runs through the forest'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(false)
        expect(result.violations[0].attribute).toBe('skin_tone')
      })
    })

    describe('Eye Validation', () => {
      it('detects preserved eye description', () => {
        const characters = [
          createMockCharacter('Hero', { eyes: 'bright green eyes' }),
        ]
        const prompt = 'A hero with bright green eyes looks ahead'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
      })

      it('matches partial eye terms', () => {
        const characters = [
          createMockCharacter('Hero', { eyes: 'deep blue almond-shaped eyes' }),
        ]
        const prompt = 'Her blue eyes scanned the horizon'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
      })

      it('detects missing eye description', () => {
        const characters = [
          createMockCharacter('Hero', { eyes: 'piercing amber eyes' }),
        ]
        const prompt = 'A hero stands in the doorway'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(false)
        expect(result.violations[0].attribute).toBe('eyes')
      })
    })

    describe('Clothing Validation', () => {
      it('detects preserved clothing', () => {
        const characters = [
          createMockCharacter('Hero', { default_clothing: 'leather jacket' }),
        ]
        const prompt = 'A hero in a leather jacket walks the streets'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
      })

      it('accepts generic "wearing" as clothing present', () => {
        const characters = [
          createMockCharacter('Hero', { default_clothing: 'business suit' }),
        ]
        const prompt = 'A hero wearing formal attire enters the building'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
      })

      it('creates soft violation for missing clothing', () => {
        const characters = [
          createMockCharacter('Hero', { default_clothing: 'vintage dress' }),
        ]
        const prompt = 'A hero stands in the rain'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(false)
        expect(result.violations[0].attribute).toBe('default_clothing')
        expect(result.violations[0].issue).toContain('brief can override')
      })
    })

    describe('Age Validation', () => {
      it('detects preserved age', () => {
        const characters = [
          createMockCharacter('Hero', { age: 'middle-aged' }),
        ]
        const prompt = 'A middle-aged woman reflects on her past'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
      })

      it('matches age descriptors', () => {
        const characters = [
          createMockCharacter('Hero', { age: 'young adult in their twenties' }),
        ]
        const prompt = 'A young person dances joyfully'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
      })

      it('detects missing age', () => {
        const characters = [
          createMockCharacter('Hero', { age: 'elderly' }),
        ]
        const prompt = 'A person sits on a park bench'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(false)
        expect(result.violations[0].attribute).toBe('age')
      })
    })

    describe('Multiple Characters', () => {
      it('validates all characters', () => {
        const characters = [
          createMockCharacter('Hero', { hair: 'blonde hair', ethnicity: 'Scandinavian' }),
          createMockCharacter('Villain', { hair: 'bald', eyes: 'red eyes' }),
        ]
        const prompt =
          'A blonde Scandinavian hero faces off against a bald villain with glowing red eyes'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
        expect(result.details.totalAttributes).toBe(4)
        expect(result.details.preservedAttributes).toBe(4)
      })

      it('reports violations for multiple characters', () => {
        const characters = [
          createMockCharacter('Hero', { hair: 'red hair' }),
          createMockCharacter('Sidekick', { hair: 'purple hair' }),
        ]
        const prompt = 'Two friends walk through the park'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(false)
        expect(result.violations).toHaveLength(2)
        expect(result.violations.map((v) => v.characterName)).toContain('Hero')
        expect(result.violations.map((v) => v.characterName)).toContain('Sidekick')
      })
    })

    describe('Characters Without Visual Fingerprint', () => {
      it('skips characters with null visual fingerprint', () => {
        const characters = [
          createMockCharacter('Hero', null),
          createMockCharacter('Sidekick', { hair: 'black hair' }),
        ]
        const prompt = 'A sidekick with black hair follows along'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
        expect(result.details.totalAttributes).toBe(1)
      })

      it('handles all characters having null fingerprint', () => {
        const characters = [
          createMockCharacter('Hero', null),
          createMockCharacter('Sidekick', null),
        ]
        const prompt = 'Two friends adventure together'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
        expect(result.qualityScore).toBe(100)
        expect(result.details.totalAttributes).toBe(0)
      })
    })

    describe('Quality Score Calculation', () => {
      it('returns 100 for perfect preservation', () => {
        const characters = [
          createMockCharacter('Hero', {
            hair: 'brown hair',
            eyes: 'blue eyes',
          }),
        ]
        const prompt = 'A hero with brown hair and blue eyes smiles'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.qualityScore).toBe(100)
      })

      it('returns 50 for half preserved', () => {
        const characters = [
          createMockCharacter('Hero', {
            hair: 'brown hair',
            eyes: 'blue eyes',
          }),
        ]
        const prompt = 'A hero with brown hair stands tall'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.qualityScore).toBe(50)
      })

      it('returns 0 for no preservation', () => {
        const characters = [
          createMockCharacter('Hero', {
            hair: 'purple hair',
            eyes: 'golden eyes',
          }),
        ]
        const prompt = 'A person walks down the street'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.qualityScore).toBe(0)
      })

      it('rounds quality score', () => {
        const characters = [
          createMockCharacter('Hero', {
            hair: 'brown',
            eyes: 'blue',
            age: 'young',
          }),
        ]
        // 2/3 = 66.66... should round to 67
        const prompt = 'A young person with brown hair runs'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.qualityScore).toBe(67)
      })
    })

    describe('Empty Inputs', () => {
      it('handles empty character array', () => {
        const result = validateCharacterConsistency('A scene unfolds', [])

        expect(result.valid).toBe(true)
        expect(result.qualityScore).toBe(100)
        expect(result.violations).toHaveLength(0)
      })

      it('handles empty prompt', () => {
        const characters = [createMockCharacter('Hero', { hair: 'black hair' })]
        const result = validateCharacterConsistency('', characters)

        expect(result.valid).toBe(false)
        expect(result.violations).toHaveLength(1)
      })
    })

    describe('Case Sensitivity', () => {
      it('matches case-insensitively', () => {
        const characters = [
          createMockCharacter('Hero', { hair: 'BLONDE HAIR' }),
        ]
        const prompt = 'a hero with blonde hair'

        const result = validateCharacterConsistency(prompt, characters)

        expect(result.valid).toBe(true)
      })
    })
  })

  describe('getQualityTier', () => {
    it('returns excellent for score >= 90', () => {
      expect(getQualityTier(90)).toBe('excellent')
      expect(getQualityTier(95)).toBe('excellent')
      expect(getQualityTier(100)).toBe('excellent')
    })

    it('returns good for score 75-89', () => {
      expect(getQualityTier(75)).toBe('good')
      expect(getQualityTier(80)).toBe('good')
      expect(getQualityTier(89)).toBe('good')
    })

    it('returns fair for score 60-74', () => {
      expect(getQualityTier(60)).toBe('fair')
      expect(getQualityTier(65)).toBe('fair')
      expect(getQualityTier(74)).toBe('fair')
    })

    it('returns poor for score < 60', () => {
      expect(getQualityTier(0)).toBe('poor')
      expect(getQualityTier(30)).toBe('poor')
      expect(getQualityTier(59)).toBe('poor')
    })
  })

  describe('getQualityAssessment', () => {
    it('returns excellent assessment', () => {
      const result: ValidationResult = {
        valid: true,
        violations: [],
        qualityScore: 95,
        details: { totalAttributes: 5, preservedAttributes: 5, violatedAttributes: 0 },
      }

      expect(getQualityAssessment(result)).toBe('Character specifications excellently preserved')
    })

    it('returns good assessment', () => {
      const result: ValidationResult = {
        valid: true,
        violations: [],
        qualityScore: 80,
        details: { totalAttributes: 5, preservedAttributes: 4, violatedAttributes: 1 },
      }

      expect(getQualityAssessment(result)).toBe(
        'Character specifications well preserved with minor variations'
      )
    })

    it('returns fair assessment', () => {
      const result: ValidationResult = {
        valid: false,
        violations: [],
        qualityScore: 65,
        details: { totalAttributes: 5, preservedAttributes: 3, violatedAttributes: 2 },
      }

      expect(getQualityAssessment(result)).toBe(
        'Character specifications partially preserved - review recommended'
      )
    })

    it('returns poor assessment', () => {
      const result: ValidationResult = {
        valid: false,
        violations: [],
        qualityScore: 30,
        details: { totalAttributes: 5, preservedAttributes: 1, violatedAttributes: 4 },
      }

      expect(getQualityAssessment(result)).toBe(
        'Character specifications poorly preserved - regeneration recommended'
      )
    })
  })
})
