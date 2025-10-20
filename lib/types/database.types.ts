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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      series: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          genre: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null
          visual_template: VisualTemplate
          enforce_continuity: boolean
          allow_continuity_breaks: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          genre?: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null
          visual_template?: Json
          enforce_continuity?: boolean
          allow_continuity_breaks?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          genre?: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null
          visual_template?: Json
          enforce_continuity?: boolean
          allow_continuity_breaks?: boolean
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
      videos: {
        Row: {
          id: string
          project_id: string
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
          project_id: string
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
          project_id?: string
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
  timing: string
  description: string
  camera: string
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
