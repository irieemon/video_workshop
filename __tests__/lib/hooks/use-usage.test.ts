/**
 * Tests for useUsage Hook
 *
 * Tests the usage data fetching and quota status functionality.
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useUsage, useCanPerformAction } from '@/lib/hooks/use-usage'
import useSWR from 'swr'

// Mock SWR
jest.mock('swr')
const mockUseSWR = useSWR as jest.Mock

// Helper to create mock usage response
function createMockUsageResponse(overrides: Partial<{
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
}> = {}) {
  return {
    tier: 'free',
    nextResetDate: null,
    usage: {
      quota: {
        projects: 3,
        videos_per_month: 10,
        consultations_per_month: 10,
      },
      current: {
        projects: 1,
        videos_this_month: 5,
        consultations_this_month: 3,
      },
    },
    ...overrides,
  }
}

describe('useUsage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    it('returns isLoading true while fetching', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.usage).toBeNull()
    })

    it('returns isLoading false after data loads', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse(),
        error: undefined,
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.usage).not.toBeNull()
    })
  })

  describe('Error State', () => {
    it('returns error when fetch fails', () => {
      const mockError = new Error('Network error')
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: mockError,
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.error).toBe(mockError)
      expect(result.current.usage).toBeNull()
    })
  })

  describe('Usage Calculation', () => {
    it('calculates video usage correctly', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
            current: { projects: 1, videos_this_month: 7, consultations_this_month: 3 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.videos.current).toBe(7)
      expect(result.current.usage?.videos.limit).toBe(10)
      expect(result.current.usage?.videos.remaining).toBe(3)
      expect(result.current.usage?.videos.percentUsed).toBe(70)
    })

    it('calculates consultation usage correctly', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 20 },
            current: { projects: 1, videos_this_month: 5, consultations_this_month: 16 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.consultations.current).toBe(16)
      expect(result.current.usage?.consultations.limit).toBe(20)
      expect(result.current.usage?.consultations.remaining).toBe(4)
      expect(result.current.usage?.consultations.percentUsed).toBe(80)
    })

    it('calculates project usage correctly', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 5, videos_per_month: 10, consultations_per_month: 10 },
            current: { projects: 2, videos_this_month: 5, consultations_this_month: 3 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.projects.current).toBe(2)
      expect(result.current.usage?.projects.limit).toBe(5)
      expect(result.current.usage?.projects.remaining).toBe(3)
      expect(result.current.usage?.projects.percentUsed).toBe(40)
    })

    it('handles zero limit gracefully', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 0, videos_per_month: 0, consultations_per_month: 0 },
            current: { projects: 0, videos_this_month: 0, consultations_this_month: 0 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.videos.percentUsed).toBe(0)
      expect(result.current.usage?.consultations.percentUsed).toBe(0)
      expect(result.current.usage?.projects.percentUsed).toBe(0)
    })
  })

  describe('Limit Detection', () => {
    it('detects nearLimit when at 80% usage', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
            current: { projects: 1, videos_this_month: 8, consultations_this_month: 3 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.videos.nearLimit).toBe(true)
      expect(result.current.usage?.videos.atLimit).toBe(false)
    })

    it('detects atLimit when at 100% usage', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
            current: { projects: 1, videos_this_month: 10, consultations_per_month: 3 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.videos.atLimit).toBe(true)
      expect(result.current.usage?.videos.nearLimit).toBe(false)
    })

    it('detects atLimit when over limit', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
            current: { projects: 5, videos_this_month: 12, consultations_this_month: 3 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.videos.atLimit).toBe(true)
      expect(result.current.usage?.projects.atLimit).toBe(true)
    })

    it('returns hasWarnings true when any resource is near limit', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
            current: { projects: 1, videos_this_month: 9, consultations_this_month: 3 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.hasWarnings).toBe(true)
    })

    it('returns hasLimitsReached true when any resource is at limit', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
            current: { projects: 3, videos_this_month: 5, consultations_this_month: 3 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.hasLimitsReached).toBe(true)
    })
  })

  describe('Tier and Upgrade', () => {
    it('extracts tier from response', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({ tier: 'pro' }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.tier).toBe('pro')
    })

    it('sets upgradeRequired true for free tier', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({ tier: 'free' }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.upgradeRequired).toBe(true)
    })

    it('sets upgradeRequired false for paid tier', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({ tier: 'pro' }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.upgradeRequired).toBe(false)
    })
  })

  describe('Reset Date', () => {
    it('parses nextResetDate correctly', () => {
      const resetDate = '2024-02-01T00:00:00Z'
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({ nextResetDate: resetDate }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.nextResetDate).toEqual(new Date(resetDate))
    })

    it('handles null nextResetDate', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({ nextResetDate: null }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.nextResetDate).toBeNull()
    })

    it('getResetDateString returns null when no reset date', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({ nextResetDate: null }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.getResetDateString()).toBeNull()
    })

    it('getResetDateString returns "today" for same day', () => {
      const now = new Date()
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({ nextResetDate: now.toISOString() }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.getResetDateString()).toBe('today')
    })

    it('getResetDateString returns "tomorrow" for next day', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({ nextResetDate: tomorrow.toISOString() }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.getResetDateString()).toBe('tomorrow')
    })

    it('getResetDateString returns "in X days" for near future', () => {
      const future = new Date()
      future.setDate(future.getDate() + 5)
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({ nextResetDate: future.toISOString() }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.getResetDateString()).toMatch(/in \d days/)
    })
  })

  describe('Warning Messages', () => {
    it('returns video limit message when at limit', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
            current: { projects: 1, videos_this_month: 10, consultations_this_month: 3 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.getWarningMessage()).toContain('monthly video limit')
    })

    it('returns consultation limit message when at limit', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
            current: { projects: 1, videos_this_month: 5, consultations_this_month: 10 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.getWarningMessage()).toContain('AI consultation limit')
    })

    it('returns project limit message when at limit', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
            current: { projects: 3, videos_this_month: 5, consultations_this_month: 3 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.getWarningMessage()).toContain('project limit')
    })

    it('returns approaching limit message when near limit', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
            current: { projects: 1, videos_this_month: 9, consultations_this_month: 3 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.getWarningMessage()).toContain('approaching')
    })

    it('returns null when no warnings', () => {
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse({
          usage: {
            quota: { projects: 10, videos_per_month: 100, consultations_per_month: 100 },
            current: { projects: 1, videos_this_month: 5, consultations_this_month: 3 },
          },
        }),
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.getWarningMessage()).toBeNull()
    })
  })

  describe('Refresh Function', () => {
    it('exposes mutate as refresh', () => {
      const mockMutate = jest.fn()
      mockUseSWR.mockReturnValue({
        data: createMockUsageResponse(),
        isLoading: false,
        mutate: mockMutate,
      })

      const { result } = renderHook(() => useUsage())

      result.current.refresh()
      expect(mockMutate).toHaveBeenCalled()
    })
  })

  describe('Default Values', () => {
    it('uses default quota values when missing', () => {
      mockUseSWR.mockReturnValue({
        data: {
          tier: 'free',
          usage: {
            quota: {},
            current: { projects: 1, videos_this_month: 5, consultations_this_month: 3 },
          },
        },
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.videos.limit).toBe(10)
      expect(result.current.usage?.consultations.limit).toBe(10)
      expect(result.current.usage?.projects.limit).toBe(3)
    })

    it('uses zero for missing current values', () => {
      mockUseSWR.mockReturnValue({
        data: {
          tier: 'free',
          usage: {
            quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
            current: {},
          },
        },
        isLoading: false,
        mutate: jest.fn(),
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.usage?.videos.current).toBe(0)
      expect(result.current.usage?.consultations.current).toBe(0)
      expect(result.current.usage?.projects.current).toBe(0)
    })
  })
})

describe('useCanPerformAction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns canPerform true when resource is not at limit', () => {
    mockUseSWR.mockReturnValue({
      data: createMockUsageResponse({
        usage: {
          quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
          current: { projects: 1, videos_this_month: 5, consultations_this_month: 3 },
        },
      }),
      isLoading: false,
      mutate: jest.fn(),
    })

    const { result } = renderHook(() => useCanPerformAction('videos'))

    expect(result.current.canPerform).toBe(true)
    expect(result.current.remaining).toBe(5)
    expect(result.current.percentUsed).toBe(50)
  })

  it('returns canPerform false when resource is at limit', () => {
    mockUseSWR.mockReturnValue({
      data: createMockUsageResponse({
        usage: {
          quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
          current: { projects: 1, videos_this_month: 10, consultations_this_month: 3 },
        },
      }),
      isLoading: false,
      mutate: jest.fn(),
    })

    const { result } = renderHook(() => useCanPerformAction('videos'))

    expect(result.current.canPerform).toBe(false)
    expect(result.current.remaining).toBe(0)
    expect(result.current.percentUsed).toBe(100)
  })

  it('checks consultations resource correctly', () => {
    mockUseSWR.mockReturnValue({
      data: createMockUsageResponse({
        usage: {
          quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
          current: { projects: 1, videos_this_month: 5, consultations_this_month: 10 },
        },
      }),
      isLoading: false,
      mutate: jest.fn(),
    })

    const { result } = renderHook(() => useCanPerformAction('consultations'))

    expect(result.current.canPerform).toBe(false)
  })

  it('checks projects resource correctly', () => {
    mockUseSWR.mockReturnValue({
      data: createMockUsageResponse({
        usage: {
          quota: { projects: 3, videos_per_month: 10, consultations_per_month: 10 },
          current: { projects: 3, videos_this_month: 5, consultations_this_month: 3 },
        },
      }),
      isLoading: false,
      mutate: jest.fn(),
    })

    const { result } = renderHook(() => useCanPerformAction('projects'))

    expect(result.current.canPerform).toBe(false)
  })

  it('returns default values while loading', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      mutate: jest.fn(),
    })

    const { result } = renderHook(() => useCanPerformAction('videos'))

    expect(result.current.canPerform).toBe(true)
    expect(result.current.remaining).toBe(0)
    expect(result.current.percentUsed).toBe(0)
    expect(result.current.isLoading).toBe(true)
  })
})
