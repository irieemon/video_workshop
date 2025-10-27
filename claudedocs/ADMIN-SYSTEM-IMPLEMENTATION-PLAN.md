# Admin System & Rate Limiting Implementation Plan

## Overview
Implementation plan for re-enabling rate limiting on video creation with admin controls, creating an admin dashboard, and setting up default admin user.

**Date**: 2025-10-25
**Status**: Planning Phase
**Priority**: High

---

## Requirements Summary

1. **Re-enable Rate Limiting**
   - Currently disabled (see `app/api/videos/route.ts:84-105`)
   - Enable quota enforcement for video creation
   - Free tier: 10 videos/month (existing quota structure)

2. **Admin Exception System**
   - `test@example.com` gets unlimited video generations
   - Extensible system for future admin users
   - Check admin status before rate limit enforcement

3. **Admin Dashboard**
   - View all users and their usage
   - Manage admin privileges
   - System health monitoring
   - Analytics overview

4. **Default Admin User**
   - Set up during app initialization
   - Persistent admin role in database
   - Secure authentication

---

## Architecture Decisions

### 1. Admin Role Storage

**Decision**: Add `is_admin` field to `profiles` table

**Rationale**:
- Simple and performant (no JOIN needed for auth checks)
- Leverages existing RLS policies
- Easy to query for admin-only routes
- Follows existing schema patterns

**Alternative Considered**: Separate `admins` table
- Rejected: Over-engineered for current scale
- Can migrate later if role complexity increases

### 2. Rate Limit Bypass Strategy

**Decision**: Check `is_admin` before rate limit and quota checks

**Flow**:
```typescript
1. Authenticate user
2. Fetch profile (including is_admin flag)
3. IF is_admin → bypass all limits
4. ELSE → apply rate limiting + quota enforcement
```

**Rationale**:
- Clean separation of concerns
- Easy to understand and maintain
- No changes needed to rate limiting logic
- Centralized admin check

### 3. Admin Dashboard Location

**Decision**: Create `/admin` route with separate layout

**Structure**:
```
app/admin/
├── layout.tsx          # Admin-only layout with middleware check
├── page.tsx            # Dashboard overview
├── users/
│   └── page.tsx        # User management
└── system/
    └── page.tsx        # System health monitoring
```

**Rationale**:
- Clear separation from user dashboard
- Easy to add more admin features
- Can apply admin-only middleware at layout level
- Professional admin interface design

### 4. Default Admin Setup

**Decision**: Database migration + environment variable

**Implementation**:
```sql
-- Migration adds is_admin field and sets default admin
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
UPDATE profiles SET is_admin = TRUE WHERE email = 'test@example.com';
```

**Environment Variable**:
```bash
ADMIN_EMAILS=test@example.com,admin@example.com
```

**Rationale**:
- Migration ensures schema consistency
- Env variable allows flexible admin configuration
- No hardcoded emails in codebase
- Easy to add more admins without code changes

---

## Implementation Tasks

### Phase 1: Database Schema (30 min)

**Tasks**:
1. Create migration file: `add-admin-role.sql`
2. Add `is_admin` boolean column to profiles table
3. Create index on `is_admin` for performance
4. Update default admin user(s) based on ADMIN_EMAILS env var
5. Update RLS policies if needed

**Files**:
- `supabase-migrations/add-admin-role.sql` (new)

**SQL**:
```sql
-- Add admin role to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for admin checks (performance)
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;

-- Set default admin (will be replaced by env-based setup)
UPDATE profiles
SET is_admin = TRUE
WHERE email = 'test@example.com';

-- Add comment for documentation
COMMENT ON COLUMN profiles.is_admin IS 'Flag indicating if user has admin privileges (unlimited generations, admin dashboard access)';
```

### Phase 2: TypeScript Types (15 min)

**Tasks**:
1. Update `Database` interface in `database.types.ts`
2. Add admin-specific types for dashboard data

**Files**:
- `lib/types/database.types.ts` (modify)
- `lib/types/admin.types.ts` (new)

**Types to Add**:
```typescript
// database.types.ts - Update profiles Row/Insert/Update
profiles: {
  Row: {
    // ... existing fields
    is_admin: boolean
  }
}

// admin.types.ts - New file
export interface AdminUserSummary {
  id: string
  email: string
  full_name: string | null
  subscription_tier: 'free' | 'premium'
  is_admin: boolean
  created_at: string
  usage_current: {
    videos_this_month: number
    consultations_this_month: number
  }
  usage_quota: {
    videos_per_month: number
    consultations_per_month: number
  }
}

export interface SystemStats {
  total_users: number
  total_admins: number
  total_videos: number
  videos_this_month: number
  active_users_30d: number
  free_tier_users: number
  premium_users: number
}
```

### Phase 3: Rate Limit Bypass Logic (30 min)

**Tasks**:
1. Update `checkRateLimit` to accept optional `skipCheck` parameter
2. Modify `/api/videos/route.ts` POST to check admin status
3. Re-enable quota enforcement with admin bypass
4. Add logging for admin actions

**Files**:
- `lib/rate-limit/index.ts` (modify)
- `app/api/videos/route.ts` (modify)

**Implementation**:

```typescript
// lib/rate-limit/index.ts - Add bypass parameter
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  skipCheck: boolean = false // NEW
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  bypassed?: boolean; // NEW
} {
  // Admin bypass
  if (skipCheck) {
    return {
      allowed: true,
      remaining: 999999,
      resetTime: Date.now() + config.interval,
      bypassed: true,
    };
  }

  // ... existing logic
}

// app/api/videos/route.ts - POST handler
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get profile to check admin status
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1)

  const profile = profiles?.[0]
  const isAdmin = profile?.is_admin || false

  // Rate limiting with admin bypass
  const rateLimitKey = createRateLimitKey(user.id, 'videos:create')
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.WRITE, isAdmin)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      createRateLimitResponse(rateLimit),
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  // Quota enforcement with admin bypass
  if (!isAdmin && profile.subscription_tier === 'free') {
    const currentVideos = profile.usage_current?.videos_this_month || 0
    const maxVideos = profile.usage_quota?.videos_per_month || 10

    if (currentVideos >= maxVideos) {
      logger.warn('Quota exceeded', { tier: profile.subscription_tier })
      return NextResponse.json(
        {
          error: 'Monthly video limit reached',
          code: 'QUOTA_EXCEEDED',
          message: `Free tier is limited to ${maxVideos} videos per month.`,
        },
        { status: 429 }
      )
    }
  }

  // Log admin actions
  if (isAdmin) {
    logger.info('Admin video creation (limits bypassed)', { userId: user.id })
  }

  // ... rest of existing video creation logic
}
```

### Phase 4: Admin Middleware (20 min)

**Tasks**:
1. Create admin authentication middleware
2. Add route protection for `/admin/*` routes
3. Handle unauthorized access gracefully

**Files**:
- `middleware.ts` (modify)
- `lib/middleware/admin-auth.ts` (new)

**Implementation**:

```typescript
// lib/middleware/admin-auth.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function adminAuthMiddleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => response.cookies.set(name, value, options),
        remove: (name, options) => response.cookies.set(name, '', options),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// middleware.ts - Add admin route protection
import { adminAuthMiddleware } from '@/lib/middleware/admin-auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin routes
  if (pathname.startsWith('/admin')) {
    return adminAuthMiddleware(request)
  }

  // ... existing middleware logic
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*', // NEW
    // ... existing matchers
  ],
}
```

### Phase 5: Admin API Routes (45 min)

**Tasks**:
1. Create `/api/admin/users` - List all users with usage stats
2. Create `/api/admin/stats` - System-wide statistics
3. Create `/api/admin/users/[id]` - Update user admin status
4. Add proper error handling and logging

**Files**:
- `app/api/admin/users/route.ts` (new)
- `app/api/admin/stats/route.ts` (new)
- `app/api/admin/users/[id]/route.ts` (new)

**Example: GET /api/admin/users**:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all users (admin only)
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, subscription_tier, is_admin, created_at, usage_current, usage_quota')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  return NextResponse.json(users)
}
```

### Phase 6: Admin Dashboard UI (90 min)

**Tasks**:
1. Create admin layout with navigation
2. Build dashboard overview page
3. Build user management page
4. Add system stats component
5. Style with shadcn/ui components

**Files**:
- `app/admin/layout.tsx` (new)
- `app/admin/page.tsx` (new)
- `app/admin/users/page.tsx` (new)
- `components/admin/user-table.tsx` (new)
- `components/admin/stats-cards.tsx` (new)

**Dashboard Features**:
- Total users count
- Total videos created
- Active users (30 days)
- Monthly video generation trend
- User list with search/filter
- Toggle admin status button
- Usage statistics per user

### Phase 7: Environment Setup & Migration Script (30 min)

**Tasks**:
1. Update `.env.local` with ADMIN_EMAILS
2. Create migration script to apply admin role
3. Document environment variables
4. Test migration locally

**Files**:
- `.env.local` (modify)
- `scripts/setup-admin.sh` (new)
- `README.md` (update)

**Script**:
```bash
#!/bin/bash
# scripts/setup-admin.sh

# Load environment variables
source .env.local

# Apply migration
psql "$SUPABASE_DB_URL" -f supabase-migrations/add-admin-role.sql

# Set admin users from env var
IFS=',' read -ra EMAILS <<< "$ADMIN_EMAILS"
for email in "${EMAILS[@]}"; do
  psql "$SUPABASE_DB_URL" -c "UPDATE profiles SET is_admin = TRUE WHERE email = '$email';"
  echo "✅ Set $email as admin"
done

echo "✅ Admin setup complete"
```

---

## Testing Checklist

### Unit Tests
- [ ] Rate limit bypass for admin users
- [ ] Quota enforcement skipped for admins
- [ ] Admin middleware authentication
- [ ] Admin API routes authorization

### Integration Tests
- [ ] Admin user can create unlimited videos
- [ ] Regular user hits quota limit correctly
- [ ] Admin dashboard loads for admin users
- [ ] Non-admin redirected from /admin routes
- [ ] Admin can toggle user admin status

### E2E Tests
- [ ] Create video as regular user (quota enforced)
- [ ] Create video as admin user (unlimited)
- [ ] Access admin dashboard
- [ ] View user list and statistics
- [ ] Toggle admin status for user

---

## Security Considerations

### 1. Admin Privilege Escalation Prevention
- Only existing admins can grant admin status
- Admin status changes are logged
- Middleware validates admin status on every request
- No client-side admin checks (server-only validation)

### 2. Rate Limit Bypass Logging
- Log all admin actions that bypass limits
- Include timestamp, user ID, action type
- Monitor for abuse patterns
- Alerting for suspicious admin activity

### 3. Admin Dashboard Access Control
- Server-side middleware enforcement
- No admin UI visible to non-admins
- API routes check admin status independently
- RLS policies still apply to admin queries

### 4. Environment Variable Security
- ADMIN_EMAILS not exposed to client
- Server-only variable (no NEXT_PUBLIC_ prefix)
- Migration script uses secure connection
- Document in .env.example, not .env

---

## Deployment Steps

### 1. Pre-Deployment
```bash
# Update .env with admin emails
echo "ADMIN_EMAILS=test@example.com" >> .env.local

# Run migration locally
npm run db:migrate

# Test admin setup
npm run test:e2e -- admin
```

### 2. Deployment
```bash
# Commit changes
git add .
git commit -m "feat: admin system with rate limit bypass"

# Deploy to Vercel
git push origin main

# Vercel auto-deploys
```

### 3. Post-Deployment
```bash
# Run migration on production database
npm run db:migrate:prod

# Verify admin users
psql $PRODUCTION_DB_URL -c "SELECT email, is_admin FROM profiles WHERE is_admin = TRUE;"

# Test admin dashboard
open https://app.example.com/admin
```

---

## Rollback Plan

If issues arise after deployment:

### 1. Disable Admin Features
```typescript
// Quick fix: disable admin bypass in code
const isAdmin = false // Force disable
```

### 2. Revert Migration
```sql
-- Remove admin column
ALTER TABLE profiles DROP COLUMN is_admin;
DROP INDEX IF EXISTS idx_profiles_is_admin;
```

### 3. Revert Code
```bash
git revert HEAD
git push origin main
```

---

## Future Enhancements

### Phase 2 Features (Not in Initial Scope)
- Role-based permissions (admin, moderator, user)
- Admin activity audit log
- User suspension/ban functionality
- Bulk user operations
- Analytics dashboard with charts
- Email notifications for admin actions
- API key management for admins
- System health monitoring
- Database backup management

---

## Estimated Timeline

**Total**: ~4.5 hours

- Phase 1: Database Schema - 30 min
- Phase 2: TypeScript Types - 15 min
- Phase 3: Rate Limit Logic - 30 min
- Phase 4: Admin Middleware - 20 min
- Phase 5: Admin API Routes - 45 min
- Phase 6: Admin Dashboard UI - 90 min
- Phase 7: Environment Setup - 30 min
- Testing: 30 min
- Documentation: 20 min

---

## Success Criteria

✅ **Functional Requirements**:
- [ ] Rate limiting re-enabled for video creation
- [ ] test@example.com has unlimited generations
- [ ] Admin dashboard accessible at `/admin`
- [ ] User management features work correctly
- [ ] System stats display accurate data

✅ **Non-Functional Requirements**:
- [ ] No performance regression on video creation
- [ ] Admin checks add <50ms latency
- [ ] All existing tests still pass
- [ ] New features have ≥80% test coverage
- [ ] Documentation is complete and accurate

✅ **Security Requirements**:
- [ ] Admin routes protected by middleware
- [ ] Admin API routes validate admin status
- [ ] No admin privilege escalation vulnerabilities
- [ ] Admin actions are logged
- [ ] Environment variables are secure

---

## References

**Existing Code**:
- Rate limiting: `lib/rate-limit/index.ts`
- Video creation API: `app/api/videos/route.ts`
- Profiles schema: `lib/types/database.types.ts`
- Middleware: `middleware.ts`

**Documentation**:
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- shadcn/ui: https://ui.shadcn.com

---

**Status**: Ready for Implementation
**Approval Required**: Yes
**Breaking Changes**: No (only re-enabling existing quota system)
