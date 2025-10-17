# Quick Command Reference

## Development Commands

### Start Development Server
\`\`\`bash
npm run dev
\`\`\`
- Runs on http://localhost:3000
- Hot reload enabled
- Open DevTools for debugging

### Build for Production
\`\`\`bash
npm run build
\`\`\`
- Checks TypeScript types
- Optimizes bundle
- Generates static pages

### Start Production Server (Local)
\`\`\`bash
npm run start
\`\`\`
- Must run `npm run build` first
- Tests production build locally

### Lint Code
\`\`\`bash
npm run lint
\`\`\`
- Checks code quality
- Enforces Next.js best practices

---

## shadcn/ui Commands

### Add Components
\`\`\`bash
# Individual components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add tabs
npx shadcn@latest add select
npx shadcn@latest add dropdown-menu
npx shadcn@latest add accordion
npx shadcn@latest add badge
npx shadcn@latest add progress
npx shadcn@latest add avatar
npx shadcn@latest add separator
npx shadcn@latest add label

# Multiple at once
npx shadcn@latest add button card dialog form input
\`\`\`

### List Available Components
\`\`\`bash
npx shadcn@latest add
\`\`\`
Choose from interactive menu

---

## Database Commands

### Apply Schema to Supabase
1. Copy contents of `supabase-schema.sql`
2. Open Supabase SQL Editor
3. Paste and execute

### Generate TypeScript Types (Manual)
After schema changes, update `lib/types/database.types.ts`

### Reset Database (Careful!)
In Supabase SQL Editor:
\`\`\`sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
\`\`\`
Then re-run `supabase-schema.sql`

---

## Git Commands

### Initial Commit
\`\`\`bash
git init
git add .
git commit -m "Initial commit: Next.js + Supabase + Agent system"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
\`\`\`

### Standard Workflow
\`\`\`bash
git status                          # Check changes
git add .                           # Stage all changes
git commit -m "feat: add feature"   # Commit with message
git push                            # Push to remote
\`\`\`

### Feature Branch Workflow
\`\`\`bash
git checkout -b feature/authentication
# Make changes
git add .
git commit -m "feat: implement login flow"
git push -u origin feature/authentication
\`\`\`

---

## Vercel Commands

### Install Vercel CLI
\`\`\`bash
npm i -g vercel
\`\`\`

### Deploy to Vercel
\`\`\`bash
vercel                  # Deploy to preview
vercel --prod           # Deploy to production
\`\`\`

### Link Project
\`\`\`bash
vercel link
\`\`\`

### Set Environment Variables
\`\`\`bash
vercel env pull .env.local          # Pull from Vercel
vercel env add OPENAI_API_KEY       # Add new variable
\`\`\`

---

## Supabase Commands

### Login to Supabase CLI (Optional)
\`\`\`bash
npx supabase login
\`\`\`

### Link Project (Optional)
\`\`\`bash
npx supabase link --project-ref <your-project-ref>
\`\`\`

### Generate Types (Alternative Method)
\`\`\`bash
npx supabase gen types typescript --project-id <your-project-id> > lib/types/supabase.types.ts
\`\`\`

---

## Testing Commands

### Test API Route Locally
\`\`\`bash
curl -X POST http://localhost:3000/api/agent/roundtable \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <supabase-anon-key>" \\
  -d '{
    "brief": "Test video brief",
    "platform": "tiktok",
    "projectId": "test-uuid"
  }'
\`\`\`

### Check Environment Variables
\`\`\`bash
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
node -e "console.log(process.env.OPENAI_API_KEY ? 'Set' : 'Not set')"
\`\`\`

---

## Troubleshooting Commands

### Clear Next.js Cache
\`\`\`bash
rm -rf .next
npm run dev
\`\`\`

### Reinstall Dependencies
\`\`\`bash
rm -rf node_modules package-lock.json
npm install
\`\`\`

### Check TypeScript Errors
\`\`\`bash
npx tsc --noEmit
\`\`\`

### Check Bundle Size
\`\`\`bash
npm run build
# Look for "First Load JS" in output
\`\`\`

### Analyze Bundle
\`\`\`bash
npm install --save-dev @next/bundle-analyzer
# Add to next.config.ts:
# const withBundleAnalyzer = require('@next/bundle-analyzer')({
#   enabled: process.env.ANALYZE === 'true',
# })
# module.exports = withBundleAnalyzer(config)

ANALYZE=true npm run build
\`\`\`

---

## Useful Aliases (Add to ~/.bashrc or ~/.zshrc)

\`\`\`bash
# Development
alias dev="npm run dev"
alias build="npm run build"

# Git shortcuts
alias gs="git status"
alias ga="git add ."
alias gc="git commit -m"
alias gp="git push"

# Vercel
alias vd="vercel"
alias vp="vercel --prod"
\`\`\`

---

## Environment Variable Checklist

Before running, ensure these are set in `.env.local`:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `CRON_SECRET`

Test with:
\`\`\`bash
node -e "const required = ['NEXT_PUBLIC_SUPABASE_URL', 'OPENAI_API_KEY']; required.forEach(key => console.log(key + ':', process.env[key] ? '✓' : '✗'))"
\`\`\`
