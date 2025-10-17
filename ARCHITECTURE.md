# Sora2 Prompt Studio - System Architecture

**Version:** 1.0
**Last Updated:** October 17, 2025
**Status:** Production-Ready Foundation

---

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Component Design](#component-design)
3. [Data Flow & Interactions](#data-flow--interactions)
4. [Infrastructure & Deployment](#infrastructure--deployment)
5. [Security Architecture](#security-architecture)
6. [Scalability & Performance](#scalability--performance)
7. [Future Architecture Considerations](#future-architecture-considerations)

---

## High-Level Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Next.js 15 App (React 19)                        │  │
│  │  ┌─────────────┬──────────────┬─────────────┬──────────────┐ │  │
│  │  │  Auth Pages │  Dashboard   │  Projects   │ Agent UI     │ │  │
│  │  │  (Login/    │  (Projects   │  (Videos &  │ (Roundtable) │ │  │
│  │  │   Signup)   │   Overview)  │  Series)    │ (Prompts)    │ │  │
│  │  └─────────────┴──────────────┴─────────────┴──────────────┘ │  │
│  │                                                                │  │
│  │  State Management: TanStack Query + React Context            │  │
│  │  Styling: Tailwind CSS 3 + shadcn/ui Components              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ HTTPS / WebSocket
                                 │
┌────────────────────────────────┴────────────────────────────────────┐
│                       APPLICATION LAYER                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           Vercel Edge Network (Global CDN)                    │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │             Next.js Middleware                          │  │  │
│  │  │  - Auth Session Management (Supabase)                   │  │  │
│  │  │  - Route Protection (/dashboard/*)                      │  │  │
│  │  │  - Usage Quota Validation (Freemium)                    │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │           Serverless Functions (Vercel)                 │  │  │
│  │  │  ┌──────────────┬────────────────┬──────────────────┐  │  │  │
│  │  │  │  /api/auth   │  /api/agent    │  /api/projects   │  │  │  │
│  │  │  │  - callback  │  - roundtable  │  - CRUD ops      │  │  │  │
│  │  │  │  - signout   │  - regenerate  │  /api/videos     │  │  │  │
│  │  │  │              │                │  /api/series     │  │  │  │
│  │  │  └──────────────┴────────────────┴──────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────┬──────────────────────┬─────────────────────────┘
                     │                      │
                     │                      │
        ┌────────────┴──────────┐  ┌───────┴──────────┐
        │                       │  │                   │
┌───────┴───────┐   ┌──────────┴──┴───────┐  ┌────────┴────────┐
│   SUPABASE    │   │     OPENAI API       │  │  VERCEL INFRA   │
│   (BaaS)      │   │   (AI Services)      │  │  (Deployment)   │
├───────────────┤   ├──────────────────────┤  ├─────────────────┤
│ PostgreSQL DB │   │  GPT-4o (Agents)     │  │  Analytics      │
│ Auth (JWT)    │   │  GPT-4o-mini (Synth) │  │  Monitoring     │
│ Storage       │   │  JSON Mode           │  │  Logs           │
│ Realtime      │   │  Streaming           │  │  Env Vars       │
│ RLS Policies  │   └──────────────────────┘  └─────────────────┘
└───────────────┘
```

### Architecture Principles

1. **Serverless-First**: Leverage Vercel's serverless architecture for automatic scaling
2. **Edge Computing**: Middleware runs on edge for low-latency auth validation
3. **Database-Centric**: Supabase Row-Level Security (RLS) as primary security layer
4. **API-Driven**: Clear separation between frontend and backend via REST APIs
5. **Stateless Operations**: All application state stored in database or client
6. **Progressive Enhancement**: Core features work without JavaScript (where possible)

---

## Component Design

### 1. Frontend Architecture (Next.js 15 App Router)

#### 1.1 Application Structure

```
app/
├── (auth)/                          # Auth group (no dashboard layout)
│   ├── login/
│   │   └── page.tsx                # Login page
│   └── signup/
│       └── page.tsx                # Signup page
│
├── (dashboard)/                     # Dashboard group (with sidebar layout)
│   ├── layout.tsx                  # Sidebar + main content layout
│   ├── page.tsx                    # Projects overview (dashboard home)
│   ├── projects/
│   │   ├── [id]/
│   │   │   ├── page.tsx           # Project detail view
│   │   │   └── videos/
│   │   │       ├── page.tsx       # Videos list
│   │   │       └── new/
│   │   │           └── page.tsx   # Video creation (agent roundtable)
│   │   └── new/
│   │       └── page.tsx           # Create new project
│   ├── series/
│   │   └── [id]/
│   │       └── page.tsx           # Series detail view
│   └── settings/
│       └── page.tsx               # User profile settings
│
├── api/                            # API routes
│   ├── auth/
│   │   ├── callback/route.ts      # OAuth callback handler
│   │   └── signout/route.ts       # Sign out handler
│   ├── agent/
│   │   └── roundtable/route.ts    # Agent consultation endpoint
│   ├── projects/
│   │   ├── route.ts               # GET (list), POST (create)
│   │   └── [id]/route.ts          # GET, PUT, DELETE
│   ├── videos/
│   │   ├── route.ts               # GET, POST
│   │   └── [id]/route.ts          # GET, PUT, DELETE
│   └── series/
│       ├── route.ts               # GET, POST
│       └── [id]/route.ts          # GET, PUT, DELETE
│
├── globals.css                     # Global styles
├── layout.tsx                      # Root layout
└── page.tsx                        # Homepage
```

#### 1.2 Component Architecture

**Component Hierarchy:**
```
RootLayout
├── AuthLayout (login, signup)
│   ├── LoginForm
│   ├── SignupForm
│   └── OAuthButtons
│
└── DashboardLayout (protected routes)
    ├── Sidebar
    │   ├── Navigation
    │   ├── ProjectList
    │   └── UserMenu
    │
    └── MainContent
        ├── ProjectsGrid
        │   └── ProjectCard
        ├── VideoCreation
        │   ├── BriefInput
        │   ├── AgentRoundtable
        │   │   ├── AgentCard (x5)
        │   │   ├── DebateVisualization
        │   │   └── ThreadingLines
        │   └── PromptOutput
        │       ├── DetailedBreakdown
        │       ├── OptimizedPrompt
        │       └── CharacterCounter
        └── SeriesManagement
            ├── SeriesCard
            └── VisualTemplateEditor
```

**Key Shared Components:**
- `AgentCard`: Displays individual agent responses with color-coding
- `PromptDisplay`: Dual-format output (detailed + optimized)
- `PerformanceMetrics`: Manual input forms + visualizations
- `HashtagPills`: Recommended hashtags with volume indicators
- `QuotaIndicator`: Freemium usage tracking display

---

### 2. Backend Architecture (API Layer)

#### 2.1 API Design Patterns

**RESTful Endpoints:**
```
Authentication:
  POST   /api/auth/signup           - Create new user account
  GET    /api/auth/callback         - Handle OAuth redirects
  POST   /api/auth/signout          - End user session

Agent System:
  POST   /api/agent/roundtable      - Generate video prompt via agent debate
          Body: { brief, platform, seriesId?, projectId }
          Response: { discussion, detailedBreakdown, optimizedPrompt, hashtags }

Projects:
  GET    /api/projects              - List user's projects
  POST   /api/projects              - Create new project
  GET    /api/projects/[id]         - Get project details
  PUT    /api/projects/[id]         - Update project
  DELETE /api/projects/[id]         - Delete project

Videos:
  GET    /api/videos?projectId=     - List videos for project
  POST   /api/videos                - Create video from agent output
  GET    /api/videos/[id]           - Get video details
  PUT    /api/videos/[id]           - Update video
  DELETE /api/videos/[id]           - Delete video

Series:
  GET    /api/series?projectId=     - List series for project
  POST   /api/series                - Create new series with template
  GET    /api/series/[id]           - Get series details + videos
  PUT    /api/series/[id]           - Update series template
  DELETE /api/series/[id]           - Delete series

Performance:
  POST   /api/videos/[id]/performance - Add performance metrics
  GET    /api/analytics/insights     - Get AI-driven performance insights
```

#### 2.2 Agent System Architecture

**Multi-Agent Orchestration Flow:**

```
┌────────────────────────────────────────────────────────────────┐
│                    Agent Roundtable System                      │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  ROUND 1: Parallel Execution (5 simultaneous API calls)        │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐     │
│  │ Director │ Photo DP │ Platform │ Marketer │  Music   │     │
│  │ GPT-4o   │ GPT-4o   │ GPT-4o   │ GPT-4o   │ GPT-4o   │     │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘     │
│       │          │          │          │          │           │
│       └──────────┴──────────┴──────────┴──────────┘           │
│                        │                                       │
│                        ▼                                       │
│               Context Aggregation                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  ROUND 2: Sequential Debate (context-aware follow-ups)        │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Platform Expert challenges Director (30% prob)      │     │
│  │  → Director responds to challenge                    │     │
│  │  → Marketer builds on consensus                      │     │
│  └─────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  ROUND 3: Synthesis (GPT-4o-mini for cost efficiency)         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Input: Full agent discussion (Round 1 + 2)         │     │
│  │  Output:                                             │     │
│  │   - Detailed Breakdown (JSON structure)             │     │
│  │   - Optimized Prompt (<500 chars)                   │     │
│  │   - Character count validation                      │     │
│  │   - Hashtag recommendations                         │     │
│  └─────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
```

**Agent System Implementation:**

```typescript
// Lazy initialization pattern (avoids build-time API key requirement)
function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// Round 1: Parallel execution for speed
const round1Promises = [
  callAgent('director', brief, platform, visualTemplate),
  callAgent('photography_director', brief, platform, visualTemplate),
  callAgent('platform_expert', brief, platform, visualTemplate),
  callAgent('social_media_marketer', brief, platform, visualTemplate),
  callAgent('music_producer', brief, platform, visualTemplate),
]
const round1Responses = await Promise.all(round1Promises)

// Round 2: Sequential debate with context
const round2Responses = []
if (Math.random() < 0.3) {  // 30% debate probability
  // Platform Expert challenges Director
  const challenge = await callAgentWithContext(...)
  // Director responds
  const response = await callAgentWithContext(...)
}

// Round 3: Synthesis with GPT-4o-mini (cheaper)
const synthesis = await synthesizeRoundtable({
  brief, platform, round1, round2
})
```

---

### 3. Database Architecture (Supabase PostgreSQL)

#### 3.1 Entity Relationship Diagram

```
┌─────────────────────┐
│      profiles       │
│─────────────────────│
│ id (PK) UUID        │
│ email TEXT          │
│ full_name TEXT      │
│ subscription_tier   │
│ usage_quota JSONB   │
│ usage_current JSONB │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────┴──────────┐
│      projects       │
│─────────────────────│
│ id (PK) UUID        │
│ user_id (FK)        │◄─┐
│ name TEXT           │  │
│ description TEXT    │  │
└──────────┬──────────┘  │
           │ 1            │
           │              │ Owned by
           │ N            │
┌──────────┴──────────┐  │
│       series        │  │
│─────────────────────│  │
│ id (PK) UUID        │  │
│ project_id (FK)     │──┘
│ name TEXT           │
│ visual_template     │
│   JSONB             │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────┴──────────┐
│       videos        │───────┐
│─────────────────────│       │
│ id (PK) UUID        │       │
│ project_id (FK)     │       │ 1
│ series_id (FK)?     │       │
│ title TEXT          │       │
│ user_brief TEXT     │       │ N
│ agent_discussion    │       │
│   JSONB             │  ┌────┴────────────────┐
│ detailed_breakdown  │  │ video_performance   │
│   JSONB             │  │─────────────────────│
│ optimized_prompt    │  │ id (PK) UUID        │
│   TEXT              │  │ video_id (FK)       │
│ character_count INT │  │ platform TEXT       │
│ platform TEXT       │  │ views INT           │
│ status TEXT         │  │ likes INT           │
└──────────┬──────────┘  │ shares INT          │
           │             │ saves INT           │
           │ 1           └─────────────────────┘
           │
           │ N           ┌─────────────────────┐
           ├─────────────│     hashtags        │
           │             │─────────────────────│
           │             │ id (PK) UUID        │
           │             │ video_id (FK)       │
           │             │ tag TEXT            │
           │             │ volume_category     │
           │             │ performance_score   │
           │             └─────────────────────┘
           │
           │ N           ┌──────────────────────┐
           └─────────────│ agent_contributions  │
                         │──────────────────────│
                         │ id (PK) UUID         │
                         │ video_id (FK)        │
                         │ agent_name TEXT      │
                         │ suggestion_text TEXT │
                         │ was_applied BOOLEAN  │
                         │ performance_         │
                         │   correlation DEC    │
                         └──────────────────────┘
```

#### 3.2 Row-Level Security (RLS) Policies

**Security Model:**
- Users can only access their own data
- RLS enforced at database level (defense in depth)
- Policies applied to all tables with user_id relationships

**Example Policy (Projects):**
```sql
-- Users can only view their own projects
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

-- Cascade security through relationships
CREATE POLICY "Users can view own videos" ON public.videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );
```

#### 3.3 Data Access Patterns

**Query Optimization:**
- Indexes on foreign keys (`user_id`, `project_id`, `series_id`, `video_id`)
- Composite indexes for common filters (`user_id + created_at`)
- JSONB indexes for visual_template and agent_discussion queries

**Caching Strategy:**
- TanStack Query client-side caching (5-minute stale time)
- Supabase Realtime for live project updates (optional)
- Static generation for public pages (homepage)

---

## Data Flow & Interactions

### 1. User Authentication Flow

```
┌──────┐                 ┌────────────┐                ┌──────────┐
│Client│                 │  Vercel    │                │ Supabase │
│(Next)│                 │ Serverless │                │   Auth   │
└───┬──┘                 └─────┬──────┘                └────┬─────┘
    │                          │                            │
    │  1. Submit Login Form    │                            │
    │─────────────────────────>│                            │
    │                          │  2. Validate Credentials   │
    │                          │───────────────────────────>│
    │                          │                            │
    │                          │  3. Return JWT + Session   │
    │                          │<───────────────────────────│
    │  4. Set Auth Cookie      │                            │
    │<─────────────────────────│                            │
    │                          │                            │
    │  5. Redirect to /dashboard                            │
    │<─────────────────────────│                            │
    │                          │                            │
    │  6. Request Protected Route                           │
    │─────────────────────────>│                            │
    │                          │                            │
    │                 7. Middleware: Verify JWT             │
    │                          │───────────────────────────>│
    │                          │                            │
    │                          │  8. Valid Session          │
    │                          │<───────────────────────────│
    │                          │                            │
    │  9. Serve Dashboard Page │                            │
    │<─────────────────────────│                            │
    │                          │                            │
```

### 2. Video Creation Flow (Agent Roundtable)

```
User Action: Click "New Video" → Enter Brief → Select Platform

┌──────────────────────────────────────────────────────────────────┐
│ 1. CLIENT: Submit Brief                                          │
│    POST /api/agent/roundtable                                    │
│    Body: { brief, platform, projectId, seriesId? }              │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. SERVERLESS FUNCTION: Agent Roundtable Handler                │
│    - Verify authentication (Supabase JWT)                        │
│    - Check usage quota (free tier: 10/month)                     │
│    - Fetch series template if seriesId provided                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. OPENAI API: Round 1 (Parallel Execution)                     │
│    - 5 simultaneous GPT-4o calls (Director, Photo DP, etc.)     │
│    - Each agent: 100-word response based on brief               │
│    - Total latency: ~2-3 seconds                                │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. OPENAI API: Round 2 (Sequential Debate)                      │
│    - Platform Expert challenges Director (30% probability)      │
│    - Director responds to challenge                             │
│    - Marketer synthesizes consensus                             │
│    - Total latency: ~1-2 seconds                                │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. OPENAI API: Synthesis (GPT-4o-mini)                          │
│    - Distill discussion into structured output                  │
│    - Generate detailed breakdown (JSON)                         │
│    - Generate optimized prompt (<500 chars)                     │
│    - Generate hashtag recommendations                           │
│    - Total latency: ~1-2 seconds                                │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. SUPABASE: Increment Usage Counter                            │
│    - Call increment_consultation_usage(user_id)                 │
│    - Update usage_current.consultations_this_month += 1         │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. RESPONSE: Return to Client                                   │
│    {                                                             │
│      discussion: { round1: [...], round2: [...] },              │
│      detailedBreakdown: { scene_structure, visual_specs, ... }, │
│      optimizedPrompt: "...",                                    │
│      characterCount: 437,                                       │
│      hashtags: ["#tag1", "#tag2", ...]                          │
│    }                                                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 8. CLIENT: Display Results                                      │
│    - Render agent discussion with debate visualization          │
│    - Display dual-format prompt output                          │
│    - Show character counter and hashtags                        │
│    - Enable "Save Video" action                                 │
└──────────────────────────────────────────────────────────────────┘

Total End-to-End Latency: 5-8 seconds
```

### 3. Performance Tracking Flow

```
User publishes video → Returns to app → Inputs metrics

┌──────────────────────────────────────────────────────────────────┐
│ 1. CLIENT: Submit Performance Data                              │
│    POST /api/videos/[id]/performance                             │
│    Body: {                                                       │
│      platform: 'tiktok',                                        │
│      views: 15000, likes: 1200, shares: 80,                     │
│      traffic_source: 'fyp'                                      │
│    }                                                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. SUPABASE: Store Performance Record                           │
│    - INSERT into video_performance table                        │
│    - Timestamped for historical tracking                        │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. ANALYTICS ENGINE: Calculate Correlations (Async)             │
│    - Query agent_contributions for this video                   │
│    - Compare performance vs. average for similar videos         │
│    - Calculate performance_correlation per agent suggestion     │
│    - Store insights for later retrieval                         │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. CLIENT: Display Updated Performance                          │
│    - Show performance badge (High/Medium/Low)                   │
│    - Update video card with metrics                             │
│    - Trigger insights generation if 3+ videos tracked           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Infrastructure & Deployment

### 1. Vercel Deployment Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                  VERCEL GLOBAL NETWORK                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │               Edge Network (300+ locations)             │  │
│  │  ┌───────────┬────────────┬────────────┬──────────────┐ │  │
│  │  │  Americas │   Europe   │    Asia    │   Oceania    │ │  │
│  │  │   (IAD)   │   (CDG)    │   (HND)    │    (SYD)     │ │  │
│  │  └─────┬─────┴──────┬─────┴──────┬─────┴──────┬───────┘ │  │
│  │        │            │            │            │         │  │
│  │  ┌─────┴────────────┴────────────┴────────────┴──────┐  │  │
│  │  │         Middleware (Edge Runtime)                  │  │  │
│  │  │  - Auth session validation (Supabase)             │  │  │
│  │  │  - Route protection                               │  │  │
│  │  │  - Usage quota checks                             │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           Serverless Functions (Regional)               │  │
│  │  ┌─────────────────────────────────────────────────┐   │  │
│  │  │  Function: /api/agent/roundtable                 │   │  │
│  │  │  Runtime: Node.js 20.x                           │   │  │
│  │  │  Memory: 1024 MB                                 │   │  │
│  │  │  Timeout: 30s (agent calls)                      │   │  │
│  │  │  Concurrency: 1000 max                           │   │  │
│  │  └─────────────────────────────────────────────────┘   │  │
│  │  ┌─────────────────────────────────────────────────┐   │  │
│  │  │  Function: /api/projects/* (CRUD)               │   │  │
│  │  │  Runtime: Node.js 20.x                           │   │  │
│  │  │  Memory: 512 MB                                  │   │  │
│  │  │  Timeout: 10s                                    │   │  │
│  │  └─────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Static Assets (CDN)                        │  │
│  │  - JavaScript bundles                                   │  │
│  │  - CSS stylesheets                                      │  │
│  │  - Images, fonts                                        │  │
│  │  - Cache-Control: public, max-age=31536000             │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### 2. Environment Configuration

**Deployment Environments:**
```
Production (main branch)
├── Domain: video-workshop.vercel.app
├── Environment Variables:
│   ├── NEXT_PUBLIC_SUPABASE_URL
│   ├── NEXT_PUBLIC_SUPABASE_ANON_KEY
│   ├── SUPABASE_SERVICE_ROLE_KEY
│   ├── OPENAI_API_KEY
│   ├── NEXT_PUBLIC_APP_URL
│   └── CRON_SECRET
├── Auto-deploy on push to main
└── Analytics: Vercel Analytics + Web Vitals

Preview (feature branches)
├── Unique URL per PR
├── Shared environment variables
├── Auto-deploy on PR creation
└── Temporary (deleted after merge)

Development (local)
├── http://localhost:3000
├── .env.local file
└── Hot reload enabled
```

---

## Security Architecture

### 1. Authentication & Authorization

**Multi-Layer Security:**
```
Layer 1: Supabase Auth (JWT-based)
├── Email/password authentication
├── OAuth providers (Google, GitHub)
├── JWT tokens (httpOnly cookies)
└── Session management (automatic refresh)

Layer 2: Next.js Middleware (Edge)
├── Route protection (/dashboard/*)
├── Token validation before page load
├── Automatic redirect to /login if unauthenticated
└── Usage quota enforcement

Layer 3: Row-Level Security (Database)
├── RLS policies on all tables
├── User can only access own data
├── Automatic user_id filtering
└── Defense in depth (even if middleware bypassed)

Layer 4: API Route Guards
├── Verify auth header/cookie
├── Check user permissions
├── Validate request payload
└── Rate limiting (future)
```

### 2. Data Protection

**Sensitive Data Handling:**
- **API Keys**: Stored in Vercel environment variables (encrypted at rest)
- **User Passwords**: Hashed by Supabase Auth (bcrypt)
- **JWT Tokens**: httpOnly cookies (XSS protection)
- **Database Connections**: TLS 1.3 encryption in transit
- **Video URLs**: Signed URLs with expiration (if using Supabase Storage)

**GDPR Compliance Considerations:**
- User can delete account (CASCADE delete in database)
- Export user data API endpoint (future)
- Cookie consent banner (future)
- Privacy policy and terms of service (future)

---

## Scalability & Performance

### 1. Performance Targets

**Frontend:**
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1

**Backend:**
- Agent roundtable response: < 8s (5 seconds typical)
- API endpoint response (CRUD): < 500ms
- Database query latency: < 100ms (with indexes)

**Scalability:**
- Serverless functions: Auto-scale to 1000+ concurrent requests
- Database connections: Supabase connection pooling (100 max)
- Static assets: Global CDN with edge caching
- Agent API: OpenAI rate limits (10,000 RPM for GPT-4o)

### 2. Cost Optimization

**Resource Usage Estimates (Per 1000 Users/Month):**

```
OpenAI API Costs:
  Assumptions:
    - 10 consultations/user/month (free tier)
    - 5 GPT-4o calls + 1 GPT-4o-mini per consultation
    - ~400 tokens per agent response

  Calculation:
    - Input: 1000 users × 10 consultations × 6 calls × 200 tokens
            = 12M tokens input ≈ $60
    - Output: 1000 users × 10 consultations × 6 calls × 150 tokens
             = 9M tokens output ≈ $180
    - Total: ~$240/month for AI at scale

Supabase Costs:
  - Free tier: Up to 500MB database, 1GB bandwidth
  - Pro tier: $25/month (2GB database, 8GB bandwidth)
  - Estimated: $25-50/month for moderate usage

Vercel Costs:
  - Free tier: 100GB bandwidth, 100 function invocations
  - Pro tier: $20/month (1TB bandwidth, 1M function invocations)
  - Estimated: $20-100/month depending on traffic

Total Estimated Cost: $285-390/month for 1000 active users
Revenue at 5% conversion: 50 users × $24 = $1200/month
Gross Margin: ~70%+
```

---

## Future Architecture Considerations

### 1. Phase 2 Enhancements

**Real-time Collaboration:**
- Supabase Realtime for live project updates
- WebSocket connections for agent streaming responses
- Presence indicators for team members

**Advanced Analytics:**
- Background jobs for performance correlation (Vercel Cron)
- ML model for predictive performance scoring
- A/B testing framework for prompt variations

**Template Marketplace:**
- User-generated template sharing
- Template rating and discovery
- Premium template monetization

### 2. Scalability Evolution

**Database Sharding (if >100K users):**
- Shard by user_id for horizontal scaling
- Read replicas for analytics queries
- Caching layer (Redis) for hot data

**API Optimization:**
- GraphQL for flexible data fetching
- Response caching (Vercel Edge Config)
- Batch operations for bulk updates

**AI Optimization:**
- Agent response caching for similar briefs
- Fine-tuned models for cost reduction
- Streaming responses for perceived speed

---

## Conclusion

The Sora2 Prompt Studio architecture is designed for:
- ✅ **Scalability**: Serverless functions auto-scale to demand
- ✅ **Security**: Multi-layer auth with Row-Level Security
- ✅ **Performance**: Edge computing + global CDN
- ✅ **Cost Efficiency**: Freemium model with usage tracking
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Future-Proof**: Modular design for feature expansion

**Current State:** Production-ready foundation deployed
**Next Steps:** Build authentication system → Dashboard UI → Agent roundtable interface

---

**Document Version:** 1.0
**Author:** Claude Code Design Agent
**Last Updated:** October 17, 2025
