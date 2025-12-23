import { z } from 'zod';

/**
 * Centralized Zod validation schemas for API endpoints
 * This ensures consistent validation across the application
 */

// ============================================================
// COMMON SCHEMAS
// ============================================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================
// (REMOVED: PROJECT SCHEMAS - Projects entity deprecated)
// ============================================================

// ============================================================
// VIDEO SCHEMAS
// ============================================================

export const platformSchema = z.enum([
  'tiktok',
  'instagram',
  'youtube',
  'twitter',
  'facebook',
  'linkedin',
  'other'
]);

export const characterCountSchema = z.enum([
  'none',
  'single',
  'duo',
  'group'
]);

export const createVideoSchema = z.object({
  series_id: uuidSchema, // REQUIRED: All videos must belong to a series (including system "Standalone Videos" series)
  episodeId: uuidSchema.optional().nullable(),
  selectedCharacters: z.array(uuidSchema).optional().default([]),
  selectedSettings: z.array(uuidSchema).optional().default([]),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  user_brief: z.string()
    .min(10, 'Brief must be at least 10 characters')
    .max(5000, 'Brief must be less than 5000 characters')
    .trim(),
  agent_discussion: z.any().optional().nullable(), // JSONB field
  detailed_breakdown: z.any().optional().nullable(), // JSONB field
  optimized_prompt: z.string().optional().nullable(),
  character_count: z.number().int().nonnegative().optional().default(0),
  platform: platformSchema,
  status: z.enum(['draft', 'generated', 'published']).optional().default('draft'),
  hashtags: z.array(z.string().trim().min(1)).optional().default([]),
  generation_source: z.enum(['manual', 'episode', 'template']).optional().default('manual'),
  source_metadata: z.any().optional().nullable(),
});

export const updateVideoSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  userBrief: z.string()
    .min(10, 'Brief must be at least 10 characters')
    .max(5000, 'Brief must be less than 5000 characters')
    .trim()
    .optional(),
  optimizedPrompt: z.string()
    .max(10000, 'Prompt must be less than 10000 characters')
    .optional(),
  characterCount: characterCountSchema.optional(),
  platform: platformSchema.optional(),
});

// ============================================================
// SERIES SCHEMAS
// ============================================================

export const genreSchema = z.enum([
  'narrative',
  'product-showcase',
  'educational',
  'brand-content',
  'other'
]);

export const createSeriesSchema = z.object({
  name: z.string()
    .min(1, 'Series name is required')
    .max(100, 'Series name must be less than 100 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
  genre: genreSchema.optional().nullable(),
  workspace_id: uuidSchema.optional().nullable(), // Optional: series can exist independently or within workspaces
  is_system: z.boolean().optional().default(false), // System series are hidden (e.g., "Standalone Videos")
});

export const updateSeriesSchema = z.object({
  name: z.string()
    .min(1, 'Series name is required')
    .max(100, 'Series name must be less than 100 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
  genre: genreSchema.optional().nullable(),
});

// ============================================================
// CHARACTER SCHEMAS
// ============================================================

export const createCharacterSchema = z.object({
  name: z.string()
    .min(1, 'Character name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  role: z.string()
    .max(50, 'Role must be less than 50 characters')
    .trim()
    .optional()
    .nullable(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional()
    .nullable(),
  visual_fingerprint: z.string()
    .max(2000, 'Visual fingerprint must be less than 2000 characters')
    .trim()
    .optional()
    .nullable(),
  voice_profile: z.string()
    .max(1000, 'Voice profile must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
  character_arc: z.string()
    .max(1000, 'Character arc must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
  skin_tone: z.string()
    .max(100, 'Skin tone must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),
});

export const updateCharacterSchema = createCharacterSchema.partial();

// ============================================================
// SETTING SCHEMAS
// ============================================================

export const createSettingSchema = z.object({
  name: z.string()
    .min(1, 'Setting name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional()
    .nullable(),
  atmosphere: z.string()
    .max(500, 'Atmosphere must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
  key_features: z.string()
    .max(1000, 'Key features must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
});

export const updateSettingSchema = createSettingSchema.partial();

// ============================================================
// AI AGENT SCHEMAS
// ============================================================

export const agentRoundtableSchema = z.object({
  brief: z.string()
    .min(10, 'Brief must be at least 10 characters')
    .max(5000, 'Brief must be less than 5000 characters')
    .trim(),
  platform: platformSchema,
  seriesId: uuidSchema.optional().nullable(),
  episodeId: uuidSchema.optional().nullable(), // Auto-fetch series context from episode
  selectedCharacters: z.array(uuidSchema).optional().default([]),
  selectedSettings: z.array(uuidSchema).optional().default([]),
});

export const advancedRoundtableSchema = agentRoundtableSchema.extend({
  mode: z.enum(['sequential', 'debate', 'collaborative']).default('sequential'),
});

// ============================================================
// RELATIONSHIP SCHEMAS
// ============================================================

export const relationshipTypeSchema = z.enum([
  'allies',
  'rivals',
  'family',
  'romantic',
  'mentor-student',
  'enemies',
  'colleagues',
  'friends',
  'other'
]);

export const createRelationshipSchema = z.object({
  character_a_id: uuidSchema,
  character_b_id: uuidSchema,
  relationship_type: relationshipTypeSchema,
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
  evolution_notes: z.string()
    .max(1000, 'Evolution notes must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
}).refine(
  (data) => data.character_a_id !== data.character_b_id,
  {
    message: 'Cannot create relationship between same character',
    path: ['character_b_id'],
  }
);

export const updateRelationshipSchema = z.object({
  relationship_type: relationshipTypeSchema.optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
  evolution_notes: z.string()
    .max(1000, 'Evolution notes must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
});

// ============================================================
// SORA SETTINGS SCHEMAS
// ============================================================

export const soraSettingsSchema = z.object({
  sora_camera_style: z.string()
    .max(200, 'Camera style must be less than 200 characters')
    .trim()
    .optional()
    .nullable(),
  sora_lighting_mood: z.string()
    .max(200, 'Lighting mood must be less than 200 characters')
    .trim()
    .optional()
    .nullable(),
  sora_color_palette: z.string()
    .max(200, 'Color palette must be less than 200 characters')
    .trim()
    .optional()
    .nullable(),
  sora_overall_tone: z.string()
    .max(200, 'Overall tone must be less than 200 characters')
    .trim()
    .optional()
    .nullable(),
  sora_narrative_prefix: z.string()
    .max(500, 'Narrative prefix must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
});

// ============================================================
// VISUAL ASSET SCHEMAS
// ============================================================

export const assetTypeSchema = z.enum([
  'character_reference',
  'setting_reference',
  'prop_reference',
  'mood_board',
  'style_reference',
  'other'
]);

export const createVisualAssetSchema = z.object({
  asset_type: assetTypeSchema,
  file_url: z.string().url('Invalid URL format'),
  file_name: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name must be less than 255 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
  display_order: z.number().int().nonnegative().optional().default(0),
});

export const updateVisualAssetSchema = z.object({
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
  display_order: z.number().int().nonnegative().optional(),
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Validates request body against a schema and returns parsed data or error response
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details?: z.ZodError } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      const fieldPath = firstError.path.join('.');
      const errorMessage = fieldPath
        ? `${fieldPath}: ${firstError.message}`
        : firstError.message;
      return {
        success: false,
        error: errorMessage,
        details: error,
      };
    }
    return {
      success: false,
      error: 'Validation failed',
    };
  }
}

/**
 * Express/Next.js middleware helper for validation
 */
export function createValidationError(error: string, details?: z.ZodError) {
  return {
    error,
    validation_errors: details?.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}
