# Project Patterns: OAuth & Subscription Management

## OAuth Implementation Pattern

### Configuration Structure
```toml
# supabase/config.toml
[auth.external.google]
enabled = true
client_id = "public_client_id_here"
secret = "env(GOOGLE_CLIENT_SECRET)"  # ← env() reference, not actual secret
redirect_uri = "https://[project].supabase.co/auth/v1/callback"
```

### Secret Management
```bash
# Store secrets via Supabase CLI (encrypted)
supabase secrets set GOOGLE_CLIENT_SECRET=[secret] --project-ref [ref]
supabase secrets set GITHUB_CLIENT_SECRET=[secret] --project-ref [ref]

# Verify secrets are set
supabase secrets list --project-ref [ref]
```

### Key Principles
1. **Never commit actual secrets** - Use env() references in config files
2. **CLI for secrets** - Always use `supabase secrets set` for secret storage
3. **Redact documentation** - Replace secrets with placeholders before committing
4. **Dashboard configuration** - Some OAuth settings require dashboard setup

### Supabase Project Details
- **Project Reference**: qbnkdtbqabpnkoadguez
- **OAuth Callback**: https://qbnkdtbqabpnkoadguez.supabase.co/auth/v1/callback
- **Dashboard**: https://app.supabase.com/project/qbnkdtbqabpnkoadguez/auth/providers

## Subscription-Based Feature Gating Pattern

### Component Pattern
```typescript
// Component with subscription gating
interface ComponentProps {
  // ... other props
  subscriptionTier?: 'free' | 'premium' | 'enterprise'
}

export function PremiumFeatureComponent({
  subscriptionTier = 'free',
  // ... other props
}: ComponentProps) {
  const isPremium = subscriptionTier === 'premium' || subscriptionTier === 'enterprise'
  
  const handleFeatureClick = () => {
    if (isPremium) {
      // Show premium feature
      showFeatureModal()
    } else {
      // Show upgrade dialog
      showUpgradeDialog()
    }
  }
  
  return (
    <>
      <Button onClick={handleFeatureClick}>
        Feature Name
        {!isPremium && <Crown className="ml-1 h-3 w-3" />}
      </Button>
      
      {isPremium && <FeatureModal />}
      <UpgradeDialog />
    </>
  )
}
```

### Server Component Integration
```typescript
// Server Component (page.tsx)
export default async function Page() {
  const supabase = await createClient()
  
  // Get user and profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user?.id || '')
    .single()
  
  return (
    <ClientComponent 
      subscriptionTier={profile?.subscription_tier || 'free'}
    />
  )
}
```

### Upgrade Dialog Pattern
```typescript
// Upgrade dialog with benefits
<Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-yellow-500" />
        Premium Feature
      </DialogTitle>
      <DialogDescription>
        [Feature] is available exclusively for Premium users.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      <div className="rounded-lg bg-gradient-to-br from-sage-50 to-sage-100 p-4">
        <h4 className="font-semibold mb-2">Premium Benefits</h4>
        <ul className="space-y-2 text-sm">
          <li>✓ Benefit 1</li>
          <li>✓ Benefit 2</li>
          <li>✓ Benefit 3</li>
        </ul>
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={close}>Maybe Later</Button>
      <Button asChild>
        <Link href="/dashboard/settings?tab=subscription">
          <Crown className="mr-2 h-4 w-4" />
          Upgrade to Premium
        </Link>
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Database Schema Consistency Pattern

### Field Naming Convention
**Rule**: Use snake_case for all database-backed fields throughout the stack

```typescript
// ✅ CORRECT - Consistent snake_case
const createVideoSchema = z.object({
  series_id: uuidSchema,
  user_brief: z.string(),
  agent_discussion: z.any(),
  optimized_prompt: z.string(),
  character_count: z.number()
})

// API route destructuring matches schema
const {
  series_id,
  user_brief,
  agent_discussion,
  optimized_prompt,
  character_count
} = validation.data

// Database insert matches destructured names
await supabase.from('videos').insert({
  series_id,
  user_brief,
  agent_discussion,
  optimized_prompt,
  character_count
})
```

```typescript
// ❌ INCORRECT - Mixed camelCase/snake_case causes build failures
const createVideoSchema = z.object({
  series_id: uuidSchema,  // snake_case in schema
  userBrief: z.string(),  // camelCase in schema
})

const { seriesId, userBrief } = validation.data  // camelCase destructuring

await supabase.from('videos').insert({
  series_id: seriesId,     // Mismatch!
  user_brief: userBrief    // Mismatch!
})
```

### Migration Strategy
When fixing field name inconsistencies:
1. Update validation schemas first (source of truth)
2. Update API route destructuring to match schemas
3. Update database insert/update operations
4. Update all component props that use these fields
5. Run TypeScript compilation to catch remaining issues

## Next.js 16 + Supabase SSR Pattern

### Server Component Data Fetching
```typescript
// Server Component - Secure data fetching
import { createClient } from '@/lib/supabase/server'

export default async function ServerPage() {
  const supabase = await createClient()
  
  // Fetch user data server-side (secure)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()
  
  // Pass to Client Component
  return <ClientComponent profile={profile} />
}
```

### Client Component Pattern
```typescript
// Client Component - UI only
'use client'

export function ClientComponent({ profile }) {
  // Use passed data, don't fetch again
  return <div>{profile.subscription_tier}</div>
}
```

### Key Principles
1. **Fetch server-side** - User data, profiles, sensitive info
2. **Pass as props** - Server → Client component data flow
3. **Client for interactivity** - UI state, modals, user actions
4. **No client-side auth queries** - Prevents security issues

## Git Workflow for Sensitive Data

### Pre-Commit Checklist
```bash
# Before committing files with secrets
1. git status  # Check what's being committed
2. git diff    # Review actual changes
3. Search for: GOCSPX-, client_secret=, password=, token=
4. Replace secrets with placeholders
5. git add [files]
6. git commit
```

### Fixing Commits with Secrets
```bash
# If commit contains secrets
git add [redacted_files]
git commit --amend --no-edit  # Update commit
git push origin main
```

### GitHub Push Protection
- Automatically blocks pushes with detected secrets
- Provides URLs to allow secrets (don't use unless intentional)
- Always redact and amend commits instead

## Testing Patterns

### TypeScript Compilation Check
```bash
# Always run before committing
npx tsc --noEmit

# Check for specific errors
npx tsc --noEmit 2>&1 | grep -A 5 "error TS"
```

### Dev Server Verification
```bash
# Check dev server is running
npm run dev

# Look for compilation errors in output
# Verify localhost:3000 is accessible
```

## Common Issues & Solutions

### Issue: Vercel Build Fails, Local Works
**Cause**: Uncommitted changes or cached build
**Solution**: 
1. Commit all changes: `git status`
2. Check what's deployed: `git log origin/main`
3. Verify TypeScript: `npx tsc --noEmit`

### Issue: GitHub Blocks Push with Secrets
**Cause**: Actual secrets in committed files
**Solution**:
1. Redact secrets in files
2. Stage redacted files: `git add [files]`
3. Amend commit: `git commit --amend --no-edit`
4. Push: `git push origin main`

### Issue: Subscription Tier Not Available
**Cause**: Profile not fetched or user not authenticated
**Solution**:
1. Check user is authenticated: `supabase.auth.getUser()`
2. Fetch profile: `supabase.from('profiles').select().single()`
3. Provide fallback: `subscriptionTier={profile?.subscription_tier || 'free'}`

### Issue: TypeScript Field Not Found
**Cause**: Field name mismatch between schema and usage
**Solution**:
1. Check validation schema field name
2. Update destructuring to match schema exactly
3. Update database operations to use same name
4. Run `npx tsc --noEmit` to verify
