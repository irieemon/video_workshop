import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PerformanceMetricsList } from '@/components/performance/performance-metrics-list'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock fetch
global.fetch = jest.fn()

describe('PerformanceMetricsList', () => {
  const mockOnDelete = jest.fn()
  const videoId = 'test-video-id'

  const mockMetrics = [
    {
      id: 'metric-1',
      platform: 'tiktok' as const,
      views: 10000,
      likes: 500,
      comments: 50,
      shares: 25,
      saves: 100,
      watch_time_seconds: 3600,
      completion_rate: 85,
      traffic_source: 'fyp' as const,
      recorded_at: '2025-10-29T12:00:00Z',
    },
    {
      id: 'metric-2',
      platform: 'instagram' as const,
      views: 5000,
      likes: 250,
      comments: 25,
      shares: 10,
      saves: 150,
      watch_time_seconds: null,
      completion_rate: null,
      traffic_source: null,
      recorded_at: '2025-10-28T12:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  it('renders empty state when no metrics', () => {
    render(<PerformanceMetricsList videoId={videoId} metrics={[]} onDelete={mockOnDelete} />)

    expect(screen.getByText('No performance data yet')).toBeInTheDocument()
    expect(
      screen.getByText(/Add your first performance metrics to start tracking/)
    ).toBeInTheDocument()
  })

  it('renders metrics list', () => {
    render(
      <PerformanceMetricsList videoId={videoId} metrics={mockMetrics} onDelete={mockOnDelete} />
    )

    expect(screen.getByText('TikTok')).toBeInTheDocument()
    expect(screen.getByText('Instagram')).toBeInTheDocument()
    expect(screen.getByText('10,000')).toBeInTheDocument()
    expect(screen.getByText('5,000')).toBeInTheDocument()
  })

  it('displays platform-specific badges', () => {
    render(
      <PerformanceMetricsList videoId={videoId} metrics={mockMetrics} onDelete={mockOnDelete} />
    )

    const badges = screen.getAllByText(/TikTok|Instagram/)
    expect(badges).toHaveLength(2)
  })

  it('displays engagement rate correctly', () => {
    render(
      <PerformanceMetricsList videoId={videoId} metrics={mockMetrics} onDelete={mockOnDelete} />
    )

    // TikTok engagement: (500 + 50 + 25) / 10000 * 100 = 5.75%
    expect(screen.getByText('5.75%')).toBeInTheDocument()
    // Instagram engagement: (250 + 25 + 10) / 5000 * 100 = 5.70%
    expect(screen.getByText('5.70%')).toBeInTheDocument()
  })

  it('shows completion rate when available', () => {
    render(
      <PerformanceMetricsList videoId={videoId} metrics={mockMetrics} onDelete={mockOnDelete} />
    )

    expect(screen.getByText('85.0%')).toBeInTheDocument()
  })

  it('shows traffic source badge when available', () => {
    render(
      <PerformanceMetricsList videoId={videoId} metrics={mockMetrics} onDelete={mockOnDelete} />
    )

    expect(screen.getByText('For You Page')).toBeInTheDocument()
  })

  it('shows delete confirmation dialog', async () => {
    render(
      <PerformanceMetricsList videoId={videoId} metrics={mockMetrics} onDelete={mockOnDelete} />
    )

    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: '' })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Delete Performance Metric?')).toBeInTheDocument()
    })
  })

  it('handles delete confirmation', async () => {
    render(
      <PerformanceMetricsList videoId={videoId} metrics={mockMetrics} onDelete={mockOnDelete} />
    )

    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: '' })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Delete Performance Metric?')).toBeInTheDocument()
    })

    // Confirm delete
    const confirmButton = screen.getByRole('button', { name: 'Delete' })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/videos/${videoId}/performance/metric-1`,
        { method: 'DELETE' }
      )
      expect(mockOnDelete).toHaveBeenCalled()
    })
  })

  it('handles delete cancellation', async () => {
    render(
      <PerformanceMetricsList videoId={videoId} metrics={mockMetrics} onDelete={mockOnDelete} />
    )

    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: '' })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Delete Performance Metric?')).toBeInTheDocument()
    })

    // Cancel delete
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockOnDelete).not.toHaveBeenCalled()
  })

  it('handles zero views gracefully', () => {
    const zeroViewsMetric = [
      {
        ...mockMetrics[0],
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      },
    ]

    render(
      <PerformanceMetricsList
        videoId={videoId}
        metrics={zeroViewsMetric}
        onDelete={mockOnDelete}
      />
    )

    // Should render the metric card
    expect(screen.getByText('TikTok')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // Zero views displayed
  })

  it('formats numbers with commas', () => {
    const largeNumberMetric = [
      {
        ...mockMetrics[0],
        views: 1000000,
        likes: 50000,
      },
    ]

    render(
      <PerformanceMetricsList
        videoId={videoId}
        metrics={largeNumberMetric}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('1,000,000')).toBeInTheDocument()
    expect(screen.getByText('50,000')).toBeInTheDocument()
  })
})
