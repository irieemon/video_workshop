# Sora2 Prompt Studio

AI-powered creative production platform for social media content creators. Generate optimized Sora2 video prompts through collaborative multi-agent film crew consultation.

## Features

- **Multi-Agent Film Crew System**: 5 specialized AI personas (Director, Photography Director, Platform Expert, Social Media Marketer, Music Producer) collaborate in debate-style discussions
- **Project & Series Management**: Organize videos with enforced visual template consistency
- **Dual-Format Prompt Output**: Detailed breakdown + character-optimized Sora2 prompt
- **Performance Tracking**: Manual input with AI-driven insights and learning
- **Hashtag Intelligence**: Context-aware recommendations for TikTok/Instagram
- **Freemium Model**: Free tier with upgrade path to premium features

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui (Radix UI primitives)
- **Backend**: Vercel serverless functions
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenAI GPT-5 for agent personas
- **State**: TanStack Query, React Hook Form, Zod

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key (with GPT-4o/GPT-5 access)
- Vercel account (for deployment)

## Getting Started

### 1. Clone and Install

\`\`\`bash
git clone <your-repo-url>
cd sora-video-generator
npm install
\`\`\`

### 2. Environment Variables

Create \`.env.local\` file in the root directory:

\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron (for usage reset)
CRON_SECRET=your-random-secret
\`\`\`

### 3. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of \`supabase-schema.sql\`
4. Paste and run the SQL in the editor
5. Verify tables were created in **Table Editor**

**Important**: The schema includes:
- All database tables (profiles, projects, series, videos, etc.)
- Row-Level Security (RLS) policies for data isolation
- Triggers for auto-creating user profiles on signup
- Function for incrementing consultation usage

### 4. Configure Supabase Auth

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. (Optional) Enable **Google OAuth** and **GitHub OAuth**
4. Set **Site URL**: \`http://localhost:3000\`
5. Add **Redirect URLs**:
   - \`http://localhost:3000/auth/callback\`
   - \`https://your-vercel-domain.vercel.app/auth/callback\`

### 5. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Verify Setup

- Homepage should load with "Sora2 Prompt Studio" title
- No console errors
- Supabase connection working (check Network tab for auth requests)

## Project Structure

\`\`\`
sora-video-generator/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes
│   │   └── agent/
│   │       └── roundtable/     # Agent consultation endpoint
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Homepage
├── components/                 # React components
│   └── ui/                     # shadcn/ui components
├── lib/                        # Core logic
│   ├── ai/                     # Agent system
│   │   ├── agent-prompts.ts    # Agent persona definitions
│   │   └── agent-orchestrator.ts # Roundtable orchestration
│   ├── supabase/               # Supabase clients
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── middleware.ts       # Auth middleware
│   ├── types/                  # TypeScript types
│   │   └── database.types.ts   # Database schema types
│   └── utils.ts                # Utility functions
├── supabase-schema.sql         # Database schema
├── middleware.ts               # Next.js middleware
├── tailwind.config.ts          # Tailwind configuration
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── PRD.md                      # Product requirements document
\`\`\`

## Development Workflow

### Creating New Components

Use shadcn/ui CLI to add components:

\`\`\`bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add tabs
npx shadcn@latest add accordion
\`\`\`

### Database Migrations

When updating the database schema:

1. Modify \`supabase-schema.sql\`
2. Run the updated SQL in Supabase SQL Editor
3. Update TypeScript types in \`lib/types/database.types.ts\`

### Testing Agent System

Test the agent roundtable API:

\`\`\`bash
curl -X POST http://localhost:3000/api/agent/roundtable \\
  -H "Content-Type: application/json" \\
  -d '{
    "brief": "Unboxing video for luxury skincare serum",
    "platform": "tiktok",
    "projectId": "your-project-uuid"
  }'
\`\`\`

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables (same as \`.env.local\`)
4. Deploy

### Post-Deployment

1. Update Supabase **Redirect URLs** with Vercel domain
2. Update \`NEXT_PUBLIC_APP_URL\` environment variable
3. Test authentication flow
4. Verify API routes work in production

## Key Features Implementation Status

- ✅ Next.js 15 + TypeScript setup
- ✅ Tailwind CSS with custom editorial palette
- ✅ shadcn/ui component library configured
- ✅ Supabase integration (client, server, middleware)
- ✅ Complete database schema with RLS policies
- ✅ TypeScript types for database schema
- ✅ Agent system with GPT-5 integration
- ✅ Agent orchestration (debate-style roundtable)
- ✅ API route for agent consultation
- ⏳ Authentication pages and flow
- ⏳ Dashboard layout and navigation
- ⏳ Project management UI
- ⏳ Video creation flow with agent roundtable UI
- ⏳ Performance tracking UI
- ⏳ Freemium tier enforcement

## Next Steps

1. **Authentication Flow**: Build login, signup, and password reset pages
2. **Dashboard Layout**: Create sidebar navigation and main content area
3. **Project Management**: CRUD operations for projects and series
4. **Video Creation**: Agent roundtable UI with debate visualization
5. **Performance Tracking**: Manual input forms and analytics dashboard

## Architecture Decisions

### Why Next.js App Router?
- Server Components for better performance
- Built-in API routes
- Streaming and Suspense support
- Simplified data fetching

### Why Supabase?
- PostgreSQL with built-in Row-Level Security
- Realtime subscriptions
- Authentication out of the box
- Generous free tier

### Why OpenAI GPT-5?
- Most advanced language model for agent personas
- Excellent instruction following
- JSON mode for structured outputs
- Fast response times

### Why Tailwind + shadcn/ui?
- Rapid UI development
- Consistent design system
- Accessible components (Radix UI)
- Easy customization

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Product Requirements Document](./PRD.md)

## License

ISC

## Support

For questions or issues, please open a GitHub issue or contact the development team.
