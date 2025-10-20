# Login Error Diagnosis & Resolution

**Issue**: `400 Bad Request` from Supabase auth endpoint
**Error**: `POST https://qbnkdtbqabpnkoadguez.supabase.co/auth/v1/token?grant_type=password 400 (Bad Request)`
**Date**: 2025-10-19
**Status**: ⚠️ Configuration Issue

---

## Root Cause Analysis

### Primary Issue: Invalid Supabase API Keys

Your `.env.local` file contains **placeholder/invalid API keys**:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Vn-TohVC3sovyUyATkIl-w_4BD9c4Es
SUPABASE_SERVICE_ROLE_KEY=sb_secret_5hLrjoveoS2hYwmmuU8KHA_2SOct-y1
```

**Problem**: These keys follow a non-standard format (`sb_publishable_` and `sb_secret_`) which is **not** the format of real Supabase keys.

Real Supabase keys look like:
```
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
```
(Long JWT tokens starting with `eyJ`)

### Secondary Issues (Not Blocking)

1. **Missing Favicon**: `favicon.ico:1 Failed to load resource: 404` - Minor, doesn't affect functionality
2. **React DevTools**: Informational message only, not an error

---

## Step-by-Step Resolution

### Step 1: Get Real Supabase API Keys

1. **Open Supabase Dashboard**: https://app.supabase.com
2. **Select Your Project**: `qbnkdtbqabpnkoadguez` (or create new project if needed)
3. **Navigate to Settings → API**
4. **Copy the following**:
   - **Project URL**: Should be `https://qbnkdtbqabpnkoadguez.supabase.co` ✅ (already correct)
   - **anon public key**: Long JWT token (starts with `eyJ...`)
   - **service_role key**: Long JWT token (starts with `eyJ...`) - **Keep this secret!**

### Step 2: Update `.env.local`

Replace your current keys with the real ones:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://qbnkdtbqabpnkoadguez.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc... (PASTE YOUR REAL KEY)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M... (PASTE YOUR REAL KEY)

# OpenAI
OPENAI_API_KEY=sk-proj-your-actual-openai-api-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron (for usage reset)
CRON_SECRET=your-random-secret
```

### Step 3: Verify Database Setup

1. **Open Supabase SQL Editor**
2. **Check if schema exists**:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
3. **If tables don't exist**, run the schema file:
   - Open `supabase-schema.sql` from your project
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Execute

### Step 4: Enable Email Authentication

In Supabase Dashboard:

1. **Authentication** → **Providers**
2. **Enable Email provider** (toggle ON)
3. **Settings** → **Authentication** → **Site URL**: `http://localhost:3000`
4. **Redirect URLs**: Add `http://localhost:3000/api/auth/callback`

### Step 5: Create a Test User

**Option A: Via Supabase Dashboard**
1. **Authentication** → **Users**
2. **Add user** → **Create new user**
3. Enter email and password
4. **Auto Confirm User**: YES (for testing)

**Option B: Via Signup Page**
1. Go to http://localhost:3000/signup
2. Create account with valid email/password
3. If email confirmation required, check Supabase → Authentication → Email Templates

### Step 6: Restart Dev Server

**Important**: Environment variable changes require server restart

```bash
# Stop current dev server (Ctrl+C)
# Restart
npm run dev
```

### Step 7: Test Login

1. Go to http://localhost:3000/login
2. Enter test credentials
3. Should redirect to `/dashboard` on success
4. Check browser console - should see no 400 errors

---

## Verification Checklist

- [ ] Supabase anon key is a long JWT token (starts with `eyJ`)
- [ ] Supabase service role key is a long JWT token (starts with `eyJ`)
- [ ] Dev server restarted after `.env.local` update
- [ ] Database tables exist in Supabase (profiles, projects, videos, etc.)
- [ ] Email authentication enabled in Supabase dashboard
- [ ] Test user created in Supabase Authentication panel
- [ ] Login page loads without errors
- [ ] Login succeeds and redirects to dashboard

---

## Additional Troubleshooting

### If Login Still Fails After Key Update

**Check 1: Verify Keys Are Loaded**
```bash
# In project directory
node -e "require('dotenv').config({ path: '.env.local' }); console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');"
```
Should output: `Anon Key: eyJhbGciOiJIUzI1NiIs...`

**Check 2: Test Supabase Connection**
```bash
curl -X GET "https://qbnkdtbqabpnkoadguez.supabase.co/rest/v1/" \
  -H "apikey: YOUR_ANON_KEY_HERE" \
  -H "Authorization: Bearer YOUR_ANON_KEY_HERE"
```
Should return JSON (not error)

**Check 3: Browser Console**
- Open DevTools → Network tab
- Attempt login
- Find the `token` request
- Click → Response tab
- Should show specific error message from Supabase

### Common Error Messages & Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Invalid login credentials` | User doesn't exist or wrong password | Create user in Supabase dashboard |
| `Email not confirmed` | Email verification required | Auto-confirm user in dashboard OR check email |
| `Invalid API key` | Wrong anon key | Copy correct key from Supabase Settings → API |
| `User already registered` | Trying to sign up with existing email | Use login instead of signup |
| `Database error` | Tables don't exist | Run `supabase-schema.sql` in SQL Editor |

---

## Quick Fix Commands

### 1. Generate New Cron Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Verify Environment Variables
```bash
cat .env.local
```

### 3. Check Supabase Project Status
```bash
curl -s "https://qbnkdtbqabpnkoadguez.supabase.co/rest/v1/" -I
```

### 4. Restart Dev Server with Clean Cache
```bash
rm -rf .next
npm run dev
```

---

## Expected Behavior After Fix

### Successful Login Flow

1. **User enters credentials** → Form validates
2. **Supabase auth request** → Returns 200 OK with session
3. **Redirect to dashboard** → Shows projects page
4. **Session persists** → User stays logged in on refresh

### Browser Console (Success)

```
✅ No errors
✅ Network tab shows: POST /auth/v1/token → 200 OK
✅ Response includes: access_token, refresh_token, user object
```

### Browser Console (Current - Before Fix)

```
❌ POST /auth/v1/token → 400 Bad Request
❌ Error: Invalid API key or authentication failure
```

---

## Prevention

### Before Committing Code

**Never commit real API keys to git!**

1. **Use `.env.local`** - Already in `.gitignore`
2. **Use `.env.example`** - Template with placeholders only:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   OPENAI_API_KEY=your_openai_key_here
   ```
3. **Document in README** - Instructions for getting keys

### API Key Security

- ✅ **SAFE**: Anon key in client-side code (it's public)
- ❌ **UNSAFE**: Service role key in client-side code (server only!)
- ❌ **UNSAFE**: Committing `.env.local` to git

---

## Files Involved

### Configuration Files
- `.env.local` - **Local environment variables (needs real keys)**
- `.env.example` - Template with placeholders
- `lib/supabase/client.ts` - Browser Supabase client
- `lib/supabase/server.ts` - Server Supabase client

### Authentication Pages
- `app/(auth)/login/page.tsx` - Login form (line 26 triggers auth)
- `app/(auth)/signup/page.tsx` - Signup form
- `app/(auth)/forgot-password/page.tsx` - Password reset

### Middleware
- `middleware.ts` - Route protection and session handling

---

## Next Steps After Login Works

1. **Test Full Auth Flow**:
   - Sign up → Verify email → Login → Dashboard
   - Logout → Login again
   - Forgot password flow

2. **Create Test Project**:
   - Dashboard → New Project
   - Add video
   - Test agent roundtable

3. **Security Hardening**:
   - Enable RLS policies in Supabase
   - Test unauthorized access attempts
   - Verify session timeout behavior

---

**Status**: Ready to fix - just need real Supabase API keys
**Priority**: 🔴 High (blocking login functionality)
**Estimated Fix Time**: 5 minutes (copy keys + restart server)
