/**
 * Tests for lib/validation/schemas.ts
 *
 * Comprehensive tests for Zod validation schemas used across the application.
 * Tests cover valid inputs, edge cases, and error messages.
 */

import { z } from 'zod'
import {
  uuidSchema,
  paginationSchema,
  platformSchema,
  characterCountSchema,
  createVideoSchema,
  updateVideoSchema,
  genreSchema,
  createSeriesSchema,
  updateSeriesSchema,
  createCharacterSchema,
  updateCharacterSchema,
  createSettingSchema,
  updateSettingSchema,
  agentRoundtableSchema,
  advancedRoundtableSchema,
  relationshipTypeSchema,
  createRelationshipSchema,
  updateRelationshipSchema,
  soraSettingsSchema,
  assetTypeSchema,
  createVisualAssetSchema,
  updateVisualAssetSchema,
  validateRequest,
  createValidationError,
} from '@/lib/validation/schemas'

describe('Validation Schemas', () => {
  // ============================================================
  // COMMON SCHEMAS
  // ============================================================

  describe('uuidSchema', () => {
    it('accepts valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(() => uuidSchema.parse(validUuid)).not.toThrow()
    })

    it('rejects invalid UUID format', () => {
      expect(() => uuidSchema.parse('not-a-uuid')).toThrow('Invalid UUID format')
    })

    it('rejects empty string', () => {
      expect(() => uuidSchema.parse('')).toThrow('Invalid UUID format')
    })

    it('rejects number', () => {
      expect(() => uuidSchema.parse(123)).toThrow()
    })
  })

  describe('paginationSchema', () => {
    it('accepts valid pagination params', () => {
      const result = paginationSchema.parse({ page: '2', limit: '50' })
      expect(result.page).toBe(2)
      expect(result.limit).toBe(50)
    })

    it('uses defaults for missing values', () => {
      const result = paginationSchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('coerces strings to numbers', () => {
      const result = paginationSchema.parse({ page: '3', limit: '30' })
      expect(result.page).toBe(3)
      expect(result.limit).toBe(30)
    })

    it('rejects page less than 1', () => {
      expect(() => paginationSchema.parse({ page: 0 })).toThrow()
    })

    it('rejects limit greater than 100', () => {
      expect(() => paginationSchema.parse({ limit: 101 })).toThrow()
    })

    it('rejects negative limit', () => {
      expect(() => paginationSchema.parse({ limit: -1 })).toThrow()
    })
  })

  // ============================================================
  // VIDEO SCHEMAS
  // ============================================================

  describe('platformSchema', () => {
    const validPlatforms = ['tiktok', 'instagram', 'youtube', 'twitter', 'facebook', 'linkedin', 'other']

    it.each(validPlatforms)('accepts platform: %s', (platform) => {
      expect(() => platformSchema.parse(platform)).not.toThrow()
    })

    it('rejects invalid platform', () => {
      expect(() => platformSchema.parse('snapchat')).toThrow()
    })
  })

  describe('characterCountSchema', () => {
    const validCounts = ['none', 'single', 'duo', 'group']

    it.each(validCounts)('accepts character count: %s', (count) => {
      expect(() => characterCountSchema.parse(count)).not.toThrow()
    })

    it('rejects invalid character count', () => {
      expect(() => characterCountSchema.parse('many')).toThrow()
    })
  })

  describe('createVideoSchema', () => {
    const validVideo = {
      series_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Video',
      user_brief: 'This is a test video brief that is at least 10 characters',
      platform: 'youtube',
    }

    it('accepts valid video data', () => {
      const result = createVideoSchema.parse(validVideo)
      expect(result.title).toBe('Test Video')
      expect(result.platform).toBe('youtube')
      expect(result.status).toBe('draft')
    })

    it('sets defaults for optional fields', () => {
      const result = createVideoSchema.parse(validVideo)
      expect(result.selectedCharacters).toEqual([])
      expect(result.selectedSettings).toEqual([])
      expect(result.hashtags).toEqual([])
      expect(result.character_count).toBe(0)
      expect(result.generation_source).toBe('manual')
    })

    it('trims title whitespace', () => {
      const result = createVideoSchema.parse({
        ...validVideo,
        title: '  Trimmed Title  ',
      })
      expect(result.title).toBe('Trimmed Title')
    })

    it('rejects missing series_id', () => {
      const { series_id, ...withoutSeriesId } = validVideo
      expect(() => createVideoSchema.parse(withoutSeriesId)).toThrow()
    })

    it('rejects title over 200 characters', () => {
      expect(() =>
        createVideoSchema.parse({
          ...validVideo,
          title: 'x'.repeat(201),
        })
      ).toThrow('Title must be less than 200 characters')
    })

    it('rejects brief under 10 characters', () => {
      expect(() =>
        createVideoSchema.parse({
          ...validVideo,
          user_brief: 'short',
        })
      ).toThrow('Brief must be at least 10 characters')
    })

    it('rejects brief over 5000 characters', () => {
      expect(() =>
        createVideoSchema.parse({
          ...validVideo,
          user_brief: 'x'.repeat(5001),
        })
      ).toThrow('Brief must be less than 5000 characters')
    })

    it('accepts valid status values', () => {
      const statuses = ['draft', 'generated', 'published']
      statuses.forEach((status) => {
        const result = createVideoSchema.parse({ ...validVideo, status })
        expect(result.status).toBe(status)
      })
    })

    it('accepts optional episodeId', () => {
      const result = createVideoSchema.parse({
        ...validVideo,
        episodeId: '550e8400-e29b-41d4-a716-446655440001',
      })
      expect(result.episodeId).toBe('550e8400-e29b-41d4-a716-446655440001')
    })

    it('accepts null episodeId', () => {
      const result = createVideoSchema.parse({
        ...validVideo,
        episodeId: null,
      })
      expect(result.episodeId).toBeNull()
    })
  })

  describe('updateVideoSchema', () => {
    it('accepts partial updates', () => {
      const result = updateVideoSchema.parse({ title: 'Updated Title' })
      expect(result.title).toBe('Updated Title')
    })

    it('accepts empty object (no updates)', () => {
      const result = updateVideoSchema.parse({})
      expect(result).toEqual({})
    })

    it('validates title length on update', () => {
      expect(() =>
        updateVideoSchema.parse({ title: 'x'.repeat(201) })
      ).toThrow('Title must be less than 200 characters')
    })

    it('accepts valid platform on update', () => {
      const result = updateVideoSchema.parse({ platform: 'tiktok' })
      expect(result.platform).toBe('tiktok')
    })
  })

  // ============================================================
  // SERIES SCHEMAS
  // ============================================================

  describe('genreSchema', () => {
    const validGenres = ['narrative', 'product-showcase', 'educational', 'brand-content', 'other']

    it.each(validGenres)('accepts genre: %s', (genre) => {
      expect(() => genreSchema.parse(genre)).not.toThrow()
    })

    it('rejects invalid genre', () => {
      expect(() => genreSchema.parse('comedy')).toThrow()
    })
  })

  describe('createSeriesSchema', () => {
    it('accepts valid series data', () => {
      const result = createSeriesSchema.parse({
        name: 'My Series',
        description: 'A test series',
        genre: 'narrative',
      })
      expect(result.name).toBe('My Series')
      expect(result.genre).toBe('narrative')
    })

    it('requires name', () => {
      expect(() =>
        createSeriesSchema.parse({ description: 'No name' })
      ).toThrow()
    })

    it('rejects name over 100 characters', () => {
      expect(() =>
        createSeriesSchema.parse({ name: 'x'.repeat(101) })
      ).toThrow('Series name must be less than 100 characters')
    })

    it('rejects description over 1000 characters', () => {
      expect(() =>
        createSeriesSchema.parse({
          name: 'Valid Name',
          description: 'x'.repeat(1001),
        })
      ).toThrow('Description must be less than 1000 characters')
    })

    it('accepts null genre', () => {
      const result = createSeriesSchema.parse({
        name: 'Series',
        genre: null,
      })
      expect(result.genre).toBeNull()
    })

    it('defaults is_system to false', () => {
      const result = createSeriesSchema.parse({ name: 'Series' })
      expect(result.is_system).toBe(false)
    })

    it('accepts is_system true', () => {
      const result = createSeriesSchema.parse({
        name: 'System Series',
        is_system: true,
      })
      expect(result.is_system).toBe(true)
    })
  })

  describe('updateSeriesSchema', () => {
    it('accepts partial updates', () => {
      const result = updateSeriesSchema.parse({ name: 'New Name' })
      expect(result.name).toBe('New Name')
    })

    it('accepts empty object', () => {
      const result = updateSeriesSchema.parse({})
      expect(result).toEqual({})
    })
  })

  // ============================================================
  // CHARACTER SCHEMAS
  // ============================================================

  describe('createCharacterSchema', () => {
    it('accepts valid character data', () => {
      const result = createCharacterSchema.parse({
        name: 'Hero',
        role: 'Protagonist',
        description: 'The main character',
      })
      expect(result.name).toBe('Hero')
      expect(result.role).toBe('Protagonist')
    })

    it('requires name', () => {
      expect(() =>
        createCharacterSchema.parse({ role: 'villain' })
      ).toThrow()
    })

    it('rejects name over 100 characters', () => {
      expect(() =>
        createCharacterSchema.parse({ name: 'x'.repeat(101) })
      ).toThrow('Name must be less than 100 characters')
    })

    it('accepts all optional fields', () => {
      const result = createCharacterSchema.parse({
        name: 'Character',
        role: 'Lead',
        description: 'Main character',
        visual_fingerprint: 'Tall with dark hair',
        voice_profile: 'Deep and commanding',
        character_arc: 'Hero journey',
        skin_tone: 'Medium',
      })
      expect(result.visual_fingerprint).toBe('Tall with dark hair')
      expect(result.skin_tone).toBe('Medium')
    })

    it('rejects description over 2000 characters', () => {
      expect(() =>
        createCharacterSchema.parse({
          name: 'Hero',
          description: 'x'.repeat(2001),
        })
      ).toThrow('Description must be less than 2000 characters')
    })
  })

  describe('updateCharacterSchema', () => {
    it('accepts partial updates', () => {
      const result = updateCharacterSchema.parse({ name: 'Updated Hero' })
      expect(result.name).toBe('Updated Hero')
    })

    it('accepts empty object', () => {
      const result = updateCharacterSchema.parse({})
      expect(result).toEqual({})
    })
  })

  // ============================================================
  // SETTING SCHEMAS
  // ============================================================

  describe('createSettingSchema', () => {
    it('accepts valid setting data', () => {
      const result = createSettingSchema.parse({
        name: 'City Street',
        description: 'An urban environment',
        atmosphere: 'Busy and vibrant',
      })
      expect(result.name).toBe('City Street')
      expect(result.atmosphere).toBe('Busy and vibrant')
    })

    it('requires name', () => {
      expect(() =>
        createSettingSchema.parse({ atmosphere: 'dark' })
      ).toThrow()
    })

    it('rejects name over 100 characters', () => {
      expect(() =>
        createSettingSchema.parse({ name: 'x'.repeat(101) })
      ).toThrow('Name must be less than 100 characters')
    })

    it('rejects atmosphere over 500 characters', () => {
      expect(() =>
        createSettingSchema.parse({
          name: 'Location',
          atmosphere: 'x'.repeat(501),
        })
      ).toThrow('Atmosphere must be less than 500 characters')
    })

    it('rejects key_features over 1000 characters', () => {
      expect(() =>
        createSettingSchema.parse({
          name: 'Location',
          key_features: 'x'.repeat(1001),
        })
      ).toThrow('Key features must be less than 1000 characters')
    })
  })

  describe('updateSettingSchema', () => {
    it('accepts partial updates', () => {
      const result = updateSettingSchema.parse({ name: 'Updated Location' })
      expect(result.name).toBe('Updated Location')
    })

    it('accepts empty object', () => {
      const result = updateSettingSchema.parse({})
      expect(result).toEqual({})
    })
  })

  // ============================================================
  // AI AGENT SCHEMAS
  // ============================================================

  describe('agentRoundtableSchema', () => {
    const validRoundtable = {
      brief: 'This is a test brief for the AI roundtable discussion',
      platform: 'youtube',
    }

    it('accepts valid roundtable data', () => {
      const result = agentRoundtableSchema.parse(validRoundtable)
      expect(result.brief).toBe('This is a test brief for the AI roundtable discussion')
      expect(result.platform).toBe('youtube')
    })

    it('rejects brief under 10 characters', () => {
      expect(() =>
        agentRoundtableSchema.parse({ ...validRoundtable, brief: 'short' })
      ).toThrow('Brief must be at least 10 characters')
    })

    it('rejects brief over 5000 characters', () => {
      expect(() =>
        agentRoundtableSchema.parse({
          ...validRoundtable,
          brief: 'x'.repeat(5001),
        })
      ).toThrow('Brief must be less than 5000 characters')
    })

    it('accepts optional seriesId and episodeId', () => {
      const result = agentRoundtableSchema.parse({
        ...validRoundtable,
        seriesId: '550e8400-e29b-41d4-a716-446655440000',
        episodeId: '550e8400-e29b-41d4-a716-446655440001',
      })
      expect(result.seriesId).toBeDefined()
      expect(result.episodeId).toBeDefined()
    })

    it('defaults selectedCharacters and selectedSettings to empty arrays', () => {
      const result = agentRoundtableSchema.parse(validRoundtable)
      expect(result.selectedCharacters).toEqual([])
      expect(result.selectedSettings).toEqual([])
    })
  })

  describe('advancedRoundtableSchema', () => {
    const validAdvanced = {
      brief: 'This is a test brief for advanced roundtable',
      platform: 'instagram',
    }

    it('extends base schema with mode', () => {
      const result = advancedRoundtableSchema.parse({
        ...validAdvanced,
        mode: 'debate',
      })
      expect(result.mode).toBe('debate')
    })

    it('defaults mode to sequential', () => {
      const result = advancedRoundtableSchema.parse(validAdvanced)
      expect(result.mode).toBe('sequential')
    })

    it('accepts all mode values', () => {
      const modes = ['sequential', 'debate', 'collaborative']
      modes.forEach((mode) => {
        const result = advancedRoundtableSchema.parse({ ...validAdvanced, mode })
        expect(result.mode).toBe(mode)
      })
    })

    it('rejects invalid mode', () => {
      expect(() =>
        advancedRoundtableSchema.parse({ ...validAdvanced, mode: 'invalid' })
      ).toThrow()
    })
  })

  // ============================================================
  // RELATIONSHIP SCHEMAS
  // ============================================================

  describe('relationshipTypeSchema', () => {
    const validTypes = [
      'allies', 'rivals', 'family', 'romantic', 'mentor-student',
      'enemies', 'colleagues', 'friends', 'other'
    ]

    it.each(validTypes)('accepts relationship type: %s', (type) => {
      expect(() => relationshipTypeSchema.parse(type)).not.toThrow()
    })

    it('rejects invalid relationship type', () => {
      expect(() => relationshipTypeSchema.parse('strangers')).toThrow()
    })
  })

  describe('createRelationshipSchema', () => {
    const validRelationship = {
      character_a_id: '550e8400-e29b-41d4-a716-446655440001',
      character_b_id: '550e8400-e29b-41d4-a716-446655440002',
      relationship_type: 'allies',
    }

    it('accepts valid relationship data', () => {
      const result = createRelationshipSchema.parse(validRelationship)
      expect(result.relationship_type).toBe('allies')
    })

    it('rejects same character for both sides', () => {
      expect(() =>
        createRelationshipSchema.parse({
          character_a_id: '550e8400-e29b-41d4-a716-446655440001',
          character_b_id: '550e8400-e29b-41d4-a716-446655440001',
          relationship_type: 'friends',
        })
      ).toThrow('Cannot create relationship between same character')
    })

    it('accepts optional description and evolution_notes', () => {
      const result = createRelationshipSchema.parse({
        ...validRelationship,
        description: 'Long-time allies',
        evolution_notes: 'Became friends in episode 3',
      })
      expect(result.description).toBe('Long-time allies')
      expect(result.evolution_notes).toBe('Became friends in episode 3')
    })

    it('rejects description over 1000 characters', () => {
      expect(() =>
        createRelationshipSchema.parse({
          ...validRelationship,
          description: 'x'.repeat(1001),
        })
      ).toThrow('Description must be less than 1000 characters')
    })
  })

  describe('updateRelationshipSchema', () => {
    it('accepts partial updates', () => {
      const result = updateRelationshipSchema.parse({
        relationship_type: 'rivals',
      })
      expect(result.relationship_type).toBe('rivals')
    })

    it('accepts empty object', () => {
      const result = updateRelationshipSchema.parse({})
      expect(result).toEqual({})
    })
  })

  // ============================================================
  // SORA SETTINGS SCHEMAS
  // ============================================================

  describe('soraSettingsSchema', () => {
    it('accepts valid sora settings', () => {
      const result = soraSettingsSchema.parse({
        sora_camera_style: 'Handheld, documentary style',
        sora_lighting_mood: 'Golden hour, warm tones',
        sora_color_palette: 'Earthy, muted colors',
        sora_overall_tone: 'Intimate and reflective',
        sora_narrative_prefix: 'A day in the life of...',
      })
      expect(result.sora_camera_style).toBe('Handheld, documentary style')
    })

    it('accepts all null values', () => {
      const result = soraSettingsSchema.parse({
        sora_camera_style: null,
        sora_lighting_mood: null,
        sora_color_palette: null,
        sora_overall_tone: null,
        sora_narrative_prefix: null,
      })
      expect(result.sora_camera_style).toBeNull()
    })

    it('accepts empty object', () => {
      const result = soraSettingsSchema.parse({})
      expect(result).toEqual({})
    })

    it('rejects camera_style over 200 characters', () => {
      expect(() =>
        soraSettingsSchema.parse({ sora_camera_style: 'x'.repeat(201) })
      ).toThrow('Camera style must be less than 200 characters')
    })

    it('rejects narrative_prefix over 500 characters', () => {
      expect(() =>
        soraSettingsSchema.parse({ sora_narrative_prefix: 'x'.repeat(501) })
      ).toThrow('Narrative prefix must be less than 500 characters')
    })
  })

  // ============================================================
  // VISUAL ASSET SCHEMAS
  // ============================================================

  describe('assetTypeSchema', () => {
    const validTypes = [
      'character_reference', 'setting_reference', 'prop_reference',
      'mood_board', 'style_reference', 'other'
    ]

    it.each(validTypes)('accepts asset type: %s', (type) => {
      expect(() => assetTypeSchema.parse(type)).not.toThrow()
    })

    it('rejects invalid asset type', () => {
      expect(() => assetTypeSchema.parse('video')).toThrow()
    })
  })

  describe('createVisualAssetSchema', () => {
    const validAsset = {
      asset_type: 'character_reference',
      file_url: 'https://example.com/image.png',
      file_name: 'hero-reference.png',
    }

    it('accepts valid asset data', () => {
      const result = createVisualAssetSchema.parse(validAsset)
      expect(result.file_name).toBe('hero-reference.png')
      expect(result.display_order).toBe(0)
    })

    it('requires file_url to be valid URL', () => {
      expect(() =>
        createVisualAssetSchema.parse({
          ...validAsset,
          file_url: 'not-a-url',
        })
      ).toThrow('Invalid URL format')
    })

    it('requires file_name', () => {
      expect(() =>
        createVisualAssetSchema.parse({
          asset_type: 'mood_board',
          file_url: 'https://example.com/image.png',
        })
      ).toThrow()
    })

    it('rejects file_name over 255 characters', () => {
      expect(() =>
        createVisualAssetSchema.parse({
          ...validAsset,
          file_name: 'x'.repeat(256),
        })
      ).toThrow('File name must be less than 255 characters')
    })

    it('accepts optional description', () => {
      const result = createVisualAssetSchema.parse({
        ...validAsset,
        description: 'Reference image for the hero character',
      })
      expect(result.description).toBe('Reference image for the hero character')
    })

    it('rejects description over 500 characters', () => {
      expect(() =>
        createVisualAssetSchema.parse({
          ...validAsset,
          description: 'x'.repeat(501),
        })
      ).toThrow('Description must be less than 500 characters')
    })
  })

  describe('updateVisualAssetSchema', () => {
    it('accepts partial updates', () => {
      const result = updateVisualAssetSchema.parse({
        description: 'Updated description',
        display_order: 5,
      })
      expect(result.description).toBe('Updated description')
      expect(result.display_order).toBe(5)
    })

    it('accepts empty object', () => {
      const result = updateVisualAssetSchema.parse({})
      expect(result).toEqual({})
    })

    it('rejects negative display_order', () => {
      expect(() =>
        updateVisualAssetSchema.parse({ display_order: -1 })
      ).toThrow()
    })
  })

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  describe('validateRequest', () => {
    const testSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      age: z.number().positive('Age must be positive'),
    })

    it('returns success with parsed data for valid input', () => {
      const result = validateRequest(testSchema, { name: 'John', age: 30 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John')
        expect(result.data.age).toBe(30)
      }
    })

    it('returns error with message for invalid input', () => {
      const result = validateRequest(testSchema, { name: '', age: 30 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Name is required')
      }
    })

    it('includes field path in error message', () => {
      const result = validateRequest(testSchema, { name: 'John', age: -5 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('age')
        expect(result.error).toContain('Age must be positive')
      }
    })

    it('includes ZodError details', () => {
      const result = validateRequest(testSchema, { name: '', age: -5 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.details).toBeDefined()
        expect(result.details?.issues.length).toBeGreaterThan(0)
      }
    })

    it('handles non-Zod errors gracefully', () => {
      const throwingSchema = z.any().transform(() => {
        throw new Error('Custom error')
      })
      const result = validateRequest(throwingSchema, { anything: true })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })
  })

  describe('createValidationError', () => {
    it('creates error object with message', () => {
      const result = createValidationError('Something went wrong')
      expect(result.error).toBe('Something went wrong')
      expect(result.validation_errors).toBeUndefined()
    })

    it('includes validation_errors from ZodError', () => {
      const zodError = new z.ZodError([
        {
          code: 'too_small',
          minimum: 1,
          type: 'string',
          inclusive: true,
          exact: false,
          message: 'Name is required',
          path: ['name'],
        },
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          message: 'Expected number, received string',
          path: ['age'],
        },
      ])

      const result = createValidationError('Validation failed', zodError)

      expect(result.error).toBe('Validation failed')
      expect(result.validation_errors).toHaveLength(2)
      expect(result.validation_errors![0]).toEqual({
        field: 'name',
        message: 'Name is required',
      })
      expect(result.validation_errors![1]).toEqual({
        field: 'age',
        message: 'Expected number, received string',
      })
    })

    it('handles nested paths', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          message: 'Required',
          path: ['user', 'profile', 'name'],
        },
      ])

      const result = createValidationError('Validation failed', zodError)

      expect(result.validation_errors![0].field).toBe('user.profile.name')
    })
  })
})
