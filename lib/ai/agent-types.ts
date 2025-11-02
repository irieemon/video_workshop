// Agent types shared between agent-orchestrator and agent-prompts
export type AgentName = 'director' | 'photography_director' | 'platform_expert' | 'social_media_marketer' | 'music_producer' | 'subject_director'

export interface AgentResponse {
  agent: AgentName
  response: string
  isChallenge?: boolean
  respondingTo?: AgentName
  buildingOn?: AgentName[]
}

export interface AgentDiscussion {
  round1: AgentResponse[]
  round2: AgentResponse[]
}

export interface DetailedBreakdown {
  scene_structure: string
  visual_specs: string
  audio: string
  platform_optimization: string
  hashtags: string[]
}

export interface VisualTemplate {
  style?: string
  tone?: string
  colorPalette?: string
  cameraWork?: string
  lighting?: string
}
