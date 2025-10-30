# OAuth Implementation Analysis - Google & GitHub Login

**Date**: 2025-10-30
**Project**: Sora Video Generator (Scenra Prompt Studio)
**Task**: Implement Google and GitHub OAuth login via Supabase
**Status**: ✅ **Code Already Exists - Configuration Required**

---

## Executive Summary

**GOOD NEWS**: Your application **already has complete OAuth implementation code** for both Google and GitHub login! The UI, auth flow, and callback handling are all implemented. What's needed is **Supabase provider configuration** to enable these features.

### Current Status
- ✅ **UI Implementation**: Login page has Google & GitHub buttons (app/(auth)/login/page.tsx:125-163)
- ✅ **OAuth Flow Code**: `handleOAuthLogin()` function implemented with proper redirects
- ✅ **Callback Handler**: OAuth callback route exists (app/api/auth/callback/route.ts)
- ✅ **Supabase Client Setup**: Proper SSR configuration for auth
- ⚠️ **Provider Configuration**: Needs Supabase dashboard configuration
- ⚠️ **OAuth App Registration**: Need to register apps with Google & GitHub

---

## Current Implementation Review

### 1. Login Page UI ✅ COMPLETE
**File**: `app/(auth)/login/page.tsx`

**OAuth Implementation** (Lines 42-56):
```typescript
const handleOAuthLogin = async (provider: 'google' | 'github') => {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) throw error
  } catch (err: any) {
    setError(err.message || `Failed to sign in with ${provider}`)
  }
}
```

**UI Buttons** (Lines 125-163):
- ✅ Google button with official logo (SVG)
- ✅ GitHub button with official logo (SVG)
- ✅ Proper styling and disabled states
- ✅ Error handling UI
- ✅ Loading states

### 2. OAuth Callback Handler ✅ COMPLETE
**File**: `app/api/auth/callback/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/dashboard`)
}
```

**Features**:
- ✅ Extracts OAuth code from query params
- ✅ Exchanges code for session using Supabase
- ✅ Error handling with redirect to login
- ✅ Success redirect to dashboard
- ✅ Proper Next.js 15 async server component pattern

### 3. Supabase Client Configuration ✅ COMPLETE

**Browser Client** (`lib/supabase/client.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Server Client** (`lib/supabase/server.ts`):
- ✅ Proper cookie handling for SSR
- ✅ Next.js 15 async cookies() usage
- ✅ setAll/getAll cookie methods

---

## What's Missing: Supabase Provider Configuration

### Required Steps Overview

1. **Register OAuth Apps** with Google and GitHub
2. **Configure Providers** in Supabase Dashboard
3. **Set Redirect URLs** for OAuth callbacks
4. **Test OAuth Flow** in development and production

---

## Implementation Guide

### Phase 1: Register Google OAuth Application

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing one
3. Enable **Google+ API** or **Google Identity Services**

#### Step 2: Create OAuth 2.0 Credentials
1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Application name**: Scenra Prompt Studio
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://your-domain.com` (production)
   - **Authorized redirect URIs**:
     - `https://qbnkdtbqabpnkoadguez.supabase.co/auth/v1/callback`
     - `http://localhost:54321/auth/v1/callback` (local Supabase if running)

#### Step 3: Save Credentials
- Copy **Client ID**
- Copy **Client Secret**
- Keep these secure (never commit to git)

---

### Phase 2: Register GitHub OAuth Application

#### Step 1: Create GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**

#### Step 2: Configure Application
- **Application name**: Scenra Prompt Studio
- **Homepage URL**:
  - Development: `http://localhost:3000`
  - Production: `https://your-domain.com`
- **Authorization callback URL**:
  - `https://qbnkdtbqabpnkoadguez.supabase.co/auth/v1/callback`

#### Step 3: Generate Client Secret
1. After creating app, click **Generate a new client secret**
2. Copy **Client ID**
3. Copy **Client Secret**
4. Save securely

---

### Phase 3: Configure Supabase Providers

#### Using Supabase CLI (Recommended for Version Control)

**Create config file**: `supabase/config.toml` (if not exists)

```toml
[auth.external.google]
enabled = true
client_id = "YOUR_GOOGLE_CLIENT_ID"
secret = "env(GOOGLE_CLIENT_SECRET)"
redirect_uri = "https://qbnkdtbqabpnkoadguez.supabase.co/auth/v1/callback"

[auth.external.github]
enabled = true
client_id = "YOUR_GITHUB_CLIENT_ID"
secret = "env(GITHUB_CLIENT_SECRET)"
redirect_uri = "https://qbnkdtbqabpnkoadguez.supabase.co/auth/v1/callback"
```

**Set environment secrets**:
```bash
supabase secrets set GOOGLE_CLIENT_SECRET=your_google_secret_here
supabase secrets set GITHUB_CLIENT_SECRET=your_github_secret_here
```

**Push configuration**:
```bash
supabase db push
```

#### Using Supabase Dashboard (Alternative Method)

1. Go to [Supabase Dashboard](https://app.supabase.com/project/qbnkdtbqabpnkoadguez)
2. Navigate to **Authentication** → **Providers**

**Google Configuration**:
3. Find **Google** in provider list
4. Toggle **Enable Sign in with Google**
5. Enter:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)
6. Click **Save**

**GitHub Configuration**:
7. Find **GitHub** in provider list
8. Toggle **Enable Sign in with GitHub**
9. Enter:
   - **Client ID**: (from GitHub OAuth App)
   - **Client Secret**: (from GitHub OAuth App)
10. Click **Save**

---

### Phase 4: Update Environment Variables (Optional)

If you want to reference OAuth credentials locally (for documentation):

**Add to `.env.local`** (DO NOT commit):
```bash
# OAuth Provider Credentials (configured in Supabase Dashboard)
# These are NOT used by the app directly - Supabase handles OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

**Add to `.env.example`** (safe to commit):
```bash
# OAuth Configuration (Optional - configured in Supabase Dashboard)
# Document your OAuth app names/IDs here for reference
# GOOGLE_CLIENT_ID=your_google_client_id_here
# GITHUB_CLIENT_ID=your_github_client_id_here
```

---

### Phase 5: Testing OAuth Flow

#### Development Testing (localhost:3000)

1. **Start Development Server**:
```bash
npm run dev
```

2. **Navigate to Login Page**:
   - Go to `http://localhost:3000/login`

3. **Test Google Login**:
   - Click "Google" button
   - Should redirect to Google consent screen
   - After approval, should redirect back to dashboard

4. **Test GitHub Login**:
   - Click "GitHub" button
   - Should redirect to GitHub authorization screen
   - After approval, should redirect back to dashboard

5. **Verify Session**:
```typescript
// Check in browser console on dashboard page
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user)
// Should show user object with provider info
```

#### Production Testing

1. **Deploy to Vercel** (or your hosting)
2. **Update OAuth Redirect URIs**:
   - Add production URLs to Google Cloud Console
   - Add production URLs to GitHub OAuth App
   - Update Supabase auth redirect URLs if needed

3. **Test full flow** on production domain

---

## Security Considerations

### Current Implementation Security ✅

1. **Secure Redirect URLs**: Using `window.location.origin` prevents redirect attacks
2. **PKCE Flow**: Supabase uses PKCE for OAuth (secure for public clients)
3. **HttpOnly Cookies**: Supabase SSR stores tokens in httpOnly cookies
4. **CSRF Protection**: Supabase includes state parameter for CSRF protection

### Additional Recommendations

1. **Email Verification**: Consider requiring email verification for OAuth users
```typescript
// In Supabase Dashboard → Authentication → Providers
// Enable "Confirm email" for Google and GitHub providers
```

2. **Rate Limiting**: OAuth endpoints already protected by Supabase rate limits

3. **User Profile Creation**: Ensure profiles table has trigger for OAuth users
```sql
-- Check if this exists in your migrations
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

4. **Scopes Review**: Default scopes are minimal (email, profile) - perfect for auth

---

## Database Considerations

### User Profile Creation for OAuth Users

**Check existing trigger** (`supabase-migrations/` folder):
```sql
-- Ensure OAuth users get profiles created automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Verify profiles table includes**:
- `id` (uuid, references auth.users)
- `email` (text)
- OAuth-specific fields if needed (avatar_url, full_name)

---

## Testing Checklist

### Pre-Configuration Tests ❌
- [ ] Google button shows on login page
- [ ] GitHub button shows on login page
- [ ] Clicking buttons shows appropriate error (provider not configured)

### Post-Configuration Tests
- [ ] **Google OAuth**:
  - [ ] Button redirects to Google consent screen
  - [ ] After approval, redirects to `/api/auth/callback`
  - [ ] Callback exchanges code for session
  - [ ] User redirected to dashboard
  - [ ] Session persists across page reloads
  - [ ] User profile created in profiles table
  - [ ] User can sign out and sign in again

- [ ] **GitHub OAuth**:
  - [ ] Button redirects to GitHub authorization
  - [ ] After approval, redirects to `/api/auth/callback`
  - [ ] Callback exchanges code for session
  - [ ] User redirected to dashboard
  - [ ] Session persists across page reloads
  - [ ] User profile created in profiles table
  - [ ] User can sign out and sign in again

- [ ] **Error Handling**:
  - [ ] User declines consent → shows error on login page
  - [ ] Invalid OAuth config → shows error message
  - [ ] Network error → proper error handling

- [ ] **Security**:
  - [ ] Session stored in httpOnly cookies (check DevTools)
  - [ ] Cannot access session token from JavaScript
  - [ ] CSRF state parameter present in OAuth flow
  - [ ] Redirect URL validated by Supabase

---

## Implementation Commands

### Quick Setup Commands

```bash
# 1. Navigate to project directory
cd "/Users/sean.mcinerney/Documents/claude projects/sora video generator"

# 2. Check current Supabase link status
supabase link --project-ref qbnkdtbqabpnkoadguez

# 3. Create config file if it doesn't exist
mkdir -p supabase
touch supabase/config.toml

# 4. After adding OAuth credentials to config.toml:
supabase secrets set GOOGLE_CLIENT_SECRET=your_secret_here
supabase secrets set GITHUB_CLIENT_SECRET=your_secret_here

# 5. Push configuration to Supabase
supabase db push

# 6. Restart local dev server
npm run dev

# 7. Test OAuth flow at http://localhost:3000/login
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### Issue: "Provider not enabled" Error
**Cause**: OAuth provider not configured in Supabase
**Solution**: Complete Phase 3 configuration in Supabase Dashboard

#### Issue: "Invalid redirect URI" Error
**Cause**: Mismatch between configured redirect URI and actual callback URL
**Solution**:
- Ensure redirect URI is exactly: `https://qbnkdtbqabpnkoadguez.supabase.co/auth/v1/callback`
- Check both Google/GitHub OAuth app settings AND Supabase settings

#### Issue: "Code exchange failed" Error
**Cause**: Invalid client secret or client ID
**Solution**: Double-check credentials copied correctly from OAuth providers

#### Issue: User logs in but no profile created
**Cause**: Missing database trigger
**Solution**: Run the `handle_new_user()` trigger SQL from Database Considerations section

#### Issue: OAuth works locally but fails in production
**Cause**: Production redirect URLs not added to OAuth providers
**Solution**: Add production domain to Authorized redirect URIs in Google/GitHub

---

## Estimated Implementation Time

| Phase | Task | Time | Difficulty |
|-------|------|------|------------|
| 1 | Register Google OAuth | 10 min | Easy |
| 2 | Register GitHub OAuth | 10 min | Easy |
| 3 | Configure Supabase Providers | 15 min | Easy |
| 4 | Test Development Flow | 10 min | Easy |
| 5 | Deploy & Test Production | 15 min | Easy |
| **Total** | **End-to-End** | **60 min** | **Easy** |

**Complexity**: ⭐ **Low** (configuration-only, no code changes needed)

---

## Summary & Next Steps

### What You Have ✅
- Complete OAuth UI implementation
- Proper OAuth flow handling code
- Secure callback route with session exchange
- Error handling and loading states
- Professional Google & GitHub button styling

### What You Need ⚙️
1. **Register OAuth applications** with Google and GitHub (20 minutes)
2. **Configure providers** in Supabase Dashboard (15 minutes)
3. **Test OAuth flow** in development (10 minutes)
4. **Deploy and test** in production (15 minutes)

### Recommended Action Plan

**Option 1: Supabase Dashboard (Fastest)**
1. Register Google OAuth app (10 min)
2. Register GitHub OAuth app (10 min)
3. Configure both in Supabase Dashboard (15 min)
4. Test immediately (10 min)
5. **Total: ~45 minutes to working OAuth**

**Option 2: CLI Configuration (Better for Teams)**
1. Register OAuth apps (20 min)
2. Create `supabase/config.toml` with credentials
3. Use `supabase secrets` to store client secrets
4. Push configuration with `supabase db push`
5. **Total: ~60 minutes, version-controlled**

---

## Additional Resources

### Documentation
- [Supabase OAuth Docs](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [GitHub OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

### Useful Commands
```bash
# Check Supabase project status
supabase status

# View current auth configuration
supabase projects api-keys --project-ref qbnkdtbqabpnkoadguez

# Test auth callback locally
curl http://localhost:3000/api/auth/callback?code=test

# View Supabase logs
supabase functions logs
```

---

**Analysis Completed By**: Claude Code (Sonnet 4.5)
**Analysis Date**: 2025-10-30
**Status**: ✅ **Ready for Configuration** (No Code Changes Needed)
**Recommendation**: Use Supabase Dashboard method for fastest implementation
