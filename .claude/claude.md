# Sora Video Generator - Claude Development Configuration

**Project Type**: Next.js 15 + React 19 AI Video Production Application
**Stack**: TypeScript, Supabase, OpenAI, TanStack Query, shadcn/ui
**Context**: AI-powered video prompt generation with multi-agent roundtable system

---

## Project Overview

This is an AI-powered video production application that helps users generate optimized prompts for Sora video generation. The application features a multi-agent roundtable system that collaborates to produce professional video prompts, shot lists, and creative guidance.

### Core Capabilities
- **Project Management**: Organize video projects with series and episodes
- **AI Agent Roundtable**: Multi-agent collaboration for prompt generation
- **Shot List Builder**: Detailed shot-by-shot planning with AI assistance
- **Prompt Optimization**: Structured prompt refinement with advanced modes
- **Authentication**: Supabase-based auth with protected routes
- **Testing**: Comprehensive Jest + Playwright test suite

---

## Tech Stack Context

### Framework & Libraries
```yaml
frontend:
  framework: "Next.js 15 (App Router)"
  react: "React 19"
  language: "TypeScript 5.9"
  state: "TanStack Query 5 + React Context"
  ui: "shadcn/ui + Tailwind CSS 3"
  forms: "react-hook-form + zod"

backend:
  database: "Supabase (PostgreSQL)"
  auth: "Supabase Auth (@supabase/ssr)"
  ai: "OpenAI GPT-4"
  deployment: "Vercel"

testing:
  unit: "Jest 29 + React Testing Library"
  e2e: "Playwright"
  coverage: "Jest coverage reporting"
```

### Project Structure
```
app/                    # Next.js 15 App Router
├── (auth)/            # Authentication pages (login, signup)
├── dashboard/         # Protected dashboard routes
│   ├── projects/      # Project management
│   │   └── [id]/      # Dynamic project routes
│   │       └── videos/[videoId]/  # Video editor
│   └── settings/      # User settings
├── api/               # API routes
│   ├── auth/          # Auth endpoints
│   ├── projects/      # Project CRUD
│   ├── videos/        # Video CRUD
│   └── agent/         # AI agent endpoints
│       └── roundtable/  # Multi-agent collaboration
└── layout.tsx         # Root layout

components/            # React components
├── ui/               # shadcn/ui primitives
├── dashboard/        # Dashboard-specific components
├── projects/         # Project components
├── agents/           # Agent UI components
└── videos/           # Video editing components

lib/                  # Utilities and services
├── supabase/        # Supabase client config
├── openai/          # OpenAI integration
└── utils.ts         # Helper functions

__tests__/           # Jest unit tests
e2e/                 # Playwright E2E tests
```

---

## Development Guidelines

### Code Quality Standards
- **TypeScript Strict Mode**: All code must be fully typed
- **Component Patterns**: Use functional components with hooks
- **Error Handling**: Comprehensive try-catch with user-friendly messages
- **Loading States**: Always show loading/skeleton states for async operations
- **Form Validation**: Use zod schemas with react-hook-form
- **API Routes**: RESTful design with proper error responses

### UI/UX Conventions
- **Design System**: Use shadcn/ui components exclusively
- **Responsive**: Mobile-first design approach
- **Accessibility**: WCAG 2.1 AA compliance
- **Loading Indicators**: Skeleton loaders for better perceived performance
- **Error States**: Clear error messages with recovery actions
- **Empty States**: Helpful empty states with CTAs

### State Management Patterns
```typescript
// Server state: TanStack Query
const { data, isLoading, error } = useQuery({
  queryKey: ['projects', userId],
  queryFn: fetchProjects
})

// Client state: React Context for global UI state
// Local state: useState for component-specific state
```

### API Route Pattern
```typescript
// app/api/*/route.ts
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Business logic here

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## Testing Strategy

### Test Coverage Requirements
- **Unit Tests**: All utility functions, hooks, and complex logic
- **Component Tests**: User interactions and conditional rendering
- **Integration Tests**: API routes and database operations
- **E2E Tests**: Critical user flows (auth, project creation, video editing)

### Running Tests
```bash
npm run test              # Watch mode for development
npm run test:ci           # CI mode with coverage
npm run test:coverage     # Generate coverage report
npm run test:e2e          # Playwright E2E tests
npm run test:e2e:ui       # Playwright UI mode
```

### Test Organization
- Unit tests: `__tests__/unit/`
- Component tests: `__tests__/components/`
- Integration tests: `__tests__/integration/`
- E2E tests: `e2e/`

---

## AI Agent System Context

### Roundtable Architecture
The application uses a multi-agent system where specialized AI agents collaborate:

```typescript
agents: {
  director: "Creative vision and storytelling",
  cinematographer: "Visual composition and camera work",
  editor: "Pacing, transitions, and flow",
  colorist: "Color grading and mood",
  vfx: "Visual effects and enhancement"
}
```

### Agent Communication Pattern
1. User provides video concept
2. Agents analyze in parallel (basic mode) or sequentially (advanced mode)
3. Each agent contributes domain expertise
4. System synthesizes into optimized Sora prompt
5. Generate shot list with detailed specifications

---

## Database Schema (Supabase)

### Core Tables
```sql
users                # Managed by Supabase Auth
projects            # Video projects
├── id (uuid)
├── user_id (uuid)
├── name (text)
├── description (text)
└── created_at (timestamp)

videos              # Individual videos in projects
├── id (uuid)
├── project_id (uuid)
├── title (text)
├── final_prompt (text)
├── shot_list (jsonb)
└── metadata (jsonb)

series              # Series organization (future)
episodes            # Episode tracking (future)
```

### Row Level Security (RLS)
All tables have RLS policies ensuring users can only access their own data.

---

## Common Development Tasks

### Adding New Features
1. **Plan with TodoWrite**: Break down into 3+ actionable tasks
2. **Update Types**: Add TypeScript interfaces in relevant files
3. **Create Components**: Use shadcn/ui primitives
4. **Add API Route**: Follow RESTful conventions
5. **Write Tests**: Unit + integration tests
6. **Update Documentation**: Keep ARCHITECTURE.md current

### Working with Supabase
```typescript
// Server Components (App Router)
import { createServerSupabaseClient } from '@/lib/supabase/server'

const supabase = createServerSupabaseClient()
const { data } = await supabase.from('projects').select('*')

// Client Components
import { createClientSupabaseClient } from '@/lib/supabase/client'

const supabase = createClientSupabaseClient()
const { data } = await supabase.from('projects').select('*')
```

### OpenAI Integration
```typescript
// lib/openai/client.ts
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Agent roundtable calls
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: agentMessages,
  temperature: 0.7
})
```

---

## Environment Variables

Required in `.env.local`:
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

---

## Development Workflow

### Session Start Pattern
```bash
# 1. Check git status
git status && git branch

# 2. Pull latest changes
git pull origin main

# 3. Install dependencies if needed
npm install

# 4. Start dev server
npm run dev

# 5. Run tests in watch mode (separate terminal)
npm run test
```

### Feature Development Pattern
```bash
# 1. Create feature branch
git checkout -b feature/descriptive-name

# 2. Develop with tests
# - Write failing test
# - Implement feature
# - Verify test passes
# - Refactor if needed

# 3. Run full test suite
npm run test:ci

# 4. Commit with descriptive message
git add .
git commit -m "feat: add video series organization"

# 5. Push and create PR
git push origin feature/descriptive-name
```

### Bug Fix Pattern
```bash
# 1. Create bug branch
git checkout -b fix/issue-description

# 2. Reproduce with test
# - Write test that exposes bug
# - Verify test fails
# - Fix the bug
# - Verify test passes

# 3. Commit and push
git commit -m "fix: resolve video prompt generation error"
git push origin fix/issue-description
```

---

## Performance Optimization

### Code Splitting
- Use dynamic imports for heavy components
- Lazy load agent roundtable interface
- Split OpenAI integration into separate chunks

### Data Fetching
- Implement TanStack Query caching strategies
- Use Supabase realtime subscriptions for live updates
- Prefetch project data on dashboard load

### Image & Asset Optimization
- Use Next.js Image component for all images
- Implement proper loading states
- Lazy load below-fold content

---

## Security Considerations

### Authentication
- All dashboard routes protected by middleware
- Session validation on every request
- Secure httpOnly cookies for session management

### API Security
- Validate user authentication in all API routes
- Implement rate limiting for AI endpoints
- Sanitize all user inputs
- Use prepared statements for database queries

### Data Privacy
- RLS policies on all Supabase tables
- No sensitive data in client-side code
- Encrypt API keys and secrets

---

## Debugging Helpers

### Common Issues & Solutions

**Issue**: Supabase client errors in Server Components
```typescript
// ✅ Correct: Use server client
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ❌ Wrong: Don't use client in server components
import { createClientSupabaseClient } from '@/lib/supabase/client'
```

**Issue**: TypeScript errors with Next.js types
```bash
# Clear Next.js cache and rebuild types
rm -rf .next
npm run dev
```

**Issue**: Test failures after component changes
```bash
# Update snapshots if UI changed intentionally
npm run test -- -u

# Check coverage for missed test cases
npm run test:coverage
```

---

## Key Files Reference

### Configuration
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS setup
- `tsconfig.json` - TypeScript config
- `jest.config.ts` - Jest testing config
- `playwright.config.ts` - E2E testing config

### Core Application
- `middleware.ts` - Auth & route protection
- `app/layout.tsx` - Root layout with providers
- `lib/supabase/middleware.ts` - Supabase session handling
- `lib/openai/agents.ts` - Agent definitions and logic

### Documentation
- `PRD.md` - Product requirements
- `ARCHITECTURE.md` - System architecture
- `TESTING.md` - Testing strategy
- `SETUP.md` - Initial setup guide
- `IMPLEMENTATION_WORKFLOW.md` - Development workflow

---

## Claude Development Preferences

### When Adding Features
1. ✅ **Always use TodoWrite** for multi-step tasks (>3 steps)
2. ✅ **Follow existing patterns** - Check similar components first
3. ✅ **Write tests first** when fixing bugs or adding critical features
4. ✅ **Use TypeScript strictly** - No `any` types
5. ✅ **Leverage shadcn/ui** - Don't create custom UI primitives

### When Refactoring
1. ✅ **Maintain test coverage** - Update tests alongside code
2. ✅ **Keep commits atomic** - One logical change per commit
3. ✅ **Document breaking changes** - Update relevant docs
4. ✅ **Check bundle size** - Monitor for performance regressions

### When Debugging
1. ✅ **Reproduce with test** - Write failing test first
2. ✅ **Check git history** - Review recent changes for context
3. ✅ **Use TypeScript errors** - Follow type errors to root cause
4. ✅ **Verify in dev mode** - Test both dev and production builds

### Tool Preferences
- **File Operations**: Use Read before Edit, use MultiEdit for batch changes
- **Search**: Use Grep tool for code search, Glob for file patterns
- **AI Tasks**: Leverage agent roundtable API for complex prompt generation
- **Testing**: Run tests after changes, maintain >80% coverage

---

## Quick Commands Reference

```bash
# Development
npm run dev                    # Start dev server (http://localhost:3000)
npm run build                  # Production build
npm run start                  # Start production server
npm run lint                   # Run ESLint

# Testing
npm run test                   # Jest watch mode
npm run test:ci                # CI mode with coverage
npm run test:coverage          # Generate coverage report
npm run test:e2e               # Run Playwright E2E tests
npm run test:e2e:ui            # Playwright UI mode
npm run test:e2e:debug         # Debug E2E tests

# Database
npx supabase start             # Start local Supabase
npx supabase db push           # Push migrations
npx supabase db reset          # Reset local DB

# Git
git status                     # Check working tree status
git log --oneline -10          # Recent commits
git diff                       # View unstaged changes
```

---

## Project Status & Roadmap

### Current Status
- ✅ Core authentication system
- ✅ Project management CRUD
- ✅ Video creation and editing
- ✅ Basic AI agent roundtable
- ✅ Shot list builder
- ✅ Comprehensive test suite
- 🔄 Advanced agent collaboration modes
- 📋 Series and episode organization (planned)
- 📋 Video generation integration (planned)

### Immediate Priorities
1. Enhance agent roundtable with advanced mode
2. Improve shot list AI generation quality
3. Add video template system
4. Implement user settings and preferences

### Future Enhancements
- Real-time collaboration features
- Video generation API integration
- Advanced prompt library system
- Team workspaces and sharing
- Analytics and usage tracking

---

## Support & Resources

### Documentation
- Next.js 15: https://nextjs.org/docs
- React 19: https://react.dev
- Supabase: https://supabase.com/docs
- shadcn/ui: https://ui.shadcn.com
- TanStack Query: https://tanstack.com/query/latest

### Project Docs
- Architecture decisions: `ARCHITECTURE.md`
- Testing guide: `TESTING.md`
- Setup instructions: `SETUP.md`
- Implementation workflow: `IMPLEMENTATION_WORKFLOW.md`

---

## Notes for Claude

### Context Preservation
- This is an active development project with frequent iterations
- Maintain awareness of test suite status - tests must pass before features are complete
- Follow the established patterns in existing components
- Keep documentation updated as features are added

### Quality Gates
- TypeScript must compile with no errors
- Tests must pass (`npm run test:ci`)
- ESLint must pass (`npm run lint`)
- Coverage should remain above 80%
- E2E tests for critical flows must pass

### Communication Style
- Be concise and technical - no marketing language
- Focus on implementation details and trade-offs
- Ask clarifying questions when requirements are ambiguous
- Suggest improvements backed by evidence or best practices

---

**Last Updated**: 2025-10-19
**Version**: 1.0
**Maintained By**: Development team via Claude Code
