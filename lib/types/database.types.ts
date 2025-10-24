export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'premium'
          subscription_expires_at: string | null
          usage_quota: {
            projects: number
            videos_per_month: number
            consultations_per_month: number
          }
          usage_current: {
            projects: number
            videos_this_month: number
            consultations_this_month: number
          }
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'premium'
          subscription_expires_at?: string | null
          usage_quota?: Json
          usage_current?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'premium'
          subscription_expires_at?: string | null
          usage_quota?: Json
          usage_current?: Json
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          default_series_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          default_series_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          default_series_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      series: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          name: string
          description: string | null
          genre: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null
          visual_template: VisualTemplate
          enforce_continuity: boolean
          allow_continuity_breaks: boolean
          sora_camera_style: string | null
          sora_lighting_mood: string | null
          sora_color_palette: string | null
          sora_overall_tone: string | null
          sora_narrative_prefix: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          name: string
          description?: string | null
          genre?: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null
          visual_template?: Json
          enforce_continuity?: boolean
          allow_continuity_breaks?: boolean
          sora_camera_style?: string | null
          sora_lighting_mood?: string | null
          sora_color_palette?: string | null
          sora_overall_tone?: string | null
          sora_narrative_prefix?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          name?: string
          description?: string | null
          genre?: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null
          visual_template?: Json
          enforce_continuity?: boolean
          allow_continuity_breaks?: boolean
          sora_camera_style?: string | null
          sora_lighting_mood?: string | null
          sora_color_palette?: string | null
          sora_overall_tone?: string | null
          sora_narrative_prefix?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      series_characters: {
        Row: {
          id: string
          series_id: string
          name: string
          description: string
          role: 'protagonist' | 'supporting' | 'background' | 'other' | null
          appearance_details: Json
          performance_style: string | null
          introduced_episode_id: string | null
          evolution_timeline: Json
          visual_reference_url: string | null
          visual_cues: Json
          visual_fingerprint: Json | null
          voice_profile: Json | null
          sora_prompt_template: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          series_id: string
          name: string
          description: string
          role?: 'protagonist' | 'supporting' | 'background' | 'other' | null
          appearance_details?: Json
          performance_style?: string | null
          introduced_episode_id?: string | null
          evolution_timeline?: Json
          visual_reference_url?: string | null
          visual_cues?: Json
          visual_fingerprint?: Json
          voice_profile?: Json
          sora_prompt_template?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          series_id?: string
          name?: string
          description?: string
          role?: 'protagonist' | 'supporting' | 'background' | 'other' | null
          appearance_details?: Json
          performance_style?: string | null
          introduced_episode_id?: string | null
          evolution_timeline?: Json
          visual_reference_url?: string | null
          visual_cues?: Json
          visual_fingerprint?: Json
          voice_profile?: Json
          sora_prompt_template?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      series_settings: {
        Row: {
          id: string
          series_id: string
          name: string
          description: string
          environment_type: 'interior' | 'exterior' | 'mixed' | 'other' | null
          time_of_day: string | null
          atmosphere: string | null
          details: Json
          introduced_episode_id: string | null
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          series_id: string
          name: string
          description: string
          environment_type?: 'interior' | 'exterior' | 'mixed' | 'other' | null
          time_of_day?: string | null
          atmosphere?: string | null
          details?: Json
          introduced_episode_id?: string | null
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          series_id?: string
          name?: string
          description?: string
          environment_type?: 'interior' | 'exterior' | 'mixed' | 'other' | null
          time_of_day?: string | null
          atmosphere?: string | null
          details?: Json
          introduced_episode_id?: string | null
          is_primary?: boolean
          created_at?: string
        }
      }
      series_visual_style: {
        Row: {
          id: string
          series_id: string
          cinematography: Json
          lighting: Json
          color_palette: Json
          composition_rules: Json
          audio_style: Json
          default_platform: 'tiktok' | 'instagram' | 'youtube-shorts' | 'both' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          series_id: string
          cinematography?: Json
          lighting?: Json
          color_palette?: Json
          composition_rules?: Json
          audio_style?: Json
          default_platform?: 'tiktok' | 'instagram' | 'youtube-shorts' | 'both' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          series_id?: string
          cinematography?: Json
          lighting?: Json
          color_palette?: Json
          composition_rules?: Json
          audio_style?: Json
          default_platform?: 'tiktok' | 'instagram' | 'youtube-shorts' | 'both' | null
          created_at?: string
          updated_at?: string
        }
      }
      seasons: {
        Row: {
          id: string
          series_id: string
          season_number: number
          name: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          series_id: string
          season_number: number
          name?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          series_id?: string
          season_number?: number
          name?: string | null
          description?: string | null
          created_at?: string
        }
      }
      series_episodes: {
        Row: {
          id: string
          series_id: string
          season_id: string | null
          video_id: string
          episode_number: number
          episode_title: string | null
          story_beat: string | null
          emotional_arc: string | null
          continuity_breaks: Json
          custom_context: Json
          characters_used: string[]
          settings_used: string[]
          timeline_position: number | null
          is_key_episode: boolean
          created_at: string
        }
        Insert: {
          id?: string
          series_id: string
          season_id?: string | null
          video_id: string
          episode_number: number
          episode_title?: string | null
          story_beat?: string | null
          emotional_arc?: string | null
          continuity_breaks?: Json
          custom_context?: Json
          characters_used?: string[]
          settings_used?: string[]
          timeline_position?: number | null
          is_key_episode?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          series_id?: string
          season_id?: string | null
          video_id?: string
          episode_number?: number
          episode_title?: string | null
          story_beat?: string | null
          emotional_arc?: string | null
          continuity_breaks?: Json
          custom_context?: Json
          characters_used?: string[]
          settings_used?: string[]
          timeline_position?: number | null
          is_key_episode?: boolean
          created_at?: string
        }
      }
      character_relationships: {
        Row: {
          id: string
          series_id: string
          character_a_id: string
          character_b_id: string
          relationship_type: RelationshipType
          custom_label: string | null
          is_symmetric: boolean
          description: string | null
          intensity: number | null
          established_in_episode_id: string | null
          evolution_notes: string | null
          attributes: Json
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          series_id: string
          character_a_id: string
          character_b_id: string
          relationship_type: RelationshipType
          custom_label?: string | null
          is_symmetric?: boolean
          description?: string | null
          intensity?: number | null
          established_in_episode_id?: string | null
          evolution_notes?: string | null
          attributes?: Json
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          series_id?: string
          character_a_id?: string
          character_b_id?: string
          relationship_type?: RelationshipType
          custom_label?: string | null
          is_symmetric?: boolean
          description?: string | null
          intensity?: number | null
          established_in_episode_id?: string | null
          evolution_notes?: string | null
          attributes?: Json
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      videos: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          series_id: string | null
          title: string
          user_brief: string
          agent_discussion: AgentDiscussion
          detailed_breakdown: DetailedBreakdown
          optimized_prompt: string
          character_count: number
          sora_video_url: string | null
          platform: 'tiktok' | 'instagram' | 'both' | null
          status: 'draft' | 'generated' | 'published'
          user_edits: UserEdits | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          series_id?: string | null
          title: string
          user_brief: string
          agent_discussion: Json
          detailed_breakdown: Json
          optimized_prompt: string
          character_count: number
          sora_video_url?: string | null
          platform?: 'tiktok' | 'instagram' | 'both' | null
          status?: 'draft' | 'generated' | 'published'
          user_edits?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          series_id?: string | null
          title?: string
          user_brief?: string
          agent_discussion?: Json
          detailed_breakdown?: Json
          optimized_prompt?: string
          character_count?: number
          sora_video_url?: string | null
          platform?: 'tiktok' | 'instagram' | 'both' | null
          status?: 'draft' | 'generated' | 'published'
          user_edits?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      video_performance: {
        Row: {
          id: string
          video_id: string
          platform: 'tiktok' | 'instagram'
          views: number
          likes: number
          comments: number
          shares: number
          saves: number
          watch_time_seconds: number | null
          completion_rate: number | null
          traffic_source: 'fyp' | 'profile' | 'hashtag' | 'share' | 'other' | null
          recorded_at: string
        }
        Insert: {
          id?: string
          video_id: string
          platform: 'tiktok' | 'instagram'
          views?: number
          likes?: number
          comments?: number
          shares?: number
          saves?: number
          watch_time_seconds?: number | null
          completion_rate?: number | null
          traffic_source?: 'fyp' | 'profile' | 'hashtag' | 'share' | 'other' | null
          recorded_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          platform?: 'tiktok' | 'instagram'
          views?: number
          likes?: number
          comments?: number
          shares?: number
          saves?: number
          watch_time_seconds?: number | null
          completion_rate?: number | null
          traffic_source?: 'fyp' | 'profile' | 'hashtag' | 'share' | 'other' | null
          recorded_at?: string
        }
      }
      hashtags: {
        Row: {
          id: string
          video_id: string
          tag: string
          suggested_by: 'platform_expert' | 'user' | 'system' | null
          volume_category: 'high' | 'medium' | 'niche' | null
          performance_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          tag: string
          suggested_by?: 'platform_expert' | 'user' | 'system' | null
          volume_category?: 'high' | 'medium' | 'niche' | null
          performance_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          tag?: string
          suggested_by?: 'platform_expert' | 'user' | 'system' | null
          volume_category?: 'high' | 'medium' | 'niche' | null
          performance_score?: number | null
          created_at?: string
        }
      }
      agent_contributions: {
        Row: {
          id: string
          video_id: string
          agent_name: AgentName
          suggestion_type: string | null
          suggestion_text: string
          was_applied: boolean
          performance_correlation: number | null
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          agent_name: AgentName
          suggestion_type?: string | null
          suggestion_text: string
          was_applied?: boolean
          performance_correlation?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          agent_name?: AgentName
          suggestion_type?: string | null
          suggestion_text?: string
          was_applied?: boolean
          performance_correlation?: number | null
          created_at?: string
        }
      }
    }
  }
}

// Custom types
export type AgentName =
  | 'director'
  | 'photography_director'
  | 'platform_expert'
  | 'social_media_marketer'
  | 'music_producer'
  | 'subject_director'

export interface AgentResponse {
  agent: AgentName
  response: string
  respondingTo?: AgentName
  isChallenge?: boolean
  buildingOn?: AgentName[]
}

export interface AgentDiscussion {
  round1: AgentResponse[]
  round2: AgentResponse[]
}

export interface VisualTemplate {
  lighting?: string
  camera_angles?: string[]
  color_grading?: string
  pacing?: string
  aspect_ratio?: string
}

export interface DetailedBreakdown {
  scene_structure: string
  visual_specs: string
  audio: string
  platform_optimization: string
  hashtags: string[]
}

// Advanced Mode Types
export interface Shot {
  id?: string
  shotNumber?: number
  timing: string
  description: string
  camera: string
  cameraAngle?: string
  cameraMovement?: string
  duration?: string
  order: number
  lighting?: string
  notes?: string
}

export interface AdvancedEdit {
  timestamp: string
  prompt_changes?: string
  shot_list?: Shot[]
  additional_guidance?: string
  regenerated_agents?: AgentName[]
}

export interface UserEdits {
  mode: 'standard' | 'advanced'
  iterations: number
  additional_guidance?: string // Persists across regenerations
  edits: AdvancedEdit[]
  final_version?: {
    prompt: string
    shot_list?: Shot[]
    character_count: number
  }
}

// Character Relationship Types
export type RelationshipType =
  | 'friends'
  | 'rivals'
  | 'romantic'
  | 'family'
  | 'allies'
  | 'enemies'
  | 'mentor_student'
  | 'custom'

export interface RelationshipAttributes {
  familiarity?: number // 0-100
  trust?: number // 0-100
  affection?: number // 0-100
  power_dynamic?: number // -100 to 100 (negative = A dominated by B)
}

export interface CharacterRelationshipWithDetails {
  id: string
  series_id: string
  character_a_id: string
  character_b_id: string
  character_a: {
    id: string
    name: string
  }
  character_b: {
    id: string
    name: string
  }
  relationship_type: RelationshipType
  custom_label: string | null
  is_symmetric: boolean
  description: string | null
  intensity: number | null
  established_in_episode_id: string | null
  evolution_notes: string | null
  attributes: RelationshipAttributes
  display_order: number
  created_at: string
  updated_at: string
}

export interface RelationshipGraphNode {
  id: string
  name: string
  role?: 'protagonist' | 'supporting' | 'background' | 'other'
}

export interface RelationshipGraphLink {
  source: string
  target: string
  relationshipType: RelationshipType
  customLabel?: string
  isSymmetric: boolean
  description?: string
  intensity?: number
}

// Visual Cues Types
export type VisualCueType = 'full-body' | 'face' | 'costume' | 'expression' | 'other'

export interface VisualCue {
  url: string
  caption: string
  type: VisualCueType
  uploaded_at: string
}
