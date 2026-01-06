/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentList } from '@/components/segments/segment-list'

// Mock Supabase client
const mockSupabaseFrom = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Mock SegmentCard component
jest.mock('@/components/segments/segment-card', () => ({
  SegmentCard: ({
    segment,
    onViewDetails,
    onGenerate,
    onViewVideo,
  }: {
    segment: any
    onViewDetails: (segment: any) => void
    onGenerate: (segmentId: string) => void
    onViewVideo: (videoId: string) => void
  }) => (
    <div data-testid={`segment-card-${segment.id}`}>
      <span>Segment {segment.segment_number}</span>
      <span>{segment.title}</span>
      {segment.hasVideo && <span>Has Video</span>}
      <button onClick={() => onViewDetails(segment)}>View Details</button>
      <button onClick={() => onGenerate(segment.id)}>Generate</button>
      {segment.videoId && (
        <button onClick={() => onViewVideo(segment.videoId)}>View Video</button>
      )}
    </div>
  ),
  SegmentCardSkeleton: () => <div data-testid="segment-card-skeleton" />,
}))

// Mock SegmentDetailDrawer
jest.mock('@/components/segments/segment-detail-drawer', () => ({
  SegmentDetailDrawer: ({
    segment,
    open,
    onOpenChange,
  }: {
    segment: any
    open: boolean
    onOpenChange: (open: boolean) => void
  }) =>
    open ? (
      <div data-testid="segment-detail-drawer">
        <span>Detail for: {segment?.title}</span>
        <button onClick={() => onOpenChange(false)}>Close Drawer</button>
      </div>
    ) : null,
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  PlayCircle: () => <div data-testid="play-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
}))

// Helper to create mock query builders
function createMockQueryBuilder(options: {
  segmentGroupData?: any
  segmentGroupError?: any
  segmentsData?: any[]
  segmentsError?: any
  videosData?: any[]
  videosError?: any
}) {
  return (table: string) => {
    if (table === 'segment_groups') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: options.segmentGroupData ?? null,
              error: options.segmentGroupError ?? null,
            }),
          }),
        }),
      }
    }
    if (table === 'video_segments') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: options.segmentsData ?? [],
              error: options.segmentsError ?? null,
            }),
          }),
        }),
      }
    }
    if (table === 'videos') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: options.videosData ?? [],
              error: options.videosError ?? null,
            }),
          }),
        }),
      }
    }
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }
  }
}

describe('SegmentList', () => {
  const defaultProps = {
    episodeId: 'episode-123',
    seriesId: 'series-456',
    refreshTrigger: 0,
    onBatchGenerate: jest.fn(),
  }

  const mockSegmentGroup = {
    id: 'group-1',
    episode_id: 'episode-123',
    status: 'partial',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  }

  const mockSegments = [
    {
      id: 'seg-1',
      episode_id: 'episode-123',
      segment_number: 1,
      title: 'Opening Scene',
      description: 'The hero arrives',
      duration_seconds: 10,
      prompt: 'A hero walking into a city',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'seg-2',
      episode_id: 'episode-123',
      segment_number: 2,
      title: 'Confrontation',
      description: 'Meeting the villain',
      duration_seconds: 15,
      prompt: 'Hero faces villain',
      created_at: '2024-01-15T10:01:00Z',
    },
    {
      id: 'seg-3',
      episode_id: 'episode-123',
      segment_number: 3,
      title: 'Resolution',
      description: 'The final battle',
      duration_seconds: 20,
      prompt: 'Epic battle scene',
      created_at: '2024-01-15T10:02:00Z',
    },
  ]

  const mockVideos = [
    { id: 'video-1', segment_id: 'seg-1' },
    { id: 'video-2', segment_id: 'seg-2' },
  ]

  // Store original location
  const originalLocation = window.location

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock window.location
    delete (window as any).location
    window.location = { ...originalLocation, href: '' } as any
  })

  afterEach(() => {
    window.location = originalLocation
  })

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('renders skeleton loaders while loading', () => {
      // Make the query hang
      mockSupabaseFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockReturnValue(new Promise(() => {})),
            order: jest.fn().mockReturnValue(new Promise(() => {})),
          }),
        }),
      }))

      render(<SegmentList {...defaultProps} />)

      // Should show skeleton cards
      expect(screen.getAllByTestId('segment-card-skeleton')).toHaveLength(3)
    })

    it('shows progress skeleton card while loading', () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockReturnValue(new Promise(() => {})),
            order: jest.fn().mockReturnValue(new Promise(() => {})),
          }),
        }),
      }))

      render(<SegmentList {...defaultProps} />)

      // Should have animated pulse elements in the loading skeleton
      // The skeleton cards are rendered and there are progress bar skeleton elements
      const skeletons = screen.getAllByTestId('segment-card-skeleton')
      expect(skeletons.length).toBe(3)

      // Check that there are loading elements in the parent container
      const loadingContainer = skeletons[0].closest('.space-y-4')
      expect(loadingContainer).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('renders empty state when no segments exist', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: null,
          segmentsData: [],
          videosData: [],
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('No Segments Yet')).toBeInTheDocument()
      })
      expect(
        screen.getByText('Create segments from your episode screenplay to get started')
      ).toBeInTheDocument()
    })

    it('shows play circle icon in empty state', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: null,
          segmentsData: [],
          videosData: [],
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('play-circle-icon')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Error State
  // ============================================================================
  describe('Error State', () => {
    it('renders error state when segment group fetch fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupError: { code: 'OTHER_ERROR', message: 'Database connection failed' },
          segmentsData: [],
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Segments')).toBeInTheDocument()
      })
      expect(screen.getByText(/Database connection failed/)).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('renders error state when segments fetch fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsError: { message: 'Network error' },
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Segments')).toBeInTheDocument()
      })
      expect(screen.getByText(/Network error/)).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('shows retry button in error state', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentsError: { message: 'Server error' },
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('retries loading when Try Again button is clicked', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const user = userEvent.setup()

      // First call fails
      mockSupabaseFrom.mockImplementationOnce(
        createMockQueryBuilder({
          segmentsError: { message: 'Server error' },
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Segments')).toBeInTheDocument()
      })

      // Setup successful response for retry
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: [],
        })
      )

      await user.click(screen.getByRole('button', { name: /try again/i }))

      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('shows alert circle icon in error state', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentsError: { message: 'Error' },
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('ignores PGRST116 error code for segment groups', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupError: { code: 'PGRST116', message: 'No rows found' },
          segmentsData: mockSegments,
          videosData: [],
        })
      )

      render(<SegmentList {...defaultProps} />)

      // Should not show error state for PGRST116 (no rows found)
      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument()
      })
      expect(screen.queryByText('Failed to Load Segments')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Successful Data Display
  // ============================================================================
  describe('Successful Data Display', () => {
    it('renders segment cards when data is loaded', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: [],
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('segment-card-seg-1')).toBeInTheDocument()
        expect(screen.getByTestId('segment-card-seg-2')).toBeInTheDocument()
        expect(screen.getByTestId('segment-card-seg-3')).toBeInTheDocument()
      })
    })

    it('displays segment titles correctly', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: [],
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument()
        expect(screen.getByText('Confrontation')).toBeInTheDocument()
        expect(screen.getByText('Resolution')).toBeInTheDocument()
      })
    })

    it('marks segments with videos correctly', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: mockVideos,
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        const seg1Card = screen.getByTestId('segment-card-seg-1')
        const seg2Card = screen.getByTestId('segment-card-seg-2')
        const seg3Card = screen.getByTestId('segment-card-seg-3')

        expect(within(seg1Card).getByText('Has Video')).toBeInTheDocument()
        expect(within(seg2Card).getByText('Has Video')).toBeInTheDocument()
        expect(within(seg3Card).queryByText('Has Video')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Progress Display
  // ============================================================================
  describe('Progress Display', () => {
    it('shows progress card when segment group exists', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: mockVideos,
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Generation Progress')).toBeInTheDocument()
      })
    })

    it('displays correct completion count', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: mockVideos, // 2 of 3 have videos
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('2 of 3 segments generated')).toBeInTheDocument()
      })
    })

    it('calculates progress percentage correctly', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: mockVideos, // 2 of 3 = 67%
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('67%')).toBeInTheDocument()
      })
    })

    it('shows 100% progress when all segments have videos', async () => {
      const allVideos = [
        { id: 'video-1', segment_id: 'seg-1' },
        { id: 'video-2', segment_id: 'seg-2' },
        { id: 'video-3', segment_id: 'seg-3' },
      ]

      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: { ...mockSegmentGroup, status: 'complete' },
          segmentsData: mockSegments,
          videosData: allVideos,
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
        expect(screen.getByText('3 of 3 segments generated')).toBeInTheDocument()
      })
    })

    it('does not show progress card when no segment group exists', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: null,
          segmentsData: mockSegments,
          videosData: [],
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument()
      })
      expect(screen.queryByText('Generation Progress')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Status Badge Display
  // ============================================================================
  describe('Status Badge Display', () => {
    const statusTestCases = [
      { status: 'pending', expected: 'Pending' },
      { status: 'generating', expected: 'Generating' },
      { status: 'partial', expected: 'In Progress' },
      { status: 'complete', expected: 'Complete' },
      { status: 'error', expected: 'Error' },
      { status: 'unknown_status', expected: 'unknown_status' },
      { status: null, expected: 'Unknown' },
    ]

    statusTestCases.forEach(({ status, expected }) => {
      it(`displays "${expected}" badge for status "${status}"`, async () => {
        mockSupabaseFrom.mockImplementation(
          createMockQueryBuilder({
            segmentGroupData: { ...mockSegmentGroup, status },
            segmentsData: mockSegments,
            videosData: [],
          })
        )

        render(<SegmentList {...defaultProps} />)

        await waitFor(() => {
          expect(screen.getByText(expected)).toBeInTheDocument()
        })
      })
    })
  })

  // ============================================================================
  // User Interactions
  // ============================================================================
  describe('User Interactions', () => {
    it('opens detail drawer when View Details is clicked', async () => {
      const user = userEvent.setup()
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: [],
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('segment-card-seg-1')).toBeInTheDocument()
      })

      const seg1Card = screen.getByTestId('segment-card-seg-1')
      await user.click(within(seg1Card).getByRole('button', { name: /view details/i }))

      expect(screen.getByTestId('segment-detail-drawer')).toBeInTheDocument()
      expect(screen.getByText('Detail for: Opening Scene')).toBeInTheDocument()
    })

    it('closes detail drawer when close button is clicked', async () => {
      const user = userEvent.setup()
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: [],
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('segment-card-seg-1')).toBeInTheDocument()
      })

      // Open drawer
      const seg1Card = screen.getByTestId('segment-card-seg-1')
      await user.click(within(seg1Card).getByRole('button', { name: /view details/i }))
      expect(screen.getByTestId('segment-detail-drawer')).toBeInTheDocument()

      // Close drawer
      await user.click(screen.getByRole('button', { name: /close drawer/i }))
      expect(screen.queryByTestId('segment-detail-drawer')).not.toBeInTheDocument()
    })

    it('opens detail drawer when Generate is clicked', async () => {
      const user = userEvent.setup()
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: [],
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('segment-card-seg-2')).toBeInTheDocument()
      })

      const seg2Card = screen.getByTestId('segment-card-seg-2')
      await user.click(within(seg2Card).getByRole('button', { name: /generate/i }))

      expect(screen.getByTestId('segment-detail-drawer')).toBeInTheDocument()
      expect(screen.getByText('Detail for: Confrontation')).toBeInTheDocument()
    })

    it('navigates to video page when View Video is clicked', async () => {
      const user = userEvent.setup()
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: mockVideos,
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('segment-card-seg-1')).toBeInTheDocument()
      })

      const seg1Card = screen.getByTestId('segment-card-seg-1')
      await user.click(within(seg1Card).getByRole('button', { name: /view video/i }))

      expect(window.location.href).toBe('/dashboard/videos/video-1')
    })
  })

  // ============================================================================
  // Refresh Trigger
  // ============================================================================
  describe('Refresh Trigger', () => {
    it('reloads data when refreshTrigger changes', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: [],
        })
      )

      const { rerender } = render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument()
      })

      // Clear call count
      mockSupabaseFrom.mockClear()

      // Update segments to include a new one
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: [
            ...mockSegments,
            {
              id: 'seg-4',
              episode_id: 'episode-123',
              segment_number: 4,
              title: 'New Segment',
              description: 'Added after refresh',
              duration_seconds: 12,
              prompt: 'New scene',
              created_at: '2024-01-15T10:03:00Z',
            },
          ],
          videosData: [],
        })
      )

      // Trigger refresh
      rerender(<SegmentList {...defaultProps} refreshTrigger={1} />)

      await waitFor(() => {
        expect(screen.getByText('New Segment')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles videos fetch error gracefully (continues with empty video map)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosError: { message: 'Videos fetch failed' },
        })
      )

      render(<SegmentList {...defaultProps} />)

      // Should still render segments, just without video status
      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument()
      })

      // All segments should not have video status
      const seg1Card = screen.getByTestId('segment-card-seg-1')
      expect(within(seg1Card).queryByText('Has Video')).not.toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('handles null segments data gracefully', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'segment_groups') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'video_segments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null, // null instead of empty array
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      render(<SegmentList {...defaultProps} />)

      // Should show empty state
      await waitFor(() => {
        expect(screen.getByText('No Segments Yet')).toBeInTheDocument()
      })
    })

    it('handles generic error without Error instance', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockSupabaseFrom.mockImplementation(() => {
        throw 'String error' // Not an Error instance
      })

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Segments')).toBeInTheDocument()
        expect(screen.getByText('Failed to load segments')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('renders single segment correctly', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: [mockSegments[0]],
          videosData: [mockVideos[0]],
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('1 of 1 segments generated')).toBeInTheDocument()
        expect(screen.getByText('100%')).toBeInTheDocument()
      })
    })

    it('handles segments without matching videos correctly', async () => {
      mockSupabaseFrom.mockImplementation(
        createMockQueryBuilder({
          segmentGroupData: mockSegmentGroup,
          segmentsData: mockSegments,
          videosData: [{ id: 'video-99', segment_id: 'non-existent-segment' }],
        })
      )

      render(<SegmentList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('0 of 3 segments generated')).toBeInTheDocument()
        expect(screen.getByText('0%')).toBeInTheDocument()
      })
    })
  })
})
