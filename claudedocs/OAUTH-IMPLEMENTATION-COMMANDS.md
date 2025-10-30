# OAuth Implementation - Executable Commands

**Quick Start Guide**: Run these commands in order

---

## Prerequisites Check ✅

- [x] Supabase CLI installed (v2.54.11)
- [x] config.toml created with OAuth settings
- [x] Google & GitHub OAuth apps registered
- [ ] Supabase CLI authenticated

---

## Authentication Required

The Supabase CLI needs authentication before you can manage secrets and configuration.

### Option 1: Browser Login (Recommended)

```bash
# Open browser and login to Supabase
supabase login

# This will:
# 1. Open your browser
# 2. Prompt you to login to Supabase
# 3. Store access token locally
```

### Option 2: Manual Access Token

1. Get your access token from: https://app.supabase.com/account/tokens
2. Click **Generate new token**
3. Copy the token
4. Set environment variable:

```bash
export SUPABASE_ACCESS_TOKEN=your_token_here
```

---

## Implementation Commands

### Step 1: Authenticate CLI

```bash
cd "/Users/sean.mcinerney/Documents/claude projects/sora video generator"

# Login via browser
supabase login
```

**Expected**: Browser opens, you login, then see "Logged in successfully"

---

### Step 2: Link Project

```bash
# Link to your Supabase project
supabase link --project-ref qbnkdtbqabpnkoadguez
```

**Expected Output**:
```
Linked to project qbnkdtbqabpnkoadguez
```

---

### Step 3: Set OAuth Secrets

**IMPORTANT**: Replace with your actual OAuth client secrets from Google/GitHub OAuth apps:
- Google: `[YOUR_GOOGLE_CLIENT_SECRET]`
- GitHub: `[YOUR_GITHUB_CLIENT_SECRET]`

```bash
# Set Google OAuth client secret
supabase secrets set GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET] --project-ref qbnkdtbqabpnkoadguez

# Set GitHub OAuth client secret
supabase secrets set GITHUB_CLIENT_SECRET=[YOUR_GITHUB_CLIENT_SECRET] --project-ref qbnkdtbqabpnkoadguez
```

**Expected Output** (for each):
```
Finished supabase secrets set GOOGLE_CLIENT_SECRET for project qbnkdtbqabpnkoadguez.
Finished supabase secrets set GITHUB_CLIENT_SECRET for project qbnkdtbqabpnkoadguez.
```

---

### Step 4: Verify Secrets

```bash
# List all secrets (won't show values, just names)
supabase secrets list --project-ref qbnkdtbqabpnkoadguez
```

**Expected Output**:
```
GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_SECRET
```

---

### Step 5: Configure Providers in Dashboard

**Note**: Auth provider configuration is typically done via dashboard, not CLI.

Go to: https://app.supabase.com/project/qbnkdtbqabpnkoadguez/auth/providers

**For Google**:
1. Find "Google" in the list
2. Click to expand
3. Toggle **Enable**
4. Enter:
   - Client ID: `210098948540-80gnr6r89vv4kr6lk88solmhnrpu0c04.apps.googleusercontent.com`
   - Client Secret: `[YOUR_GOOGLE_CLIENT_SECRET]`
5. Click **Save**

**For GitHub**:
1. Find "GitHub" in the list
2. Click to expand
3. Toggle **Enable**
4. Enter:
   - Client ID: `Ov23lijjLkeC6o1WwLuH`
   - Client Secret: `[YOUR_GITHUB_CLIENT_SECRET]`
5. Click **Save**

---

### Step 6: Test OAuth Flow

```bash
# Start dev server
npm run dev
```

Then navigate to: http://localhost:3000/login

**Test Sequence**:
1. Click "Google" button → Should redirect to Google consent screen
2. Approve → Should redirect to dashboard
3. Sign out
4. Click "GitHub" button → Should redirect to GitHub authorization
5. Approve → Should redirect to dashboard

---

## Verification Commands

```bash
# Check Supabase project status
supabase status --project-ref qbnkdtbqabpnkoadguez

# Check if secrets are set
supabase secrets list --project-ref qbnkdtbqabpnkoadguez

# Check project link
supabase projects list
```

---

## Quick Debug Commands

If OAuth doesn't work, check browser console:

```javascript
// On login page, open browser console and run:
const supabase = createClient()

// Test Google OAuth
const { error: googleError } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/api/auth/callback` }
})
console.log('Google OAuth error:', googleError)

// Test GitHub OAuth
const { error: githubError } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: { redirectTo: `${window.location.origin}/api/auth/callback` }
})
console.log('GitHub OAuth error:', githubError)
```

---

## Complete Command Sequence (Copy-Paste Ready)

```bash
# Navigate to project
cd "/Users/sean.mcinerney/Documents/claude projects/sora video generator"

# Step 1: Login to Supabase CLI
supabase login

# Step 2: Link project
supabase link --project-ref qbnkdtbqabpnkoadguez

# Step 3: Set OAuth secrets
supabase secrets set GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET] --project-ref qbnkdtbqabpnkoadguez
supabase secrets set GITHUB_CLIENT_SECRET=[YOUR_GITHUB_CLIENT_SECRET] --project-ref qbnkdtbqabpnkoadguez

# Step 4: Verify secrets
supabase secrets list --project-ref qbnkdtbqabpnkoadguez

# Step 5: Configure providers in dashboard (browser)
# Go to: https://app.supabase.com/project/qbnkdtbqabpnkoadguez/auth/providers

# Step 6: Start dev server and test
npm run dev
# Then open: http://localhost:3000/login
```

---

## Expected Results

After completing all steps:

✅ Supabase CLI authenticated
✅ Project linked
✅ OAuth secrets set securely
✅ Google provider enabled in dashboard
✅ GitHub provider enabled in dashboard
✅ OAuth buttons redirect to consent/authorization screens
✅ After approval, users redirect to dashboard
✅ Session persists across page reloads

---

## Troubleshooting

### "Access token not provided"
**Solution**: Run `supabase login` first

### "Secrets not found"
**Solution**: Make sure you ran `supabase secrets set` commands with correct project ref

### "OAuth provider not enabled"
**Solution**: Configure manually in dashboard (Step 5)

### OAuth redirect fails
**Solution**: Check that redirect URIs in Google/GitHub OAuth apps match:
- `https://qbnkdtbqabpnkoadguez.supabase.co/auth/v1/callback`

---

## Security Checklist

- [x] Client secrets NOT in config.toml (using env() reference)
- [x] Secrets stored via Supabase CLI (encrypted)
- [ ] config.toml safe to commit to git
- [ ] .env.local in .gitignore
- [ ] OAuth redirect URIs verified in provider settings

---

**Ready to Execute**: Yes
**Estimated Time**: 15 minutes
**Next Action**: Run `supabase login` to start
