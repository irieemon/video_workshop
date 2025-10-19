# Testing Quick Start Guide

## Installation

```bash
npm install
```

All testing dependencies are now installed.

## Running Tests

### Unit & Component Tests

```bash
# Watch mode (for development)
npm test

# Run once with coverage
npm run test:coverage

# CI mode (for automated testing)
npm run test:ci
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Interactive mode (see tests run in browser)
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug
```

## Quick Commands

```bash
# Run specific test file
npm test -- shot-list-builder.test.tsx

# Run tests matching pattern
npm test -- --testPathPattern="components"

# Run with verbose output
npm test -- --verbose

# Generate coverage report
npm run test:coverage
# Then open: coverage/lcov-report/index.html
```

## Test Structure

### Unit Test Example
```typescript
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

test('renders correctly', () => {
  render(<MyComponent />)
  expect(screen.getByText('Expected')).toBeInTheDocument()
})
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test'

test('user flow', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('text=Create Video')
  await expect(page.locator('text=Video Brief')).toBeVisible()
})
```

## What's Tested

✅ AI Agent Orchestration (11 tests)
✅ Advanced Mode Components (35 tests)
✅ API Routes (13 tests)
✅ User Workflows (16 tests)

**Total: 75+ tests**

## File Locations

- **Unit/Integration Tests**: `__tests__/` directory
- **E2E Tests**: `e2e/` directory
- **Configuration**: `jest.config.ts`, `playwright.config.ts`
- **Setup**: `jest.setup.ts`

## CI/CD

Tests automatically run on:
- Push to main/develop
- Pull requests
- Can be run manually in GitHub Actions

## Coverage Reports

After running `npm run test:coverage`:
- **HTML Report**: `coverage/lcov-report/index.html`
- **Console**: Shows coverage percentages
- **Thresholds**: Currently 20% (will increase as tests expand)

## Need Help?

- Full guide: See `TESTING.md`
- Implementation details: See `TEST_SUITE_SUMMARY.md`
- Playwright docs: https://playwright.dev/docs/intro
- Jest docs: https://jestjs.io/docs/getting-started
- Testing Library: https://testing-library.com/docs/react-testing-library/intro/

## Common Issues

**Issue**: Tests fail with "cannot find module"
**Fix**: Run `npm install`

**Issue**: E2E tests timeout
**Fix**: Increase timeout in test: `await expect(element).toBeVisible({ timeout: 120000 })`

**Issue**: Mock not working
**Fix**: Check `jest.setup.ts` for mock definitions

## Environment Variables

Create `.env.test.local` (not committed):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-key
SUPABASE_SERVICE_ROLE_KEY=test-key
OPENAI_API_KEY=test-key
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

## Next Steps

1. Run tests: `npm test`
2. Check coverage: `npm run test:coverage`
3. Try E2E: `npm run test:e2e:ui`
4. Read full docs: `TESTING.md`

Happy testing! 🚀
