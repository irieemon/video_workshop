export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_contributions: {
        Row: {
          agent_name: string
          created_at: string | null
          id: string
          performance_correlation: number | null
          suggestion_text: string
          suggestion_type: string | null
          video_id: string
          was_applied: boolean | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          id?: string
          performance_correlation?: number | null
          suggestion_text: string
          suggestion_type?: string | null
          video_id: string
          was_applied?: boolean | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          id?: string
          performance_correlation?: number | null
          suggestion_text?: string
          suggestion_type?: string | null
          video_id?: string
          was_applied?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_contributions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      character_relationships: {
        Row: {
          attributes: Json | null
          character_a_id: string
          character_b_id: string
          created_at: string | null
          custom_label: string | null
          description: string | null
          display_order: number | null
          established_in_episode_id: string | null
          evolution_notes: string | null
          id: string
          intensity: number | null
          interaction_context: Json | null
          is_symmetric: boolean | null
          relationship_type: string
          series_id: string
          updated_at: string | null
        }
        Insert: {
          attributes?: Json | null
          character_a_id: string
          character_b_id: string
          created_at?: string | null
          custom_label?: string | null
          description?: string | null
          display_order?: number | null
          established_in_episode_id?: string | null
          evolution_notes?: string | null
          id?: string
          intensity?: number | null
          interaction_context?: Json | null
          is_symmetric?: boolean | null
          relationship_type: string
          series_id: string
          updated_at?: string | null
        }
        Update: {
          attributes?: Json | null
          character_a_id?: string
          character_b_id?: string
          created_at?: string | null
          custom_label?: string | null
          description?: string | null
          display_order?: number | null
          established_in_episode_id?: string | null
          evolution_notes?: string | null
          id?: string
          intensity?: number | null
          interaction_context?: Json | null
          is_symmetric?: boolean | null
          relationship_type?: string
          series_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_relationships_character_a_id_fkey"
            columns: ["character_a_id"]
            isOneToOne: false
            referencedRelation: "series_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_relationships_character_b_id_fkey"
            columns: ["character_b_id"]
            isOneToOne: false
            referencedRelation: "series_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_relationships_established_in_episode_id_fkey"
            columns: ["established_in_episode_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_relationships_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          act_breakdown: Json | null
          character_development: Json | null
          characters_used: string[] | null
          continuity_breaks: Json | null
          created_at: string | null
          current_session_id: string | null
          custom_context: Json | null
          emotional_arc: string | null
          episode_number: number
          id: string
          is_key_episode: boolean | null
          logline: string | null
          notes: string | null
          plots: Json | null
          runtime_minutes: number | null
          screenplay_text: string | null
          season_number: number | null
          series_id: string
          settings_used: string[] | null
          status: string | null
          story_beat: string | null
          story_beats: Json | null
          structure_type: string | null
          structured_screenplay: Json | null
          timeline_position: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          act_breakdown?: Json | null
          character_development?: Json | null
          characters_used?: string[] | null
          continuity_breaks?: Json | null
          created_at?: string | null
          current_session_id?: string | null
          custom_context?: Json | null
          emotional_arc?: string | null
          episode_number: number
          id?: string
          is_key_episode?: boolean | null
          logline?: string | null
          notes?: string | null
          plots?: Json | null
          runtime_minutes?: number | null
          screenplay_text?: string | null
          season_number?: number | null
          series_id: string
          settings_used?: string[] | null
          status?: string | null
          story_beat?: string | null
          story_beats?: Json | null
          structure_type?: string | null
          structured_screenplay?: Json | null
          timeline_position?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          act_breakdown?: Json | null
          character_development?: Json | null
          characters_used?: string[] | null
          continuity_breaks?: Json | null
          created_at?: string | null
          current_session_id?: string | null
          custom_context?: Json | null
          emotional_arc?: string | null
          episode_number?: number
          id?: string
          is_key_episode?: boolean | null
          logline?: string | null
          notes?: string | null
          plots?: Json | null
          runtime_minutes?: number | null
          screenplay_text?: string | null
          season_number?: number | null
          series_id?: string
          settings_used?: string[] | null
          status?: string | null
          story_beat?: string | null
          story_beats?: Json | null
          structure_type?: string | null
          structured_screenplay?: Json | null
          timeline_position?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_current_session_id_fkey"
            columns: ["current_session_id"]
            isOneToOne: false
            referencedRelation: "screenplay_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtags: {
        Row: {
          created_at: string | null
          id: string
          performance_score: number | null
          suggested_by: string | null
          tag: string
          video_id: string
          volume_category: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          performance_score?: number | null
          suggested_by?: string | null
          tag: string
          video_id: string
          volume_category?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          performance_score?: number | null
          suggested_by?: string | null
          tag?: string
          video_id?: string
          volume_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hashtags_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_admin: boolean
          subscription_expires_at: string | null
          subscription_tier: string | null
          theme_preference: string | null
          updated_at: string | null
          usage_current: Json | null
          usage_quota: Json | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          theme_preference?: string | null
          updated_at?: string | null
          usage_current?: Json | null
          usage_quota?: Json | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          theme_preference?: string | null
          updated_at?: string | null
          usage_current?: Json | null
          usage_quota?: Json | null
        }
        Relationships: []
      }
      scenes: {
        Row: {
          act_number: number | null
          action_description: string | null
          characters_present: string[] | null
          created_at: string | null
          dialogue: Json | null
          emotional_beat: string | null
          episode_id: string
          estimated_duration_seconds: number | null
          id: string
          interior_exterior: string | null
          location: string
          notes: string | null
          plot_line: string | null
          props_needed: string[] | null
          scene_heading: string
          scene_number: number
          scene_purpose: string | null
          story_function: string | null
          time_of_day: string | null
          updated_at: string | null
          video_id: string | null
          video_prompt: string | null
        }
        Insert: {
          act_number?: number | null
          action_description?: string | null
          characters_present?: string[] | null
          created_at?: string | null
          dialogue?: Json | null
          emotional_beat?: string | null
          episode_id: string
          estimated_duration_seconds?: number | null
          id?: string
          interior_exterior?: string | null
          location: string
          notes?: string | null
          plot_line?: string | null
          props_needed?: string[] | null
          scene_heading: string
          scene_number: number
          scene_purpose?: string | null
          story_function?: string | null
          time_of_day?: string | null
          updated_at?: string | null
          video_id?: string | null
          video_prompt?: string | null
        }
        Update: {
          act_number?: number | null
          action_description?: string | null
          characters_present?: string[] | null
          created_at?: string | null
          dialogue?: Json | null
          emotional_beat?: string | null
          episode_id?: string
          estimated_duration_seconds?: number | null
          id?: string
          interior_exterior?: string | null
          location?: string
          notes?: string | null
          plot_line?: string | null
          props_needed?: string[] | null
          scene_heading?: string
          scene_number?: number
          scene_purpose?: string | null
          story_function?: string | null
          time_of_day?: string | null
          updated_at?: string | null
          video_id?: string | null
          video_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenes_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      screenplay_sessions: {
        Row: {
          completed: boolean | null
          completed_steps: string[] | null
          conversation_history: Json | null
          current_step: string | null
          episode_id: string | null
          id: string
          last_activity_at: string | null
          series_id: string
          started_at: string | null
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_steps?: string[] | null
          conversation_history?: Json | null
          current_step?: string | null
          episode_id?: string | null
          id?: string
          last_activity_at?: string | null
          series_id: string
          started_at?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_steps?: string[] | null
          conversation_history?: Json | null
          current_step?: string | null
          episode_id?: string | null
          id?: string
          last_activity_at?: string | null
          series_id?: string
          started_at?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenplay_sessions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenplay_sessions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenplay_sessions_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string | null
          season_number: number
          series_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          season_number: number
          series_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          season_number?: number
          series_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_groups: {
        Row: {
          actual_cost: number | null
          completed_segments: number | null
          created_at: string | null
          description: string | null
          episode_id: string
          error_message: string | null
          estimated_cost: number | null
          generation_completed_at: string | null
          generation_started_at: string | null
          id: string
          series_id: string
          status: string | null
          title: string
          total_segments: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_cost?: number | null
          completed_segments?: number | null
          created_at?: string | null
          description?: string | null
          episode_id: string
          error_message?: string | null
          estimated_cost?: number | null
          generation_completed_at?: string | null
          generation_started_at?: string | null
          id?: string
          series_id: string
          status?: string | null
          title: string
          total_segments: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_cost?: number | null
          completed_segments?: number | null
          created_at?: string | null
          description?: string | null
          episode_id?: string
          error_message?: string | null
          estimated_cost?: number | null
          generation_completed_at?: string | null
          generation_started_at?: string | null
          id?: string
          series_id?: string
          status?: string | null
          title?: string
          total_segments?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_groups_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_groups_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_groups_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          allow_continuity_breaks: boolean | null
          created_at: string | null
          description: string | null
          enforce_continuity: boolean | null
          genre: string | null
          id: string
          is_system: boolean | null
          name: string
          overall_story_arc: string | null
          screenplay_data: Json | null
          series_bible: string | null
          sora_camera_style: string | null
          sora_color_palette: string | null
          sora_lighting_mood: string | null
          sora_narrative_prefix: string | null
          sora_overall_tone: string | null
          updated_at: string | null
          user_id: string
          visual_template: Json | null
          workspace_id: string | null
        }
        Insert: {
          allow_continuity_breaks?: boolean | null
          created_at?: string | null
          description?: string | null
          enforce_continuity?: boolean | null
          genre?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          overall_story_arc?: string | null
          screenplay_data?: Json | null
          series_bible?: string | null
          sora_camera_style?: string | null
          sora_color_palette?: string | null
          sora_lighting_mood?: string | null
          sora_narrative_prefix?: string | null
          sora_overall_tone?: string | null
          updated_at?: string | null
          user_id: string
          visual_template?: Json | null
          workspace_id?: string | null
        }
        Update: {
          allow_continuity_breaks?: boolean | null
          created_at?: string | null
          description?: string | null
          enforce_continuity?: boolean | null
          genre?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          overall_story_arc?: string | null
          screenplay_data?: Json | null
          series_bible?: string | null
          sora_camera_style?: string | null
          sora_color_palette?: string | null
          sora_lighting_mood?: string | null
          sora_narrative_prefix?: string | null
          sora_overall_tone?: string | null
          updated_at?: string | null
          user_id?: string
          visual_template?: Json | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "series_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_video_counts"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "series_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      series_characters: {
        Row: {
          appearance_details: Json | null
          character_bio: string | null
          created_at: string | null
          description: string
          dramatic_profile: Json | null
          evolution_timeline: Json | null
          id: string
          introduced_episode_id: string | null
          name: string
          performance_style: string | null
          role: string | null
          series_id: string
          sora_prompt_template: string | null
          updated_at: string | null
          visual_cues: Json | null
          visual_fingerprint: Json | null
          visual_reference_url: string | null
          voice_profile: Json | null
        }
        Insert: {
          appearance_details?: Json | null
          character_bio?: string | null
          created_at?: string | null
          description: string
          dramatic_profile?: Json | null
          evolution_timeline?: Json | null
          id?: string
          introduced_episode_id?: string | null
          name: string
          performance_style?: string | null
          role?: string | null
          series_id: string
          sora_prompt_template?: string | null
          updated_at?: string | null
          visual_cues?: Json | null
          visual_fingerprint?: Json | null
          visual_reference_url?: string | null
          voice_profile?: Json | null
        }
        Update: {
          appearance_details?: Json | null
          character_bio?: string | null
          created_at?: string | null
          description?: string
          dramatic_profile?: Json | null
          evolution_timeline?: Json | null
          id?: string
          introduced_episode_id?: string | null
          name?: string
          performance_style?: string | null
          role?: string | null
          series_id?: string
          sora_prompt_template?: string | null
          updated_at?: string | null
          visual_cues?: Json | null
          visual_fingerprint?: Json | null
          visual_reference_url?: string | null
          voice_profile?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_character_intro_episode"
            columns: ["introduced_episode_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_characters_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      series_settings: {
        Row: {
          atmosphere: string | null
          created_at: string | null
          description: string
          details: Json | null
          environment_type: string | null
          id: string
          introduced_episode_id: string | null
          is_primary: boolean | null
          name: string
          series_id: string
          time_of_day: string | null
        }
        Insert: {
          atmosphere?: string | null
          created_at?: string | null
          description: string
          details?: Json | null
          environment_type?: string | null
          id?: string
          introduced_episode_id?: string | null
          is_primary?: boolean | null
          name: string
          series_id: string
          time_of_day?: string | null
        }
        Update: {
          atmosphere?: string | null
          created_at?: string | null
          description?: string
          details?: Json | null
          environment_type?: string | null
          id?: string
          introduced_episode_id?: string | null
          is_primary?: boolean | null
          name?: string
          series_id?: string
          time_of_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_setting_intro_episode"
            columns: ["introduced_episode_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_settings_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      series_visual_assets: {
        Row: {
          ai_analysis: Json | null
          asset_type: Database["public"]["Enums"]["visual_asset_type"]
          created_at: string
          description: string | null
          display_order: number | null
          file_name: string
          file_size: number | null
          height: number | null
          id: string
          mime_type: string | null
          name: string
          series_id: string
          storage_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          asset_type?: Database["public"]["Enums"]["visual_asset_type"]
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_name: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          series_id: string
          storage_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          asset_type?: Database["public"]["Enums"]["visual_asset_type"]
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_name?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          series_id?: string
          storage_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "series_visual_assets_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      series_visual_style: {
        Row: {
          audio_style: Json | null
          cinematography: Json | null
          color_palette: Json | null
          composition_rules: Json | null
          created_at: string | null
          default_platform: string | null
          id: string
          lighting: Json | null
          series_id: string
          updated_at: string | null
        }
        Insert: {
          audio_style?: Json | null
          cinematography?: Json | null
          color_palette?: Json | null
          composition_rules?: Json | null
          created_at?: string | null
          default_platform?: string | null
          id?: string
          lighting?: Json | null
          series_id: string
          updated_at?: string | null
        }
        Update: {
          audio_style?: Json | null
          cinematography?: Json | null
          color_palette?: Json | null
          composition_rules?: Json | null
          created_at?: string | null
          default_platform?: string | null
          id?: string
          lighting?: Json | null
          series_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "series_visual_style_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      video_insights_cache: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          insights: Json
          metrics_count: number
          updated_at: string
          video_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          insights: Json
          metrics_count?: number
          updated_at?: string
          video_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          insights?: Json
          metrics_count?: number
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_insights_cache_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_performance: {
        Row: {
          comments: number | null
          completion_rate: number | null
          id: string
          likes: number | null
          platform: string
          recorded_at: string | null
          saves: number | null
          shares: number | null
          traffic_source: string | null
          video_id: string
          views: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          comments?: number | null
          completion_rate?: number | null
          id?: string
          likes?: number | null
          platform: string
          recorded_at?: string | null
          saves?: number | null
          shares?: number | null
          traffic_source?: string | null
          video_id: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          comments?: number | null
          completion_rate?: number | null
          id?: string
          likes?: number | null
          platform?: string
          recorded_at?: string | null
          saves?: number | null
          shares?: number | null
          traffic_source?: string | null
          video_id?: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_performance_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_segments: {
        Row: {
          action_beats: string[] | null
          characters_in_segment: string[] | null
          created_at: string | null
          dialogue_lines: Json | null
          end_timestamp: number
          episode_id: string
          estimated_duration: number
          final_visual_state: Json | null
          following_segment_id: string | null
          id: string
          narrative_beat: string
          narrative_transition: string | null
          preceding_segment_id: string | null
          scene_ids: string[]
          segment_number: number
          settings_in_segment: string[] | null
          start_timestamp: number
          updated_at: string | null
          visual_continuity_notes: string | null
        }
        Insert: {
          action_beats?: string[] | null
          characters_in_segment?: string[] | null
          created_at?: string | null
          dialogue_lines?: Json | null
          end_timestamp: number
          episode_id: string
          estimated_duration: number
          final_visual_state?: Json | null
          following_segment_id?: string | null
          id?: string
          narrative_beat: string
          narrative_transition?: string | null
          preceding_segment_id?: string | null
          scene_ids?: string[]
          segment_number: number
          settings_in_segment?: string[] | null
          start_timestamp: number
          updated_at?: string | null
          visual_continuity_notes?: string | null
        }
        Update: {
          action_beats?: string[] | null
          characters_in_segment?: string[] | null
          created_at?: string | null
          dialogue_lines?: Json | null
          end_timestamp?: number
          episode_id?: string
          estimated_duration?: number
          final_visual_state?: Json | null
          following_segment_id?: string | null
          id?: string
          narrative_beat?: string
          narrative_transition?: string | null
          preceding_segment_id?: string | null
          scene_ids?: string[]
          segment_number?: number
          settings_in_segment?: string[] | null
          start_timestamp?: number
          updated_at?: string | null
          visual_continuity_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_segments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_segments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_segments_following_segment_id_fkey"
            columns: ["following_segment_id"]
            isOneToOne: false
            referencedRelation: "video_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_segments_preceding_segment_id_fkey"
            columns: ["preceding_segment_id"]
            isOneToOne: false
            referencedRelation: "video_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          agent_discussion: Json
          character_count: number
          created_at: string | null
          detailed_breakdown: Json
          episode_id: string | null
          generation_source: string | null
          id: string
          is_segment: boolean | null
          optimized_prompt: string
          platform: string | null
          scene_id: string | null
          screenplay_enrichment_data: Json | null
          segment_group_id: string | null
          segment_id: string | null
          segment_order: number | null
          series_characters_used: string[] | null
          series_id: string
          series_settings_used: string[] | null
          sora_completed_at: string | null
          sora_error_message: string | null
          sora_generation_cost: number | null
          sora_generation_settings: Json | null
          sora_generation_status: string | null
          sora_job_id: string | null
          sora_started_at: string | null
          sora_video_url: string | null
          source_metadata: Json | null
          status: string | null
          title: string
          updated_at: string | null
          user_brief: string
          user_edits: Json | null
          user_id: string
        }
        Insert: {
          agent_discussion: Json
          character_count: number
          created_at?: string | null
          detailed_breakdown: Json
          episode_id?: string | null
          generation_source?: string | null
          id?: string
          is_segment?: boolean | null
          optimized_prompt: string
          platform?: string | null
          scene_id?: string | null
          screenplay_enrichment_data?: Json | null
          segment_group_id?: string | null
          segment_id?: string | null
          segment_order?: number | null
          series_characters_used?: string[] | null
          series_id: string
          series_settings_used?: string[] | null
          sora_completed_at?: string | null
          sora_error_message?: string | null
          sora_generation_cost?: number | null
          sora_generation_settings?: Json | null
          sora_generation_status?: string | null
          sora_job_id?: string | null
          sora_started_at?: string | null
          sora_video_url?: string | null
          source_metadata?: Json | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_brief: string
          user_edits?: Json | null
          user_id: string
        }
        Update: {
          agent_discussion?: Json
          character_count?: number
          created_at?: string | null
          detailed_breakdown?: Json
          episode_id?: string | null
          generation_source?: string | null
          id?: string
          is_segment?: boolean | null
          optimized_prompt?: string
          platform?: string | null
          scene_id?: string | null
          screenplay_enrichment_data?: Json | null
          segment_group_id?: string | null
          segment_id?: string | null
          segment_order?: number | null
          series_characters_used?: string[] | null
          series_id?: string
          series_settings_used?: string[] | null
          sora_completed_at?: string | null
          sora_error_message?: string | null
          sora_generation_cost?: number | null
          sora_generation_settings?: Json | null
          sora_generation_status?: string | null
          sora_job_id?: string | null
          sora_started_at?: string | null
          sora_video_url?: string | null
          source_metadata?: Json | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_brief?: string
          user_edits?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_segment_group_id_fkey"
            columns: ["segment_group_id"]
            isOneToOne: false
            referencedRelation: "segment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "video_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          default_series_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_series_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_series_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_default_series_id_fkey"
            columns: ["default_series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      episode_overview: {
        Row: {
          act_breakdown: Json | null
          character_development: Json | null
          created_at: string | null
          episode_number: number | null
          id: string | null
          logline: string | null
          notes: string | null
          plots: Json | null
          runtime_minutes: number | null
          scene_count: number | null
          series_id: string | null
          series_name: string | null
          status: string | null
          story_beats: Json | null
          structure_type: string | null
          title: string | null
          total_estimated_duration: number | null
          updated_at: string | null
          videos_generated: number | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_video_counts: {
        Row: {
          series_count: number | null
          video_count: number | null
          workspace_id: string | null
          workspace_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_sora_generation_cost: {
        Args: { p_duration: number; p_model?: string; p_resolution: string }
        Returns: number
      }
      generate_scene_video_prompt: {
        Args: { scene_id: string }
        Returns: string
      }
      get_character_relationships: {
        Args: { p_character_id: string }
        Returns: {
          custom_label: string
          description: string
          id: string
          is_character_a: boolean
          is_symmetric: boolean
          other_character_id: string
          other_character_name: string
          relationship_type: string
        }[]
      }
      get_next_episode_number: {
        Args: { p_series_id: string }
        Returns: number
      }
      get_project_videos: {
        Args: { project_uuid: string }
        Returns: {
          created_at: string
          id: string
          series_id: string
          series_name: string
          title: string
        }[]
      }
      get_series_episode_count: {
        Args: { p_series_id: string }
        Returns: number
      }
      get_series_relationships_context: {
        Args: { p_series_id: string }
        Returns: string
      }
      get_series_videos: {
        Args: { series_uuid: string }
        Returns: {
          created_at: string
          id: string
          project_id: string
          project_name: string
          title: string
        }[]
      }
      get_user_standalone_series: {
        Args: { p_user_id: string }
        Returns: string
      }
      increment_consultation_usage: {
        Args: { user_id: string }
        Returns: undefined
      }
      promote_to_admin: {
        Args: { requesting_user_id: string; target_user_id: string }
        Returns: boolean
      }
      relationship_exists: {
        Args: {
          p_character_a_id: string
          p_character_b_id: string
          p_series_id: string
        }
        Returns: boolean
      }
      revoke_admin: {
        Args: { requesting_user_id: string; target_user_id: string }
        Returns: boolean
      }
      test_jsonb_access: { Args: never; Returns: string }
    }
    Enums: {
      visual_asset_type:
        | "logo"
        | "color_palette"
        | "setting_reference"
        | "style_reference"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      visual_asset_type: [
        "logo",
        "color_palette",
        "setting_reference",
        "style_reference",
        "other",
      ],
    },
  },
} as const

// Type aliases for convenient access
export type Episode = Database['public']['Tables']['episodes']['Row']
export type Series = Database['public']['Tables']['series']['Row']
export type SeriesCharacter = Database['public']['Tables']['series_characters']['Row']
export type SeriesSetting = Database['public']['Tables']['series_settings']['Row']
export type SeriesRelationship = Database['public']['Tables']['character_relationships']['Row']
export type VisualAsset = Database['public']['Tables']['series_visual_assets']['Row']
export type CharacterRelationship = Database['public']['Tables']['character_relationships']['Row']
export type VideoSegment = Database['public']['Tables']['video_segments']['Row']
export type SegmentGroup = Database['public']['Tables']['segment_groups']['Row']
export type Video = Database['public']['Tables']['videos']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Season = Database['public']['Tables']['seasons']['Row']
export type VisualTemplate = Database['public']['Tables']['series']['Row']['visual_template']
export type DetailedBreakdown = {
  scene_structure: string
  visual_specs: string
  audio: string
  platform_optimization: string
  hashtags: string[]
}
export type SeriesSoraSettings = {
  sora_camera_style?: string | null
  sora_lighting_mood?: string | null
  sora_color_palette?: string | null
  sora_overall_tone?: string | null
  sora_narrative_prefix?: string | null
}
export type Scene = {
  scene_id: string
  scene_number: number
  location: string
  time_of_day: string
  time_period: string
  description: string
  action: string[]
  dialogue: DialogueLine[]
  characters: string[]
  duration_estimate?: number
}
export type DialogueLine = {
  character: string
  lines: string[]
}

export type Beat = {
  beat_id: string
  beat_type: 'plot' | 'character' | 'theme' | 'turning-point'
  description?: string
}

export type Act = {
  act_number: number
  title: string
  description: string
  scenes: string[]
}

export type StructuredScreenplay = {
  title: string
  logline: string
  scenes: Scene[]
  beats?: Beat[]
  acts?: Act[]
  notes?: string[]
}

export type VisualCueType = 'full-body' | 'face' | 'costume' | 'expression' | 'other'

export type VisualCue = {
  url: string
  caption: string
  type: VisualCueType
  uploaded_at: string
}

export type Shot = {
  timing: string
  description: string
  camera: string
  order: number
  lighting?: string
  notes?: string
}

export type RelationshipType = 'friends' | 'rivals' | 'romantic' | 'family' | 'allies' | 'enemies' | 'mentor_student' | 'custom'

export type CharacterRelationshipWithDetails = CharacterRelationship & {
  character_a: {
    id: string
    name: string
  }
  character_b: {
    id: string
    name: string
  }
}

export type ScreenplayEnrichmentData = {
  sourceScene: {
    sceneId: string
    sceneNumber: number
    location: string
    timeOfDay: string | null
    timePeriod: string | null
  }
  extractedDialogue: DialogueLine[]
  extractedActions: string[]
  charactersInScene: string[]
  settingsInScene: string[]
  emotionalBeat: string
  durationEstimate?: number
  enrichmentTimestamp: string
}
