/**
 * Tests for Screenplay to Sora Prompt Builder
 *
 * Tests the conversion of structured screenplay scenes into Sora video prompts.
 */

import {
  sceneToSoraPrompt,
  getAllScenes,
  findSceneByNumber,
  findScenesByCharacter,
  generateScenePreview,
  buildCharacterDescriptions,
  SoraPromptOptions,
} from '@/lib/utils/screenplay-to-sora'
import type { Scene, StructuredScreenplay } from '@/lib/types/database.types'

describe('Screenplay to Sora', () => {
  // Helper to create mock scene
  function createMockScene(overrides: Partial<Scene> = {}): Scene {
    return {
      scene_id: 'scene_1',
      scene_number: 1,
      location: 'OFFICE',
      time_of_day: 'INT' as 'INT' | 'EXT' | 'INT/EXT',
      time_period: 'DAY' as 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS',
      description: 'A modern office with glass walls.',
      characters: ['JOHN', 'MARY'],
      dialogue: [
        { character: 'JOHN', lines: ['Hello, Mary.', 'How are you?'] },
        { character: 'MARY', lines: ['Fine, thanks.'] },
      ],
      action: ['John walks to the window.', 'Mary sits down.'],
      duration_estimate: 5,
      ...overrides,
    }
  }

  // Helper to create mock screenplay
  function createMockScreenplay(overrides: Partial<StructuredScreenplay> = {}): StructuredScreenplay {
    return {
      title: 'Test Screenplay',
      logline: 'A test story',
      scenes: [
        createMockScene({ scene_number: 1 }),
        createMockScene({
          scene_id: 'scene_2',
          scene_number: 2,
          location: 'STREET',
          time_of_day: 'EXT',
          time_period: 'NIGHT',
          characters: ['JOHN'],
        }),
        createMockScene({
          scene_id: 'scene_3',
          scene_number: 3,
          location: 'PARK',
          time_of_day: 'EXT',
          time_period: 'DAY',
          characters: ['MARY', 'BOB'],
        }),
      ],
      acts: [],
      beats: [],
      notes: [],
      ...overrides,
    }
  }

  describe('sceneToSoraPrompt', () => {
    describe('Basic Prompt Generation', () => {
      it('generates prompt with required fields', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).toContain('**Story & Direction**')
        expect(result.prompt).toContain('A modern office with glass walls.')
        expect(result.prompt).toContain('**Format & Technical Specs**')
      })

      it('includes scene metadata in output', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene)

        expect(result.sceneInfo.sceneNumber).toBe(1)
        expect(result.sceneInfo.location).toBe('OFFICE')
        expect(result.sceneInfo.timeOfDay).toBe('INT')
        expect(result.sceneInfo.timePeriod).toBe('DAY')
        expect(result.sceneInfo.characters).toEqual(['JOHN', 'MARY'])
      })

      it('includes dialogue in output', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene)

        expect(result.dialogue).toHaveLength(2)
        expect(result.dialogue[0].character).toBe('JOHN')
        expect(result.dialogue[1].character).toBe('MARY')
      })

      it('includes actions in output', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene)

        expect(result.actions).toContain('John walks to the window.')
        expect(result.actions).toContain('Mary sits down.')
      })
    })

    describe('Default Options', () => {
      it('uses scene duration_estimate as default', () => {
        const scene = createMockScene({ duration_estimate: 8 })
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).toContain('**Duration:** 8 seconds')
        expect(result.sceneInfo.duration).toBe(8)
      })

      it('uses fallback duration of 6 when not specified', () => {
        const scene = createMockScene({ duration_estimate: undefined })
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).toContain('**Duration:** 6 seconds')
        expect(result.sceneInfo.duration).toBe(6)
      })

      it('uses default aspect ratio of 9:16', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).toContain('**Aspect Ratio:** 9:16')
      })

      it('uses default resolution of 1080p', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).toContain('**Resolution:** 1080p')
      })
    })

    describe('Custom Options', () => {
      it('respects custom duration', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = { duration: 10 }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**Duration:** 10 seconds')
        expect(result.sceneInfo.duration).toBe(10)
      })

      it('respects custom aspect ratio', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = { aspectRatio: '16:9' }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**Aspect Ratio:** 16:9')
      })

      it('respects custom resolution', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = { resolution: '720p' }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**Resolution:** 720p')
      })

      it('supports 1:1 aspect ratio', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = { aspectRatio: '1:1' }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**Aspect Ratio:** 1:1')
      })
    })

    describe('Visual Style Options', () => {
      it('includes camera style when provided', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = { cameraStyle: 'Handheld, shaky cam' }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**Visual Style**')
        expect(result.prompt).toContain('**Camera:** Handheld, shaky cam')
      })

      it('includes lighting mood when provided', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = { lightingMood: 'Warm, golden hour' }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**Lighting:** Warm, golden hour')
      })

      it('includes color palette when provided', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = { colorPalette: 'Muted earth tones' }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**Color Palette:** Muted earth tones')
      })

      it('includes overall tone when provided', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = { overallTone: 'Suspenseful and tense' }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**Overall Tone:** Suspenseful and tense')
      })

      it('omits visual style section when no style options', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene, {})

        expect(result.prompt).not.toContain('**Visual Style**')
      })

      it('includes all visual styles together', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = {
          cameraStyle: 'Steadicam',
          lightingMood: 'Dramatic',
          colorPalette: 'High contrast',
          overallTone: 'Epic',
        }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**Camera:** Steadicam')
        expect(result.prompt).toContain('**Lighting:** Dramatic')
        expect(result.prompt).toContain('**Color Palette:** High contrast')
        expect(result.prompt).toContain('**Overall Tone:** Epic')
      })
    })

    describe('Character Descriptions', () => {
      it('includes character names in prompt', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).toContain('**Characters in Scene:**')
        expect(result.prompt).toContain('**JOHN**')
        expect(result.prompt).toContain('**MARY**')
      })

      it('adds character descriptions when provided', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = {
          characterDescriptions: {
            JOHN: 'Tall man in his 30s, wearing a suit',
            MARY: 'Young woman with red hair',
          },
        }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**JOHN**: Tall man in his 30s, wearing a suit')
        expect(result.prompt).toContain('**MARY**: Young woman with red hair')
      })

      it('handles partial character descriptions', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = {
          characterDescriptions: {
            JOHN: 'Tall businessman',
          },
        }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**JOHN**: Tall businessman')
        expect(result.prompt).toMatch(/- \*\*MARY\*\*[^:]/)
      })

      it('omits characters section when no characters', () => {
        const scene = createMockScene({ characters: [] })
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).not.toContain('**Characters in Scene:**')
      })

      it('handles undefined characters array', () => {
        const scene = createMockScene({ characters: undefined })
        const result = sceneToSoraPrompt(scene)

        expect(result.sceneInfo.characters).toEqual([])
      })
    })

    describe('Dialogue Formatting', () => {
      it('includes dialogue section in prompt', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).toContain('**Dialogue:**')
        expect(result.prompt).toContain('**JOHN**:')
        expect(result.prompt).toContain('**MARY**:')
      })

      it('joins multiple dialogue lines with spaces', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene)

        // JOHN has two lines: "Hello, Mary." and "How are you?"
        expect(result.prompt).toContain('"Hello, Mary. How are you?"')
      })

      it('handles dialogue with string lines (not array)', () => {
        const scene = createMockScene({
          dialogue: [
            { character: 'JOHN', lines: 'Single line dialogue' as unknown as string[] },
          ],
        })
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).toContain('"Single line dialogue"')
      })

      it('omits dialogue section when no dialogue', () => {
        const scene = createMockScene({ dialogue: [] })
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).not.toContain('**Dialogue:**')
      })

      it('handles undefined dialogue array', () => {
        const scene = createMockScene({ dialogue: undefined })
        const result = sceneToSoraPrompt(scene)

        expect(result.dialogue).toEqual([])
      })
    })

    describe('Action Formatting', () => {
      it('includes actions section in prompt', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).toContain('**Key Actions:**')
        expect(result.prompt).toContain('- John walks to the window.')
        expect(result.prompt).toContain('- Mary sits down.')
      })

      it('omits actions section when no actions', () => {
        const scene = createMockScene({ action: [] })
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).not.toContain('**Key Actions:**')
      })

      it('handles undefined action array', () => {
        const scene = createMockScene({ action: undefined })
        const result = sceneToSoraPrompt(scene)

        expect(result.actions).toEqual([])
      })
    })

    describe('Location Formatting', () => {
      it('includes location and setting section', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).toContain('**Location & Setting**')
        expect(result.prompt).toContain('**OFFICE** (INT - DAY)')
      })

      it('includes scene type in technical specs', () => {
        const scene = createMockScene({
          location: 'BEACH',
          time_of_day: 'EXT',
          time_period: 'DUSK',
        })
        const result = sceneToSoraPrompt(scene)

        expect(result.prompt).toContain('**Scene Type:** EXT BEACH - DUSK')
      })
    })

    describe('Custom Instructions', () => {
      it('includes custom instructions when provided', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = {
          customInstructions: 'Focus on character emotions. Use slow motion for dramatic moments.',
        }
        const result = sceneToSoraPrompt(scene, options)

        expect(result.prompt).toContain('**Additional Instructions:**')
        expect(result.prompt).toContain('Focus on character emotions. Use slow motion for dramatic moments.')
      })

      it('omits custom instructions when not provided', () => {
        const scene = createMockScene()
        const result = sceneToSoraPrompt(scene, {})

        expect(result.prompt).not.toContain('**Additional Instructions:**')
      })
    })

    describe('Complete Prompt Structure', () => {
      it('includes all sections in correct order', () => {
        const scene = createMockScene()
        const options: SoraPromptOptions = {
          cameraStyle: 'Steadicam',
          customInstructions: 'Test instruction',
        }
        const result = sceneToSoraPrompt(scene, options)

        const prompt = result.prompt
        const storyIndex = prompt.indexOf('**Story & Direction**')
        const charactersIndex = prompt.indexOf('**Characters in Scene:**')
        const dialogueIndex = prompt.indexOf('**Dialogue:**')
        const actionsIndex = prompt.indexOf('**Key Actions:**')
        const formatIndex = prompt.indexOf('**Format & Technical Specs**')
        const styleIndex = prompt.indexOf('**Visual Style**')
        const locationIndex = prompt.indexOf('**Location & Setting**')
        const instructionsIndex = prompt.indexOf('**Additional Instructions:**')

        expect(storyIndex).toBeLessThan(charactersIndex)
        expect(charactersIndex).toBeLessThan(dialogueIndex)
        expect(dialogueIndex).toBeLessThan(actionsIndex)
        expect(actionsIndex).toBeLessThan(formatIndex)
        expect(formatIndex).toBeLessThan(styleIndex)
        expect(styleIndex).toBeLessThan(locationIndex)
        expect(locationIndex).toBeLessThan(instructionsIndex)
      })
    })
  })

  describe('getAllScenes', () => {
    it('returns scenes from screenplay', () => {
      const screenplay = createMockScreenplay()
      const scenes = getAllScenes(screenplay)

      expect(scenes).toHaveLength(3)
      expect(scenes[0].scene_number).toBe(1)
      expect(scenes[1].scene_number).toBe(2)
      expect(scenes[2].scene_number).toBe(3)
    })

    it('returns empty array for null screenplay', () => {
      const scenes = getAllScenes(null)

      expect(scenes).toEqual([])
    })

    it('returns empty array for screenplay with no scenes', () => {
      const screenplay = createMockScreenplay({ scenes: undefined as unknown as Scene[] })
      const scenes = getAllScenes(screenplay)

      expect(scenes).toEqual([])
    })

    it('returns empty array for empty scenes array', () => {
      const screenplay = createMockScreenplay({ scenes: [] })
      const scenes = getAllScenes(screenplay)

      expect(scenes).toEqual([])
    })
  })

  describe('findSceneByNumber', () => {
    it('finds scene by number', () => {
      const screenplay = createMockScreenplay()
      const scene = findSceneByNumber(screenplay, 2)

      expect(scene).not.toBeNull()
      expect(scene?.scene_number).toBe(2)
      expect(scene?.location).toBe('STREET')
    })

    it('returns null when scene not found', () => {
      const screenplay = createMockScreenplay()
      const scene = findSceneByNumber(screenplay, 99)

      expect(scene).toBeNull()
    })

    it('returns null for null screenplay', () => {
      const scene = findSceneByNumber(null, 1)

      expect(scene).toBeNull()
    })

    it('finds first scene', () => {
      const screenplay = createMockScreenplay()
      const scene = findSceneByNumber(screenplay, 1)

      expect(scene?.location).toBe('OFFICE')
    })

    it('finds last scene', () => {
      const screenplay = createMockScreenplay()
      const scene = findSceneByNumber(screenplay, 3)

      expect(scene?.location).toBe('PARK')
    })
  })

  describe('findScenesByCharacter', () => {
    it('finds scenes by character name', () => {
      const screenplay = createMockScreenplay()
      const scenes = findScenesByCharacter(screenplay, 'JOHN')

      expect(scenes).toHaveLength(2)
      expect(scenes[0].location).toBe('OFFICE')
      expect(scenes[1].location).toBe('STREET')
    })

    it('returns empty array when character not found', () => {
      const screenplay = createMockScreenplay()
      const scenes = findScenesByCharacter(screenplay, 'UNKNOWN')

      expect(scenes).toEqual([])
    })

    it('returns empty array for null screenplay', () => {
      const scenes = findScenesByCharacter(null, 'JOHN')

      expect(scenes).toEqual([])
    })

    it('performs case-insensitive search', () => {
      const screenplay = createMockScreenplay()
      const scenes = findScenesByCharacter(screenplay, 'john')

      expect(scenes).toHaveLength(2)
    })

    it('performs partial match', () => {
      const screenplay = createMockScreenplay()
      const scenes = findScenesByCharacter(screenplay, 'JO')

      expect(scenes).toHaveLength(2)
    })

    it('finds character in multiple scenes', () => {
      const screenplay = createMockScreenplay()
      const scenes = findScenesByCharacter(screenplay, 'MARY')

      expect(scenes).toHaveLength(2) // Scene 1 (OFFICE) and Scene 3 (PARK)
    })
  })

  describe('generateScenePreview', () => {
    it('generates basic preview', () => {
      const scene = createMockScene()
      const preview = generateScenePreview(scene)

      expect(preview).toContain('Scene 1: OFFICE')
      expect(preview).toContain('(INT - DAY)')
    })

    it('includes characters in preview', () => {
      const scene = createMockScene()
      const preview = generateScenePreview(scene)

      expect(preview).toContain('Characters: JOHN, MARY')
    })

    it('includes first dialogue line preview', () => {
      const scene = createMockScene()
      const preview = generateScenePreview(scene)

      expect(preview).toContain('JOHN: "Hello, Mary.')
    })

    it('handles scene without characters', () => {
      const scene = createMockScene({ characters: [] })
      const preview = generateScenePreview(scene)

      expect(preview).not.toContain('Characters:')
    })

    it('handles scene without dialogue', () => {
      const scene = createMockScene({ dialogue: [] })
      const preview = generateScenePreview(scene)

      expect(preview).toContain('Scene 1: OFFICE')
      expect(preview).not.toContain('JOHN:')
    })

    it('truncates long dialogue preview', () => {
      const scene = createMockScene({
        dialogue: [{
          character: 'JOHN',
          lines: ['This is a very long line of dialogue that should be truncated in the preview.'],
        }],
      })
      const preview = generateScenePreview(scene)

      expect(preview).toContain('...')
      expect(preview.length).toBeLessThan(200)
    })

    it('handles dialogue lines as string (not array)', () => {
      const scene = createMockScene({
        dialogue: [{
          character: 'JOHN',
          lines: 'Single line as string' as unknown as string[],
        }],
      })
      const preview = generateScenePreview(scene)

      expect(preview).toContain('JOHN: "')
    })
  })

  describe('buildCharacterDescriptions', () => {
    it('builds descriptions from character data', () => {
      const characters = [
        { name: 'JOHN', description: 'Tall businessman', role: 'Protagonist', performance_style: 'Intense' },
        { name: 'MARY', description: 'Young artist', role: 'Supporting', performance_style: null },
      ]
      const descriptions = buildCharacterDescriptions(characters)

      expect(descriptions.JOHN).toContain('Tall businessman')
      expect(descriptions.JOHN).toContain('(Protagonist)')
      expect(descriptions.JOHN).toContain('Performance: Intense')
      expect(descriptions.MARY).toContain('Young artist')
      expect(descriptions.MARY).toContain('(Supporting)')
    })

    it('handles characters with only description', () => {
      const characters = [
        { name: 'JOHN', description: 'Just a description' },
      ]
      const descriptions = buildCharacterDescriptions(characters)

      expect(descriptions.JOHN).toBe('Just a description')
    })

    it('handles characters with null description', () => {
      const characters = [
        { name: 'JOHN', description: null, role: 'Lead' },
      ]
      const descriptions = buildCharacterDescriptions(characters)

      expect(descriptions.JOHN).toBe('(Lead)')
    })

    it('handles characters with all null fields', () => {
      const characters = [
        { name: 'JOHN', description: null, role: null, performance_style: null },
      ]
      const descriptions = buildCharacterDescriptions(characters)

      expect(descriptions.JOHN).toBe('')
    })

    it('handles empty characters array', () => {
      const descriptions = buildCharacterDescriptions([])

      expect(descriptions).toEqual({})
    })

    it('separates parts with pipe delimiter', () => {
      const characters = [
        { name: 'JOHN', description: 'Part 1', role: 'Part 2', performance_style: 'Part 3' },
      ]
      const descriptions = buildCharacterDescriptions(characters)

      expect(descriptions.JOHN).toBe('Part 1 | (Part 2) | Performance: Part 3')
    })
  })
})
