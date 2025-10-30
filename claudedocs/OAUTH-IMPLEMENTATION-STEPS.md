# OAuth Implementation Steps - Google & GitHub Login

**Date**: 2025-10-30
**Status**: Ready for CLI Configuration
**Credentials Extracted**: ✅ Google & GitHub client IDs found in config.toml

---

## Implementation Status

✅ **config.toml Created** - OAuth providers configured
✅ **Client IDs Added** - Google and GitHub client IDs in place
✅ **Secrets Format Fixed** - Using `env()` reference for security
⏳ **Next Steps** - Set secrets and push configuration

---

## Your OAuth Credentials

### Google OAuth
- **Client ID**: `210098948540-80gnr6r89vv4kr6lk88solmhnrpu0c04.apps.googleusercontent.com`
- **Client Secret**: `[YOUR_GOOGLE_CLIENT_SECRET]`
- **Redirect URI**: `https://qbnkdtbqabpnkoadguez.supabase.co/auth/v1/callback`

### GitHub OAuth
- **Client ID**: `Ov23lijjLkeC6o1WwLuH`
- **Client Secret**: `[YOUR_GITHUB_CLIENT_SECRET]`
- **Redirect URI**: `https://qbnkdtbqabpnkoadguez.supabase.co/auth/v1/callback`

---

## Step-by-Step Implementation

### Step 1: Link Supabase Project (If Not Already Linked)

```bash
cd "/Users/sean.mcinerney/Documents/claude projects/sora video generator"

# Link to your Supabase project
supabase link --project-ref qbnkdtbqabpnkoadguez
```

**Expected Output**:
```
Linked to qbnkdtbqabpnkoadguez
```

If it asks for access token, you can get it from: https://app.supabase.com/account/tokens

---

### Step 2: Set OAuth Secrets via Supabase CLI

**Important**: The secrets must be set via CLI - they won't be in the config file for security.

```bash
# Set Google OAuth secret
supabase secrets set GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET]

# Set GitHub OAuth secret
supabase secrets set GITHUB_CLIENT_SECRET=[YOUR_GITHUB_CLIENT_SECRET]
```

**Expected Output**:
```
Finished supabase secrets set.
```

**Verify secrets are set**:
```bash
supabase secrets list
```

Should show:
```
GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_SECRET
```

---

### Step 3: Push Configuration to Supabase

Now push your config.toml settings to Supabase:

```bash
# Push auth configuration
supabase db push
```

**Expected Output**:
```
Applying migration...
Finished supabase db push.
```

**Alternative**: If `db push` doesn't work for auth config, you can use the dashboard or try:

```bash
# Push full project config
supabase functions deploy
```

Or manually configure via dashboard (see Alternative Method below).

---

### Step 4: Verify Configuration in Supabase Dashboard

1. Go to: https://app.supabase.com/project/qbnkdtbqabpnkoadguez/auth/providers
2. Verify:
   - ✅ **Google** is enabled with your client ID
   - ✅ **GitHub** is enabled with your client ID

If they're not showing, you may need to configure them manually via dashboard.

---

### Step 5: Test OAuth Flow

Start your dev server:
```bash
npm run dev
```

Navigate to: http://localhost:3000/login

**Test Google Login**:
1. Click "Google" button
2. Should redirect to Google consent screen
3. Approve access
4. Should redirect back to dashboard
5. Check browser console for user object

**Test GitHub Login**:
1. Click "GitHub" button
2. Should redirect to GitHub authorization
3. Approve access
4. Should redirect back to dashboard
5. Check browser console for user object

---

## Alternative Method: Manual Dashboard Configuration

If CLI configuration doesn't work, configure manually in Supabase Dashboard:

### Step 1: Open Supabase Dashboard
Go to: https://app.supabase.com/project/qbnkdtbqabpnkoadguez/auth/providers

### Step 2: Configure Google Provider

1. Find **Google** in the provider list
2. Click to expand
3. Toggle **Enable Sign in with Google** to ON
4. Enter:
   - **Client ID**: `210098948540-80gnr6r89vv4kr6lk88solmhnrpu0c04.apps.googleusercontent.com`
   - **Client Secret**: `[YOUR_GOOGLE_CLIENT_SECRET]`
5. Click **Save**

### Step 3: Configure GitHub Provider

1. Find **GitHub** in the provider list
2. Click to expand
3. Toggle **Enable Sign in with GitHub** to ON
4. Enter:
   - **Client ID**: `Ov23lijjLkeC6o1WwLuH`
   - **Client Secret**: `[YOUR_GITHUB_CLIENT_SECRET]`
5. Click **Save**

### Step 4: Test as described in Step 5 above

---

## Troubleshooting

### Issue: "supabase: command not found"
**Solution**: Supabase CLI is installed at `/opt/homebrew/bin/supabase`
```bash
# Add to PATH if needed
export PATH="/opt/homebrew/bin:$PATH"

# Or use full path
/opt/homebrew/bin/supabase link --project-ref qbnkdtbqabpnkoadguez
```

### Issue: "Project not linked"
**Solution**:
```bash
supabase link --project-ref qbnkdtbqabpnkoadguez
```
You may need an access token from: https://app.supabase.com/account/tokens

### Issue: "db push doesn't update auth config"
**Solution**: Auth configuration might need to be done via dashboard. Use the Alternative Method above.

### Issue: OAuth button doesn't redirect
**Possible Causes**:
1. Provider not enabled in Supabase → Check dashboard
2. Invalid redirect URI → Verify in Google/GitHub OAuth app settings
3. Client credentials incorrect → Double-check in dashboard

**Debug Steps**:
```typescript
// Check in browser console on login page
const supabase = createClient()
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/api/auth/callback`,
  },
})
console.log('OAuth error:', error)
```

### Issue: Callback fails with "Code exchange failed"
**Cause**: Client secret mismatch
**Solution**: Verify secrets in dashboard match exactly

---

## Post-Implementation Checklist

- [ ] Both OAuth providers enabled in Supabase dashboard
- [ ] Google OAuth redirects to consent screen
- [ ] GitHub OAuth redirects to authorization
- [ ] Both providers successfully redirect to dashboard after approval
- [ ] User session persists after page reload
- [ ] User profile created in profiles table
- [ ] Can sign out and sign back in with OAuth
- [ ] Error handling works (decline consent shows error)

---

## Quick Command Reference

```bash
# Navigate to project
cd "/Users/sean.mcinerney/Documents/claude projects/sora video generator"

# Link Supabase project
supabase link --project-ref qbnkdtbqabpnkoadguez

# Set secrets
supabase secrets set GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET]
supabase secrets set GITHUB_CLIENT_SECRET=[YOUR_GITHUB_CLIENT_SECRET]

# List secrets
supabase secrets list

# Push configuration (if supported for auth)
supabase db push

# Check project status
supabase status

# Start dev server
npm run dev
```

---

## Security Notes

### Safe to Commit
✅ `supabase/config.toml` - Uses `env()` references, not actual secrets
✅ OAuth client IDs (public identifiers)

### DO NOT Commit
❌ OAuth client secrets (use Supabase secrets management)
❌ `.env.local` file with secrets
❌ Any file containing `GOCSPX-*` or actual GitHub secrets

### Current Security Setup
- ✅ Client secrets stored via Supabase secrets (encrypted)
- ✅ config.toml references secrets via `env()` function
- ✅ OAuth redirect URIs properly configured
- ✅ PKCE flow enabled by default (Supabase)

---

## Expected Timeline

| Step | Duration | Status |
|------|----------|--------|
| Link Supabase project | 2 min | ⏳ Pending |
| Set OAuth secrets | 3 min | ⏳ Pending |
| Push configuration | 2 min | ⏳ Pending |
| Test Google OAuth | 3 min | ⏳ Pending |
| Test GitHub OAuth | 3 min | ⏳ Pending |
| **Total** | **13 min** | ⏳ In Progress |

---

## Next Steps

### Immediate Actions
1. Run the commands in **Step 1** to link your project
2. Run the commands in **Step 2** to set secrets
3. Verify configuration in dashboard (Step 4)
4. Test OAuth flow (Step 5)

### If CLI Method Doesn't Work
- Use the **Alternative Method** to configure via dashboard
- This is faster and just as secure
- Takes ~10 minutes total

---

**Implementation Guide Created**: 2025-10-30
**Ready to Execute**: Yes
**Estimated Completion**: 13 minutes
**Complexity**: Low (configuration-only)
