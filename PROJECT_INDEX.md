# Scenra Studio - Project Index

**Generated:** 2026-01-04
**Version:** 1.0.0
**Product Name:** Scenra Studio (formerly Sora Video Generator)

---

## Quick Reference

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.0.7 (App Router) |
| React | React 19.2.0 |
| Language | TypeScript 5.9 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (@supabase/ssr) |
| AI | OpenAI GPT-4o |
| Payments | Stripe |
| State | TanStack Query 5 + React Context |
| UI | shadcn/ui + Tailwind CSS 3 |
| Forms | react-hook-form + zod |
| Testing | Jest 29 + Playwright |

---

## Project Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│    Next.js 15 App (React 19) + TanStack Query + shadcn/ui          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
┌────────────────────────────────┴────────────────────────────────────┐
│                       APPLICATION LAYER                              │
│    Vercel Edge Network → Middleware → Serverless Functions          │
└────────────────────┬──────────────────────┬─────────────────────────┘
                     │                      │
        ┌────────────┴──────────┐  ┌───────┴──────────┐
        │      SUPABASE         │  │   OPENAI API     │
        │  (PostgreSQL + Auth)  │  │   (GPT-4o)       │
        └───────────────────────┘  └──────────────────┘
```

---

## Directory Structure

### `/app` - Next.js App Router Pages & API

```
app/
├── (auth)/                    # Authentication pages (unprotected)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
│
├── (legal)/                   # Legal pages with dedicated layout
│   ├── layout.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   └── cookies/page.tsx
│
├── admin/                     # Admin dashboard (protected)
│   ├── layout.tsx
│   ├── page.tsx               # Admin overview
│   ├── users/page.tsx         # User management
│   └── billing/page.tsx       # Billing statistics
│
├── dashboard/                 # Main user dashboard (protected)
│   ├── layout.tsx             # Dashboard layout with sidebar
│   ├── page.tsx               # Dashboard home
│   │
│   ├── series/                # Series management
│   │   ├── page.tsx           # Series list
│   │   ├── [seriesId]/page.tsx # Series detail
│   │   └── concept/page.tsx   # AI concept generation
│   │
│   ├── episodes/              # Episode management
│   │   └── [id]/page.tsx      # Episode detail with segments
│   │
│   ├── videos/                # Video management
│   │   ├── page.tsx           # Videos list with filters
│   │   ├── new/page.tsx       # Create new video
│   │   └── [id]/
│   │       ├── ready/page.tsx       # Video ready dashboard
│   │       └── roundtable/page.tsx  # Agent roundtable
│   │
│   ├── settings/page.tsx      # User settings & billing
│   ├── upgrade/page.tsx       # Subscription upgrade
│   └── help/page.tsx          # Help & onboarding
│
├── share/[token]/             # Public video sharing
│   ├── page.tsx
│   └── share-page-client.tsx
│
├── providers/                 # React context providers
│   ├── theme-provider.tsx
│   └── query-provider.tsx
│
└── api/                       # API routes (see API section below)
```

### `/app/api` - API Routes

```
api/
├── auth/
│   ├── callback/route.ts      # OAuth callback
│   └── signout/route.ts       # Sign out handler
│
├── series/                    # Series CRUD + nested resources
│   ├── route.ts               # GET list, POST create
│   ├── [seriesId]/
│   │   ├── route.ts           # GET, PUT, DELETE series
│   │   ├── settings/route.ts           # Series settings
│   │   ├── context/route.ts            # Series context
│   │   ├── visual-style/route.ts       # Visual style config
│   │   ├── characters/route.ts         # Character management
│   │   ├── assets/route.ts             # Visual assets
│   │   ├── relationships/route.ts      # Character relationships
│   │   └── sora-settings/route.ts      # Sora generation settings
│   ├── standalone/route.ts    # Standalone series creation
│   └── concept/               # AI concept generation
│       ├── generate/route.ts  # Generate series concept
│       ├── dialogue/route.ts  # Dialogue generation
│       └── persist/route.ts   # Save concept to database
│
├── episodes/
│   ├── route.ts               # GET list, POST create
│   ├── create-segments/route.ts  # Bulk segment creation
│   └── [id]/
│       ├── route.ts           # GET, PUT, DELETE
│       ├── segments/route.ts  # Episode segments
│       ├── videos/route.ts    # Episode videos
│       ├── full-data/route.ts # Complete episode data
│       └── convert-to-prompt/route.ts  # AI conversion
│
├── videos/
│   ├── route.ts               # GET list, POST create
│   └── [id]/
│       ├── route.ts           # GET, PUT, DELETE
│       ├── generate-sora/route.ts    # Trigger Sora generation
│       ├── reset-sora/route.ts       # Reset generation state
│       ├── sora-status/route.ts      # Check generation status
│       ├── duplicate/route.ts        # Duplicate video
│       ├── share/route.ts            # Generate share link
│       ├── export/pdf/route.ts       # PDF export
│       └── performance/              # Analytics
│           ├── route.ts
│           ├── insights/route.ts
│           └── [metricId]/route.ts
│
├── segments/
│   ├── generate-prompt/route.ts     # AI prompt generation
│   ├── generate-video/route.ts      # Video generation
│   └── [id]/generate-video/route.ts # Specific segment
│
├── segment-groups/
│   └── [id]/
│       ├── route.ts                  # Group management
│       └── generate-batch/route.ts   # Batch generation
│
├── screenplay/               # Screenplay system
│   ├── scenes/route.ts
│   ├── episodes/route.ts
│   └── session/
│       ├── start/route.ts
│       └── message/route.ts
│
├── agent/                    # AI Agent system
│   └── roundtable/
│       ├── route.ts          # Standard roundtable
│       ├── advanced/route.ts # Advanced mode
│       └── stream/route.ts   # Streaming response
│
├── stripe/                   # Payment integration
│   ├── webhook/route.ts      # Stripe webhooks
│   ├── portal/route.ts       # Customer portal
│   ├── checkout/route.ts     # Checkout session
│   └── subscription/route.ts # Subscription status
│
├── user/                     # User management
│   └── api-keys/
│       ├── route.ts
│       └── [id]/
│           ├── route.ts
│           └── validate/route.ts
│
├── admin/                    # Admin endpoints
│   ├── users/route.ts
│   ├── stats/route.ts
│   └── billing/route.ts
│
├── cron/
│   └── poll-sora-status/route.ts  # Background job
│
└── debug/
    └── series-schema/route.ts     # Dev debugging
```

---

### `/components` - React Components

```
components/
├── ui/                       # shadcn/ui primitives (36 components)
│   ├── button.tsx            # Button variants
│   ├── card.tsx              # Card layouts
│   ├── dialog.tsx            # Modal dialogs
│   ├── form.tsx              # Form primitives
│   ├── input.tsx             # Input fields
│   ├── select.tsx            # Select dropdowns
│   ├── toast.tsx             # Toast notifications
│   ├── skeleton.tsx          # Loading skeletons
│   ├── skeleton-loaders.tsx  # Custom skeleton compositions
│   ├── motion.tsx            # Framer Motion wrappers
│   └── ... (26 more)
│
├── series/                   # Series management (20 components)
│   ├── series-card.tsx
│   ├── create-series-dialog.tsx
│   ├── character-manager.tsx
│   ├── relationship-manager.tsx
│   ├── visual-asset-manager.tsx
│   ├── sora-settings-manager.tsx
│   ├── concept-agent-dialog.tsx     # AI concept generation
│   ├── concept-preview.tsx
│   └── ...
│
├── videos/                   # Video editing (25 components)
│   ├── videos-page-client.tsx
│   ├── video-ready-dashboard.tsx
│   ├── video-roundtable-client.tsx
│   ├── sora-generation-modal.tsx
│   ├── sora-generation-button.tsx
│   ├── shot-list-builder.tsx
│   ├── prompt-output.tsx
│   ├── character-selector.tsx
│   └── ...
│
├── agents/                   # AI Agent UI (4 components)
│   ├── agent-card.tsx
│   ├── agent-roundtable.tsx
│   ├── streaming-roundtable.tsx
│   └── streaming-roundtable-modal.tsx
│
├── segments/                 # Segment management (7 components)
│   ├── segment-list.tsx
│   ├── segment-card.tsx
│   ├── segment-detail-drawer.tsx
│   ├── batch-generation-dialog.tsx
│   ├── batch-generation-progress.tsx
│   ├── create-segments-dialog.tsx
│   └── continuity-report-viewer.tsx
│
├── episodes/                 # Episode components
│   ├── episode-video-generator.tsx
│   └── index.ts
│
├── screenplay/               # Screenplay system (5 components)
│   ├── screenplay-chat.tsx
│   ├── screenplay-viewer.tsx
│   ├── scene-list.tsx
│   ├── episode-manager.tsx
│   └── index.ts
│
├── dashboard/                # Dashboard layout (6 components)
│   ├── sidebar.tsx
│   ├── user-menu.tsx
│   ├── mobile-nav.tsx
│   ├── page-wrapper.tsx
│   ├── dashboard-content.tsx
│   └── migration-banner.tsx
│
├── settings/                 # Settings panels
│   ├── billing-settings.tsx
│   └── api-keys-settings.tsx
│
├── billing/                  # Billing UI (4 components)
│   ├── usage-indicator.tsx
│   ├── upgrade-prompt-dialog.tsx
│   ├── usage-warning-banner.tsx
│   └── index.ts
│
├── performance/              # Analytics UI (7 components)
│   ├── performance-metrics-section.tsx
│   ├── performance-chart-views.tsx
│   ├── performance-chart-engagement.tsx
│   ├── performance-insights-panel.tsx
│   └── ...
│
├── onboarding/               # User onboarding (4 components)
│   ├── TourProvider.tsx
│   ├── WelcomeTourTrigger.tsx
│   ├── HelpModal.tsx
│   └── tours/tour-definitions.ts
│
├── brand/                    # Branding components
│   ├── scenra-logo.tsx
│   ├── sub-brand-badge.tsx
│   └── index.ts
│
├── layout/
│   └── site-footer.tsx
│
├── modals/
│   ├── confirm-modal.tsx
│   └── error-modal.tsx
│
├── providers/
│   └── modal-provider.tsx
│
└── error-boundary.tsx
```

---

### `/lib` - Utilities & Services

```
lib/
├── ai/                        # AI integration layer (14 files)
│   ├── config.ts              # OpenAI configuration
│   ├── agent-types.ts         # Agent type definitions
│   ├── agent-prompts.ts       # Agent system prompts
│   ├── agent-orchestrator.ts  # Standard orchestration
│   ├── agent-orchestrator-stream.ts  # Streaming orchestration
│   ├── series-concept-agent.ts       # Series concept generation
│   ├── screenplay-agent.ts           # Screenplay AI
│   ├── screenplay-to-prompt.ts       # Conversion utilities
│   ├── screenplay-context.ts         # Context building
│   ├── episode-segmenter.ts          # Auto-segmentation
│   ├── visual-state-extractor.ts     # Visual continuity
│   ├── continuity-validator.ts       # Validation
│   ├── vision-analysis.ts            # Image analysis
│   ├── performance-analyzer.ts       # Performance insights
│   ├── cinematic-templates.ts        # Shot templates
│   └── ultra-detailed-prompt-template.ts
│
├── supabase/                  # Database clients
│   ├── client.ts              # Browser client
│   ├── server.ts              # Server client
│   └── middleware.ts          # Auth middleware
│
├── stripe/                    # Payment integration
│   ├── client.ts              # Browser Stripe.js
│   ├── server.ts              # Server Stripe SDK (lazy init)
│   ├── config.ts              # Pricing tiers & features
│   ├── usage.ts               # Usage checking
│   └── index.ts
│
├── types/                     # TypeScript definitions
│   ├── database.types.ts      # Supabase generated types
│   ├── api.types.ts           # API request/response types
│   ├── admin.types.ts         # Admin types
│   ├── character-consistency.ts
│   └── series-concept.types.ts
│
├── services/                  # Business logic services
│   ├── series-concept-persister.ts
│   ├── series-context.ts
│   └── screenplay-enrichment.ts
│
├── hooks/                     # React hooks
│   ├── use-usage.ts           # Usage tracking (SWR)
│   ├── use-videos-filters.ts  # Video filtering
│   └── use-confetti.ts        # Celebration effects
│
├── utils/                     # Utility functions
│   ├── screenplay-parser.ts
│   ├── screenplay-to-sora.ts
│   └── screenplay-extraction.ts
│
├── validation/                # Zod schemas
│   ├── schemas.ts
│   ├── series-concept-validator.ts
│   └── character-consistency.ts
│
├── middleware/
│   └── admin-auth.ts
│
├── encryption/
│   └── api-key-encryption.ts
│
├── animations/
│   └── variants.ts            # Framer Motion variants
│
├── analytics/                 # Analytics tracking
│   ├── events.ts
│   ├── use-analytics.ts
│   └── index.ts
│
├── rate-limit/
│   └── index.ts
│
├── logger/
│   └── index.ts
│
└── utils.ts                   # General utilities (cn, etc.)
```

---

## Database Schema

### Core Tables

| Table | Description | RLS |
|-------|-------------|-----|
| `profiles` | User profiles with Stripe data | Yes |
| `series` | Video series/projects | Yes |
| `episodes` | Episodes within series | Yes |
| `videos` | Individual video records | Yes |
| `video_segments` | Auto-generated segments | Yes |
| `segment_groups` | Batch generation groups | Yes |
| `series_characters` | Character definitions | Yes |
| `series_relationships` | Character relationships | Yes |
| `series_settings` | Location/setting definitions | Yes |
| `visual_assets` | Uploaded visual references | Yes |
| `sora_settings` | Sora generation preferences | Yes |
| `user_api_keys` | Encrypted API keys | Yes |
| `payment_history` | Stripe payment records | Yes |
| `terms_acceptance` | Legal consent records | Yes |
| `video_shares` | Public share tokens | Yes |

### Key Relationships

```
series
├── episodes (1:many)
│   └── video_segments (1:many)
│       └── videos (1:1)
├── series_characters (1:many)
│   └── visual_cues (embedded JSON)
├── series_relationships (1:many)
├── series_settings (1:many)
├── visual_assets (1:many)
└── sora_settings (1:1)

profiles
├── series (1:many via user_id)
├── user_api_keys (1:many)
└── payment_history (1:many)
```

---

## AI Agent System

### Agent Roles

| Agent | Expertise | Focus |
|-------|-----------|-------|
| **Director** | Creative vision | Storytelling, narrative arc, emotional beats |
| **Cinematographer** | Visual composition | Camera work, framing, movement |
| **Editor** | Pacing & flow | Transitions, rhythm, continuity |
| **Colorist** | Color grading | Mood, atmosphere, color palette |
| **VFX Supervisor** | Visual effects | Enhancement, style, technical quality |

### Roundtable Flow

```
User Input (Brief)
     │
     ▼
┌────────────────────────────────────────┐
│ Context Building                        │
│ - Series settings                       │
│ - Character descriptions                │
│ - Visual assets                         │
│ - Sora generation preferences           │
│ - Previous segment visual state         │
└────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ Agent Orchestration                     │
│ Basic: Parallel execution               │
│ Advanced: Sequential with synthesis     │
└────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ Synthesis & Optimization                │
│ - Combine agent insights                │
│ - Apply Sora prompt best practices      │
│ - Generate shot list                    │
└────────────────────────────────────────┘
     │
     ▼
Optimized Sora Prompt + Shot List
```

---

## Key Features

### 1. Series-First Architecture
- Organize content into series with characters, settings, relationships
- Maintain visual and narrative consistency across episodes
- AI-powered concept generation from natural language

### 2. Multi-Segment Video Generation
- Automatic episode segmentation (8-12 second segments)
- Visual continuity propagation between segments
- Batch generation with anchor point refresh
- Continuity validation and auto-correction

### 3. AI Agent Roundtable
- Multi-agent collaboration for prompt optimization
- Streaming responses for real-time feedback
- Basic and Advanced modes
- Context-aware with series/character data

### 4. Screenplay Integration
- Interactive screenplay chat
- Scene-to-prompt conversion
- Structured screenplay parsing

### 5. Stripe Monetization
- Free tier with usage limits
- Premium subscription ($29/month)
- Usage tracking and enforcement
- Customer portal integration

---

## Scripts & Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production
npm run lint             # ESLint

# Testing
npm run test             # Jest watch mode
npm run test:ci          # CI with coverage
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright E2E
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:debug   # Debug E2E
```

---

## Environment Variables

### Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Stripe (Production)

```bash
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_ANNUAL=price_...
```

---

## File Naming Conventions

| Pattern | Usage |
|---------|-------|
| `page.tsx` | Next.js page component |
| `route.ts` | API route handler |
| `layout.tsx` | Layout wrapper |
| `*-client.tsx` | Client component ("use client") |
| `*-dialog.tsx` | Modal dialog component |
| `*-form.tsx` | Form component |
| `*.types.ts` | TypeScript type definitions |
| `use-*.ts` | React hook |
| `index.ts` | Barrel export file |

---

## Test Structure

```
__tests__/
├── unit/                # Unit tests
├── components/          # Component tests
└── integration/         # Integration tests

e2e/                     # Playwright E2E tests
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `ARCHITECTURE.md` | System architecture |
| `PRD.md` | Product requirements |
| `SETUP.md` | Setup instructions |
| `TESTING.md` | Testing strategy |
| `IMPLEMENTATION_WORKFLOW.md` | Dev workflow |
| `PROJECT_STATUS.md` | Current status |
| `ROADMAP-PHASE-4.md` | Future plans |

---

## Memory References (Serena)

| Memory | Content |
|--------|---------|
| `project_architecture_segments` | Multi-segment architecture details |
| `session_2025-01-03_stripe_monetization_complete` | Stripe implementation |
| `project_database_schema_series_table` | Database schema |
| `project_patterns_oauth_subscription` | Auth patterns |
| `phase2_implementation_complete` | Phase 2 summary |
| `phase3_implementation_plan` | Phase 3 planning |

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd sora-video-generator
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Start development
npm run dev

# 4. Run tests
npm run test
```

---

**Last Updated:** 2026-01-04
**Generated by:** Claude Code with Serena MCP
