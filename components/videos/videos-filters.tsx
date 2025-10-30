'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'

export type FilterState = {
  search: string
  seriesId: string | null
  platform: string | null
  status: string | null
  sortBy: 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'series' | 'status'
}

interface VideosFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  series: { id: string; name: string }[]
  platforms: string[]
  statuses: string[]
}

export function VideosFilters({
  filters,
  onFiltersChange,
  series,
  platforms,
  statuses,
}: VideosFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    // Debounce search - update filters after user stops typing
    const timeoutId = setTimeout(() => {
      onFiltersChange({ ...filters, search: value })
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const handleClearFilters = () => {
    setLocalSearch('')
    onFiltersChange({
      search: '',
      seriesId: null,
      platform: null,
      status: null,
      sortBy: 'date-desc',
    })
  }

  const hasActiveFilters =
    filters.search ||
    filters.seriesId ||
    filters.platform ||
    filters.status ||
    filters.sortBy !== 'date-desc'

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search videos by title or brief..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Series Filter */}
        <Select
          value={filters.seriesId || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              seriesId: value === 'all' ? null : value,
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Series" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Series</SelectItem>
            <SelectItem value="standalone">Standalone</SelectItem>
            {series.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Platform Filter */}
        <Select
          value={filters.platform || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              platform: value === 'all' ? null : value,
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              status: value === 'all' ? null : value,
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort By */}
        <Select
          value={filters.sortBy}
          onValueChange={(value: any) =>
            onFiltersChange({ ...filters, sortBy: value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="title-asc">Title (A-Z)</SelectItem>
            <SelectItem value="title-desc">Title (Z-A)</SelectItem>
            <SelectItem value="series">Series</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}
