/**
 * React Hook Testing Utilities
 *
 * Centralized utilities for testing React hooks with proper providers,
 * mocking patterns, and common test scenarios.
 *
 * Usage in test files:
 * ```typescript
 * import { renderHookWithProviders, mockSWRResponse, createMockUsageData } from '../helpers/hook-test-utils'
 *
 * const { result } = renderHookWithProviders(() => useMyHook())
 * ```
 */

import * as React from 'react'
import { ReactNode } from 'react'
import { renderHook, RenderHookOptions, RenderHookResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ============================================================================
// Types
// ============================================================================

export interface WrapperOptions {
  queryClient?: QueryClient
  initialRouterPath?: string
  userOverrides?: MockUserData
  supabaseOverrides?: MockSupabaseData
}

export interface MockUserData {
  id?: string
  email?: string
  role?: 'authenticated' | 'anon'
  user_metadata?: Record<string, any>
}

export interface MockSupabaseData {
  user?: MockUserData | null
  session?: any
  error?: any
}

export interface MockSWROptions<T> {
  data?: T
  error?: Error | null
  isLoading?: boolean
  isValidating?: boolean
  mutate?: jest.Mock
}

export interface MockUsageData {
  tier?: 'free' | 'premium' | 'enterprise'
  nextResetDate?: string | null
  usage?: {
    quota?: {
      projects?: number
      videos_per_month?: number
      consultations_per_month?: number
    }
    current?: {
      projects?: number
      videos_this_month?: number
      consultations_this_month?: number
    }
  }
}

export interface MockVideoFilters {
  search?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// Query Client Setup
// ============================================================================

/**
 * Create a test QueryClient with sensible defaults
 * - Disables retries for predictable test behavior
 * - Short cache times for test isolation
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Previously called cacheTime in v4
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// ============================================================================
// Provider Wrapper
// ============================================================================

/**
 * Create a wrapper component with all necessary providers for hook testing
 */
export function createWrapper(options: WrapperOptions = {}) {
  const { queryClient = createTestQueryClient() } = options

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

/**
 * Render a hook with all necessary providers
 *
 * @example
 * ```typescript
 * const { result } = renderHookWithProviders(() => useMyHook(), {
 *   queryClient: customQueryClient,
 * })
 * ```
 */
export function renderHookWithProviders<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options?: RenderHookOptions<TProps> & { wrapperOptions?: WrapperOptions }
): RenderHookResult<TResult, TProps> {
  const { wrapperOptions, ...renderOptions } = options || {}
  const wrapper = createWrapper(wrapperOptions)

  return renderHook(hook, {
    wrapper,
    ...renderOptions,
  })
}

// ============================================================================
// SWR Mocking Utilities
// ============================================================================

/**
 * Create a mock SWR response object
 */
export function mockSWRResponse<T>(options: MockSWROptions<T> = {}): {
  data: T | undefined
  error: Error | undefined
  isLoading: boolean
  isValidating: boolean
  mutate: jest.Mock
} {
  const {
    data,
    error = null,
    isLoading = false,
    isValidating = false,
    mutate = jest.fn(),
  } = options

  return {
    data,
    error: error || undefined,
    isLoading,
    isValidating,
    mutate,
  }
}

/**
 * Create a loading SWR response
 */
export function mockSWRLoading<T>(): ReturnType<typeof mockSWRResponse<T>> {
  return mockSWRResponse<T>({ isLoading: true })
}

/**
 * Create an error SWR response
 */
export function mockSWRError<T>(
  error: Error | string
): ReturnType<typeof mockSWRResponse<T>> {
  const err = typeof error === 'string' ? new Error(error) : error
  return mockSWRResponse<T>({ error: err })
}

/**
 * Create a successful SWR response
 */
export function mockSWRSuccess<T>(data: T): ReturnType<typeof mockSWRResponse<T>> {
  return mockSWRResponse<T>({ data })
}

// ============================================================================
// Mock Data Builders
// ============================================================================

/**
 * Create mock usage data for useUsage hook tests
 */
export function createMockUsageData(overrides: MockUsageData = {}): {
  tier: string
  nextResetDate: string | null
  usage: {
    quota: {
      projects: number
      videos_per_month: number
      consultations_per_month: number
    }
    current: {
      projects: number
      videos_this_month: number
      consultations_this_month: number
    }
  }
} {
  return {
    tier: overrides.tier || 'free',
    nextResetDate: overrides.nextResetDate ?? null,
    usage: {
      quota: {
        projects: overrides.usage?.quota?.projects ?? 3,
        videos_per_month: overrides.usage?.quota?.videos_per_month ?? 10,
        consultations_per_month: overrides.usage?.quota?.consultations_per_month ?? 10,
      },
      current: {
        projects: overrides.usage?.current?.projects ?? 1,
        videos_this_month: overrides.usage?.current?.videos_this_month ?? 5,
        consultations_this_month: overrides.usage?.current?.consultations_this_month ?? 3,
      },
    },
  }
}

/**
 * Create mock video filter data for useVideosFilters hook tests
 */
export function createMockVideoFilters(overrides: MockVideoFilters = {}): {
  search: string
  status: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
} {
  return {
    search: overrides.search ?? '',
    status: overrides.status ?? 'all',
    sortBy: overrides.sortBy ?? 'created_at',
    sortOrder: overrides.sortOrder ?? 'desc',
  }
}

/**
 * Create mock user data
 */
export function createMockUser(overrides: MockUserData = {}): {
  id: string
  email: string
  role: string
  user_metadata: Record<string, any>
} {
  return {
    id: overrides.id ?? 'test-user-id',
    email: overrides.email ?? 'test@example.com',
    role: overrides.role ?? 'authenticated',
    user_metadata: overrides.user_metadata ?? {},
  }
}

/**
 * Create mock profile data
 */
export function createMockProfile(overrides: Partial<{
  id: string
  is_admin: boolean
  subscription_tier: string
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}> = {}) {
  return {
    id: overrides.id ?? 'test-user-id',
    is_admin: overrides.is_admin ?? false,
    subscription_tier: overrides.subscription_tier ?? 'free',
    stripe_customer_id: overrides.stripe_customer_id ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  }
}

/**
 * Create mock series data
 */
export function createMockSeries(overrides: Partial<{
  id: string
  user_id: string
  name: string
  description: string | null
  style: string | null
  created_at: string
  updated_at: string
}> = {}) {
  return {
    id: overrides.id ?? 'test-series-id',
    user_id: overrides.user_id ?? 'test-user-id',
    name: overrides.name ?? 'Test Series',
    description: overrides.description ?? 'A test series description',
    style: overrides.style ?? 'cinematic',
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  }
}

/**
 * Create mock video data
 */
export function createMockVideo(overrides: Partial<{
  id: string
  series_id: string
  episode_id: string | null
  title: string
  prompt: string
  status: string
  sora_job_id: string | null
  video_url: string | null
  created_at: string
  updated_at: string
}> = {}) {
  return {
    id: overrides.id ?? 'test-video-id',
    series_id: overrides.series_id ?? 'test-series-id',
    episode_id: overrides.episode_id ?? null,
    title: overrides.title ?? 'Test Video',
    prompt: overrides.prompt ?? 'A test video prompt',
    status: overrides.status ?? 'draft',
    sora_job_id: overrides.sora_job_id ?? null,
    video_url: overrides.video_url ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  }
}

/**
 * Create mock episode data
 */
export function createMockEpisode(overrides: Partial<{
  id: string
  series_id: string
  title: string
  description: string | null
  episode_number: number
  screenplay: string | null
  created_at: string
  updated_at: string
}> = {}) {
  return {
    id: overrides.id ?? 'test-episode-id',
    series_id: overrides.series_id ?? 'test-series-id',
    title: overrides.title ?? 'Test Episode',
    description: overrides.description ?? 'A test episode description',
    episode_number: overrides.episode_number ?? 1,
    screenplay: overrides.screenplay ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  }
}

// ============================================================================
// Common Test Scenarios
// ============================================================================

/**
 * Create usage data for a free tier user at quota limit
 */
export function createFreeUserAtLimit() {
  return createMockUsageData({
    tier: 'free',
    usage: {
      quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
      current: { projects: 3, videos_this_month: 10, consultations_this_month: 10 },
    },
  })
}

/**
 * Create usage data for a premium tier user with plenty of quota
 */
export function createPremiumUserWithQuota() {
  return createMockUsageData({
    tier: 'premium',
    usage: {
      quota: { projects: 100, videos_per_month: 500, consultations_per_month: 500 },
      current: { projects: 5, videos_this_month: 10, consultations_this_month: 5 },
    },
  })
}

/**
 * Create usage data for an enterprise tier user
 */
export function createEnterpriseUser() {
  return createMockUsageData({
    tier: 'enterprise',
    usage: {
      quota: { projects: -1, videos_per_month: -1, consultations_per_month: -1 }, // Unlimited
      current: { projects: 50, videos_this_month: 200, consultations_this_month: 100 },
    },
  })
}

// ============================================================================
// Hook State Assertions
// ============================================================================

/**
 * Assert that a hook is in loading state
 */
export function expectLoadingState<T extends { isLoading: boolean }>(
  result: { current: T }
): void {
  expect(result.current.isLoading).toBe(true)
}

/**
 * Assert that a hook has an error
 */
export function expectErrorState<T extends { error: any }>(
  result: { current: T },
  expectedMessage?: string
): void {
  expect(result.current.error).toBeTruthy()
  if (expectedMessage) {
    expect(result.current.error.message).toContain(expectedMessage)
  }
}

/**
 * Assert that a hook has loaded successfully
 */
export function expectSuccessState<T extends { isLoading: boolean; error: any }>(
  result: { current: T }
): void {
  expect(result.current.isLoading).toBe(false)
  expect(result.current.error).toBeFalsy()
}

// ============================================================================
// Timer Utilities
// ============================================================================

/**
 * Wait for all promises and timers to resolve
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Advance timers and flush promises
 */
export async function advanceTimersAndFlush(ms: number): Promise<void> {
  jest.advanceTimersByTime(ms)
  await flushPromises()
}

// ============================================================================
// Supabase Mock Utilities
// ============================================================================

/**
 * Create a mock Supabase auth state
 */
export function createMockAuthState(options: {
  user?: MockUserData | null
  session?: any
  isLoading?: boolean
} = {}) {
  const { user = createMockUser(), session = null, isLoading = false } = options

  return {
    user,
    session: session || (user ? { user, access_token: 'mock-token' } : null),
    isLoading,
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
  }
}

/**
 * Create mock Supabase query response
 */
export function createMockQueryResponse<T>(
  data: T | null,
  error: { message: string; code: string } | null = null
) {
  return { data, error }
}

/**
 * Create a successful Supabase query response
 */
export function createSuccessQueryResponse<T>(data: T) {
  return createMockQueryResponse(data, null)
}

/**
 * Create an error Supabase query response
 */
export function createErrorQueryResponse(message: string, code = 'PGRST116') {
  return createMockQueryResponse(null, { message, code })
}

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Reset common mocks between tests
 */
export function resetHookTestMocks(): void {
  jest.clearAllMocks()
  jest.clearAllTimers()
}

/**
 * Setup fake timers for hook tests
 */
export function setupFakeTimers(): void {
  jest.useFakeTimers()
}

/**
 * Cleanup fake timers after hook tests
 */
export function cleanupFakeTimers(): void {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
}
