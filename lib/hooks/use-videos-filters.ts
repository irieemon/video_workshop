'use client'

import { useState, useEffect, useMemo } from 'react'
import type { FilterState } from '@/components/videos/videos-filters'
import type { ViewMode } from '@/components/videos/videos-view-toggle'

const FILTER_STORAGE_KEY = 'videos-filters'
const VIEW_STORAGE_KEY = 'videos-view'

type Video = {
  id: string
  title: string
  user_brief: string
  platform: string
  status: string
  created_at: string
  series?: {
    id: string
    name: string
    is_system: boolean
  } | null
}

export function useVideosFilters(videos: Video[]) {
  // Initialize filters from localStorage or defaults
  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window === 'undefined') {
      return {
        search: '',
        seriesId: null,
        platform: null,
        status: null,
        sortBy: 'date-desc' as const,
      }
    }
    const stored = localStorage.getItem(FILTER_STORAGE_KEY)
    return stored
      ? JSON.parse(stored)
      : {
          search: '',
          seriesId: null,
          platform: null,
          status: null,
          sortBy: 'date-desc' as const,
        }
  })

  // Initialize view mode from localStorage or default
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'card'
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    return (stored as ViewMode) || 'card'
  })

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
  }, [filters])

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
  }, [viewMode])

  // Filter and sort videos
  const filteredAndSortedVideos = useMemo(() => {
    let result = [...videos]

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (video) =>
          video.title.toLowerCase().includes(searchLower) ||
          video.user_brief?.toLowerCase().includes(searchLower)
      )
    }

    // Apply series filter
    if (filters.seriesId === 'standalone') {
      result = result.filter((video) => video.series?.is_system === true)
    } else if (filters.seriesId) {
      result = result.filter((video) => video.series?.id === filters.seriesId)
    }

    // Apply platform filter
    if (filters.platform) {
      result = result.filter((video) => video.platform === filters.platform)
    }

    // Apply status filter
    if (filters.status) {
      result = result.filter((video) => video.status === filters.status)
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'title-asc':
          return a.title.localeCompare(b.title)
        case 'title-desc':
          return b.title.localeCompare(a.title)
        case 'series':
          const aSeriesName = a.series?.name || 'ZZZ' // Push no-series to end
          const bSeriesName = b.series?.name || 'ZZZ'
          return aSeriesName.localeCompare(bSeriesName)
        case 'status':
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

    return result
  }, [videos, filters])

  // Extract unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const platforms = [...new Set(videos.map((v) => v.platform).filter(Boolean))]
    const statuses = [...new Set(videos.map((v) => v.status).filter(Boolean))]
    return { platforms, statuses }
  }, [videos])

  return {
    filters,
    setFilters,
    viewMode,
    setViewMode,
    filteredAndSortedVideos,
    filterOptions,
  }
}
