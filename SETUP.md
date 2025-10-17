# Quick Setup Guide

Follow these steps to get your Sora2 Prompt Studio running locally.

## 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

## 2. Configure Environment Variables

Create \`.env.local\` file:

\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Fill in your actual values:

### Supabase Setup
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or use existing one
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → \`NEXT_PUBLIC_SUPABASE_URL\`
   - **anon public** key → \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`
   - **service_role** key → \`SUPABASE_SERVICE_ROLE_KEY\` (keep secret!)

### OpenAI Setup
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Copy to \`OPENAI_API_KEY\`

### Cron Secret
Generate a random string:
\`\`\`bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`

## 3. Set Up Database

1. Open Supabase SQL Editor in your project
2. Copy entire contents of \`supabase-schema.sql\`
3. Paste and execute
4. Verify tables in **Table Editor**:
   - profiles
   - projects
   - series
   - videos
   - video_performance
   - hashtags
   - agent_contributions

## 4. Configure Authentication

In Supabase Dashboard:

1. **Authentication** → **Providers**
2. Enable **Email** provider
3. **Configuration** → **Site URL**: \`http://localhost:3000\`
4. **Redirect URLs**: Add \`http://localhost:3000/auth/callback\`

## 5. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Visit [http://localhost:3000](http://localhost:3000)

## 6. Verify Installation

### Check Homepage
- Should see "Sora2 Prompt Studio" title
- No errors in browser console
- Page loads with Tailwind styles

### Check Database Connection
Open browser DevTools → Network tab:
- Should see requests to Supabase API
- No 401/403 errors

### Check Environment Variables
\`\`\`bash
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
\`\`\`
Should output your Supabase URL (not undefined)

## Common Issues

### "Module not found" errors
\`\`\`bash
rm -rf node_modules package-lock.json
npm install
\`\`\`

### Supabase connection errors
- Verify environment variables are set correctly
- Check Supabase project is running (not paused)
- Verify anon key is correct (copy from Settings → API)

### TypeScript errors
\`\`\`bash
npm run build
\`\`\`
Fix any type errors before proceeding

### Agent API not working
- Verify OpenAI API key is valid
- Check API key has GPT-4 access
- Monitor OpenAI usage dashboard for errors

## Next Steps

Once setup is complete:

1. **Build Authentication**: Create login/signup pages
2. **Build Dashboard**: Project management UI
3. **Build Agent Interface**: Roundtable visualization
4. **Test End-to-End**: Create project → generate video prompt

## Need Help?

- Check \`README.md\` for detailed documentation
- Review \`PRD.md\` for product requirements
- Open GitHub issue for bugs or questions
