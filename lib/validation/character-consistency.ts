/**
 * Character Consistency Validation
 *
 * Post-generation validation to ensure character specifications from the database
 * are preserved in AI-generated Sora prompts.
 */

import type { CharacterWithConsistency } from '@/lib/types/character-consistency'
import { createAPILogger } from '@/lib/logger'

const logger = createAPILogger('character-validation')

export interface CharacterViolation {
  characterName: string
  attribute: string
  expected: string
  issue: string
}

export interface ValidationResult {
  valid: boolean
  violations: CharacterViolation[]
  qualityScore: number
  details: {
    totalAttributes: number
    preservedAttributes: number
    violatedAttributes: number
  }
}

/**
 * Validates that character specifications are preserved in the final prompt
 */
export function validateCharacterConsistency(
  finalPrompt: string,
  characters: CharacterWithConsistency[]
): ValidationResult {
  const violations: CharacterViolation[] = []
  let totalAttributes = 0
  let preservedAttributes = 0

  const promptLower = finalPrompt.toLowerCase()

  for (const char of characters) {
    const vf = char.visual_fingerprint
    if (!vf) continue

    // Check hair
    if (vf.hair) {
      totalAttributes++
      const hairTerms = extractKeyTerms(vf.hair)
      const hairPreserved = hairTerms.some(term => promptLower.includes(term.toLowerCase()))

      if (hairPreserved) {
        preservedAttributes++
      } else {
        violations.push({
          characterName: char.name,
          attribute: 'hair',
          expected: vf.hair,
          issue: `Hair specification "${vf.hair}" not found in prompt`
        })
      }
    }

    // Check ethnicity
    if (vf.ethnicity) {
      totalAttributes++
      const ethnicityLower = vf.ethnicity.toLowerCase()

      if (promptLower.includes(ethnicityLower)) {
        preservedAttributes++
      } else {
        violations.push({
          characterName: char.name,
          attribute: 'ethnicity',
          expected: vf.ethnicity,
          issue: `Ethnicity "${vf.ethnicity}" not explicitly mentioned in prompt`
        })
      }
    }

    // Check skin tone
    if (vf.skin_tone) {
      totalAttributes++
      const skinTonePreserved = promptLower.includes('skin tone') ||
                                 promptLower.includes(vf.skin_tone.toLowerCase())

      if (skinTonePreserved) {
        preservedAttributes++
      } else {
        violations.push({
          characterName: char.name,
          attribute: 'skin_tone',
          expected: vf.skin_tone,
          issue: 'Skin tone not specified in prompt'
        })
      }
    }

    // Check eyes
    if (vf.eyes) {
      totalAttributes++
      const eyeTerms = extractKeyTerms(vf.eyes)
      const eyesPreserved = eyeTerms.some(term => promptLower.includes(term.toLowerCase()))

      if (eyesPreserved) {
        preservedAttributes++
      } else {
        violations.push({
          characterName: char.name,
          attribute: 'eyes',
          expected: vf.eyes,
          issue: `Eye description "${vf.eyes}" not found in prompt`
        })
      }
    }

    // Check default clothing (more lenient - brief might override)
    if (vf.default_clothing) {
      totalAttributes++
      const clothingTerms = extractKeyTerms(vf.default_clothing)
      const clothingPreserved = clothingTerms.some(term => promptLower.includes(term.toLowerCase())) ||
                                promptLower.includes('wearing')

      if (clothingPreserved) {
        preservedAttributes++
      } else {
        // This is a warning, not a hard violation (brief can override clothing)
        violations.push({
          characterName: char.name,
          attribute: 'default_clothing',
          expected: vf.default_clothing,
          issue: `Default clothing "${vf.default_clothing}" may not be preserved (brief can override)`
        })
      }
    }

    // Check age
    if (vf.age) {
      totalAttributes++
      const ageTerms = extractKeyTerms(vf.age)
      const agePreserved = ageTerms.some(term => promptLower.includes(term.toLowerCase()))

      if (agePreserved) {
        preservedAttributes++
      } else {
        violations.push({
          characterName: char.name,
          attribute: 'age',
          expected: vf.age,
          issue: `Age "${vf.age}" not found in prompt`
        })
      }
    }
  }

  // Calculate quality score (0-100)
  const qualityScore = totalAttributes > 0
    ? Math.round((preservedAttributes / totalAttributes) * 100)
    : 100

  const result: ValidationResult = {
    valid: violations.length === 0,
    violations,
    qualityScore,
    details: {
      totalAttributes,
      preservedAttributes,
      violatedAttributes: violations.length
    }
  }

  // Log validation results
  if (violations.length > 0) {
    logger.warn('Character consistency violations detected', {
      qualityScore,
      violationCount: violations.length,
      violations: violations.map(v => ({
        character: v.characterName,
        attribute: v.attribute
      }))
    })
  } else {
    logger.info('Character consistency validation passed', {
      qualityScore,
      characterCount: characters.length,
      totalAttributes
    })
  }

  return result
}

/**
 * Extract key terms from a character attribute for matching
 * Example: "short black hair" -> ["short", "black", "hair"]
 */
function extractKeyTerms(text: string): string[] {
  // Remove common connector words
  const stopWords = ['with', 'and', 'the', 'a', 'an', 'or']

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
}

/**
 * Get quality tier based on quality score
 */
export function getQualityTier(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'fair'
  return 'poor'
}

/**
 * Get human-readable quality assessment
 */
export function getQualityAssessment(result: ValidationResult): string {
  const tier = getQualityTier(result.qualityScore)

  const assessments = {
    excellent: 'Character specifications excellently preserved',
    good: 'Character specifications well preserved with minor variations',
    fair: 'Character specifications partially preserved - review recommended',
    poor: 'Character specifications poorly preserved - regeneration recommended'
  }

  return assessments[tier]
}
