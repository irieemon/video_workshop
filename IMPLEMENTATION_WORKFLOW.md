# Sora2 Prompt Studio - Implementation Workflow

**Version:** 1.0
**Last Updated:** October 17, 2025
**Status:** Ready for Execution

---

## Table of Contents
1. [Workflow Overview](#workflow-overview)
2. [Phase 1: Authentication System](#phase-1-authentication-system)
3. [Phase 2: Dashboard & Project Management](#phase-2-dashboard--project-management)
4. [Phase 3: Video Creation & Agent Interface](#phase-3-video-creation--agent-interface)
5. [Phase 4: Series Management](#phase-4-series-management)
6. [Phase 5: Performance Tracking & Analytics](#phase-5-performance-tracking--analytics)
7. [Phase 6: Polish & Optimization](#phase-6-polish--optimization)
8. [Critical Path Analysis](#critical-path-analysis)
9. [Quality Gates & Validation](#quality-gates--validation)
10. [Risk Mitigation Strategies](#risk-mitigation-strategies)

---

## Workflow Overview

### Implementation Strategy: Systematic Incremental Development

**Approach:** Build feature-complete vertical slices that deliver user value at each phase.

**Key Principles:**
- Each phase is independently testable and deployable
- Backend + Frontend + UI completed together per feature
- Quality gates before proceeding to next phase
- Parallel workstreams where dependencies allow
- Continuous deployment with feature flags

### Timeline Estimate

| Phase | Duration | Dependencies | Deliverable |
|-------|----------|-------------|-------------|
| Phase 1: Authentication | 3-4 days | Foundation complete | Working auth flow |
| Phase 2: Dashboard | 4-5 days | Phase 1 | Project CRUD operations |
| Phase 3: Video Creation | 6-7 days | Phase 2 | Agent roundtable MVP |
| Phase 4: Series Management | 3-4 days | Phase 2 | Series templates |
| Phase 5: Performance Tracking | 3-4 days | Phase 3 | Manual metrics input |
| Phase 6: Polish & Optimization | 4-5 days | All phases | Production-ready MVP |
| **Total Estimate** | **23-29 days** | - | **Full MVP** |

### Current Status
- ✅ Foundation Complete (Next.js, Supabase, AI agents, database schema)
- 🎯 **Next Phase:** Phase 1 - Authentication System
- 📍 **Critical Path:** Authentication → Dashboard → Video Creation

---

## Phase 1: Authentication System

**Duration:** 3-4 days
**Dependencies:** Foundation complete (✅)
**Goal:** Users can sign up, login, and access protected routes

### Task Breakdown

#### Day 1: Component Setup & Login Flow

**Task 1.1: Install shadcn UI Components** (30 min)
```bash
npx shadcn@latest add button
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
```

**Acceptance Criteria:**
- [ ] All components installed in `components/ui/`
- [ ] Custom theme applied (sage colors)
- [ ] TypeScript types working

---

**Task 1.2: Create Login Page** (2-3 hours)

**File:** `app/(auth)/login/page.tsx`

**Implementation:**
```typescript
// Route group (auth) for auth pages without dashboard layout
// Components: LoginForm with email/password fields
// Supabase auth: signInWithPassword
// Error handling: Display auth errors
// Loading states: Button disabled during submission
// Redirect: Navigate to /dashboard on success
```

**Acceptance Criteria:**
- [ ] Login form with email + password inputs
- [ ] Form validation (email format, password min length)
- [ ] Error messages displayed inline
- [ ] Loading spinner during authentication
- [ ] Redirects to dashboard on successful login
- [ ] Responsive design (mobile + desktop)

**API Integration:**
```typescript
const supabase = createClient()
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})
```

---

**Task 1.3: Create OAuth Callback Handler** (1 hour)

**File:** `app/api/auth/callback/route.ts`

**Implementation:**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

**Acceptance Criteria:**
- [ ] OAuth callback handler created
- [ ] Code exchange working
- [ ] Redirects to dashboard
- [ ] Error handling for invalid codes

---

#### Day 2: Signup Flow & OAuth

**Task 1.4: Create Signup Page** (2-3 hours)

**File:** `app/(auth)/signup/page.tsx`

**Implementation:**
```typescript
// SignupForm with email, password, full name
// Password confirmation field
// Terms of service checkbox
// Supabase auth: signUp with email confirmation
// Create profile record (trigger handles this)
// Success state: Email verification message
```

**Acceptance Criteria:**
- [ ] Signup form with all required fields
- [ ] Password strength indicator
- [ ] Password confirmation matching
- [ ] Terms acceptance required
- [ ] Email verification message shown
- [ ] Profile auto-created via trigger
- [ ] Link to login page

---

**Task 1.5: OAuth Provider Setup** (2 hours)

**Implementation:**
- Configure Google OAuth in Supabase dashboard
- Configure GitHub OAuth in Supabase dashboard
- Add OAuth buttons to login/signup pages
- Test OAuth flow end-to-end

**Acceptance Criteria:**
- [ ] Google OAuth button functional
- [ ] GitHub OAuth button functional
- [ ] OAuth redirects working
- [ ] Profile created on first OAuth login
- [ ] User can sign in with OAuth repeatedly

---

#### Day 3: Protected Routes & Password Reset

**Task 1.6: Update Middleware for Route Protection** (1 hour)

**File:** `middleware.ts`

**Implementation:**
```typescript
import { createClient } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from auth pages
  if ((request.nextUrl.pathname === '/login' ||
       request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
}
```

**Acceptance Criteria:**
- [ ] Unauthenticated users redirected to /login
- [ ] Authenticated users can access dashboard
- [ ] Login/signup redirect to dashboard if already logged in
- [ ] Session refresh handled automatically

---

**Task 1.7: Password Reset Flow** (2 hours)

**Files:**
- `app/(auth)/forgot-password/page.tsx`
- `app/(auth)/reset-password/page.tsx`

**Implementation:**
```typescript
// Forgot password: Email input → send reset link
// Reset password: New password form (from email link)
// Supabase auth: resetPasswordForEmail, updateUser
```

**Acceptance Criteria:**
- [ ] Forgot password page with email input
- [ ] Reset email sent confirmation
- [ ] Reset password page with new password input
- [ ] Password successfully updated
- [ ] User redirected to login after reset

---

**Task 1.8: Sign Out Functionality** (30 min)

**File:** `app/api/auth/signout/route.ts`

**Implementation:**
```typescript
export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url))
}
```

**Acceptance Criteria:**
- [ ] Sign out API route working
- [ ] Session cleared
- [ ] Redirects to login
- [ ] Can't access dashboard after signout

---

#### Day 4: Profile Management & Testing

**Task 1.9: User Profile Page** (2-3 hours)

**File:** `app/dashboard/settings/page.tsx`

**Implementation:**
```typescript
// Display user profile information
// Edit full name, avatar
// Display subscription tier and usage quota
// Update profile via Supabase
```

**Acceptance Criteria:**
- [ ] Profile page displays user info
- [ ] Can edit full name
- [ ] Avatar upload/change (optional for MVP)
- [ ] Subscription tier displayed
- [ ] Usage quota displayed
- [ ] Changes saved to database

---

**Task 1.10: End-to-End Auth Testing** (1-2 hours)

**Test Cases:**
1. Sign up with email → verify email → login
2. Login with email/password
3. Login with Google OAuth
4. Login with GitHub OAuth
5. Access protected route without auth (should redirect)
6. Password reset flow
7. Sign out and verify session cleared
8. Profile update

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] No console errors
- [ ] Error handling works correctly
- [ ] Loading states display properly
- [ ] Responsive on mobile and desktop

---

### Phase 1 Quality Gate

**Before proceeding to Phase 2, verify:**
- ✅ Users can sign up with email
- ✅ Users can login with email/password
- ✅ OAuth providers working (Google, GitHub)
- ✅ Protected routes redirect unauthenticated users
- ✅ Password reset flow functional
- ✅ User profile page working
- ✅ No TypeScript errors
- ✅ Mobile responsive
- ✅ Error handling comprehensive

---

## Phase 2: Dashboard & Project Management

**Duration:** 4-5 days
**Dependencies:** Phase 1 complete (authentication working)
**Goal:** Users can create, view, edit, and delete projects

### Task Breakdown

#### Day 1: Dashboard Layout & Navigation

**Task 2.1: Create Dashboard Layout** (2-3 hours)

**File:** `app/dashboard/layout.tsx`

**Implementation:**
```typescript
// Sidebar navigation component (fixed left)
// Main content area (fluid right)
// User menu dropdown (top right)
// Mobile hamburger menu
// Navigation links: Projects, Settings, Upgrade
```

**Components to Create:**
- `components/dashboard/sidebar.tsx`
- `components/dashboard/user-menu.tsx`
- `components/dashboard/mobile-nav.tsx`

**Acceptance Criteria:**
- [ ] Sidebar navigation displays correctly
- [ ] Active route highlighted
- [ ] User menu with name, avatar, sign out
- [ ] Mobile menu functional (< 768px)
- [ ] Responsive layout working
- [ ] Navigation links working

---

**Task 2.2: Install Additional shadcn Components** (30 min)

```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add skeleton
```

**Acceptance Criteria:**
- [ ] Components installed
- [ ] Custom styling applied
- [ ] TypeScript types working

---

#### Day 2: Projects API & Database Integration

**Task 2.3: Create Projects API Routes** (2-3 hours)

**Files:**
- `app/api/projects/route.ts` (GET list, POST create)
- `app/api/projects/[id]/route.ts` (GET detail, PUT update, DELETE)

**Implementation:**
```typescript
// GET /api/projects
// - Fetch user's projects with video counts
// - Order by updated_at desc
// - Include series count

// POST /api/projects
// - Validate input (name required)
// - Check free tier project limit (3 max)
// - Create project with user_id

// GET /api/projects/[id]
// - Fetch single project with videos and series
// - Verify ownership via RLS

// PUT /api/projects/[id]
// - Update name, description
// - Verify ownership

// DELETE /api/projects/[id]
// - Soft delete or hard delete (CASCADE in DB)
// - Verify ownership
```

**Acceptance Criteria:**
- [ ] All CRUD endpoints working
- [ ] Authentication verified on all routes
- [ ] RLS policies enforced
- [ ] Free tier limits checked
- [ ] Error handling comprehensive
- [ ] TypeScript types for request/response

---

#### Day 3: Projects List UI

**Task 2.4: Create Projects Dashboard Page** (3-4 hours)

**File:** `app/dashboard/page.tsx`

**Implementation:**
```typescript
// Fetch projects using TanStack Query
// Display in card grid (3 columns desktop)
// Empty state when no projects
// Loading skeleton cards
// "Create Project" button (prominent)
```

**Components to Create:**
- `components/projects/project-card.tsx`
- `components/projects/empty-state.tsx`
- `components/ui/loading-skeleton.tsx`

**Project Card Design:**
```typescript
interface ProjectCardProps {
  id: string
  name: string
  description?: string
  videoCount: number
  seriesCount: number
  updatedAt: Date
  thumbnails?: string[] // First 4 video thumbnails
}
```

**Acceptance Criteria:**
- [ ] Projects displayed in card grid
- [ ] Card shows name, description, counts, last updated
- [ ] Thumbnail mosaic (placeholder if no videos)
- [ ] Empty state shown when no projects
- [ ] Loading skeletons during fetch
- [ ] Click card navigates to project detail
- [ ] Responsive grid (3 col → 2 col → 1 col)

---

#### Day 4: Create & Edit Project Dialogs

**Task 2.5: Create Project Dialog** (2-3 hours)

**Component:** `components/projects/create-project-dialog.tsx`

**Implementation:**
```typescript
// Dialog with form (react-hook-form + zod)
// Fields: name (required), description (optional)
// Submit creates project via API
// Show error if limit reached (free tier)
// Close dialog on success
// Optimistic update or refetch
```

**Form Schema:**
```typescript
const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
})
```

**Acceptance Criteria:**
- [ ] Dialog opens from "Create Project" button
- [ ] Form validation working
- [ ] Error message if tier limit reached
- [ ] Success creates project in database
- [ ] Projects list updates after creation
- [ ] Loading state during submission
- [ ] Dialog closes on success

---

**Task 2.6: Edit & Delete Project** (2 hours)

**Components:**
- `components/projects/edit-project-dialog.tsx`
- `components/projects/delete-project-dialog.tsx`

**Implementation:**
```typescript
// Edit: Pre-populate form with existing data
// Delete: Confirmation dialog with warning
// Both: API calls with optimistic updates
```

**Acceptance Criteria:**
- [ ] Edit dialog pre-filled with current data
- [ ] Delete confirmation required
- [ ] Warning about cascade delete (videos, series)
- [ ] API calls successful
- [ ] UI updates after edit/delete
- [ ] Error handling for failures

---

#### Day 5: Project Detail Page

**Task 2.7: Create Project Detail Page** (3-4 hours)

**File:** `app/dashboard/projects/[id]/page.tsx`

**Implementation:**
```typescript
// Fetch project with videos and series
// Display project header (name, description, edit button)
// Tabs: Overview, Videos, Series, Analytics (future)
// Overview tab: Recent videos grid
// "New Video" button (prominent CTA)
```

**Components to Create:**
- `components/projects/project-header.tsx`
- `components/videos/video-card.tsx`

**Acceptance Criteria:**
- [ ] Project detail page loads correctly
- [ ] Header shows project info
- [ ] Edit/delete buttons in header
- [ ] Tabs navigation working
- [ ] Videos displayed in grid
- [ ] Empty state for no videos
- [ ] "New Video" button navigates correctly
- [ ] Breadcrumb navigation

---

### Phase 2 Quality Gate

**Before proceeding to Phase 3, verify:**
- ✅ Dashboard layout functional
- ✅ Projects API CRUD operations working
- ✅ Projects list displays correctly
- ✅ Create/edit/delete project functional
- ✅ Project detail page working
- ✅ Free tier limits enforced
- ✅ RLS policies protecting data
- ✅ Mobile responsive
- ✅ Loading states implemented
- ✅ Error handling comprehensive

---

## Phase 3: Video Creation & Agent Interface

**Duration:** 6-7 days
**Dependencies:** Phase 2 complete (projects working)
**Goal:** Users can generate video prompts via AI agent roundtable

### Task Breakdown

#### Day 1-2: Video Creation Form & API Integration

**Task 3.1: Create Video Creation Page** (3-4 hours)

**File:** `app/dashboard/projects/[id]/videos/new/page.tsx`

**Implementation:**
```typescript
// Two-column layout (desktop)
// Left: Brief input form
// Right: Agent roundtable display
// Platform selector (TikTok/Instagram)
// Series selector (optional, if project has series)
// "Start Roundtable" button
// Loading state during agent processing
```

**Components to Create:**
- `components/videos/brief-input-form.tsx`
- `components/videos/platform-selector.tsx`

**Acceptance Criteria:**
- [ ] Video creation page loads
- [ ] Brief textarea (multi-line, expandable)
- [ ] Platform radio buttons or select
- [ ] Series dropdown (only if series exist)
- [ ] Form validation (brief required, min 10 chars)
- [ ] Submit button disabled until valid
- [ ] Breadcrumb navigation

---

**Task 3.2: Connect to Agent Roundtable API** (2 hours)

**Implementation:**
```typescript
// POST to /api/agent/roundtable
// Body: { brief, platform, projectId, seriesId? }
// Handle loading state (5-8 seconds)
// Handle errors (quota exceeded, API failure)
// Display results when complete
```

**API Response Type:**
```typescript
interface RoundtableResult {
  discussion: {
    round1: AgentResponse[]
    round2: AgentResponse[]
  }
  detailedBreakdown: DetailedBreakdown
  optimizedPrompt: string
  characterCount: number
  hashtags: string[]
}
```

**Acceptance Criteria:**
- [ ] API call triggered on form submit
- [ ] Loading state shows progress
- [ ] Quota exceeded error handled gracefully
- [ ] API errors displayed to user
- [ ] Results displayed when ready
- [ ] TypeScript types for all data

---

#### Day 3-4: Agent Roundtable UI

**Task 3.3: Create Agent Card Components** (4-5 hours)

**Component:** `components/agents/agent-card.tsx`

**Implementation:**
```typescript
interface AgentCardProps {
  agent: AgentName
  response: string
  isChallenge?: boolean
  respondingTo?: AgentName
  buildingOn?: AgentName[]
}

// Visual elements:
// - Agent color-coded border (left 4px)
// - Agent avatar/icon with color background
// - Agent name header (uppercase, bold)
// - Response text (conversational style)
// - "Challenges..." badge (if challenge)
// - "Responding to..." badge (if response)
// - "Building on..." text (if synthesis)
```

**Agent Color Mapping:**
```typescript
const agentColors = {
  director: 'border-navy-500',
  photography_director: 'border-sage-500',
  platform_expert: 'border-[#5A6D52]',
  social_media_marketer: 'border-terracotta-500',
  music_producer: 'border-[#8B7C6B]',
}
```

**Acceptance Criteria:**
- [ ] Agent cards render correctly
- [ ] Color coding matches agent
- [ ] Challenge/response indicators clear
- [ ] Threading lines between related responses
- [ ] Animations for sequential reveal
- [ ] Readable on mobile
- [ ] Copy individual agent response

---

**Task 3.4: Create Debate Visualization** (2-3 hours)

**Component:** `components/agents/debate-visualization.tsx`

**Implementation:**
```typescript
// Display Round 1 responses in grid
// Display Round 2 responses with visual threading
// Threading lines connect challenges to responses
// Color-coded lines matching agents
// Expand/collapse individual rounds
// Loading animation during generation
```

**Acceptance Criteria:**
- [ ] Round 1 displayed in 2-column grid
- [ ] Round 2 shows sequential flow
- [ ] Visual connections between related responses
- [ ] Expand/collapse functionality
- [ ] Smooth animations
- [ ] Loading skeletons for agent responses
- [ ] "Regenerate Discussion" button

---

#### Day 5: Prompt Output Display

**Task 3.5: Create Prompt Display Components** (3-4 hours)

**Components:**
- `components/videos/detailed-breakdown.tsx`
- `components/videos/optimized-prompt.tsx`
- `components/videos/character-counter.tsx`

**Implementation:**
```typescript
// Tab interface: "Detailed Breakdown" | "Sora2 Prompt"
// Detailed breakdown: Markdown-rendered sections
// Optimized prompt: Monospace text, copy button
// Character counter: Visual gauge + count
// Color: green (<400), yellow (400-480), red (>480)
```

**Detailed Breakdown Sections:**
- Scene Structure
- Visual Specifications
- Audio Direction
- Platform Optimization
- Recommended Hashtags

**Acceptance Criteria:**
- [ ] Tab navigation working
- [ ] Detailed breakdown renders markdown
- [ ] Sections clearly separated
- [ ] Optimized prompt in monospace font
- [ ] Character counter accurate
- [ ] Color-coded gauge
- [ ] Copy button copies to clipboard
- [ ] Copy success feedback (toast or checkmark)

---

**Task 3.6: Hashtag Display & Management** (1-2 hours)

**Component:** `components/videos/hashtag-list.tsx`

**Implementation:**
```typescript
// Display hashtags as pill badges
// Volume indicator (high/medium/niche)
// "Copy All" button
// Remove individual hashtags (edit mode)
// Add custom hashtags (optional)
```

**Acceptance Criteria:**
- [ ] Hashtags displayed as badges
- [ ] Volume category shown
- [ ] Copy all functional
- [ ] Individual removal working (optional)
- [ ] Custom hashtag addition (optional)

---

#### Day 6-7: Save Video & Complete Flow

**Task 3.7: Save Video Functionality** (2-3 hours)

**Implementation:**
```typescript
// "Save Video" button at bottom of results
// Save to database:
//   - user_brief, agent_discussion, detailed_breakdown
//   - optimized_prompt, character_count, hashtags
//   - platform, status: 'draft'
// Create hashtags records
// Create agent_contributions records
// Redirect to project detail page
// Show success toast
```

**API Endpoint:** `POST /api/videos`

**Acceptance Criteria:**
- [ ] Save button visible after results
- [ ] Saves all data to database
- [ ] Hashtags created as separate records
- [ ] Agent contributions tracked
- [ ] Redirects to project page
- [ ] Video appears in project videos list
- [ ] Success feedback shown

---

**Task 3.8: Video Detail Page** (2 hours)

**File:** `app/dashboard/videos/[id]/page.tsx`

**Implementation:**
```typescript
// Display saved video details
// Show agent discussion (read-only)
// Show prompts (detailed + optimized)
// Show hashtags
// Edit video title
// Regenerate prompt option
// Delete video option
```

**Acceptance Criteria:**
- [ ] Video detail page loads
- [ ] All saved data displayed
- [ ] Agent discussion readable
- [ ] Prompts copyable
- [ ] Edit/delete functional
- [ ] Breadcrumb navigation

---

**Task 3.9: End-to-End Video Creation Testing** (2 hours)

**Test Cases:**
1. Create video from project page
2. Enter brief and select platform
3. Generate agent roundtable
4. View discussion and debate
5. Review detailed breakdown
6. Copy optimized prompt
7. Save video
8. View video in project
9. Access video detail page
10. Edit video title
11. Delete video

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] No console errors
- [ ] Agent API quota checked
- [ ] Loading states smooth
- [ ] Error handling works
- [ ] Mobile responsive

---

### Phase 3 Quality Gate

**Before proceeding to Phase 4, verify:**
- ✅ Video creation form functional
- ✅ Agent roundtable API working
- ✅ Agent cards render correctly
- ✅ Debate visualization clear
- ✅ Prompt output displays properly
- ✅ Character counter accurate
- ✅ Hashtags displayed and copyable
- ✅ Save video functional
- ✅ Video detail page working
- ✅ Quota enforcement working
- ✅ Mobile responsive
- ✅ End-to-end flow tested

---

## Phase 4: Series Management

**Duration:** 3-4 days
**Dependencies:** Phase 2 complete (projects working)
**Goal:** Users can create series with visual templates

### Task Breakdown

#### Day 1-2: Series Creation & API

**Task 4.1: Create Series API Routes** (2 hours)

**Files:**
- `app/api/series/route.ts` (POST create)
- `app/api/series/[id]/route.ts` (GET, PUT, DELETE)

**Implementation:**
```typescript
// POST /api/series
// - Create series with visual_template JSON
// - Link to project
// - Verify project ownership

// GET /api/series/[id]
// - Fetch series with videos
// - Verify ownership via RLS

// PUT /api/series/[id]
// - Update name, description, visual_template
// - Verify ownership

// DELETE /api/series/[id]
// - Delete series (videos keep reference as NULL)
// - Verify ownership
```

**Acceptance Criteria:**
- [ ] All CRUD endpoints working
- [ ] Visual template JSON stored correctly
- [ ] RLS policies enforced
- [ ] TypeScript types defined

---

**Task 4.2: Create Series Dialog** (2-3 hours)

**Component:** `components/series/create-series-dialog.tsx`

**Implementation:**
```typescript
// Form fields:
// - Name (required)
// - Description
// - Visual template fields:
//   - Lighting (text input)
//   - Camera angles (multi-select or text)
//   - Color grading (text)
//   - Pacing (text)
//   - Aspect ratio (select: 9:16, 1:1, 4:5)
```

**Visual Template Schema:**
```typescript
interface VisualTemplate {
  lighting?: string
  camera_angles?: string[]
  color_grading?: string
  pacing?: string
  aspect_ratio?: '9:16' | '1:1' | '4:5'
}
```

**Acceptance Criteria:**
- [ ] Dialog opens from project page
- [ ] All template fields available
- [ ] Form validation working
- [ ] Creates series in database
- [ ] Template saved as JSON
- [ ] Series appears in project

---

#### Day 3: Series Detail Page

**Task 4.3: Create Series Detail Page** (3-4 hours)

**File:** `app/dashboard/series/[id]/page.tsx`

**Implementation:**
```typescript
// Series header (name, template indicator)
// Template details card (show all template fields)
// Videos timeline (horizontal scroll)
// "Add Video to Series" button
// Edit/delete series buttons
```

**Components to Create:**
- `components/series/series-header.tsx`
- `components/series/template-card.tsx`
- `components/series/video-timeline.tsx`

**Acceptance Criteria:**
- [ ] Series page loads correctly
- [ ] Template details displayed
- [ ] Videos shown in timeline
- [ ] Empty state for no videos
- [ ] Add video button functional
- [ ] Edit/delete working
- [ ] Breadcrumb navigation

---

**Task 4.4: Series Selector in Video Creation** (1-2 hours)

**Implementation:**
- Add series dropdown to video creation form
- If series selected, pre-populate template in agent context
- Visual indicator that template is enforced
- Option to override template (advanced)

**Acceptance Criteria:**
- [ ] Series dropdown populated with project series
- [ ] Selecting series passes seriesId to API
- [ ] Template applied in agent roundtable
- [ ] Visual indicator shown
- [ ] Override option available (optional)

---

#### Day 4: Series Management UI

**Task 4.5: Series Tab in Project Detail** (2 hours)

**Implementation:**
```typescript
// Add "Series" tab to project detail page
// Display all series for project
// Collapsible series cards
// Each card shows:
//   - Series name
//   - Video count
//   - Template summary
//   - Videos in timeline
```

**Acceptance Criteria:**
- [ ] Series tab functional
- [ ] All series displayed
- [ ] Cards collapsible
- [ ] Timeline shows videos
- [ ] Click video navigates to detail
- [ ] Empty state for no series

---

**Task 4.6: Series Testing** (1 hour)

**Test Cases:**
1. Create series with template
2. Add video to series
3. Verify template applied in agent roundtable
4. Edit series template
5. Remove video from series
6. Delete series
7. Verify videos remain (series_id set to NULL)

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] Template enforcement working
- [ ] Series CRUD functional
- [ ] No orphaned data

---

### Phase 4 Quality Gate

**Before proceeding to Phase 5, verify:**
- ✅ Series API CRUD working
- ✅ Create series functional
- ✅ Visual template stored correctly
- ✅ Series detail page working
- ✅ Video timeline displays
- ✅ Series selector in video creation
- ✅ Template applied to agent context
- ✅ Edit/delete series functional
- ✅ Mobile responsive

---

## Phase 5: Performance Tracking & Analytics

**Duration:** 3-4 days
**Dependencies:** Phase 3 complete (videos working)
**Goal:** Users can manually input performance metrics and view basic insights

### Task Breakdown

#### Day 1-2: Performance Input

**Task 5.1: Create Performance API Route** (1-2 hours)

**File:** `app/api/videos/[id]/performance/route.ts`

**Implementation:**
```typescript
// POST /api/videos/[id]/performance
// Body: {
//   platform, views, likes, comments, shares, saves,
//   watch_time_seconds?, completion_rate?, traffic_source?
// }
// Create performance record with timestamp
// Verify video ownership
```

**Acceptance Criteria:**
- [ ] API endpoint working
- [ ] Performance record created
- [ ] Timestamp recorded
- [ ] Ownership verified
- [ ] TypeScript types defined

---

**Task 5.2: Create Performance Input Form** (2-3 hours)

**Component:** `components/videos/performance-form.tsx`

**Implementation:**
```typescript
// Form fields:
// - Platform (select: TikTok, Instagram)
// - Views (number input)
// - Likes (number input)
// - Comments (number input)
// - Shares (number input)
// - Saves (number input)
// - Watch time (optional)
// - Completion rate (optional)
// - Traffic source (optional select)
```

**Acceptance Criteria:**
- [ ] Form renders correctly
- [ ] Number inputs validated (positive integers)
- [ ] Optional fields can be skipped
- [ ] Submits to API
- [ ] Success feedback shown
- [ ] Video card updates with performance badge

---

**Task 5.3: Add Performance to Video Detail** (1 hour)

**Implementation:**
- Add "Add Performance Data" button to video detail page
- Open dialog with performance form
- Display existing performance records (if any)
- Show latest performance metrics

**Acceptance Criteria:**
- [ ] Button visible on video page
- [ ] Dialog opens form
- [ ] Can submit performance data
- [ ] Existing data displayed
- [ ] Multiple records tracked over time

---

#### Day 3: Performance Display

**Task 5.4: Create Performance Badge Component** (1-2 hours)

**Component:** `components/videos/performance-badge.tsx`

**Implementation:**
```typescript
// Calculate engagement rate: (likes + comments + shares) / views
// Categorize: High (>5%), Medium (2-5%), Low (<2%)
// Display badge with color: green (high), yellow (medium), red (low)
```

**Acceptance Criteria:**
- [ ] Badge calculation correct
- [ ] Colors match categories
- [ ] Displays on video cards
- [ ] Shows on video detail page

---

**Task 5.5: Create Metrics Display** (2 hours)

**Component:** `components/videos/performance-metrics.tsx`

**Implementation:**
```typescript
// Display key metrics in grid
// Views, likes, comments, shares, saves
// Engagement rate calculation
// Watch time and completion rate (if available)
// Traffic source indicator
// Sparkline chart (optional, if multiple records)
```

**Acceptance Criteria:**
- [ ] Metrics displayed clearly
- [ ] Engagement rate calculated
- [ ] All optional fields handled
- [ ] Sparkline shows trend (optional)

---

#### Day 4: Basic Insights

**Task 5.6: Create Insights API** (2-3 hours)

**File:** `app/api/analytics/insights/route.ts`

**Implementation:**
```typescript
// GET /api/analytics/insights
// Query user's videos with performance data
// Calculate correlations:
//   - Agent suggestions applied vs. performance
//   - Platform comparison (TikTok vs. Instagram)
//   - Hashtag performance
//   - Series vs. one-off performance
// Return top performers and patterns
```

**Basic Analytics:**
```typescript
interface Insights {
  topPerformers: Video[]
  patterns: {
    description: string
    impact: number // multiplier (e.g., 2.1x)
  }[]
  recommendations: string[]
}
```

**Acceptance Criteria:**
- [ ] API calculates basic insights
- [ ] Requires 3+ videos with performance
- [ ] Correlations calculated
- [ ] TypeScript types defined

---

**Task 5.7: Create Insights Display** (2 hours)

**Component:** `components/analytics/insights-card.tsx`

**Implementation:**
```typescript
// Display on project detail page or dashboard
// "Your Performance Patterns" section
// Top performers list
// Pattern insights with impact multipliers
// Recommendations for next video
// Only show if user has 3+ videos with data
```

**Acceptance Criteria:**
- [ ] Insights displayed when available
- [ ] Hidden if insufficient data
- [ ] Top performers shown
- [ ] Patterns clear and actionable
- [ ] Recommendations helpful

---

**Task 5.8: Performance Testing** (1 hour)

**Test Cases:**
1. Add performance data to video
2. View performance on video card
3. View performance badge
4. View detailed metrics
5. Add multiple performance records
6. View insights after 3+ videos
7. Verify correlations accurate

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] Calculations correct
- [ ] Insights helpful
- [ ] Mobile responsive

---

### Phase 5 Quality Gate

**Before proceeding to Phase 6, verify:**
- ✅ Performance API working
- ✅ Performance input form functional
- ✅ Performance displays on video cards
- ✅ Metrics display correctly
- ✅ Insights API calculates patterns
- ✅ Insights display when available
- ✅ Mobile responsive

---

## Phase 6: Polish & Optimization

**Duration:** 4-5 days
**Dependencies:** All previous phases complete
**Goal:** Production-ready MVP with polish, optimization, and testing

### Task Breakdown

#### Day 1: Freemium Tier Enforcement

**Task 6.1: Implement Usage Quota UI** (2-3 hours)

**Components:**
- `components/dashboard/quota-indicator.tsx`
- `components/dashboard/upgrade-prompt.tsx`

**Implementation:**
```typescript
// Quota indicator in sidebar
// Shows: X/Y consultations remaining this month
// Shows: X/3 projects (free tier)
// Color-coded: green (plenty), yellow (running low), red (limit)
// Upgrade prompt when limit reached
```

**Acceptance Criteria:**
- [ ] Quota indicator visible in sidebar
- [ ] Updates after each consultation
- [ ] Color-coded correctly
- [ ] Upgrade prompt shows at limit
- [ ] Links to upgrade page

---

**Task 6.2: Implement Upgrade Flow** (2 hours)

**File:** `app/dashboard/upgrade/page.tsx`

**Implementation:**
```typescript
// Tier comparison table
// Free vs. Premium features
// Pricing: $24/month
// Call-to-action button
// Link to payment (Stripe integration - Phase 2)
// For MVP: Show contact form or waitlist
```

**Acceptance Criteria:**
- [ ] Upgrade page displays
- [ ] Tier comparison clear
- [ ] CTA prominent
- [ ] Contact/waitlist form functional (MVP)

---

#### Day 2: Error Handling & Loading States

**Task 6.3: Comprehensive Error Handling** (2-3 hours)

**Implementation:**
- Add error boundaries for React errors
- Standardize error messages across API routes
- Add toast notifications for errors
- Handle quota exceeded gracefully
- Handle API failures with retry logic

**Components to Create:**
- `components/ui/error-boundary.tsx`
- `components/ui/toast.tsx` (or use shadcn toast)
- `components/ui/error-message.tsx`

**Acceptance Criteria:**
- [ ] Error boundaries catch React errors
- [ ] API errors display user-friendly messages
- [ ] Toast notifications functional
- [ ] Quota errors show upgrade prompt
- [ ] Retry logic for transient failures

---

**Task 6.4: Loading States & Skeletons** (2 hours)

**Implementation:**
- Add loading skeletons for all async operations
- Agent roundtable loading animation
- Project/video list loading states
- Button loading states
- Progress indicators for long operations

**Components:**
- `components/ui/loading-skeleton.tsx`
- `components/agents/roundtable-loading.tsx`

**Acceptance Criteria:**
- [ ] Skeletons match content layout
- [ ] Smooth transitions from loading to content
- [ ] No layout shift during loading
- [ ] Loading animations smooth

---

#### Day 3: Onboarding & Empty States

**Task 6.5: Create Onboarding Tutorial** (2-3 hours)

**Implementation:**
```typescript
// First-time user experience
// Step 1: Welcome message
// Step 2: Create first project
// Step 3: Generate first video prompt
// Step 4: Tour of dashboard features
// Dismissible tooltips
// Progress tracker
```

**Components:**
- `components/onboarding/welcome-dialog.tsx`
- `components/onboarding/tutorial-tooltip.tsx`

**Acceptance Criteria:**
- [ ] Onboarding starts for new users
- [ ] Steps guide through key features
- [ ] Can be dismissed
- [ ] Doesn't show again after completion

---

**Task 6.6: Improve Empty States** (1-2 hours)

**Implementation:**
- Add illustrations to empty states
- Clear calls-to-action
- Helpful guidance text
- Empty states for:
  - No projects
  - No videos in project
  - No series
  - No performance data

**Acceptance Criteria:**
- [ ] Empty states visually appealing
- [ ] CTAs clear and prominent
- [ ] Guidance helpful for new users

---

#### Day 4: Performance Optimization

**Task 6.7: Frontend Performance Optimization** (2-3 hours)

**Optimizations:**
- Code splitting for routes
- Lazy loading for heavy components
- Image optimization (next/image)
- Reduce bundle size
- Optimize TanStack Query caching

**Targets:**
- Bundle size < 500KB initial
- FCP < 1.5s
- LCP < 2.5s
- TTI < 3.5s

**Acceptance Criteria:**
- [ ] Lighthouse score 90+
- [ ] Performance targets met
- [ ] No console warnings
- [ ] Smooth animations

---

**Task 6.8: API Performance Optimization** (1-2 hours)

**Optimizations:**
- Database query optimization
- Add indexes where needed (already done in schema)
- Reduce API response sizes
- Implement response caching where appropriate
- Optimize agent roundtable (already parallelized)

**Targets:**
- API responses < 500ms (CRUD)
- Agent roundtable < 8s
- Database queries < 100ms

**Acceptance Criteria:**
- [ ] API response times measured
- [ ] Targets met for most operations
- [ ] No N+1 query issues
- [ ] Caching implemented where beneficial

---

#### Day 5: Testing & Bug Fixes

**Task 6.9: Comprehensive Testing** (3-4 hours)

**Test Checklist:**

**Functional Testing:**
- [ ] Auth flow (signup, login, OAuth, password reset)
- [ ] Project CRUD
- [ ] Video creation end-to-end
- [ ] Agent roundtable
- [ ] Series management
- [ ] Performance tracking
- [ ] Quota enforcement
- [ ] All navigation links

**Cross-Browser Testing:**
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Responsive Testing:**
- [ ] Desktop (1920px, 1440px, 1024px)
- [ ] Tablet (768px)
- [ ] Mobile (375px, 320px)

**Edge Cases:**
- [ ] Very long project names
- [ ] Empty data states
- [ ] Quota limits
- [ ] API failures
- [ ] Slow network
- [ ] Concurrent operations

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] No critical bugs
- [ ] Minor bugs documented
- [ ] Known issues tracked

---

**Task 6.10: Bug Fixes & Polish** (2-3 hours)

**Implementation:**
- Fix any bugs discovered in testing
- Polish animations and transitions
- Refine copy and messaging
- Adjust spacing and alignment
- Improve accessibility (ARIA labels, keyboard nav)

**Accessibility Checklist:**
- [ ] Keyboard navigation working
- [ ] Focus indicators visible
- [ ] ARIA labels on interactive elements
- [ ] Color contrast WCAG AA compliant
- [ ] Screen reader friendly

**Acceptance Criteria:**
- [ ] All P0/P1 bugs fixed
- [ ] Accessibility standards met
- [ ] Polish applied across app
- [ ] Ready for production

---

### Phase 6 Quality Gate (Final MVP Gate)

**Before launching MVP, verify:**
- ✅ All features functional
- ✅ Freemium tier enforced
- ✅ Error handling comprehensive
- ✅ Loading states implemented
- ✅ Onboarding tutorial working
- ✅ Empty states helpful
- ✅ Performance targets met
- ✅ Comprehensive testing complete
- ✅ Cross-browser compatible
- ✅ Mobile responsive
- ✅ Accessibility standards met
- ✅ No critical bugs
- ✅ Documentation complete

---

## Critical Path Analysis

### Critical Path Dependencies

```
Foundation (Complete)
    ↓
Phase 1: Authentication (3-4 days) ← CRITICAL
    ↓
Phase 2: Dashboard & Projects (4-5 days) ← CRITICAL
    ↓
Phase 3: Video Creation (6-7 days) ← CRITICAL (Longest)
    ↓
Phase 6: Polish & Optimization (4-5 days) ← CRITICAL

Phase 4: Series Management (3-4 days) ← Can run parallel with Phase 3 (after Day 2)
Phase 5: Performance Tracking (3-4 days) ← Can start after Phase 3 complete
```

### Parallel Workstreams

**Primary Track (Critical Path):**
1. Phase 1: Authentication → Phase 2: Dashboard → Phase 3: Video Creation → Phase 6: Polish

**Secondary Track (Can overlap):**
1. Phase 4: Series Management (depends on Phase 2, not Phase 3)
2. Phase 5: Performance Tracking (depends on Phase 3)

**Optimized Timeline:**
- Weeks 1-2: Phase 1 + Phase 2
- Weeks 2-3: Phase 3 (video creation) + Phase 4 (series - start Day 10)
- Week 4: Phase 5 (performance) + Phase 6 (polish)
- **Optimized Total: 20-25 days** (vs. 23-29 sequential)

### Bottleneck Analysis

**Primary Bottleneck:** Phase 3 (Video Creation & Agent Interface)
- Longest duration (6-7 days)
- Most complex UI components
- Critical for core value proposition

**Mitigation:**
- Break into smaller deliverables
- Parallel UI development (agent cards + prompt display)
- Early testing of agent API integration
- UI component library reuse

**Secondary Bottleneck:** Phase 6 (Polish & Optimization)
- Testing takes time
- Bug fixes unpredictable
- Cross-browser issues

**Mitigation:**
- Incremental testing during development
- Early performance monitoring
- Browser testing in parallel with feature development
- Bug tracking from Phase 1

---

## Quality Gates & Validation

### Quality Gate Criteria

#### Phase Gate Requirements
Each phase must meet these criteria before proceeding:

1. **Functional Completeness**
   - All planned features working
   - Happy path tested end-to-end
   - Edge cases handled

2. **Code Quality**
   - No TypeScript errors
   - No ESLint errors
   - Code reviewed (if team)
   - Tests passing (if implemented)

3. **User Experience**
   - Loading states implemented
   - Error handling comprehensive
   - Mobile responsive
   - Accessible (keyboard nav, ARIA)

4. **Performance**
   - Page load times acceptable
   - No blocking operations
   - Database queries optimized
   - API responses fast

5. **Security**
   - Authentication verified
   - Authorization enforced
   - RLS policies working
   - Input validation implemented

### Testing Strategy

#### Unit Testing (Optional for MVP)
```typescript
// Example test structure
describe('Agent Orchestrator', () => {
  it('should generate roundtable discussion', async () => {
    const result = await runAgentRoundtable({
      brief: 'Test video',
      platform: 'tiktok',
      userId: 'test-user-id',
    })
    expect(result.discussion.round1).toHaveLength(5)
    expect(result.optimizedPrompt).toBeTruthy()
  })
})
```

#### Integration Testing
- API endpoint testing with real Supabase
- Auth flow testing
- Database operations testing
- Agent API integration testing

#### E2E Testing (Critical User Flows)
1. **Signup → Create Project → Generate Video**
2. **Login → View Projects → Edit Project**
3. **Create Series → Generate Video in Series**
4. **Add Performance Data → View Insights**

#### Manual Testing Checklist
See Phase 6, Task 6.9 for comprehensive testing checklist.

### Performance Benchmarks

#### Frontend Performance Targets

| Metric | Target | Measurement Tool |
|--------|--------|------------------|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Time to Interactive (TTI) | < 3.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| Total Blocking Time (TBT) | < 300ms | Lighthouse |
| Lighthouse Score | 90+ | Lighthouse |

#### Backend Performance Targets

| Operation | Target | Measurement Method |
|-----------|--------|-------------------|
| API CRUD operations | < 500ms | Vercel Analytics |
| Agent roundtable (total) | < 8s | Custom timing |
| Agent Round 1 (parallel) | < 3s | OpenAI API metrics |
| Agent Round 2 (sequential) | < 2s | OpenAI API metrics |
| Synthesis (Round 3) | < 2s | OpenAI API metrics |
| Database queries | < 100ms | Supabase logs |

#### Cost Targets

| Resource | Cost per 1000 Users/Month | Notes |
|----------|---------------------------|-------|
| OpenAI API | $240 | 10 consultations/user, free tier |
| Supabase | $25-50 | Pro tier for production |
| Vercel | $20-100 | Pro tier, scales with traffic |
| **Total** | **$285-390** | Target: < $400/month |

**Revenue Target:**
- 5% conversion @ $24/month = 50 premium users
- Revenue: $1,200/month
- Gross Margin: 67-76%

---

## Risk Mitigation Strategies

### Technical Risks

#### Risk 1: OpenAI API Cost Overruns
**Probability:** Medium
**Impact:** High

**Mitigation:**
- Strict rate limiting on free tier (10 consultations/month)
- Monitor daily API costs via OpenAI dashboard
- Implement cost alerts (>$500/month)
- Cache agent responses for similar briefs (Phase 2)
- Use GPT-4o-mini for synthesis (cheaper)
- Consider fine-tuned models for cost reduction (future)

**Contingency:**
- Reduce free tier limits (5 consultations/month)
- Increase premium pricing ($29/month)
- Implement pay-per-use model for excessive usage

---

#### Risk 2: Agent Roundtable Performance Issues
**Probability:** Medium
**Impact:** Medium

**Mitigation:**
- Already implemented: Parallel Round 1 execution
- Already implemented: GPT-4o-mini for synthesis
- Implement timeout handling (30s max)
- Show progress indicators during generation
- Offer "Quick Mode" (skip Round 2 debate)

**Contingency:**
- Reduce agent count (4 instead of 5)
- Simplify Round 2 logic (reduce challenge probability)
- Implement background job processing (notify when done)

---

#### Risk 3: Supabase RLS Performance
**Probability:** Low
**Impact:** Medium

**Mitigation:**
- Database indexes on all foreign keys (already implemented)
- Monitor query performance via Supabase logs
- Optimize complex RLS policies if slow
- Use Supabase caching for hot queries

**Contingency:**
- Simplify RLS policies (trade security for speed)
- Implement application-level access control
- Upgrade Supabase tier (more compute)

---

### Product Risks

#### Risk 4: Low User Engagement with Agent Debate
**Probability:** Medium
**Impact:** Medium

**Mitigation:**
- Make debate collapsible (default collapsed for faster UX)
- Implement "Quick Mode" (skip debate, instant prompt)
- A/B test debate visibility (Phase 2)
- User testing during beta

**Contingency:**
- Make debate opt-in instead of default
- Focus on prompt quality over debate visualization
- Simplify debate UI (less visual complexity)

---

#### Risk 5: Prompt Quality Below Expectations
**Probability:** Medium
**Impact:** High

**Mitigation:**
- Iteratively improve agent system prompts
- User feedback mechanism (rate prompts)
- Track prompt regeneration rate (indicator of quality)
- Beta testing with target users
- Compare against manual prompts (quality benchmark)

**Contingency:**
- Add human review option (premium feature)
- Implement prompt editing/refinement UI
- Provide prompt templates as fallback
- Offer prompt consulting service (high-touch)

---

### Business Risks

#### Risk 6: Low Free-to-Premium Conversion
**Probability:** Medium
**Impact:** High

**Mitigation:**
- Optimize free tier limits (generous but limited)
- Strategic upgrade prompts (when hitting limits)
- Add premium-exclusive features (templates, analytics)
- 7-day premium trial (demonstrate value)
- Email nurture campaigns

**Contingency:**
- Adjust pricing ($19/month instead of $24)
- Change tier limits (reduce free tier)
- Add mid-tier pricing ($12/month, limited features)
- Implement annual pricing (20% discount)

---

#### Risk 7: High User Churn
**Probability:** Medium
**Impact:** High

**Mitigation:**
- Excellent onboarding (tutorial, guidance)
- Demonstrate value quickly (first prompt in < 5 min)
- Email engagement (weekly tips, case studies)
- Performance insights ("Your videos improved 40%")
- Community building (Discord, template sharing)

**Contingency:**
- User interviews (understand why churning)
- Feature development based on feedback
- Win-back campaigns (re-engage churned users)
- Improve core value proposition

---

#### Risk 8: Sora API Unavailability
**Probability:** High (currently)
**Impact:** Low (for MVP)

**Mitigation:**
- MVP focuses on prompt generation only
- Copy-paste workflow (no API dependency)
- Market as "Sora2-optimized prompt studio"
- Works with any AI video tool (Runway, Pika, etc.)

**Contingency:**
- Integrate with available APIs (Runway, Pika)
- Rebrand as "AI Video Prompt Studio" (platform-agnostic)
- Direct Sora integration when API available (Phase 3)

---

## Appendix

### Development Environment Setup

```bash
# Clone repository
git clone https://github.com/irieemon/video_workshop
cd video_workshop

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your keys

# Run Supabase migrations
# (Already complete - schema applied)

# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### Key Commands Reference

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

# shadcn Component Installation
npx shadcn@latest add [component-name]

# Database
# Apply schema: Run SQL in Supabase dashboard

# Deployment
git push origin main  # Auto-deploys to Vercel
```

### Resource Links

**Documentation:**
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- shadcn/ui: https://ui.shadcn.com
- OpenAI API: https://platform.openai.com/docs
- TanStack Query: https://tanstack.com/query/latest

**Design System:**
- Tailwind CSS: https://tailwindcss.com/docs
- Radix UI: https://www.radix-ui.com/primitives/docs
- Lucide Icons: https://lucide.dev

**Monitoring & Analytics:**
- Vercel Analytics: https://vercel.com/analytics
- Sentry: https://sentry.io/welcome/ (Phase 2)

---

## Conclusion

This implementation workflow provides a systematic, phase-based approach to building the Sora2 Prompt Studio MVP. Key success factors:

1. **Clear Dependencies:** Each phase builds on previous phases with minimal blocking
2. **Incremental Delivery:** Each phase delivers user-visible value
3. **Quality Gates:** Ensure quality before proceeding to next phase
4. **Parallel Workstreams:** Optimize timeline where possible
5. **Risk Mitigation:** Proactive strategies for known risks
6. **Measurable Targets:** Clear performance and quality benchmarks

**Next Action:** Begin Phase 1 - Authentication System

---

**Document Version:** 1.0
**Author:** Implementation Workflow Generator
**Last Updated:** October 17, 2025
**Status:** Ready for Execution
