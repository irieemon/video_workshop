# Video Ready Dashboard - Feature Specification

> **Status**: Draft
> **Created**: 2025-01-03
> **Last Updated**: 2025-01-03

## Overview

The Video Ready Dashboard is a dedicated "final step" page that provides users with a clear understanding that their AI prompt generation is complete and presents all available next actions in a unified, user-friendly interface.

### Problem Statement

The current video creation flow ends ambiguously after the AI roundtable discussion. Users:
- Don't clearly understand when prompt generation is complete
- Have actions scattered across the page (copy inline, generate in header)
- Lack guidance on next steps
- Cannot easily use their own API keys for generation

### Solution

A full-page "Your Prompt is Ready" dashboard that:
1. Clearly signals completion with a dedicated view
2. Consolidates all next-step actions in one place
3. Supports BYOK (Bring Your Own Key) for power users
4. Provides tiered experiences for Free/Premium users

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     VIDEO CREATION FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Brief Entry                                        │
│  └── User enters video concept                              │
│           ↓                                                  │
│  Step 2: AI Roundtable                                      │
│  └── Agents discuss and synthesize prompt                   │
│  └── "Continue to Final Step →" button appears              │
│           ↓ (user clicks)                                   │
│  Step 3: Video Ready Dashboard  ← NEW                       │
│  └── Full-page takeover with all actions                    │
│  └── Copy, Generate, Share, Open in Sora                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## URL Structure

| Route | Purpose |
|-------|---------|
| `/dashboard/videos/[id]/roundtable` | AI discussion (Steps 1-2) |
| `/dashboard/videos/[id]/ready` | **NEW** - Final step dashboard (Step 3) |

---

## Page Layout

### Desktop View (1200px+)

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back to Discussion                         Step 3 of 3 ━━━━━●  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                    ✨ Your Video Prompt is Ready!                  │
│                                                                    │
│          "Tom and Lyle riding a roller coaster..."                 │
│                  for TikTok · Created 2 minutes ago                │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌───────────────────────────┐  ┌───────────────────────────┐     │
│  │  📋 COPY PROMPT           │  │  🎬 GENERATE WITH SORA    │     │
│  │                           │  │                           │     │
│  │  Copy the optimized       │  │  Create video using       │     │
│  │  prompt to use anywhere   │  │  OpenAI Sora API          │     │
│  │                           │  │                           │     │
│  │  [Copy to Clipboard]      │  │  [Generate] 👑            │     │
│  └───────────────────────────┘  └───────────────────────────┘     │
│                                                                    │
│  ┌───────────────────────────┐  ┌───────────────────────────┐     │
│  │  🔗 OPEN IN SORA          │  │  📤 SHARE & EXPORT        │     │
│  │                           │  │                           │     │
│  │  Opens sora.com with      │  │  Share or download your   │     │
│  │  prompt copied            │  │  prompt and specs         │     │
│  │                           │  │                           │     │
│  │  [Open Sora →]            │  │  [Share ▼]                │     │
│  └───────────────────────────┘  └───────────────────────────┘     │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  🔑 API Configuration                                      │   │
│  │  Using: Your OpenAI Key (••••abc1) · Est. ~$0.50/video    │   │
│  │  [Change] [Manage Keys →]                                  │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ▼ View Optimized Prompt                                          │
│  ▼ View Technical Specifications                                  │
│  ▼ View Hashtags                                                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Mobile View (<768px)

- Actions stack vertically
- API config becomes a compact bar
- Collapsibles remain at bottom

---

## Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `VideoReadyDashboard` | `components/videos/video-ready-dashboard.tsx` | Main container component |
| `PromptActionCard` | `components/videos/prompt-action-card.tsx` | Action card (copy, generate, etc.) |
| `ApiKeyStatusBar` | `components/videos/api-key-status-bar.tsx` | BYOK inline status |
| `ShareExportMenu` | `components/videos/share-export-menu.tsx` | Share/export dropdown |
| `OpenInSoraButton` | `components/videos/open-in-sora-button.tsx` | Copy + redirect to Sora |
| `StepIndicator` | `components/ui/step-indicator.tsx` | Progress indicator |
| `ApiKeysSettings` | `components/settings/api-keys-settings.tsx` | Settings page section |

### Modified Components

| Component | Changes |
|-----------|---------|
| `VideoRoundtableClient` | Add "Continue to Final Step" CTA button |

---

## Feature Details

### 1. Copy Prompt

**Behavior:**
- Primary action for all users
- Copies optimized prompt to clipboard
- Shows success toast: "Prompt copied!"
- Button changes to "Copied ✓" for 2 seconds

**Implementation:**
```typescript
const handleCopyPrompt = async () => {
  await navigator.clipboard.writeText(optimizedPrompt)
  toast.success('Prompt copied to clipboard!')
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}
```

### 2. Generate with Sora

**Behavior by Tier:**

| Tier | Behavior |
|------|----------|
| Free (no key) | Shows upgrade dialog |
| Free (BYOK) | Generates using user's key |
| Premium | Generates using platform credits OR user's key |

**UI States:**
- Default: "Generate with Sora" + crown icon if premium-gated
- Processing: "Generating..." with spinner
- Success: Redirects to video with generated content

### 3. Open in Sora

**Behavior:**
1. Copy prompt to clipboard
2. Open `https://sora.com` in new tab
3. Show toast: "Prompt copied! Paste it in Sora"

**Note:** Sora doesn't support URL-based prompt injection, so this is the best UX available.

### 4. Share & Export

**Dropdown Options:**

| Option | Description |
|--------|-------------|
| Copy Link | Generates shareable link (requires `share_token` in DB) |
| Download PDF | Exports formatted prompt + specs as PDF |
| Export JSON | Downloads raw data for developers |
| Copy as Markdown | Formatted markdown to clipboard |

### 5. API Key Status (BYOK)

**States:**

| State | Display |
|-------|---------|
| No key configured | "No API key configured · [Add Key]" |
| Key configured | "Using your OpenAI key (••••abc1) · [Manage]" |
| Invalid key | "API key invalid · [Update Key]" (red warning) |

**Inline Toggle (Premium users):**
```
Generation method:
○ Use Scenra Credits (remaining: 10)
● Use Your API Key (••••abc1)
```

---

## Database Changes

### New Table: `user_api_keys`

```sql
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', etc.
  encrypted_key TEXT NOT NULL,
  key_suffix TEXT NOT NULL, -- last 4 chars for display
  key_name TEXT, -- user-friendly name: "Work Key", "Personal"
  is_valid BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider, key_name)
);

-- RLS Policy
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own keys"
  ON user_api_keys FOR ALL
  USING (auth.uid() = user_id);
```

### Videos Table Addition

```sql
ALTER TABLE videos
  ADD COLUMN share_token TEXT UNIQUE,
  ADD COLUMN is_public BOOLEAN DEFAULT false;

-- Index for share lookups
CREATE INDEX idx_videos_share_token ON videos(share_token) WHERE share_token IS NOT NULL;
```

---

## API Endpoints

### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/user/api-keys` | List user's API keys (masked) |
| POST | `/api/user/api-keys` | Add new API key |
| DELETE | `/api/user/api-keys/[id]` | Remove API key |
| POST | `/api/user/api-keys/[id]/validate` | Test key validity |
| POST | `/api/videos/[id]/share` | Generate share token |
| GET | `/api/share/[token]` | Public prompt view |

---

## Security Considerations

### API Key Storage

1. **Encryption at rest**: Keys encrypted using AES-256-GCM before storage
2. **Key derivation**: Encryption key derived from `ENCRYPTION_SECRET` env var
3. **Never log keys**: Strict logging rules to prevent key exposure
4. **Audit trail**: Log key usage (not the key itself)

```typescript
// Example encryption approach
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

export function encryptApiKey(key: string): { encrypted: string; iv: string; tag: string } {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  let encrypted = cipher.update(key, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  }
}
```

### Rate Limiting

- API key validation: 5 requests/minute
- Generation with BYOK: 20 requests/hour per user
- Share link creation: 10/day for free, unlimited for premium

---

## Implementation Phases

### Phase 1: Core Dashboard (MVP)
**Estimated: 2-3 days**

- [ ] Create `/dashboard/videos/[id]/ready/page.tsx`
- [ ] Build `VideoReadyDashboard` component
- [ ] Add "Continue to Final Step" button on roundtable page
- [ ] Implement Copy Prompt action card
- [ ] Move existing Sora generation to action card format
- [ ] Add step indicator header

### Phase 2: Enhanced Actions
**Estimated: 2 days**

- [ ] "Open in Sora" button with clipboard + redirect
- [ ] Share/Export dropdown component
- [ ] PDF export functionality
- [ ] JSON export functionality
- [ ] Shareable link system (DB + API)

### Phase 3: BYOK System
**Estimated: 3-4 days**

- [ ] Database: `user_api_keys` table + migration
- [ ] API endpoints for key management
- [ ] Settings page: API Keys section
- [ ] Key encryption/decryption utilities
- [ ] Inline status bar component
- [ ] Generation flow with key selection
- [ ] Cost estimation display

### Phase 4: Polish
**Estimated: 1-2 days**

- [ ] Page transitions/animations
- [ ] Mobile optimization
- [ ] Success celebration (subtle animation)
- [ ] Analytics events
- [ ] Error states and recovery
- [ ] Loading skeletons

---

## Acceptance Criteria

### Must Have (P0)
- [ ] User clearly understands this is the final step
- [ ] Can copy prompt with one click
- [ ] Can see all next-step options at a glance
- [ ] Free users see upgrade path, not dead end
- [ ] Works on mobile

### Should Have (P1)
- [ ] BYOK functionality end-to-end
- [ ] Share/Export options
- [ ] Open in Sora functionality
- [ ] Step progress indicator

### Nice to Have (P2)
- [ ] Cost estimation for BYOK users
- [ ] PDF export with branding
- [ ] Celebration animation on arrival
- [ ] "Create another video" quick action

---

## Open Questions

1. **Sora API Access**: Is direct Sora API available? Or only via ChatGPT Plus?
2. **Key Validation**: How often should we re-validate stored API keys?
3. **Share Privacy**: Should shared prompts include technical specs or just the main prompt?
4. **Analytics**: What events should we track for conversion optimization?

---

## Appendix: User Persona Flows

### Free User (No API Key)
```
Arrives at dashboard
→ Sees Copy Prompt (primary)
→ Sees "Generate with Sora" with upgrade prompt
→ Sees "Add your own API key" option
→ Can still copy prompt and use externally
```

### Free User (With BYOK)
```
Arrives at dashboard
→ Sees Copy Prompt
→ Sees "Generate with Sora" (enabled, uses their key)
→ Sees cost estimate
→ Full generation capability
```

### Premium User
```
Arrives at dashboard
→ Sees Copy Prompt
→ Sees "Generate with Sora" (can choose credits OR own key)
→ Full access to all features
→ Priority generation queue
```

---

**Document Version**: 1.0
**Author**: Claude Code Brainstorm Session
