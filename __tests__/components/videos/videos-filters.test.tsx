/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { VideosFilters, FilterState } from '@/components/videos/videos-filters'

// Mock Select component
jest.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode
    value: string
    onValueChange: (value: string) => void
  }) => (
    <div data-testid="select" data-value={value}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { onValueChange })
        }
        return child
      })}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="select-trigger">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode
    onValueChange?: (value: string) => void
  }) => (
    <div data-testid="select-content">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { onValueChange })
        }
        return child
      })}
    </div>
  ),
  SelectItem: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode
    value: string
    onValueChange?: (value: string) => void
  }) => (
    <button
      data-testid={`select-item-${value}`}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </button>
  ),
}))

describe('VideosFilters', () => {
  const defaultFilters: FilterState = {
    search: '',
    seriesId: null,
    platform: null,
    status: null,
    sortBy: 'date-desc',
  }

  const mockSeries = [
    { id: 'series-1', name: 'Series One' },
    { id: 'series-2', name: 'Series Two' },
  ]

  const mockPlatforms = ['tiktok', 'youtube', 'instagram']
  const mockStatuses = ['draft', 'generated', 'published']

  const mockOnFiltersChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders search input', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(
        screen.getByPlaceholderText('Search videos by title or brief...')
      ).toBeInTheDocument()
    })

    it('renders series filter', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      // Multiple elements with "All Series" - one in trigger, one in content
      expect(screen.getAllByText('All Series').length).toBeGreaterThanOrEqual(1)
    })

    it('renders platform filter', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      // Multiple elements with "All Platforms" - one in trigger, one in content
      expect(screen.getAllByText('All Platforms').length).toBeGreaterThanOrEqual(1)
    })

    it('renders status filter', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      // Multiple elements with "All Statuses" - one in trigger, one in content
      expect(screen.getAllByText('All Statuses').length).toBeGreaterThanOrEqual(1)
    })

    it('renders sort by filter', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.getByText('Sort By')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Search Functionality
  // ============================================================================
  describe('Search Functionality', () => {
    it('updates local search on input change', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      const input = screen.getByPlaceholderText('Search videos by title or brief...')
      fireEvent.change(input, { target: { value: 'test' } })

      expect(input).toHaveValue('test')
    })

    it('debounces search and calls onFiltersChange after 300ms', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      const input = screen.getByPlaceholderText('Search videos by title or brief...')
      fireEvent.change(input, { target: { value: 'test' } })

      // Should not be called immediately
      expect(mockOnFiltersChange).not.toHaveBeenCalled()

      // Fast forward 300ms
      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        search: 'test',
      })
    })

    it('initializes search from filters prop', () => {
      const filtersWithSearch: FilterState = {
        ...defaultFilters,
        search: 'initial search',
      }

      render(
        <VideosFilters
          filters={filtersWithSearch}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(
        screen.getByPlaceholderText('Search videos by title or brief...')
      ).toHaveValue('initial search')
    })
  })

  // ============================================================================
  // Series Filter
  // ============================================================================
  describe('Series Filter', () => {
    it('renders all series options', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.getByTestId('select-item-series-1')).toBeInTheDocument()
      expect(screen.getByTestId('select-item-series-2')).toBeInTheDocument()
    })

    it('renders standalone option', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.getByTestId('select-item-standalone')).toBeInTheDocument()
    })

    it('calls onFiltersChange when series is selected', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      fireEvent.click(screen.getByTestId('select-item-series-1'))

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        seriesId: 'series-1',
      })
    })

    it('clears seriesId when all is selected', () => {
      const filtersWithSeries: FilterState = {
        ...defaultFilters,
        seriesId: 'series-1',
      }

      render(
        <VideosFilters
          filters={filtersWithSeries}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      // Find and click the "All Series" option in the first select
      const allOptions = screen.getAllByTestId('select-item-all')
      fireEvent.click(allOptions[0])

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...filtersWithSeries,
        seriesId: null,
      })
    })
  })

  // ============================================================================
  // Platform Filter
  // ============================================================================
  describe('Platform Filter', () => {
    it('renders all platform options', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.getByTestId('select-item-tiktok')).toBeInTheDocument()
      expect(screen.getByTestId('select-item-youtube')).toBeInTheDocument()
      expect(screen.getByTestId('select-item-instagram')).toBeInTheDocument()
    })

    it('capitalizes platform names', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.getByText('Tiktok')).toBeInTheDocument()
      expect(screen.getByText('Youtube')).toBeInTheDocument()
      expect(screen.getByText('Instagram')).toBeInTheDocument()
    })

    it('calls onFiltersChange when platform is selected', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      fireEvent.click(screen.getByTestId('select-item-tiktok'))

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        platform: 'tiktok',
      })
    })
  })

  // ============================================================================
  // Status Filter
  // ============================================================================
  describe('Status Filter', () => {
    it('renders all status options', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.getByTestId('select-item-draft')).toBeInTheDocument()
      expect(screen.getByTestId('select-item-generated')).toBeInTheDocument()
      expect(screen.getByTestId('select-item-published')).toBeInTheDocument()
    })

    it('capitalizes status names', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.getByText('Draft')).toBeInTheDocument()
      expect(screen.getByText('Generated')).toBeInTheDocument()
      expect(screen.getByText('Published')).toBeInTheDocument()
    })

    it('calls onFiltersChange when status is selected', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      fireEvent.click(screen.getByTestId('select-item-draft'))

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        status: 'draft',
      })
    })
  })

  // ============================================================================
  // Sort By Filter
  // ============================================================================
  describe('Sort By Filter', () => {
    it('renders all sort options', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.getByText('Newest First')).toBeInTheDocument()
      expect(screen.getByText('Oldest First')).toBeInTheDocument()
      expect(screen.getByText('Title (A-Z)')).toBeInTheDocument()
      expect(screen.getByText('Title (Z-A)')).toBeInTheDocument()
      expect(screen.getByText('Series')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
    })

    it('calls onFiltersChange when sort is changed', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      fireEvent.click(screen.getByTestId('select-item-title-asc'))

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        sortBy: 'title-asc',
      })
    })
  })

  // ============================================================================
  // Clear Filters
  // ============================================================================
  describe('Clear Filters', () => {
    it('does not show clear button when no filters are active', () => {
      render(
        <VideosFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument()
    })

    it('shows clear button when search is active', () => {
      const filtersWithSearch: FilterState = {
        ...defaultFilters,
        search: 'test',
      }

      render(
        <VideosFilters
          filters={filtersWithSearch}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.getByText('Clear Filters')).toBeInTheDocument()
    })

    it('shows clear button when series filter is active', () => {
      const filtersWithSeries: FilterState = {
        ...defaultFilters,
        seriesId: 'series-1',
      }

      render(
        <VideosFilters
          filters={filtersWithSeries}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.getByText('Clear Filters')).toBeInTheDocument()
    })

    it('shows clear button when sort is changed from default', () => {
      const filtersWithSort: FilterState = {
        ...defaultFilters,
        sortBy: 'title-asc',
      }

      render(
        <VideosFilters
          filters={filtersWithSort}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      expect(screen.getByText('Clear Filters')).toBeInTheDocument()
    })

    it('resets all filters when clear is clicked', () => {
      const activeFilters: FilterState = {
        search: 'test',
        seriesId: 'series-1',
        platform: 'tiktok',
        status: 'draft',
        sortBy: 'title-asc',
      }

      render(
        <VideosFilters
          filters={activeFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      fireEvent.click(screen.getByText('Clear Filters'))

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        search: '',
        seriesId: null,
        platform: null,
        status: null,
        sortBy: 'date-desc',
      })
    })

    it('clears local search input when clear is clicked', () => {
      const activeFilters: FilterState = {
        ...defaultFilters,
        search: 'test',
      }

      render(
        <VideosFilters
          filters={activeFilters}
          onFiltersChange={mockOnFiltersChange}
          series={mockSeries}
          platforms={mockPlatforms}
          statuses={mockStatuses}
        />
      )

      fireEvent.click(screen.getByText('Clear Filters'))

      expect(
        screen.getByPlaceholderText('Search videos by title or brief...')
      ).toHaveValue('')
    })
  })
})
