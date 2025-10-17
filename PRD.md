# Product Requirements Document: Sora2 Prompt Studio

## Executive Summary

**Product Name:** Sora2 Prompt Studio (working title)

**Vision:** An AI-powered creative production platform that guides social media content creators through generating optimized Sora2 video prompts using a collaborative multi-agent "film crew" system.

**Target User:** Content creators producing short-form video content for TikTok and Instagram, seeking to leverage AI video generation (Sora2) with professional-quality direction and optimization.

**Core Value Proposition:**
- Transform vague video ideas into detailed, optimized Sora2 prompts through AI agent collaboration
- Organize video content into projects and series with visual consistency enforcement
- Track performance and receive AI-driven insights for continuous improvement
- Receive platform-specific optimization (hashtags, format, trending audio)

---

## 1. Product Overview

### 1.1 Problem Statement

Content creators face significant challenges when crafting Sora2 prompts:
- **Lack of expertise**: Don't know what details to include for optimal video generation
- **Trial-and-error cycles**: Waste time and credits on poorly specified prompts
- **Inconsistent quality**: Difficulty maintaining visual consistency across video series
- **Platform optimization**: Unsure how to optimize for TikTok/Instagram algorithms
- **Performance tracking**: No systematic way to learn what works and improve

### 1.2 Solution

A creative production platform featuring:

1. **Multi-Agent Film Crew System**: Five AI personas (Director, Photography Director, Platform Expert, Social Media Marketer, Music Producer) collaborate in real-time debate to refine prompts

2. **Project & Series Management**: Organize one-off videos and recurring series with enforced visual template consistency

3. **Dual-Format Prompt Output**:
   - Detailed breakdown for user understanding
   - Character-optimized Sora2-ready prompt (within ~400-500 character limit)

4. **Performance Intelligence**: Manual performance tracking with AI-driven insights and iterative improvement suggestions

5. **Platform Optimization**: Context-aware hashtag recommendations and platform-specific guidance

### 1.3 Success Metrics

**User Engagement:**
- Time spent in agent roundtable sessions
- Prompt generation completion rate
- Return user rate (weekly/monthly)

**Product Quality:**
- User satisfaction with generated prompts (in-app rating)
- Prompt iteration count (lower = better initial quality)
- Series adoption rate (% users creating series vs one-offs)

**Business:**
- Free-to-premium conversion rate
- Monthly recurring revenue (MRR)
- Agent consultation usage (freemium tier limit indicator)

---

## 2. User Personas & Journey

### 2.1 Primary Persona: "The Social Media Creator"

**Demographics:**
- Age: 22-35
- Occupation: Content creator, influencer, digital marketer, small business owner
- Platforms: TikTok (primary), Instagram Reels (secondary)

**Goals:**
- Produce consistent, high-quality short-form video content
- Grow audience engagement and follower count
- Leverage AI video generation to scale content production
- Maintain professional visual quality without film production experience

**Pain Points:**
- Overwhelmed by technical video production requirements
- Limited time for trial-and-error prompt engineering
- Struggle to maintain visual consistency across content series
- Unsure how to optimize content for platform algorithms

**Technical Proficiency:**
- Comfortable with web applications and AI tools
- Familiar with social media platforms and analytics
- Limited video production or cinematography knowledge

### 2.2 User Journey Map

**Phase 1: Onboarding**
1. Sign up with email/social OAuth
2. Select free or premium tier (with trial option)
3. Brief tutorial: "Create your first video with your AI film crew"
4. Create first project

**Phase 2: Content Creation (Core Loop)**
1. Navigate to project dashboard
2. Click "New Video" → Choose one-off or add to series
3. Enter brief description of desired video
4. Watch AI agent roundtable debate and collaboration
5. Review detailed breakdown + optimized Sora2 prompt
6. Copy prompt → Generate video in Sora
7. Return to app → Upload result or add external link
8. Tag video with platform (TikTok/Instagram)

**Phase 3: Performance Tracking**
1. After publishing to social platform, return to app
2. Manually input performance metrics (views, likes, shares, etc.)
3. View AI-generated insights: "Your macro product shots drive 2x engagement"
4. Receive suggestions for next video improvement

**Phase 4: Series Management**
1. Create series for recurring content themes
2. Define visual template (camera angles, lighting, style)
3. Generate new videos in series with enforced consistency
4. Track series performance over time

---

## 3. Feature Specifications

### 3.1 Core Features (MVP - Phase 1)

#### 3.1.1 Authentication & User Management

**Technical Stack:**
- Supabase Auth (email/password + OAuth providers)
- Next.js middleware for protected routes
- Row-Level Security (RLS) for data isolation

**Features:**
- Email/password authentication
- Google OAuth integration
- GitHub OAuth integration (optional)
- Password reset flow
- Email verification
- User profile management (name, avatar, preferences)

**Freemium Tier Tracking:**
- Track usage: projects created, videos generated, agent consultations
- Display quota status in UI (e.g., "7/10 consultations remaining this month")
- Upgrade prompts when limits reached

---

#### 3.1.2 Project & Series Management

**Data Model:**

```
User
├── Projects (1:N)
│   ├── Metadata: name, description, created_at, updated_at
│   ├── Series (1:N)
│   │   ├── Metadata: name, visual_template (JSON), created_at
│   │   └── Videos (1:N)
│   └── Videos (1:N) [one-offs, no series association]
```

**Project Features:**
- Create unlimited projects (premium) or 3 max (free)
- Edit project name/description
- Archive/delete projects
- Project dashboard: card grid view with video thumbnails
- Sort/filter: by date, performance, series

**Series Features:**
- Create series within projects
- Define visual template (stored as JSON):
  ```json
  {
    "lighting": "soft diffused, 5600K color temp",
    "camera_angles": ["overhead", "macro close-up", "360 rotation"],
    "color_grading": "warm highlights, desaturated shadows",
    "pacing": "slow reveal with quick hook",
    "aspect_ratio": "9:16"
  }
  ```
- Template enforcement: All videos in series inherit template by default
- Template customization: User can override per video
- Series timeline view: horizontal timeline showing video sequence

**UI Components:**
- Dashboard: Sidebar navigation + card grid
- Project card: Thumbnail, name, video count, last updated
- Series card: Visual distinction (e.g., badge, border color)
- "New Project" button (prominent CTA)
- Empty states: Onboarding guidance for first project

---

#### 3.1.3 Multi-Agent Film Crew System

**Agent Roster:**

| Agent | Personality | Expertise | Visual Identity |
|-------|-------------|-----------|-----------------|
| **Director** | Bold, visionary, storytelling-focused | Narrative arc, emotional pacing, hooks | Navy (#3B4A5C) |
| **Photography Director** | Technical, detail-oriented, aesthetic | Lighting, composition, camera angles, color | Sage (#7C9473) |
| **Platform Expert** | Data-driven, trend-aware, algorithmic | TikTok/Instagram optimization, format specs | Dark Sage (#5A6D52) |
| **Social Media Marketer** | Audience-focused, persuasive, conversion-driven | Engagement hooks, CTA, target demographics | Terracotta (#C97064) |
| **Music Producer** | Rhythm-focused, emotion-driven, audio branding | Audio selection, tempo, sound design | Warm Neutral (#8B7C6B) |

**Debate-Style Interaction Flow:**

**User Input:**
```
Brief: "Unboxing video for luxury skincare serum, Gen Z audience, TikTok"
Platform: TikTok
Additional context: Product launch, need high engagement
```

**Roundtable Orchestration:**

**Round 1: Initial Perspectives (Parallel execution)**
- All 5 agents receive brief simultaneously
- Each responds with framework-specific perspective
- Display in styled cards with agent color coding

**Round 2: Collaborative Debate (Sequential with context)**
- Agents respond to each other's ideas
- 30% probability of respectful challenge/disagreement
- Visual threading: Show conversation flow with connecting lines
- Example:
  ```
  🎬 DIRECTOR: "Start with slow cinematic reveal for luxury feel."

  📱 PLATFORM EXPERT challenges DIRECTOR: "TikTok users scroll fast.
  Hook needs to hit in 0.5 seconds or they're gone. Slow won't work."

  🎬 DIRECTOR responds: "Fair point. Quick hook with text overlay,
  THEN slow reveal?"

  💼 MARKETER builds on DIRECTOR + PLATFORM EXPERT: "Yes! Text hook:
  'The serum TikTok can't stop talking about' → then cinematic unboxing."
  ```

**Round 3: Synthesis (AI orchestration)**
- GPT-4o-mini distills consensus from debate
- Generates two outputs:
  1. **Detailed Breakdown** (structured components)
  2. **Optimized Prompt** (Sora2-ready, character-limited)

**AI Technical Implementation:**

**Model:** OpenAI GPT-5 (latest available)
- Agent personas: Separate system prompts per agent
- Parallel execution: 5 simultaneous API calls (Round 1)
- Sequential execution: Context-aware follow-ups (Round 2)
- Synthesis: Single distillation call (Round 3)

**System Prompt Structure (Example - Director):**
```
You are the DIRECTOR on a creative film production team for social media content.

PERSONALITY: Bold, visionary, storytelling-focused, cinematic thinking

EXPERTISE:
- Narrative arcs and emotional pacing for short-form content
- Hook creation (first 2 seconds critical)
- Visual storytelling for TikTok/Instagram formats

INTERACTION STYLE:
- Advocate strongly for narrative and emotional impact
- Challenge suggestions that compromise story (30% probability)
- Build upon others' ideas when they enhance the vision
- Be willing to respectfully debate and find synthesis

CURRENT PROJECT:
Brief: {USER_BRIEF}
Platform: {PLATFORM}
Context: {ADDITIONAL_CONTEXT}

OTHER AGENTS' INPUT (if Round 2):
{AGENT_CONTEXT}

Respond as the Director with your perspective. Keep response under 100 words.
```

**UI Design:**

**Agent Card Component:**
```jsx
<AgentCard
  agent="director"
  color="#3B4A5C"
  response="Start with slow cinematic reveal..."
  isChallenge={false}
  respondingTo={null}
/>
```

**Visual Elements:**
- Agent icon/avatar (styled with persona color)
- Name header with role label
- Response text (conversational canvas style)
- "Responding to..." indicator (when building on others)
- "Challenges..." indicator (when debating)
- Threading lines connecting related responses

**User Controls:**
- "Regenerate Discussion" button (if user wants different perspectives)
- "Skip to Prompt" button (fast-forward to synthesis)
- Expand/collapse individual agent cards
- "Save Discussion" (for future reference)

---

#### 3.1.4 Prompt Generation & Output

**Dual-Format Output:**

**Format 1: Detailed Breakdown (User Understanding)**

Structured sections with visual hierarchy:

```markdown
## Scene Structure
- **Opening Hook (0-2s)**: Text overlay "The serum TikTok can't stop talking about"
  + quick teaser of product result
- **Unboxing (2-10s)**: Hands opening elegant packaging, overhead shot
- **Product Showcase (10-16s)**: 360° rotation, macro texture details
- **Closing (16-18s)**: Serum application, subtle CTA

## Visual Specifications
- **Aspect Ratio**: 9:16 (TikTok vertical)
- **Lighting**: Soft, diffused, 5600K color temp with subtle rim light
- **Camera Angles**:
  - Macro close-up (f/1.4 shallow DOF)
  - Overhead shot
  - 360° rotation with dolly forward
- **Color Grading**: Warm highlights, desaturated shadows, luxury aesthetic
- **Pacing**: Quick hook (first 2s), then slow-motion reveal (0.5x speed)

## Audio Direction
- **Trending Audio**: "Ceilings - Lizzy McAlphin" (0:15-0:33 clip)
- **Sync Points**: Bass drop aligns with product reveal
- **Backup**: Lo-fi luxury aesthetic if trending audio unavailable

## Platform Optimization (TikTok)
- **Duration**: 18 seconds (optimal for TikTok algorithm)
- **Hook Timing**: 0.5 seconds (critical for scroll retention)
- **Text Overlay**: Large, readable, on-brand font
- **CTA**: "Link in bio for glass skin" (subtle, end of video)

## Recommended Hashtags
#GlassSkin #SkincareRoutine #LuxurySkincare #TikTokMadeMeBuyIt #SkincareTok
#UnboxingVideo #NewLaunch #BeautyTok

## Performance Prediction
**Estimated Engagement**: High (based on trending audio + macro visuals)
**Best Posting Time**: 7-9pm EST (Gen Z peak activity)
```

**Format 2: Optimized Sora2 Prompt (Character-Limited)**

```
Vertical 9:16. Luxury skincare unboxing. Opens: extreme macro (f/1.4) manicured
hands reaching for pearl-white box on marble, soft diffused 5600K lighting,
subtle rim light. Camera: slow dolly forward 2s. Cut: overhead, hands opening
slow-mo 0.5x. Product reveal: 360° glass serum bottle rotation, light catch,
shallow DOF. Final: serum droplet on skin, macro push-in. 18s. Style: clean
minimal luxury. Grade: warm highlights, desaturated shadows.

[Character count: 437/500 ✓]
```

**Character Counter Component:**
- Real-time character count display
- Visual gauge (green < 400, yellow 400-480, red > 480)
- Warning: "Prompt may exceed Sora2 optimal length"
- "Compress Prompt" button (AI re-distills for brevity)

**User Actions:**
- Copy to clipboard (both formats)
- Edit optimized prompt (manual refinement)
- Save to video record
- "Regenerate with changes" (modify brief, re-run agents)

**Export Options:**
- Download as PDF (for reference)
- Share link (view-only, for collaboration)

---

#### 3.1.5 Performance Tracking & Analytics

**Manual Input Workflow:**

After user publishes video to social platform, they return to app:

**Video Performance Form:**

```
Platform: [TikTok ▼] [Instagram ▼]

Core Metrics:
- Views: [_____]
- Likes: [_____]
- Comments: [_____]
- Shares: [_____]
- Saves: [_____]

Advanced Metrics (Optional):
- Watch Time: [___] seconds
- Completion Rate: [___]%
- Traffic Source: [FYP ▼] [Profile] [Hashtag] [Share]

[Submit Performance Data]
```

**Data Storage:**
- `video_performance` table (Supabase)
- Timestamped records (track performance changes over time)
- Link to `videos` and `agent_contributions` for correlation analysis

**Performance Display (Video Card):**
- Performance badge (High/Medium/Low engagement)
- Key metrics at-a-glance (views, engagement rate)
- Sparkline chart (performance over time if multiple records)

**AI-Driven Insights (Phase 1 - Basic):**

After 3+ videos with performance data:

```
📊 Your Performance Patterns

✅ Top Performers:
- Videos with "macro product shots" → 2.1x avg engagement
- Slow-motion reveals → 1.8x avg watch time
- Trending audio usage → 1.5x shares

⚠️ Improvement Opportunities:
- Videos without text hooks → 40% lower retention
- Longer duration (>20s) → 30% lower completion rate

💡 Recommendations for Next Video:
- Keep: Macro shots, trending audio
- Add: Text hook in first 0.5s
- Adjust: Reduce to <18s duration
```

**Implementation:**
- Simple correlation analysis (Python/Pandas in serverless function)
- Track which agent suggestions were applied (`agent_contributions.was_applied`)
- Calculate performance correlation per agent/suggestion type
- Store in `agent_contributions.performance_correlation`

**Phase 2 Enhancement (Post-MVP):**
- Automated platform API integration (TikTok/Instagram Business APIs)
- Predictive performance scoring (before video generation)
- A/B testing: Generate multiple prompt variations, track which performs best

---

#### 3.1.6 Hashtag Recommendation System

**Trigger:** After agent roundtable completes, before prompt finalization

**AI Generation Process:**

**Input Context:**
- Video brief and prompt content
- Target platform (TikTok/Instagram)
- Target audience demographics
- Current trending topics (manual curation for MVP)

**API Endpoint:** `/api/hashtags/suggest`

**GPT-4o Prompt:**
```
Generate 5-10 optimized hashtags for this social media video:

VIDEO CONTEXT:
{detailed_breakdown}

PLATFORM: {platform}
TARGET AUDIENCE: {audience}

REQUIREMENTS:
- Mix of high-volume (#SkincareRoutine) and niche (#GlassSkinSerum) tags
- Include platform-specific tags (#TikTokMadeMeBuyIt, #BeautyTok)
- Avoid banned or spam-flagged hashtags
- Prioritize discoverability + relevance

Return JSON:
{
  "hashtags": [
    {"tag": "GlassSkin", "volume": "high", "relevance": "exact"},
    {"tag": "SkincareRoutine", "volume": "high", "relevance": "broad"},
    ...
  ]
}
```

**UI Display:**

```
🏷️ Recommended Hashtags

[#GlassSkin] [#SkincareRoutine] [#LuxurySkincare]
[#TikTokMadeMeBuyIt] [#SkincareTok] [#UnboxingVideo]

📊 Volume Indicator:
  High: #SkincareRoutine (10M+ posts)
  Medium: #GlassSkin (500K posts)
  Niche: #LuxurySerum (50K posts)

[Copy All] [Customize]
```

**User Actions:**
- Copy all hashtags to clipboard
- Remove individual tags
- Add custom tags
- Save hashtag set for reuse (series templates)

**Data Storage:**
- `hashtags` table: video_id, tag, suggested_by, performance_score
- Track performance correlation over time
- Learn which hashtags drive engagement for specific content types

**Phase 2 Enhancement:**
- Real-time trending hashtag API integration
- Predictive performance scoring per hashtag
- Hashtag strategy recommendations ("Use 3 high-volume + 5 niche tags")

---

### 3.2 UI/UX Design Specifications

#### 3.2.1 Design System

**Aesthetic:** Creative Studio (inspired by Linear, Figma, Notion)

**Core Principles:**
- Clean, professional, tool-focused
- Content-first hierarchy
- Generous whitespace
- Purposeful color usage (not decorative)
- Sophisticated, not flashy

**Color Palette:**

```javascript
// tailwind.config.js
colors: {
  // Base
  background: '#FAFAF9', // Warm off-white
  foreground: '#1C1C1C', // Deep black

  // Muted (UI elements)
  muted: {
    DEFAULT: '#A8A29E', // Warm gray
    foreground: '#57534E',
  },

  // Accents (Editorial palette)
  sage: {
    50: '#F5F7F5',
    100: '#E8EBE8',
    500: '#7C9473', // Primary
    700: '#5A6D52',
  },
  terracotta: {
    500: '#C97064',
    700: '#A34E43',
  },
  navy: {
    500: '#3B4A5C',
    700: '#2A3744',
  },

  // Agent personas
  director: '#3B4A5C',
  photography: '#7C9473',
  platform: '#5A6D52',
  marketer: '#C97064',
  music: '#8B7C6B',

  // Semantic
  success: '#7C9473',
  warning: '#C97064',
  error: '#A34E43',
}
```

**Typography:**

```javascript
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'Consolas', 'monospace'],
}

fontSize: {
  xs: ['0.75rem', { lineHeight: '1rem' }],
  sm: ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.125rem', { lineHeight: '1.75rem' }],
  xl: ['1.25rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.5rem', { lineHeight: '2rem' }],
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
}
```

**Spacing & Layout:**

```javascript
borderRadius: {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem', // Moderate, not excessive
  xl: '1rem',
}

boxShadow: {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
}
```

---

#### 3.2.2 Layout Structure

**Primary Layout: Sidebar Navigation + Main Canvas**

```
┌──────────────┬─────────────────────────────────────────┐
│              │                                         │
│   SIDEBAR    │          MAIN CONTENT                   │
│   (240px)    │          (fluid width)                  │
│              │                                         │
│  - Logo      │  ┌───────────────────────────────────┐ │
│  - Projects  │  │                                   │ │
│  - Series    │  │   PAGE HEADER                     │ │
│  - Videos    │  │   (breadcrumbs, actions)          │ │
│  - Analytics │  │                                   │ │
│  - Settings  │  └───────────────────────────────────┘ │
│              │                                         │
│  [Upgrade]   │  ┌───────────────────────────────────┐ │
│              │  │                                   │ │
│              │  │   CONTENT AREA                    │ │
│              │  │   (cards, forms, chat)            │ │
│              │  │                                   │ │
│              │  └───────────────────────────────────┘ │
│              │                                         │
└──────────────┴─────────────────────────────────────────┘
```

**Sidebar Navigation:**
- Fixed position, full height
- Collapsible on mobile (hamburger menu)
- Active state indicator (subtle sage accent)
- Section dividers (subtle muted borders)
- Bottom CTA: "Upgrade to Premium" (for free tier users)

**Main Content Area:**
- Responsive max-width container (max-w-7xl)
- Generous padding (px-6, py-8)
- Breadcrumb navigation (top)
- Page title + primary actions (right-aligned)

---

#### 3.2.3 Key Page Layouts

**Dashboard (Projects Overview):**

```
PAGE HEADER:
  H1: "Projects"
  [+ New Project] button (primary CTA)

CONTENT:
  Card Grid (3 columns on desktop, responsive)

  Project Card:
  ┌─────────────────────────────┐
  │  [Video Thumbnail Mosaic]   │
  │                             │
  ├─────────────────────────────┤
  │  Project Name               │
  │  12 videos • 3 series       │
  │  Last updated 2 days ago    │
  │  [Performance badge]        │
  └─────────────────────────────┘

  Empty State (no projects):
  "Start your first project"
  [Visual illustration]
  [+ Create Project] button
```

**Video Creation (Agent Roundtable):**

```
PAGE HEADER:
  Breadcrumb: Projects > Spring Launch > New Video

LAYOUT: Two-column split on desktop, stacked on mobile

LEFT COLUMN (400px fixed):
  ┌─────────────────────────────┐
  │  Brief Input                │
  │  ┌────────────────────────┐ │
  │  │ Textarea (user input) │ │
  │  └────────────────────────┘ │
  │                             │
  │  Platform: [TikTok ▼]       │
  │  Series: [None ▼]           │
  │  [Start Roundtable] button  │
  └─────────────────────────────┘

RIGHT COLUMN (fluid):
  ┌─────────────────────────────┐
  │  Agent Roundtable           │
  │                             │
  │  [Agent Card - Director]    │
  │  "Let's start with..."      │
  │                             │
  │  [Agent Card - Platform]    │
  │  "Challenges Director:"     │
  │  [Threading line visual]    │
  │                             │
  │  [Agent Card - Marketer]    │
  │  "Building on Platform:"    │
  │                             │
  │  [Synthesis Section]        │
  │  - Detailed Breakdown       │
  │  - Optimized Prompt         │
  │  [Copy] [Save] buttons      │
  └─────────────────────────────┘
```

**Project Detail (Series & Videos):**

```
PAGE HEADER:
  Breadcrumb: Projects > Spring Launch
  H1: "Spring Launch"
  [+ New Video] [+ New Series] buttons

TABS:
  [Overview] [Series] [One-offs] [Analytics]

CONTENT (Series Tab):
  Series Card (collapsible):
  ┌─────────────────────────────────────────┐
  │  📁 Series: "Unboxing Videos" (5 videos)│
  │  [Template] indicator                   │
  │  ┌───┬───┬───┬───┬───┐                  │
  │  │ V1│ V2│ V3│ V4│ V5│ (timeline)       │
  │  └───┴───┴───┴───┴───┘                  │
  │  [+ Add to Series] button               │
  └─────────────────────────────────────────┘
```

---

#### 3.2.4 Component Library (shadcn Customization)

**Core Components:**

**Button:**
```jsx
// Default variant
<Button className="bg-sage-500 hover:bg-sage-700 text-white">
  Primary Action
</Button>

// Outline variant
<Button variant="outline" className="border-sage-500 text-sage-700">
  Secondary Action
</Button>

// Ghost variant
<Button variant="ghost">
  Tertiary Action
</Button>
```

**Card:**
```jsx
<Card className="border-muted/20 shadow-sm hover:shadow-md transition-shadow">
  <CardHeader>
    <CardTitle>Project Name</CardTitle>
    <CardDescription>12 videos • 3 series</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**Agent Card (Custom Component):**
```jsx
<div className="relative">
  {/* Threading line (if responding to another agent) */}
  {respondingTo && (
    <div className="absolute left-4 -top-4 w-0.5 h-4 bg-muted"></div>
  )}

  <div className={cn(
    "p-4 rounded-lg border-l-4",
    agentColors[agent]
  )}>
    <div className="flex items-start gap-3">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center",
        agentBackgrounds[agent]
      )}>
        {agentIcons[agent]}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm uppercase">
            {agentNames[agent]}
          </span>
          {isChallenge && (
            <Badge variant="outline" className="text-xs">
              Challenges {respondingTo}
            </Badge>
          )}
        </div>

        <p className="text-foreground/90 leading-relaxed">
          {response}
        </p>
      </div>
    </div>
  </div>
</div>
```

**Prompt Display (Custom Component):**
```jsx
<Tabs defaultValue="breakdown">
  <TabsList>
    <TabsTrigger value="breakdown">Detailed Breakdown</TabsTrigger>
    <TabsTrigger value="optimized">Sora2 Prompt</TabsTrigger>
  </TabsList>

  <TabsContent value="breakdown">
    <Card>
      <CardContent className="prose prose-sm">
        {/* Markdown-rendered breakdown */}
      </CardContent>
    </Card>
  </TabsContent>

  <TabsContent value="optimized">
    <Card>
      <CardContent>
        <div className="font-mono text-sm bg-muted/30 p-4 rounded-md">
          {optimizedPrompt}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Progress value={characterPercentage} className="w-24" />
            <span className="text-sm text-muted-foreground">
              {characterCount}/500 characters
            </span>
          </div>

          <Button size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copy Prompt
          </Button>
        </div>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

---

### 3.3 Technical Architecture

#### 3.3.1 Technology Stack

**Frontend:**
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS 3.4+
- **Component Library:** shadcn/ui (Radix UI primitives)
- **State Management:** React Context + Zustand (for complex state)
- **Forms:** React Hook Form + Zod validation
- **Data Fetching:** TanStack Query (React Query)
- **Markdown Rendering:** react-markdown + remark-gfm

**Backend:**
- **Platform:** Vercel (serverless functions, edge functions)
- **Database:** Supabase (PostgreSQL + Realtime + Auth + Storage)
- **AI Provider:** OpenAI (GPT-4o, GPT-4o-mini for synthesis)
- **Authentication:** Supabase Auth (JWT-based)

**DevOps & Tooling:**
- **Version Control:** Git + GitHub
- **CI/CD:** Vercel automatic deployments
- **Monitoring:** Vercel Analytics + Sentry (error tracking)
- **Environment Management:** Vercel Environment Variables

---

#### 3.3.2 Database Schema (Supabase)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth, extended here)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  usage_quota JSONB DEFAULT '{
    "projects": 3,
    "videos_per_month": 10,
    "consultations_per_month": 10
  }'::jsonb,
  usage_current JSONB DEFAULT '{
    "projects": 0,
    "videos_this_month": 0,
    "consultations_this_month": 0
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Series table
CREATE TABLE public.series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  visual_template JSONB DEFAULT '{}'::jsonb,
  -- Visual template structure:
  -- {
  --   "lighting": "soft diffused, 5600K",
  --   "camera_angles": ["overhead", "macro"],
  --   "color_grading": "warm highlights",
  --   "pacing": "slow reveal",
  --   "aspect_ratio": "9:16"
  -- }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  user_brief TEXT NOT NULL, -- Original user input
  agent_discussion JSONB NOT NULL, -- Full roundtable conversation
  -- agent_discussion structure:
  -- {
  --   "round_1": [{"agent": "director", "response": "..."}],
  --   "round_2": [{"agent": "platform", "response": "...", "responding_to": "director"}]
  -- }
  detailed_breakdown JSONB NOT NULL, -- Structured prompt components
  optimized_prompt TEXT NOT NULL, -- Final Sora2-ready prompt
  character_count INTEGER NOT NULL,
  sora_video_url TEXT, -- External URL or Supabase Storage path
  platform TEXT CHECK (platform IN ('tiktok', 'instagram', 'both')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video performance table
CREATE TABLE public.video_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  watch_time_seconds INTEGER,
  completion_rate DECIMAL(5,2), -- Percentage (e.g., 85.50)
  traffic_source TEXT CHECK (traffic_source IN ('fyp', 'profile', 'hashtag', 'share', 'other')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hashtags table
CREATE TABLE public.hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  suggested_by TEXT CHECK (suggested_by IN ('platform_expert', 'user', 'system')),
  volume_category TEXT CHECK (volume_category IN ('high', 'medium', 'niche')),
  performance_score DECIMAL(5,2), -- Calculated over time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent contributions (for learning system)
CREATE TABLE public.agent_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL CHECK (agent_name IN ('director', 'photography_director', 'platform_expert', 'social_media_marketer', 'music_producer')),
  suggestion_type TEXT, -- e.g., 'camera_angle', 'pacing', 'hook', 'audio'
  suggestion_text TEXT NOT NULL,
  was_applied BOOLEAN DEFAULT TRUE, -- Did final prompt include this?
  performance_correlation DECIMAL(5,2), -- Calculated after performance data available
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_series_project_id ON public.series(project_id);
CREATE INDEX idx_videos_project_id ON public.videos(project_id);
CREATE INDEX idx_videos_series_id ON public.videos(series_id);
CREATE INDEX idx_video_performance_video_id ON public.video_performance(video_id);
CREATE INDEX idx_hashtags_video_id ON public.hashtags(video_id);
CREATE INDEX idx_agent_contributions_video_id ON public.agent_contributions(video_id);

-- Row-Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_contributions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Projects: Users can only CRUD their own projects
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Series: Users can only CRUD series in their projects
CREATE POLICY "Users can view own series" ON public.series
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = series.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create series in own projects" ON public.series
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = series.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own series" ON public.series
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = series.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own series" ON public.series
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = series.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Videos: Similar policies (check project ownership)
CREATE POLICY "Users can view own videos" ON public.videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create videos in own projects" ON public.videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own videos" ON public.videos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own videos" ON public.videos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Performance, hashtags, agent_contributions: Inherit from videos ownership
CREATE POLICY "Users can view performance of own videos" ON public.video_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON v.project_id = p.id
      WHERE v.id = video_performance.video_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add performance to own videos" ON public.video_performance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON v.project_id = p.id
      WHERE v.id = video_performance.video_id
      AND p.user_id = auth.uid()
    )
  );

-- (Repeat similar policies for hashtags and agent_contributions)

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_series_updated_at BEFORE UPDATE ON public.series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

#### 3.3.3 API Routes (Next.js App Router)

**File Structure:**

```
app/
├── api/
│   ├── auth/
│   │   ├── callback/route.ts      # OAuth callback
│   │   └── signout/route.ts       # Sign out handler
│   ├── agent/
│   │   ├── roundtable/route.ts    # Main agent consultation
│   │   └── regenerate/route.ts    # Regenerate with changes
│   ├── videos/
│   │   ├── route.ts               # GET (list), POST (create)
│   │   └── [id]/
│   │       ├── route.ts           # GET, PUT, DELETE
│   │       └── performance/route.ts # POST (add performance)
│   ├── projects/
│   │   ├── route.ts               # GET, POST
│   │   └── [id]/route.ts          # GET, PUT, DELETE
│   ├── series/
│   │   ├── route.ts               # POST
│   │   └── [id]/route.ts          # GET, PUT, DELETE
│   ├── hashtags/
│   │   └── suggest/route.ts       # POST (generate hashtags)
│   └── analytics/
│       └── insights/route.ts      # GET (user insights)
```

**Key Endpoint: `/api/agent/roundtable`**

```typescript
// app/api/agent/roundtable/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runAgentRoundtable } from '@/lib/ai/agent-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check usage quota (freemium tier)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, usage_quota, usage_current')
      .eq('id', user.id)
      .single();

    if (profile.subscription_tier === 'free') {
      if (profile.usage_current.consultations_this_month >= profile.usage_quota.consultations_per_month) {
        return NextResponse.json({
          error: 'Monthly consultation limit reached. Upgrade to Premium for unlimited access.',
          code: 'QUOTA_EXCEEDED'
        }, { status: 429 });
      }
    }

    const body = await request.json();
    const { brief, platform, seriesId, projectId } = body;

    // Fetch series template if applicable
    let visualTemplate = null;
    if (seriesId) {
      const { data: series } = await supabase
        .from('series')
        .select('visual_template')
        .eq('id', seriesId)
        .single();
      visualTemplate = series?.visual_template;
    }

    // Run agent roundtable (orchestration logic)
    const result = await runAgentRoundtable({
      brief,
      platform,
      visualTemplate,
      userId: user.id,
    });

    // Increment usage counter
    await supabase.rpc('increment_consultation_usage', { user_id: user.id });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Roundtable error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Agent Orchestration Logic:**

```typescript
// lib/ai/agent-orchestrator.ts
import OpenAI from 'openai';
import { agentSystemPrompts } from './agent-prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RoundtableInput {
  brief: string;
  platform: 'tiktok' | 'instagram';
  visualTemplate?: any;
  userId: string;
}

export async function runAgentRoundtable(input: RoundtableInput) {
  const { brief, platform, visualTemplate } = input;

  // Round 1: Parallel agent responses
  const round1Promises = [
    callAgent('director', brief, platform, visualTemplate),
    callAgent('photography_director', brief, platform, visualTemplate),
    callAgent('platform_expert', brief, platform, visualTemplate),
    callAgent('social_media_marketer', brief, platform, visualTemplate),
    callAgent('music_producer', brief, platform, visualTemplate),
  ];

  const round1Responses = await Promise.all(round1Promises);

  // Round 2: Sequential debate (agents respond to each other)
  const round2Context = round1Responses.map(r => ({
    agent: r.agent,
    response: r.response,
  }));

  const round2Responses = [];

  // Platform Expert challenges Director (30% probability)
  if (Math.random() < 0.3) {
    const challenge = await callAgentWithContext(
      'platform_expert',
      brief,
      platform,
      round2Context,
      { challengeAgent: 'director' }
    );
    round2Responses.push(challenge);

    // Director responds to challenge
    const response = await callAgentWithContext(
      'director',
      brief,
      platform,
      [...round2Context, challenge],
      { respondingTo: 'platform_expert' }
    );
    round2Responses.push(response);
  }

  // Marketer builds on consensus
  const marketerBuild = await callAgentWithContext(
    'social_media_marketer',
    brief,
    platform,
    [...round2Context, ...round2Responses],
    { buildingOn: ['director', 'platform_expert'] }
  );
  round2Responses.push(marketerBuild);

  // Synthesis: Distill into structured output
  const synthesis = await synthesizeRoundtable({
    brief,
    platform,
    round1: round1Responses,
    round2: round2Responses,
  });

  return {
    discussion: {
      round1: round1Responses,
      round2: round2Responses,
    },
    detailedBreakdown: synthesis.breakdown,
    optimizedPrompt: synthesis.prompt,
    characterCount: synthesis.characterCount,
    hashtags: synthesis.hashtags,
  };
}

async function callAgent(
  agentName: string,
  brief: string,
  platform: string,
  visualTemplate?: any
) {
  const systemPrompt = agentSystemPrompts[agentName];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o', // Use latest model
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Brief: ${brief}\nPlatform: ${platform}${
          visualTemplate ? `\nSeries Template: ${JSON.stringify(visualTemplate)}` : ''
        }`
      },
    ],
    temperature: 0.8, // Higher for personality
    max_tokens: 300,
  });

  return {
    agent: agentName,
    response: completion.choices[0].message.content,
  };
}

async function callAgentWithContext(
  agentName: string,
  brief: string,
  platform: string,
  context: any[],
  options: { challengeAgent?: string; respondingTo?: string; buildingOn?: string[] }
) {
  const systemPrompt = agentSystemPrompts[agentName];

  let instruction = `Other agents have shared their perspectives:\n\n`;
  context.forEach(c => {
    instruction += `${c.agent.toUpperCase()}: ${c.response}\n\n`;
  });

  if (options.challengeAgent) {
    instruction += `You disagree with ${options.challengeAgent.toUpperCase()}'s approach. Respectfully challenge their perspective with your framework.`;
  } else if (options.respondingTo) {
    instruction += `Respond to ${options.respondingTo.toUpperCase()}'s challenge. Defend your perspective or find synthesis.`;
  } else if (options.buildingOn) {
    instruction += `Build upon the ideas from ${options.buildingOn.join(' and ').toUpperCase()}.`;
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Brief: ${brief}\nPlatform: ${platform}` },
      { role: 'assistant', content: context[0]?.response || '' },
      { role: 'user', content: instruction },
    ],
    temperature: 0.8,
    max_tokens: 250,
  });

  return {
    agent: agentName,
    response: completion.choices[0].message.content,
    ...options,
  };
}

async function synthesizeRoundtable(data: any) {
  // Use GPT-4o to distill into structured output
  const synthesisPrompt = `
You are synthesizing a creative film crew roundtable discussion into structured video prompt outputs.

DISCUSSION SUMMARY:
${JSON.stringify(data, null, 2)}

Generate TWO outputs:

1. DETAILED BREAKDOWN (structured sections):
- Scene Structure (with timestamps)
- Visual Specifications (aspect ratio, lighting, camera, color)
- Audio Direction (music/sound)
- Platform Optimization (${data.platform}-specific)
- Recommended Hashtags (5-10 tags)

2. OPTIMIZED SORA2 PROMPT (character-limited, under 500 chars):
- Concise, technical, Sora-optimized format
- Preserve critical visual/narrative elements
- Remove redundancy

Return JSON:
{
  "breakdown": {
    "scene_structure": "...",
    "visual_specs": "...",
    "audio": "...",
    "platform_optimization": "...",
    "hashtags": ["tag1", "tag2", ...]
  },
  "optimized_prompt": "...",
  "character_count": 437
}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Cheaper for synthesis
    messages: [
      { role: 'system', content: 'You are an expert at distilling creative discussions into structured video prompts.' },
      { role: 'user', content: synthesisPrompt },
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(completion.choices[0].message.content);

  return {
    breakdown: result.breakdown,
    prompt: result.optimized_prompt,
    characterCount: result.character_count,
    hashtags: result.breakdown.hashtags,
  };
}
```

---

#### 3.3.4 Agent System Prompts

```typescript
// lib/ai/agent-prompts.ts
export const agentSystemPrompts = {
  director: `You are the DIRECTOR on a creative film production team for social media content.

PERSONALITY: Bold, visionary, storytelling-focused, cinematic thinking

EXPERTISE:
- Narrative arcs and emotional pacing for short-form content (15-30s videos)
- Hook creation: First 2 seconds are critical for retention
- Visual storytelling optimized for vertical (9:16) and square (1:1) formats
- Emotional resonance and audience connection

INTERACTION STYLE:
- Advocate strongly for narrative and emotional impact
- Challenge suggestions that compromise storytelling (when appropriate)
- Build upon others' ideas when they enhance the vision
- Be willing to respectfully debate and find synthesis
- Keep responses under 100 words

Remember: You're collaborating with a Photography Director, Platform Expert, Social Media Marketer, and Music Producer. Listen to their expertise while maintaining your storytelling focus.`,

  photography_director: `You are the PHOTOGRAPHY DIRECTOR (Director of Photography / DP) on a creative film production team for social media content.

PERSONALITY: Technical, detail-oriented, visually sophisticated, aesthetic-driven

EXPERTISE:
- Lighting design (natural, studio, color temperature, mood)
- Camera angles and movements (overhead, macro, tracking, dolly, handheld)
- Composition (rule of thirds, leading lines, symmetry, negative space)
- Color grading and visual mood (warm/cool, saturated/desaturated, contrast)
- Depth of field and focus techniques
- Visual continuity and style consistency

INTERACTION STYLE:
- Provide technical precision and visual specificity
- Challenge vague visual descriptions with concrete alternatives
- Build upon narrative ideas with technical execution details
- Collaborate with Director on visual storytelling
- Keep responses under 100 words

Remember: Your job is to make the Director's vision technically achievable and visually stunning for mobile screens.`,

  platform_expert: `You are the PLATFORM EXPERT specializing in TikTok and Instagram algorithm optimization and content strategy.

PERSONALITY: Data-driven, trend-aware, algorithmic thinking, pragmatic

EXPERTISE:
- TikTok algorithm: FYP optimization, watch time, completion rate, engagement signals
- Instagram algorithm: Reels prioritization, explore page, hashtag strategy
- Format specifications: Aspect ratios (9:16, 1:1, 4:5), duration sweet spots
- Current trending audio, effects, and content patterns
- Platform-specific best practices (text overlays, captions, hooks)
- Optimal posting times and content cadence

INTERACTION STYLE:
- Ground creative ideas in platform realities and data
- Challenge suggestions that won't perform algorithmically (respectfully)
- Provide specific platform-optimized recommendations
- Balance creativity with performance metrics
- Keep responses under 100 words

Remember: You're the voice of "what actually works" on TikTok/Instagram. Collaborate with creatives while keeping content discoverable and engaging.`,

  social_media_marketer: `You are the SOCIAL MEDIA MARKETER focused on audience engagement and conversion for content creators.

PERSONALITY: Audience-focused, persuasive, conversion-driven, psychologically-aware

EXPERTISE:
- Target audience psychology and pain points
- Engagement hooks and attention-grabbing techniques
- Call-to-action (CTA) placement and messaging
- Value proposition communication
- Trend-jacking and cultural relevance
- Community building and follower retention
- Conversion optimization (link clicks, follows, saves, shares)

INTERACTION STYLE:
- Always advocate for audience perspective ("What's in it for them?")
- Push for clear, compelling hooks and CTAs
- Challenge content that doesn't serve audience needs
- Build upon creative ideas with engagement optimization
- Keep responses under 100 words

Remember: Every video should have a purpose beyond aesthetics. Focus on what makes viewers stop scrolling, watch, and engage.`,

  music_producer: `You are the MUSIC PRODUCER responsible for audio strategy, music selection, and sound design for social media content.

PERSONALITY: Rhythm-focused, emotion-driven, audio branding-aware, culturally-tuned

EXPERTISE:
- Trending audio on TikTok/Instagram (viral sounds, popular songs)
- Audio-visual synchronization (beat drops, transitions, emotional peaks)
- Tempo and pacing (BPM matching with visual rhythm)
- Sound design (ambient sounds, SFX, audio texture)
- Audio mood and emotional resonance
- Music licensing considerations (royalty-free, creator-safe)

INTERACTION STYLE:
- Suggest specific audio tracks or sound design approaches
- Sync audio strategy with visual pacing and narrative beats
- Challenge silent or poorly-scored content
- Build upon Director's emotional vision with audio enhancement
- Keep responses under 100 words

Remember: Audio is 50% of the experience on social media. Trending audio can significantly boost discoverability. Suggest specific tracks when possible.`,
};
```

---

### 3.4 Freemium Business Model

#### 3.4.1 Tier Comparison

| Feature | Free Tier | Premium Tier |
|---------|-----------|--------------|
| **Projects** | 3 maximum | Unlimited |
| **Videos per month** | 10 | Unlimited |
| **Agent consultations** | 10 per month | Unlimited |
| **Series management** | ✅ Yes | ✅ Yes |
| **Performance tracking** | ✅ Manual input | ✅ Manual input |
| **Hashtag suggestions** | ✅ Basic | ✅ Advanced |
| **Analytics insights** | Basic (after 3 videos) | Advanced + predictive |
| **Export options** | Copy to clipboard | PDF reports, prompt library export |
| **Priority AI processing** | ❌ No | ✅ Yes (faster responses) |
| **Custom templates** | ❌ No | ✅ Yes |
| **Support** | Community (Discord/docs) | Priority email support |
| **Price** | $0/month | $24/month |

#### 3.4.2 Pricing Strategy

**Recommended Pricing:** $24/month (annual plan: $19/month, billed $228/year)

**Rationale:**
- Comparable to creator tools (Canva Pro: $15/mo, Descript: $24/mo)
- AI cost coverage: GPT-4o API costs ~$0.50-1.00 per consultation
- Premium users should generate 20-50+ consultations/month to justify pricing
- Positioned as professional tool, not commodity

**Trial Strategy:**
- 7-day free trial of Premium (no credit card required)
- After trial: Downgrade to Free tier automatically
- In-app upgrade prompts when hitting limits

#### 3.4.3 Usage Tracking Implementation

**Supabase RLS + Middleware:**

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check usage quota for API routes
  if (request.nextUrl.pathname.startsWith('/api/agent')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, usage_quota, usage_current')
      .eq('id', user.id)
      .single();

    if (profile.subscription_tier === 'free') {
      if (profile.usage_current.consultations_this_month >= profile.usage_quota.consultations_per_month) {
        return NextResponse.json(
          { error: 'Monthly limit reached', code: 'QUOTA_EXCEEDED' },
          { status: 429 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/agent/:path*'],
};
```

**Usage Reset (Monthly Cron Job):**

```typescript
// Vercel Cron Job: Run on 1st of each month
// app/api/cron/reset-usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Reset usage_current for all users
  await supabase
    .from('profiles')
    .update({
      usage_current: {
        projects: 0, // Don't reset project count, only creation counter
        videos_this_month: 0,
        consultations_this_month: 0,
      }
    })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

  return NextResponse.json({ success: true });
}
```

---

## 4. Implementation Roadmap

### Phase 1: MVP Launch (Weeks 1-8)

**Week 1-2: Foundation**
- [x] Project setup: Next.js 14, Tailwind, shadcn/ui
- [x] Supabase setup: Database schema, auth, RLS policies
- [x] Design system: Color tokens, typography, core components
- [x] Authentication flow: Sign up, login, OAuth integration

**Week 3-4: Core Features**
- [x] Project & series CRUD operations
- [x] Agent system prompts and orchestration logic
- [x] Roundtable UI: Agent cards, debate visualization
- [x] Prompt generation: Detailed breakdown + optimized output

**Week 5-6: User Experience**
- [x] Dashboard: Project card grid, navigation
- [x] Video creation flow: Brief input → roundtable → prompt
- [x] Performance tracking: Manual input forms
- [x] Hashtag recommendation system

**Week 7-8: Polish & Launch**
- [x] Freemium tier gating and upgrade flows
- [x] Onboarding tutorial and empty states
- [x] Error handling and loading states
- [x] Testing, bug fixes, performance optimization
- [x] Deployment to Vercel production

**Launch Criteria:**
- All MVP features functional and tested
- Responsive design (mobile + desktop)
- Performance: <2s initial load, <5s agent roundtable
- Documentation: User guide, FAQ

---

### Phase 2: Post-Launch Enhancements (Weeks 9-16)

**Week 9-10: Analytics & Learning**
- AI-driven performance insights
- Pattern recognition across user videos
- Agent learning system (performance correlation)
- Advanced analytics dashboard

**Week 11-12: Template Library**
- Pre-built series templates (by niche: beauty, tech, food, etc.)
- Community template sharing (curated)
- Template marketplace (future monetization)

**Week 13-14: Collaboration Features**
- Team workspaces (invite collaborators to projects)
- Role-based permissions (viewer, editor, admin)
- Comment system on videos (internal feedback)

**Week 15-16: Mobile Optimization**
- Progressive Web App (PWA) support
- Mobile-specific UI improvements
- Touch gestures and interactions

---

### Phase 3: Advanced Features (Weeks 17-24)

**Week 17-18: Direct Sora API Integration**
- OpenAI Sora API integration (when publicly available)
- In-app video generation (no copy-paste)
- Video preview and iteration
- Supabase Storage for video hosting

**Week 19-20: Automated Analytics**
- TikTok Business API integration
- Instagram Graph API integration
- Automatic performance data syncing
- Real-time performance dashboard

**Week 21-22: A/B Testing System**
- Generate multiple prompt variations
- Side-by-side comparison
- User selection + system learning
- Predictive performance scoring

**Week 23-24: Advanced AI Features**
- Video editing suggestions (post-generation)
- Style transfer (apply successful video styles to new content)
- Trend prediction (forecast next viral formats)
- Custom agent training (user-specific persona fine-tuning)

---

## 5. Success Metrics & KPIs

### 5.1 User Engagement Metrics

**Primary:**
- **Daily Active Users (DAU)** / **Monthly Active Users (MAU)**
  - Target: 30% DAU/MAU ratio (industry standard for creator tools)
- **Session Duration**
  - Target: 15-20 minutes per session
- **Retention Rate**
  - Day 1: 60%+, Day 7: 40%+, Day 30: 25%+
- **Videos Created per User**
  - Target: 8-12 videos/month (active users)

**Secondary:**
- Agent roundtable completion rate: 85%+
- Prompt regeneration rate: <30% (indicates high initial quality)
- Series adoption rate: 40%+ of users create at least one series

---

### 5.2 Product Quality Metrics

**User Satisfaction:**
- In-app prompt rating: 4.2/5.0 average
- NPS (Net Promoter Score): 40+ (good for SaaS)
- Customer satisfaction (CSAT): 85%+

**Technical Performance:**
- Agent roundtable response time: <5 seconds (Round 1 + Round 2)
- Page load time: <2 seconds (dashboard)
- API error rate: <1%
- Uptime: 99.5%+

---

### 5.3 Business Metrics

**Revenue:**
- **Free-to-Premium Conversion Rate**: 5-8% (industry benchmark: 2-5%)
- **Monthly Recurring Revenue (MRR)**: Growth trajectory
- **Average Revenue Per User (ARPU)**: $24 * conversion rate
- **Churn Rate**: <5% monthly (premium users)

**Cost:**
- **Customer Acquisition Cost (CAC)**: Target <$50
- **LTV:CAC Ratio**: 3:1 or higher
- **AI API Costs**: <30% of revenue (control OpenAI spend)

**Growth:**
- **Month-over-Month (MoM) User Growth**: 20%+ in first 6 months
- **Viral Coefficient**: Track referrals and word-of-mouth

---

## 6. Risk Assessment & Mitigation

### 6.1 Technical Risks

**Risk: OpenAI API Cost Explosion**
- **Mitigation**: Rate limiting, token optimization, caching agent responses
- **Mitigation**: Free tier strict limits (10 consultations/month)
- **Mitigation**: Consider GPT-4o-mini for synthesis (cheaper)

**Risk: Sora API Unavailability**
- **Mitigation**: MVP focuses on prompt generation only (copy-paste workflow)
- **Mitigation**: Future integration when API publicly available
- **Mitigation**: Alternative: Support other AI video tools (Runway, Pika)

**Risk: Supabase RLS Performance Issues**
- **Mitigation**: Optimize queries with proper indexing
- **Mitigation**: Use Supabase caching (Realtime subscriptions)
- **Mitigation**: Monitor query performance with Supabase logs

---

### 6.2 Product Risks

**Risk: Agent Debate Too Complex for Users**
- **Mitigation**: Offer "Quick Mode" (skip debate, instant prompt)
- **Mitigation**: Progressive disclosure (collapsed by default, expand to see debate)
- **Mitigation**: User testing during beta to refine interaction

**Risk: Prompt Quality Below Expectations**
- **Mitigation**: Iterative improvement of agent system prompts
- **Mitigation**: User feedback loop (rate prompts, flag issues)
- **Mitigation**: A/B test different agent orchestration strategies

**Risk: Series Template Enforcement Too Rigid**
- **Mitigation**: Allow template overrides per video
- **Mitigation**: "Remix" feature (inherit template, customize elements)
- **Mitigation**: User education on when to use templates vs. one-offs

---

### 6.3 Business Risks

**Risk: Low Free-to-Premium Conversion**
- **Mitigation**: Optimize upgrade prompts (timing, messaging)
- **Mitigation**: Add premium-exclusive features (advanced analytics, templates)
- **Mitigation**: Trial period to demonstrate value before purchase

**Risk: High User Churn**
- **Mitigation**: Onboarding excellence (tutorial, empty states, guidance)
- **Mitigation**: Email engagement campaigns (weekly tips, case studies)
- **Mitigation**: Performance insights that demonstrate value ("Your videos improved 40%")

**Risk: Competitive Threats**
- **Mitigation**: Focus on differentiation (multi-agent debate, series management)
- **Mitigation**: Build moat: User data = better AI recommendations over time
- **Mitigation**: Community building (Discord, template marketplace)

---

## 7. Appendix

### 7.1 Glossary

**Agent:** AI persona with specific expertise (e.g., Director, Platform Expert) that provides input during prompt generation.

**Roundtable:** Collaborative debate-style interaction where multiple agents discuss and refine a video concept.

**Series:** Collection of videos with shared visual style and template, for recurring content themes.

**Visual Template:** JSON-structured style guide defining lighting, camera angles, color grading, etc., enforced across series videos.

**Optimized Prompt:** Character-limited, Sora2-ready prompt generated from agent discussion (target: <500 characters).

**Detailed Breakdown:** Human-readable structured document explaining video components (scene, visual, audio, platform optimization).

---

### 7.2 Technical Dependencies

**Core:**
- Next.js: ^14.2.0
- React: ^18.3.0
- Tailwind CSS: ^3.4.0
- TypeScript: ^5.4.0

**UI:**
- @radix-ui/react-* (via shadcn/ui)
- lucide-react: ^0.index (icons)
- react-hook-form: ^7.51.0
- zod: ^3.22.0

**Data:**
- @supabase/supabase-js: ^2.42.0
- @tanstack/react-query: ^5.28.0

**AI:**
- openai: ^4.28.0

**Utilities:**
- date-fns: ^3.3.0
- react-markdown: ^9.0.0
- clsx: ^2.1.0
- tailwind-merge: ^2.2.0

---

### 7.3 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-api-key

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Cron (for usage reset)
CRON_SECRET=your-cron-secret

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
```

---

### 7.4 Resources

**Documentation:**
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- shadcn/ui: https://ui.shadcn.com
- OpenAI API: https://platform.openai.com/docs

**Design Inspiration:**
- Linear: https://linear.app
- Figma: https://figma.com
- Notion: https://notion.so

**Competitor Research:**
- Runway ML: https://runwayml.com
- Pika Labs: https://pika.art
- Descript: https://descript.com

---

## End of Product Requirements Document

**Document Version:** 1.0
**Last Updated:** 2024-01-XX
**Status:** Ready for Implementation

**Next Steps:**
1. Technical review and feasibility validation
2. Design mockups and prototyping (Figma)
3. Development sprint planning
4. Beta user recruitment strategy
