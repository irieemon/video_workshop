/**
 * Tests for useVideosFilters Hook
 *
 * Tests the video filtering, sorting, and view mode persistence functionality.
 */

import { renderHook, act } from '@testing-library/react'
import { useVideosFilters } from '@/lib/hooks/use-videos-filters'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Helper to create mock videos
function createMockVideo(overrides: Partial<{
  id: string
  title: string
  user_brief: string
  platform: string
  status: string
  created_at: string
  series: { id: string; name: string; is_system: boolean } | null
}> = {}) {
  return {
    id: 'video-1',
    title: 'Test Video',
    user_brief: 'A test video brief',
    platform: 'youtube',
    status: 'draft',
    created_at: '2024-01-01T00:00:00Z',
    series: null,
    ...overrides,
  }
}

describe('useVideosFilters', () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('returns default filter state when no localStorage data', () => {
      const { result } = renderHook(() => useVideosFilters([]))

      expect(result.current.filters).toEqual({
        search: '',
        seriesId: null,
        platform: null,
        status: null,
        sortBy: 'date-desc',
      })
    })

    it('returns default view mode as card', () => {
      const { result } = renderHook(() => useVideosFilters([]))

      expect(result.current.viewMode).toBe('card')
    })

    it('restores filters from localStorage', () => {
      const storedFilters = {
        search: 'test',
        seriesId: 'series-1',
        platform: 'youtube',
        status: 'published',
        sortBy: 'title-asc',
      }
      localStorageMock.setItem('videos-filters', JSON.stringify(storedFilters))

      const { result } = renderHook(() => useVideosFilters([]))

      expect(result.current.filters).toEqual(storedFilters)
    })

    it('restores view mode from localStorage', () => {
      localStorageMock.setItem('videos-view', 'list')

      const { result } = renderHook(() => useVideosFilters([]))

      expect(result.current.viewMode).toBe('list')
    })
  })

  describe('Filter Updates', () => {
    it('updates filters when setFilters is called', () => {
      const { result } = renderHook(() => useVideosFilters([]))

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          search: 'new search',
        })
      })

      expect(result.current.filters.search).toBe('new search')
    })

    it('persists filters to localStorage on update', () => {
      const { result } = renderHook(() => useVideosFilters([]))

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          platform: 'tiktok',
        })
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'videos-filters',
        expect.stringContaining('tiktok')
      )
    })

    it('updates view mode when setViewMode is called', () => {
      const { result } = renderHook(() => useVideosFilters([]))

      act(() => {
        result.current.setViewMode('list')
      })

      expect(result.current.viewMode).toBe('list')
    })

    it('persists view mode to localStorage on update', () => {
      const { result } = renderHook(() => useVideosFilters([]))

      act(() => {
        result.current.setViewMode('list')
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith('videos-view', 'list')
    })
  })

  describe('Search Filtering', () => {
    const videos = [
      createMockVideo({ id: '1', title: 'Sunset Beach Walk' }),
      createMockVideo({ id: '2', title: 'Mountain Hiking Adventure' }),
      createMockVideo({ id: '3', title: 'City Night Life', user_brief: 'sunset in the city' }),
    ]

    it('filters by title', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, search: 'sunset' })
      })

      expect(result.current.filteredAndSortedVideos).toHaveLength(2)
      expect(result.current.filteredAndSortedVideos.map(v => v.id)).toContain('1')
      expect(result.current.filteredAndSortedVideos.map(v => v.id)).toContain('3')
    })

    it('filters by user_brief', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, search: 'city' })
      })

      expect(result.current.filteredAndSortedVideos).toHaveLength(1)
      expect(result.current.filteredAndSortedVideos[0].id).toBe('3')
    })

    it('is case insensitive', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, search: 'MOUNTAIN' })
      })

      expect(result.current.filteredAndSortedVideos).toHaveLength(1)
      expect(result.current.filteredAndSortedVideos[0].id).toBe('2')
    })

    it('returns all videos when search is empty', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, search: '' })
      })

      expect(result.current.filteredAndSortedVideos).toHaveLength(3)
    })
  })

  describe('Series Filtering', () => {
    const videos = [
      createMockVideo({
        id: '1',
        series: { id: 'series-1', name: 'Travel Series', is_system: false }
      }),
      createMockVideo({
        id: '2',
        series: { id: 'series-1', name: 'Travel Series', is_system: false }
      }),
      createMockVideo({
        id: '3',
        series: { id: 'standalone', name: 'Standalone', is_system: true }
      }),
      createMockVideo({ id: '4', series: null }),
    ]

    it('filters by specific series ID', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, seriesId: 'series-1' })
      })

      expect(result.current.filteredAndSortedVideos).toHaveLength(2)
      expect(result.current.filteredAndSortedVideos.every(v => v.series?.id === 'series-1')).toBe(true)
    })

    it('filters standalone videos with is_system=true', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, seriesId: 'standalone' })
      })

      expect(result.current.filteredAndSortedVideos).toHaveLength(1)
      expect(result.current.filteredAndSortedVideos[0].id).toBe('3')
    })

    it('returns all videos when seriesId is null', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, seriesId: null })
      })

      expect(result.current.filteredAndSortedVideos).toHaveLength(4)
    })
  })

  describe('Platform Filtering', () => {
    const videos = [
      createMockVideo({ id: '1', platform: 'youtube' }),
      createMockVideo({ id: '2', platform: 'tiktok' }),
      createMockVideo({ id: '3', platform: 'tiktok' }),
      createMockVideo({ id: '4', platform: 'instagram' }),
    ]

    it('filters by platform', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, platform: 'tiktok' })
      })

      expect(result.current.filteredAndSortedVideos).toHaveLength(2)
      expect(result.current.filteredAndSortedVideos.every(v => v.platform === 'tiktok')).toBe(true)
    })

    it('returns all videos when platform is null', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      expect(result.current.filteredAndSortedVideos).toHaveLength(4)
    })
  })

  describe('Status Filtering', () => {
    const videos = [
      createMockVideo({ id: '1', status: 'draft' }),
      createMockVideo({ id: '2', status: 'published' }),
      createMockVideo({ id: '3', status: 'published' }),
      createMockVideo({ id: '4', status: 'archived' }),
    ]

    it('filters by status', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, status: 'published' })
      })

      expect(result.current.filteredAndSortedVideos).toHaveLength(2)
      expect(result.current.filteredAndSortedVideos.every(v => v.status === 'published')).toBe(true)
    })
  })

  describe('Combined Filtering', () => {
    const videos = [
      createMockVideo({
        id: '1',
        title: 'Beach Day',
        platform: 'tiktok',
        status: 'published',
        series: { id: 'series-1', name: 'Summer', is_system: false }
      }),
      createMockVideo({
        id: '2',
        title: 'Beach Night',
        platform: 'tiktok',
        status: 'draft',
        series: { id: 'series-1', name: 'Summer', is_system: false }
      }),
      createMockVideo({
        id: '3',
        title: 'Beach Party',
        platform: 'youtube',
        status: 'published',
        series: { id: 'series-1', name: 'Summer', is_system: false }
      }),
    ]

    it('applies all filters together', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({
          search: 'beach',
          seriesId: 'series-1',
          platform: 'tiktok',
          status: 'published',
          sortBy: 'date-desc',
        })
      })

      expect(result.current.filteredAndSortedVideos).toHaveLength(1)
      expect(result.current.filteredAndSortedVideos[0].id).toBe('1')
    })
  })

  describe('Sorting', () => {
    const videos = [
      createMockVideo({ id: '1', title: 'Zebra', created_at: '2024-01-15T00:00:00Z', status: 'draft' }),
      createMockVideo({ id: '2', title: 'Apple', created_at: '2024-01-10T00:00:00Z', status: 'published' }),
      createMockVideo({ id: '3', title: 'Mango', created_at: '2024-01-20T00:00:00Z', status: 'archived' }),
    ]

    it('sorts by date descending (newest first)', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, sortBy: 'date-desc' })
      })

      expect(result.current.filteredAndSortedVideos.map(v => v.id)).toEqual(['3', '1', '2'])
    })

    it('sorts by date ascending (oldest first)', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, sortBy: 'date-asc' })
      })

      expect(result.current.filteredAndSortedVideos.map(v => v.id)).toEqual(['2', '1', '3'])
    })

    it('sorts by title ascending', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, sortBy: 'title-asc' })
      })

      expect(result.current.filteredAndSortedVideos.map(v => v.id)).toEqual(['2', '3', '1'])
    })

    it('sorts by title descending', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, sortBy: 'title-desc' })
      })

      expect(result.current.filteredAndSortedVideos.map(v => v.id)).toEqual(['1', '3', '2'])
    })

    it('sorts by status', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, sortBy: 'status' })
      })

      // Alphabetically: archived, draft, published
      expect(result.current.filteredAndSortedVideos.map(v => v.id)).toEqual(['3', '1', '2'])
    })

    it('sorts by series name', () => {
      const videosWithSeries = [
        createMockVideo({ id: '1', series: { id: 's1', name: 'Zebra Series', is_system: false } }),
        createMockVideo({ id: '2', series: { id: 's2', name: 'Apple Series', is_system: false } }),
        createMockVideo({ id: '3', series: null }), // No series should go to end
      ]

      const { result } = renderHook(() => useVideosFilters(videosWithSeries))

      act(() => {
        result.current.setFilters({ ...result.current.filters, sortBy: 'series' })
      })

      expect(result.current.filteredAndSortedVideos.map(v => v.id)).toEqual(['2', '1', '3'])
    })
  })

  describe('Filter Options Extraction', () => {
    const videos = [
      createMockVideo({ platform: 'youtube', status: 'draft' }),
      createMockVideo({ platform: 'tiktok', status: 'published' }),
      createMockVideo({ platform: 'tiktok', status: 'draft' }),
      createMockVideo({ platform: 'instagram', status: 'archived' }),
    ]

    it('extracts unique platforms', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      expect(result.current.filterOptions.platforms).toHaveLength(3)
      expect(result.current.filterOptions.platforms).toContain('youtube')
      expect(result.current.filterOptions.platforms).toContain('tiktok')
      expect(result.current.filterOptions.platforms).toContain('instagram')
    })

    it('extracts unique statuses', () => {
      const { result } = renderHook(() => useVideosFilters(videos))

      expect(result.current.filterOptions.statuses).toHaveLength(3)
      expect(result.current.filterOptions.statuses).toContain('draft')
      expect(result.current.filterOptions.statuses).toContain('published')
      expect(result.current.filterOptions.statuses).toContain('archived')
    })

    it('returns empty arrays for empty video list', () => {
      const { result } = renderHook(() => useVideosFilters([]))

      expect(result.current.filterOptions.platforms).toHaveLength(0)
      expect(result.current.filterOptions.statuses).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty video array', () => {
      const { result } = renderHook(() => useVideosFilters([]))

      expect(result.current.filteredAndSortedVideos).toHaveLength(0)
    })

    it('handles videos with missing user_brief', () => {
      const videos = [
        {
          id: '1',
          title: 'Test',
          user_brief: null as unknown as string,
          platform: 'youtube',
          status: 'draft',
          created_at: '2024-01-01T00:00:00Z',
          series: null
        },
      ]

      const { result } = renderHook(() => useVideosFilters(videos as any))

      act(() => {
        result.current.setFilters({ ...result.current.filters, search: 'test' })
      })

      expect(result.current.filteredAndSortedVideos).toHaveLength(1)
    })

    it('does not mutate original videos array', () => {
      const videos = [
        createMockVideo({ id: '1', title: 'B Video' }),
        createMockVideo({ id: '2', title: 'A Video' }),
      ]
      const originalOrder = [...videos]

      const { result } = renderHook(() => useVideosFilters(videos))

      act(() => {
        result.current.setFilters({ ...result.current.filters, sortBy: 'title-asc' })
      })

      // Original array should be unchanged
      expect(videos).toEqual(originalOrder)
    })
  })
})
