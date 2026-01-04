# Scenra Studio - Test Implementation Plan

**Created:** 2026-01-04
**Target Completion:** 8 weeks
**Coverage Goal:** 4.5% → 80%

---

## Executive Summary

This document outlines a comprehensive plan to improve test coverage from the current **4.5%** to a production-quality **80%**. The plan prioritizes business-critical functionality (payments, authentication, core AI features) while systematically addressing all layers of the application.

---

## Current State Analysis

### Test Coverage Summary

| Category | Current Coverage | Target | Status |
|----------|-----------------|--------|--------|
| **Overall** | ~4.5% | 80% | Critical |
| `lib/ai/` | 8.57% | 85% | Critical |
| `lib/stripe/` | 37.7% | 90% | High |
| `lib/hooks/` | 0% | 80% | High |
| `components/` | <5% | 75% | Medium |
| `app/api/` | <10% | 85% | Critical |

### Test Suite Status

| Status | Count | Percentage |
|--------|-------|------------|
| Passing | 5 suites | 36% |
| Failing | 5 suites | 36% |
| Skipped | 4 suites | 28% |
| **Total** | 14 suites | 100% |

### Individual Test Status

| Status | Count | Percentage |
|--------|-------|------------|
| Passing | 57 tests | 54% |
| Failing | 12 tests | 11% |
| Skipped | 37 tests | 35% |
| **Total** | 106 tests | 100% |

---

## Root Cause Analysis

### Why Tests Are Failing

1. **Schema Changes Not Reflected**
   - `series_id` is now required but tests don't provide it
   - Video creation tests missing mandatory fields

2. **Supabase Mock Chain Issues**
   - Mock doesn't support full query chain (`.select().eq().limit()`)
   - Error: `supabase.from(...).select(...).eq is not a function`

3. **Radix UI Component Issues**
   - Missing browser APIs in test environment
   - Error: `target.hasPointerCapture is not a function`

4. **OpenAI Mock Complexity**
   - Agent orchestrator tests require 11+ sequential mock responses
   - Tests skipped due to setup complexity

---

## Implementation Strategy

### Priority Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1: CRITICAL (Week 1-2)                                     │
│  Payment processing, authentication, core AI orchestration      │
│  Impact: Revenue loss, security vulnerabilities                 │
├─────────────────────────────────────────────────────────────────┤
│  TIER 2: HIGH (Week 3-4)                                         │
│  Episode segmentation, continuity validation, API routes        │
│  Impact: Core feature failures                                   │
├─────────────────────────────────────────────────────────────────┤
│  TIER 3: MEDIUM (Week 5-6)                                       │
│  Validation schemas, React hooks, utilities                     │
│  Impact: User experience degradation                            │
├─────────────────────────────────────────────────────────────────┤
│  TIER 4: LOW (Week 7-8)                                          │
│  UI components, visual elements                                  │
│  Impact: Visual/UX issues                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Fix Existing Failures (Days 1-3)

### Objective
Get all existing tests passing before adding new tests.

### Tasks

#### 1.1 Fix Supabase Mock Chain
**File:** `jest.setup.ts`

```typescript
// Enhanced Supabase mock with full chain support
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    from: jest.fn((table) => {
      const chainable = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        then: jest.fn((resolve) => resolve({ data: [], error: null })),
      };
      return chainable;
    }),
  })),
}));
```

#### 1.2 Add Radix UI Polyfill
**File:** `jest.setup.ts`

```typescript
// Polyfill for Radix UI components
Object.defineProperty(Element.prototype, 'hasPointerCapture', {
  value: jest.fn().mockReturnValue(false),
});

Object.defineProperty(Element.prototype, 'setPointerCapture', {
  value: jest.fn(),
});

Object.defineProperty(Element.prototype, 'releasePointerCapture', {
  value: jest.fn(),
});
```

#### 1.3 Update Test Data for Schema Changes
**Files to update:**
- `__tests__/app/api/videos/route.test.ts`
- `__tests__/app/api/series/route.test.ts`

Add `series_id` to all video creation test data:
```typescript
const mockVideoData = {
  projectId: '...',
  seriesId: '550e8400-e29b-41d4-a716-446655440001', // ADD THIS
  title: 'Test Video',
  // ... rest of fields
};
```

---

## Phase 2: Critical New Tests (Days 4-14)

### 2.1 Stripe/Payment Tests

#### File: `__tests__/lib/stripe/usage.test.ts`

```typescript
// Test coverage for quota checking
describe('Stripe Usage', () => {
  describe('checkQuota', () => {
    it('allows premium users unlimited usage');
    it('enforces limits for free tier users');
    it('returns correct status at limit boundary');
    it('handles database errors gracefully');
  });

  describe('enforceQuota', () => {
    it('returns allowed response when under limit');
    it('returns quota exceeded response when over limit');
    it('includes upgrade URL in exceeded response');
  });

  describe('incrementUsage', () => {
    it('increments usage count correctly');
    it('handles concurrent increment calls');
    it('returns success flag');
  });

  describe('decrementUsage', () => {
    it('decrements usage count correctly');
    it('does not go below zero');
  });
});
```

#### File: `__tests__/app/api/stripe/webhook/route.test.ts`

```typescript
describe('Stripe Webhook', () => {
  describe('signature validation', () => {
    it('rejects invalid signatures');
    it('accepts valid signatures');
  });

  describe('checkout.session.completed', () => {
    it('updates user subscription tier');
    it('creates stripe_customer_id mapping');
  });

  describe('customer.subscription.updated', () => {
    it('handles upgrade to premium');
    it('handles downgrade to free');
    it('handles cancellation');
  });

  describe('invoice.payment_failed', () => {
    it('handles failed payment gracefully');
    it('does not immediately downgrade');
  });
});
```

### 2.2 Authentication Tests

#### File: `__tests__/lib/supabase/middleware.test.ts`

```typescript
describe('Supabase Middleware', () => {
  describe('updateSession', () => {
    it('refreshes expired sessions');
    it('redirects unauthenticated users from protected routes');
    it('allows authenticated users through');
    it('allows public routes without auth');
  });
});
```

### 2.3 Agent Orchestrator Tests (Fix Skipped)

**File:** `__tests__/lib/ai/agent-orchestrator.test.ts`

```typescript
// Create reusable mock factory
function createOpenAIMockResponses(config: {
  agentResponses: string[];
  synthesisResponse: object;
}) {
  const mockCreate = jest.fn();

  // Set up sequential responses
  config.agentResponses.forEach((response, i) => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ response }) } }],
    });
  });

  // Final synthesis
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify(config.synthesisResponse) } }],
  });

  return mockCreate;
}

describe('Agent Orchestrator', () => {
  // Remove .skip - these should now pass
  describe('runAgentRoundtable', () => {
    it('orchestrates 5 agents over 2 rounds');
    it('synthesizes responses into final prompt');
    it('filters non-string hashtags');
    it('respects character count limits');
  });
});
```

---

## Phase 3: AI Layer Tests (Days 15-28)

### 3.1 Episode Segmenter

#### File: `__tests__/lib/ai/episode-segmenter.test.ts`

```typescript
describe('Episode Segmenter', () => {
  describe('segmentEpisode', () => {
    it('creates segments between 8-12 seconds');
    it('prefers scene boundaries for splits');
    it('estimates dialogue duration correctly (2.5 words/sec)');
    it('estimates action duration correctly (2s fixed)');
    it('creates continuity chain with preceding/following IDs');
    it('handles empty episodes gracefully');
    it('handles single-scene episodes');
  });

  describe('findNaturalBreakPoints', () => {
    it('identifies scene boundaries');
    it('identifies dialogue exchange endings');
    it('ranks break points by quality');
  });

  describe('generateNarrativeBeat', () => {
    it('creates meaningful segment descriptions');
    it('includes character names');
    it('includes key actions');
  });
});
```

### 3.2 Continuity Validator

#### File: `__tests__/lib/ai/continuity-validator.test.ts`

```typescript
describe('Continuity Validator', () => {
  describe('validateContinuity', () => {
    it('detects missing characters (high severity)');
    it('detects lighting changes (medium severity)');
    it('detects camera jumps (medium severity)');
    it('detects mood shifts (low severity)');
    it('returns valid for consistent segments');
    it('calculates overall score correctly');
  });

  describe('scoring', () => {
    it('passes normal mode at score >= 75');
    it('passes strict mode at score >= 90');
    it('fails below threshold');
  });

  describe('autoCorrection', () => {
    it('suggests character reintroduction');
    it('suggests lighting transition');
    it('returns null when no correction possible');
  });
});
```

### 3.3 Visual State Extractor

#### File: `__tests__/lib/ai/visual-state-extractor.test.ts`

```typescript
describe('Visual State Extractor', () => {
  describe('extractVisualState', () => {
    it('extracts final frame description');
    it('extracts character positions');
    it('extracts lighting state');
    it('extracts camera position');
    it('extracts mood/atmosphere');
    it('extracts key visual elements array');
    it('handles malformed AI responses');
  });

  describe('buildContinuityContext', () => {
    it('formats previous visual state for prompt');
    it('handles null previous state');
    it('prioritizes recent state over anchor');
  });
});
```

---

## Phase 4: Hooks & Utilities (Days 29-42)

### 4.1 React Hooks

#### File: `__tests__/lib/hooks/use-usage.test.ts`

```typescript
describe('useUsage', () => {
  it('fetches usage data on mount');
  it('returns loading state initially');
  it('returns usage status after fetch');
  it('handles fetch errors');
  it('provides refetch function');
  it('uses SWR caching');
});
```

#### File: `__tests__/lib/hooks/use-videos-filters.test.ts`

```typescript
describe('useVideosFilters', () => {
  it('initializes with default filters');
  it('updates platform filter');
  it('updates search query');
  it('updates date range');
  it('resets all filters');
  it('persists filters to URL');
});
```

### 4.2 Validation Schemas

#### File: `__tests__/lib/validation/character-consistency.test.ts`

```typescript
describe('Character Consistency Validation', () => {
  it('validates required character fields');
  it('validates visual fingerprint format');
  it('validates performance style enum');
  it('rejects invalid role values');
  it('validates visual cues structure');
});
```

### 4.3 Utility Functions

#### File: `__tests__/lib/utils/screenplay-parser.test.ts`

```typescript
describe('Screenplay Parser', () => {
  describe('parseScreenplay', () => {
    it('parses standard screenplay format');
    it('extracts scene headings');
    it('extracts character names');
    it('extracts dialogue blocks');
    it('extracts action lines');
    it('handles parentheticals');
  });
});
```

---

## Phase 5: Component Tests (Days 43-56)

### 5.1 Billing Components

#### File: `__tests__/components/billing/usage-indicator.test.tsx`

```typescript
describe('UsageIndicator', () => {
  it('renders usage progress bar');
  it('shows percentage used');
  it('changes color at warning threshold');
  it('changes color at limit');
  it('shows upgrade button when near limit');
});
```

### 5.2 Video Components

#### File: `__tests__/components/videos/sora-generation-modal.test.tsx`

```typescript
describe('SoraGenerationModal', () => {
  it('renders modal when open');
  it('shows generation progress');
  it('handles API key validation');
  it('shows success state');
  it('shows error state');
  it('closes on completion');
});
```

### 5.3 Series Components

#### File: `__tests__/components/series/character-manager.test.tsx`

```typescript
describe('CharacterManager', () => {
  it('renders character list');
  it('opens create dialog');
  it('handles character creation');
  it('handles character editing');
  it('handles character deletion');
  it('validates required fields');
});
```

---

## Test Infrastructure Improvements

### New Helper Files

#### `__tests__/helpers/stripe-test-helpers.ts`

```typescript
export function createMockStripeEvent(type: string, data: object) {
  return {
    id: `evt_test_${Date.now()}`,
    type,
    data: { object: data },
    created: Math.floor(Date.now() / 1000),
  };
}

export function createMockCheckoutSession(overrides?: Partial<Stripe.Checkout.Session>) {
  return {
    id: 'cs_test_123',
    customer: 'cus_test_123',
    subscription: 'sub_test_123',
    mode: 'subscription',
    ...overrides,
  };
}
```

#### `__tests__/helpers/openai-test-helpers.ts`

```typescript
export function createMockAgentResponse(content: object) {
  return {
    choices: [{
      message: {
        content: JSON.stringify(content),
      },
    }],
  };
}

export function createMockRoundtableSequence(agentCount: number, rounds: number) {
  const responses = [];
  for (let r = 0; r < rounds; r++) {
    for (let a = 0; a < agentCount; a++) {
      responses.push(createMockAgentResponse({
        response: `Agent ${a} Round ${r + 1} response`,
      }));
    }
  }
  return responses;
}
```

### Test Data Factories

#### `__tests__/factories/video.factory.ts`

```typescript
export function createTestVideo(overrides?: Partial<Video>): Video {
  return {
    id: crypto.randomUUID(),
    title: 'Test Video',
    user_id: 'test-user-id',
    series_id: crypto.randomUUID(),
    optimized_prompt: 'Test optimized prompt',
    character_count: 100,
    platform: 'tiktok',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
```

---

## Coverage Configuration Update

### Update `jest.config.ts`

```typescript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
  // Critical paths require higher coverage
  './lib/stripe/**/*.ts': {
    branches: 85,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  './lib/ai/agent-orchestrator.ts': {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85,
  },
},
```

---

## Timeline Summary

| Week | Phase | Focus | Coverage Target |
|------|-------|-------|-----------------|
| 1 | 1 | Fix failures + Payment tests | 15% |
| 2 | 2 | Auth + Agent orchestrator | 25% |
| 3 | 3 | Episode segmenter + Continuity | 40% |
| 4 | 3 | Visual state + API routes | 50% |
| 5 | 4 | Hooks + Validation | 60% |
| 6 | 4 | Utilities | 70% |
| 7 | 5 | Billing + Video components | 75% |
| 8 | 5 | Series components + Polish | 80% |

---

## Success Metrics

### Quantitative

- [ ] Overall coverage: 80%+
- [ ] Critical paths coverage: 90%+
- [ ] All 14 test suites passing
- [ ] 0 skipped tests
- [ ] All tests complete in <30 seconds

### Qualitative

- [ ] No mocking shortcuts (proper isolation)
- [ ] Test data factories for consistency
- [ ] Clear test descriptions (Given/When/Then)
- [ ] Edge cases covered
- [ ] Error paths tested

---

## Risk Mitigation

### Risks

1. **AI Response Mocking Complexity**
   - Mitigation: Create reusable mock factories
   - Fallback: Higher-level integration tests

2. **Stripe Webhook Testing**
   - Mitigation: Use Stripe's test fixtures
   - Fallback: E2E tests with Stripe test mode

3. **Component State Complexity**
   - Mitigation: Break into smaller testable units
   - Fallback: E2E coverage for complex flows

4. **Time Constraints**
   - Mitigation: Prioritize Tier 1-2 first
   - Fallback: Adjust coverage targets if needed

---

## Appendix: Test File Inventory

### Existing Test Files (14)

```
__tests__/
├── app/api/
│   ├── auth/signout/route.test.ts
│   ├── agent/roundtable/advanced/route.test.ts
│   ├── projects/route.test.ts
│   ├── series/route.test.ts
│   ├── videos/route.test.ts
│   └── videos/performance/*.test.ts (2)
├── components/
│   ├── performance/*.test.tsx (2)
│   └── videos/*.test.tsx (4)
├── lib/ai/
│   └── agent-orchestrator.test.ts
└── helpers/
    └── api-route-test-helpers.ts
```

### New Test Files to Create (~25)

```
__tests__/
├── lib/stripe/
│   ├── usage.test.ts
│   ├── server.test.ts
│   └── config.test.ts
├── lib/ai/
│   ├── episode-segmenter.test.ts
│   ├── continuity-validator.test.ts
│   ├── visual-state-extractor.test.ts
│   └── screenplay-to-prompt.test.ts
├── lib/hooks/
│   ├── use-usage.test.ts
│   └── use-videos-filters.test.ts
├── lib/validation/
│   ├── character-consistency.test.ts
│   └── series-concept-validator.test.ts
├── lib/utils/
│   └── screenplay-parser.test.ts
├── lib/supabase/
│   └── middleware.test.ts
├── app/api/stripe/
│   ├── webhook/route.test.ts
│   ├── checkout/route.test.ts
│   └── subscription/route.test.ts
├── app/api/segments/
│   └── generate-video/route.test.ts
├── components/billing/
│   ├── usage-indicator.test.tsx
│   └── upgrade-prompt-dialog.test.tsx
├── components/videos/
│   ├── sora-generation-modal.test.tsx
│   └── video-ready-dashboard.test.tsx
├── components/series/
│   └── character-manager.test.tsx
├── helpers/
│   ├── stripe-test-helpers.ts
│   └── openai-test-helpers.ts
└── factories/
    ├── video.factory.ts
    ├── series.factory.ts
    └── segment.factory.ts
```

---

**Document Maintainer:** Claude Code
**Review Schedule:** Weekly during implementation
