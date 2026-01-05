# Test Coverage Improvement Plan

**Created**: 2026-01-04
**Last Updated**: 2026-01-04
**Current Test Count**: 1511 tests ✅ (up from 1438)
**Goal**: Achieve >80% coverage across all critical modules

---

## Current Coverage Summary

| Module | Current Coverage | Target | Priority |
|--------|-----------------|--------|----------|
| `lib/validation/` | 100% ✅ | 100% | Complete |
| `lib/services/` | 99% ✅ | 100% | Complete |
| `lib/ai/continuity-validator.ts` | 99% ✅ | 100% | Complete |
| `lib/ai/episode-segmenter.ts` | ~80% ✅ | 80% | Complete |
| `lib/ai/performance-analyzer.ts` | ~80% ✅ | 80% | Complete |
| `lib/ai/screenplay-context.ts` | ~85% ✅ | 70% | Complete |
| `lib/ai/screenplay-to-prompt.ts` | ~90% ✅ | 80% | Complete |
| `lib/encryption/api-key-encryption.ts` | ~95% ✅ | 90% | Complete |
| `lib/hooks/use-usage.ts` | ~90% ✅ | 70% | Complete |
| `lib/hooks/use-videos-filters.ts` | ~95% ✅ | 70% | Complete |
| `lib/stripe/config.ts` | ~100% ✅ | 80% | Complete |
| `lib/stripe/usage.ts` | ~90% ✅ | 80% | Complete |
| `lib/stripe/server.ts` | ~85% ✅ | 80% | Complete |
| `lib/logger/` | 90.9% | 95% | Low |
| `lib/rate-limit/` | 82.2% | 90% | Medium |
| `lib/types/` | 4.4% | 50% | Low |
| `lib/analytics/events.ts` | ~85% ✅ | 60% | Complete |
| `lib/analytics/use-analytics.ts` | ~85% ✅ | 60% | Complete |
| `lib/hooks/use-confetti.ts` | ~80% ✅ | 30% | Complete |
| `lib/middleware/admin-auth.ts` | ~90% ✅ | 80% | Complete |
| `lib/supabase/` | 0% | 50% | Low |

---

## Priority 1: Critical Business Logic (lib/utils)

### Files to Test
| File | Lines | Complexity | Business Impact |
|------|-------|------------|-----------------|
| `screenplay-parser.ts` | ~200 | High | Core screenplay parsing |
| `screenplay-to-sora.ts` | ~150 | High | Prompt generation |

### Test Strategy
- Unit tests for parsing edge cases (empty input, malformed format)
- Integration tests with sample screenplay data
- Boundary tests for character limits and special characters

### Estimated Tests: 25-30

---

## Priority 2: AI Orchestration (lib/ai)

### Files to Test
| File | Lines | Current | Target |
|------|-------|---------|--------|
| `episode-segmenter.ts` | 515 | ~80% ✅ | 80% |
| `performance-analyzer.ts` | 206 | ~80% ✅ | 80% |
| `screenplay-context.ts` | 255 | ~85% ✅ | 70% |
| `screenplay-to-prompt.ts` | 217 | ~90% ✅ | 80% |
| `vision-analysis.ts` | 140 | 0% | 70% |
| `visual-state-extractor.ts` | ~285 | 33% | 80% |
| `agent-orchestrator.ts` | ~918 | 12% | 50% |
| `agent-orchestrator-stream.ts` | ~805 | 10% | 50% |

### Test Strategy
- Mock OpenAI API responses for deterministic testing
- Test error handling and retry logic
- Validate prompt formatting and token counting
- Test streaming behavior with mock streams

### Estimated Tests: 60-80

---

## Priority 3: Security & Encryption (lib/encryption)

### Files to Test
| File | Lines | Complexity | Security Impact |
|------|-------|------------|-----------------|
| `api-key-encryption.ts` | 178 | Medium | **Critical** - API key security |

### Test Strategy
- Encryption/decryption round-trip tests
- Key rotation handling
- Error cases (invalid keys, corrupted data)
- Edge cases (empty strings, unicode)

### Estimated Tests: 15-20

---

## Priority 4: React Hooks (lib/hooks)

### Files to Test
| File | Lines | Type |
|------|-------|------|
| `use-usage.ts` | 190 | Data fetching |
| `use-videos-filters.ts` | 136 | State management |
| `use-confetti.ts` | 180 | Animation |

### Test Strategy
- Use `@testing-library/react-hooks`
- Mock Supabase client
- Test state transitions and side effects
- Test cleanup on unmount

### Estimated Tests: 25-30

---

## Priority 5: Stripe Integration (lib/stripe)

### Current Coverage: 57.3%

### Files to Test
| File | Current | Target |
|------|---------|--------|
| `stripe-client.ts` | ~60% | 85% |
| `billing-helpers.ts` | ~55% | 85% |
| `webhook-handlers.ts` | ~50% | 80% |

### Test Strategy
- Mock Stripe SDK
- Test subscription lifecycle
- Test webhook signature verification
- Test error handling for API failures

### Estimated Tests: 20-25

---

## Priority 6: Middleware (lib/middleware)

### Files to Test
| File | Lines | Security Impact |
|------|-------|-----------------|
| `admin-auth.ts` | 130 | **High** - Admin access control |

### Test Strategy
- Test authentication flow
- Test role-based access control
- Test error responses for unauthorized access

### Estimated Tests: 10-15

---

## Priority 7: API Routes with Low Coverage

### Routes Needing Tests
| Route | Current | Target |
|-------|---------|--------|
| `api/agent/roundtable/advanced` | 4.7% | 70% |
| `api/series/[seriesId]/characters/[characterId]/analyze-image` | 0% | 80% |
| `api/series/[seriesId]/characters/[characterId]/upload-visual-cue` | 0% | 80% |
| `api/videos/[id]/sora-status` | 36% | 80% |

### Test Strategy
- Mock Supabase queries
- Test authentication and authorization
- Test validation and error handling
- Test success paths with mocked external services

### Estimated Tests: 30-40

---

## Implementation Order

### Phase 1 (Immediate - High Impact) ✅ COMPLETE
1. ✅ `lib/validation/` - Complete
2. ✅ `lib/services/series-context.ts` - Complete
3. ✅ `lib/ai/continuity-validator.ts` - Complete
4. ✅ `lib/utils/screenplay-parser.ts` - 44 tests
5. ✅ `lib/utils/screenplay-to-sora.ts` - 36 tests

### Phase 2 (Week 1 - AI Core) ✅ COMPLETE
1. ✅ `lib/ai/episode-segmenter.ts` - 45 tests
2. ✅ `lib/ai/performance-analyzer.ts` - 34 tests
3. ✅ `lib/ai/screenplay-context.ts` - 43 tests
4. ✅ `lib/ai/screenplay-to-prompt.ts` - 30 tests

### Phase 3 (Week 1-2 - Security) ✅ COMPLETE
1. ✅ `lib/encryption/api-key-encryption.ts` - 58 tests
2. ✅ `lib/middleware/admin-auth.ts` - 26 tests
3. ⬜ Character image analysis routes - Remaining

### Phase 4 (Week 2 - Hooks & Stripe) ✅ COMPLETE
1. ✅ `lib/hooks/use-usage.ts` - 34 tests
2. ✅ `lib/hooks/use-videos-filters.ts` - 31 tests
3. ✅ `lib/hooks/use-confetti.ts` - 28 tests
4. ✅ `lib/stripe/config.ts` - 37 tests
5. ✅ `lib/stripe/usage.ts` - 27 tests
6. ✅ `lib/stripe/server.ts` - 20 tests

### Phase 4.5 (Analytics & Middleware) ✅ COMPLETE
1. ✅ `lib/analytics/events.ts` - 60 tests
2. ✅ `lib/analytics/use-analytics.ts` - 34 tests
3. ✅ `lib/middleware/admin-auth.ts` - 26 tests

### Phase 5 (Week 2-3 - Components)
1. ⬜ Critical video components
2. ⬜ Series management components
3. ⬜ Settings components

---

## Test Helpers

### Created ✅
- `__tests__/helpers/api-route-test-helpers.ts` - API route testing utilities
- `__tests__/helpers/openai-mock.ts` - Centralized OpenAI mocking (chat completions, streaming, images)
- `__tests__/helpers/stripe-mock.ts` - Stripe SDK mocking (customers, subscriptions, checkout, webhooks)
- `__tests__/helpers/hook-test-utils.ts` - React hook testing utilities (providers, SWR mocks, data builders)
- Supabase mock patterns established in `jest.setup.ts`

---

## Success Metrics

| Metric | Starting | Current | Target |
|--------|----------|---------|--------|
| Total Tests | 945 | **1511** ✅ | 1200+ |
| Overall Coverage | ~65% | ~80% | 80% |
| Critical Paths | ~70% | ~90% | 95% |
| lib/ Coverage | ~45% | ~78% | 75% |
| API Route Coverage | ~80% | ~85% | 90% |

### Tests Added This Session: 566+
- lib/utils: 80 tests (screenplay-parser + screenplay-to-sora)
- lib/ai: 152 tests (episode-segmenter + performance-analyzer + screenplay-context + screenplay-to-prompt)
- lib/encryption: 58 tests
- lib/hooks: 93 tests (use-usage + use-videos-filters + use-confetti)
- lib/stripe: 84 tests (config + usage + server)
- lib/analytics: 94 tests (events + use-analytics)
- lib/middleware: 26 tests (admin-auth)

---

## Notes

- Each test file should follow existing patterns in `__tests__/`
- Mock external services (OpenAI, Stripe, Supabase) to ensure deterministic tests
- Focus on business logic and error handling over UI rendering
- Keep tests fast - aim for <10 seconds per test file
- Document any complex mocking patterns for future reference
