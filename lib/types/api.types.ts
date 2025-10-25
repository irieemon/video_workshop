/**
 * API Response Types
 * Type-safe definitions for API responses and transformations
 */

// ============================================================
// PROJECT TYPES
// ============================================================

interface ProjectCountsRaw {
  count: number | null;
}

export interface ProjectWithCountsRaw {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  videos: ProjectCountsRaw[];
  series: ProjectCountsRaw[];
}

export interface ProjectWithCounts {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  video_count: number;
  series_count: number;
}

// ============================================================
// SERIES TYPES
// ============================================================

export interface SeriesWithCountsRaw {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  genre: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null;
  created_at: string;
  updated_at: string;
  characters: ProjectCountsRaw[];
  settings: ProjectCountsRaw[];
  episodes: ProjectCountsRaw[];
}

export interface SeriesWithCounts {
  id: string;
  name: string;
  description: string | null;
  genre: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null;
  character_count: number;
  setting_count: number;
  episode_count: number;
  updated_at: string;
  project_id: string | null;
}

// ============================================================
// VIDEO TYPES
// ============================================================

export interface Video {
  id: string;
  user_id: string;
  project_id: string;
  series_id: string | null;
  title: string;
  user_brief: string;
  agent_discussion: string | null;
  detailed_breakdown: string | null;
  optimized_prompt: string;
  character_count: 'none' | 'single' | 'duo' | 'group';
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'linkedin' | 'other';
  series_characters_used: string[];
  series_settings_used: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================
// PROFILE TYPES
// ============================================================

export interface UsageQuota {
  projects?: number;
  videos_per_month?: number;
  ai_requests_per_day?: number;
  storage_mb?: number;
}

export interface UsageCurrent {
  projects?: number;
  videos_this_month?: number;
  ai_requests_today?: number;
  storage_used_mb?: number;
}

export interface Profile {
  id: string;
  email: string;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  usage_quota: UsageQuota;
  usage_current: UsageCurrent;
  created_at: string;
  updated_at: string;
}

// ============================================================
// CHARACTER TYPES
// ============================================================

export interface SeriesCharacter {
  id: string;
  series_id: string;
  name: string;
  role: string | null;
  description: string | null;
  visual_fingerprint: string | null;
  voice_profile: string | null;
  character_arc: string | null;
  skin_tone: string | null;
  sora_prompt_template: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// SETTING TYPES
// ============================================================

export interface SeriesSetting {
  id: string;
  series_id: string;
  name: string;
  description: string | null;
  atmosphere: string | null;
  key_features: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// RELATIONSHIP TYPES
// ============================================================

export type RelationshipType =
  | 'allies'
  | 'rivals'
  | 'family'
  | 'romantic'
  | 'mentor-student'
  | 'enemies'
  | 'colleagues'
  | 'friends'
  | 'other';

export interface CharacterRelationship {
  id: string;
  series_id: string;
  character_a_id: string;
  character_b_id: string;
  relationship_type: RelationshipType;
  description: string | null;
  evolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CharacterRelationshipWithNames extends CharacterRelationship {
  character_a: {
    id: string;
    name: string;
  };
  character_b: {
    id: string;
    name: string;
  };
}

// ============================================================
// VISUAL ASSET TYPES
// ============================================================

export type AssetType =
  | 'character_reference'
  | 'setting_reference'
  | 'prop_reference'
  | 'mood_board'
  | 'style_reference'
  | 'other';

export interface VisualAsset {
  id: string;
  series_id: string;
  asset_type: AssetType;
  file_url: string;
  file_name: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// ERROR TYPES
// ============================================================

export interface APIError {
  error: string;
  code?: string;
  message?: string;
  validation_errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface QuotaExceededError extends APIError {
  code: 'QUOTA_EXCEEDED';
  current: number;
  max: number;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Transform raw project data with counts to clean format
 */
export function transformProjectWithCounts(
  raw: ProjectWithCountsRaw
): ProjectWithCounts {
  return {
    ...raw,
    video_count: raw.videos[0]?.count || 0,
    series_count: raw.series[0]?.count || 0,
  };
}

/**
 * Transform raw series data with counts to clean format
 */
export function transformSeriesWithCounts(
  raw: SeriesWithCountsRaw
): SeriesWithCounts {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    genre: raw.genre,
    character_count: raw.characters[0]?.count || 0,
    setting_count: raw.settings[0]?.count || 0,
    episode_count: raw.episodes[0]?.count || 0,
    updated_at: raw.updated_at,
    project_id: raw.project_id,
  };
}

/**
 * Type guard for quota exceeded error
 */
export function isQuotaExceededError(error: unknown): error is QuotaExceededError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as QuotaExceededError).code === 'QUOTA_EXCEEDED'
  );
}
