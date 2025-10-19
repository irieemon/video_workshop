# Testing Guide

Comprehensive testing suite for the Sora Video Generator application.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Coverage Reports](#coverage-reports)

## Overview

This project uses a comprehensive testing strategy with three types of tests:

1. **Unit Tests** - Testing individual functions and components in isolation
2. **Integration Tests** - Testing API routes and database interactions
3. **E2E Tests** - Testing complete user workflows with Playwright

### Technologies

- **Jest** - Unit and integration test runner
- **React Testing Library** - Component testing utilities
- **Playwright** - E2E testing framework
- **TypeScript** - Type-safe test code

## Test Types

### Unit Tests

Located in `__tests__/` directories, these tests verify:

- **AI Agent Orchestration** (`__tests__/lib/ai/agent-orchestrator.test.ts`)
  - Roundtable discussion orchestration
  - Advanced mode with user edits
  - Copyright safety validation
  - Hashtag filtering and validation

- **Component Tests** (`__tests__/components/videos/`)
  - Shot List Builder - CRUD operations, reordering, validation
  - Editable Prompt Field - Character counting, copyright warnings
  - Advanced Mode Toggle - State management
  - Additional Guidance - Input persistence

### Integration Tests

Located in `__tests__/app/api/`, these tests verify:

- **Video API** (`__tests__/app/api/videos/route.test.ts`)
  - Video creation with all metadata
  - Hashtag insertion into separate table
  - User edits storage for Advanced Mode
  - Authentication and authorization

- **Advanced Roundtable API** (`__tests__/app/api/agent/roundtable/advanced/route.test.ts`)
  - User prompt edits integration
  - Shot list processing
  - Additional guidance handling
  - Visual template application

### E2E Tests

Located in `e2e/`, these tests verify:

- **Authentication** (`e2e/authentication.spec.ts`)
  - Login/logout flows
  - Signup validation
  - Password reset
  - Protected route access

- **Video Creation** (`e2e/video-creation.spec.ts`)
  - Complete video generation workflow
  - Advanced Mode activation and usage
  - Prompt editing with copyright validation
  - Shot list management (add, edit, reorder, delete)
  - AI-suggested shots

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:ci

# Run tests with coverage report
npm run test:coverage
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in UI mode (interactive)
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### All Tests

```bash
# Run lint, unit tests, and E2E tests
npm run lint
npm run test:ci
npm run test:e2e
```

## Test Structure

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    const mockHandler = jest.fn()

    render(<MyComponent onClick={mockHandler} />)

    await user.click(screen.getByRole('button'))
    expect(mockHandler).toHaveBeenCalled()
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('completes user flow', async ({ page }) => {
  await page.goto('/dashboard')

  await page.click('text=Create Video')
  await page.fill('textarea#brief', 'Test video brief')
  await page.click('button:has-text("Start Roundtable")')

  await expect(page.locator('text=Roundtable complete')).toBeVisible({
    timeout: 120000,
  })
})
```

## Writing Tests

### Best Practices

1. **Descriptive Test Names** - Use clear, specific test descriptions
2. **Arrange-Act-Assert** - Structure tests with clear setup, action, and verification
3. **Mock External Dependencies** - Mock API calls, Supabase, and OpenAI
4. **Test User Behavior** - Focus on user interactions, not implementation details
5. **Avoid Test Interdependence** - Each test should be independent
6. **Use Type Safety** - Leverage TypeScript for test code

### Mocking Guidelines

**Supabase Client** (already configured in `jest.setup.ts`):
```typescript
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { /* mock methods */ },
    from: jest.fn(() => ({ /* mock methods */ })),
  })),
}))
```

**OpenAI API** (already configured in `jest.setup.ts`):
```typescript
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({ /* mock response */ })),
      },
    },
  })),
}))
```

### Component Testing Utilities

```typescript
// Render with user interaction setup
const user = userEvent.setup()
render(<Component />)
await user.click(screen.getByRole('button'))

// Query by role (preferred)
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })

// Query by text
screen.getByText(/exact or regex/i)

// Async queries for elements that appear later
await screen.findByText('Async content')
```

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Workflow Jobs:**
1. **Unit Tests** - Runs on Node.js 18.x and 20.x
2. **E2E Tests** - Runs on Node.js 20.x with Playwright
3. **Build Check** - Verifies production build succeeds

**Required Secrets:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

## Coverage Reports

### Viewing Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory:
- **HTML Report**: Open `coverage/lcov-report/index.html` in browser
- **LCOV File**: `coverage/lcov.info` for CI integration
- **Console Summary**: Displayed after test run

### Coverage Thresholds

Configured in `jest.config.ts`:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### What's Covered

✅ **Covered**:
- AI agent orchestration logic
- Advanced Mode components (4 components)
- API route handlers
- Copyright safety validation
- Shot list management
- User authentication flows

❌ **Not Covered** (excluded):
- Type definition files (`.d.ts`)
- Node modules
- Next.js build artifacts
- Coverage reports themselves

## Test Maintenance

### Adding New Tests

1. **Unit/Integration Tests**:
   - Create test file in `__tests__/` matching source structure
   - Name file with `.test.ts` or `.test.tsx` extension
   - Import component/function to test
   - Write test cases using Jest and Testing Library

2. **E2E Tests**:
   - Create test file in `e2e/` directory
   - Name file with `.spec.ts` extension
   - Use Playwright test and expect imports
   - Write user flow scenarios

### Updating Mocks

When adding new dependencies:
1. Add mock setup to `jest.setup.ts`
2. Document mock structure in TESTING.md
3. Ensure mocks match actual API interfaces

### Debugging Failed Tests

**Unit Tests:**
```bash
# Run specific test file
npm test -- agent-orchestrator.test.ts

# Run specific test case
npm test -- -t "should successfully orchestrate"

# Run with verbose output
npm test -- --verbose
```

**E2E Tests:**
```bash
# Run in debug mode
npm run test:e2e:debug

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test
npx playwright test authentication.spec.ts
```

## Environment Variables

### Test Environment

Create `.env.test.local` (not committed):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
OPENAI_API_KEY=test-openai-key
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

### CI Environment

Set these as GitHub Secrets for automated testing.

## Troubleshooting

### Common Issues

**Issue**: Tests timeout waiting for AI responses
**Solution**: Increase timeout or mock OpenAI responses

**Issue**: Playwright can't find elements
**Solution**: Check element selectors, add `await page.waitForSelector()`

**Issue**: Mock not working
**Solution**: Ensure mock is defined before imports in test file

**Issue**: Coverage not meeting threshold
**Solution**: Add tests for uncovered code paths

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
