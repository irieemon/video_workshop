/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoReadyDashboard } from '@/components/videos/video-ready-dashboard'

// Mock next/navigation
const mockPush = jest.fn()
const mockRouter = { push: mockPush, refresh: jest.fn() }
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
})

// Mock child components
jest.mock('@/components/videos/sora-generation-modal', () => ({
  SoraGenerationModal: ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    if (!open) return null
    return (
      <div data-testid="sora-generation-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    )
  },
}))

jest.mock('@/components/videos/api-key-status-bar', () => ({
  ApiKeyStatusBar: ({
    onKeySelected,
    selectedKeyId,
  }: {
    onKeySelected: (id: string | null) => void
    selectedKeyId: string | null
  }) => (
    <div data-testid="api-key-status-bar">
      <button onClick={() => onKeySelected('key-123')}>Select Key</button>
      <span>Selected: {selectedKeyId || 'none'}</span>
    </div>
  ),
}))

jest.mock('@/components/videos/open-in-sora-button', () => ({
  OpenInSoraButton: ({ prompt }: { prompt: string }) => (
    <button data-testid="open-in-sora-button">Open in Sora</button>
  ),
}))

jest.mock('@/components/videos/share-export-menu', () => ({
  ShareExportMenu: () => (
    <button data-testid="share-export-menu">Share & Export</button>
  ),
}))

jest.mock('@/components/videos/prompt-action-card', () => ({
  PromptActionCard: ({
    title,
    onClick,
    isPremiumLocked,
    secondaryAction,
  }: {
    title: string
    onClick: () => void
    isPremiumLocked?: boolean
    secondaryAction?: { label: string; onClick: () => void }
  }) => (
    <div data-testid={`action-card-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <h3>{title}</h3>
      <button onClick={onClick}>{isPremiumLocked ? 'Locked' : 'Action'}</button>
      {secondaryAction && (
        <button onClick={secondaryAction.onClick}>{secondaryAction.label}</button>
      )}
    </div>
  ),
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}))

// Mock video data
const mockVideo = {
  id: 'video-123',
  title: 'Epic Adventure Scene',
  user_brief: 'Create an epic adventure scene with mountains',
  platform: 'tiktok',
  optimized_prompt: 'A sweeping cinematic shot of majestic mountains at golden hour...',
  detailed_breakdown: {
    format_and_look: '16:9 cinematic',
    lenses_and_filtration: 'Wide angle 24mm',
    grade_palette: 'Warm golden tones',
    lighting_atmosphere: 'Golden hour lighting',
    location_framing: 'Mountain range establishing shot',
    shot_list_summary: '1. Wide establishing shot 2. Medium pan',
    camera_notes: 'Steady dolly movement',
  },
  character_count: 150,
  created_at: '2024-01-01T12:00:00Z',
  series: { name: 'Adventure Series', is_system: false },
  sora_generation_settings: {
    aspect_ratio: '16:9',
    duration: 10,
    resolution: '1080p',
    model: 'sora-1.0-turbo',
  },
}

const mockHashtags = ['#adventure', '#cinematic', '#mountains', '#nature']

describe('VideoReadyDashboard', () => {
  const defaultProps = {
    video: mockVideo,
    hashtags: mockHashtags,
    subscriptionTier: 'free' as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Rendering
  // ============================================================================
  describe('Rendering', () => {
    it('renders the dashboard with video title', () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      expect(screen.getByText('Your Video Prompt is Ready!')).toBeInTheDocument()
      expect(screen.getByText(/"Epic Adventure Scene"/)).toBeInTheDocument()
    })

    it('displays platform badge', () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      expect(screen.getByText('tiktok')).toBeInTheDocument()
    })

    it('displays series badge when series exists and is not system', () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      expect(screen.getByText('Series: Adventure Series')).toBeInTheDocument()
    })

    it('does not display series badge for system series', () => {
      const propsWithSystemSeries = {
        ...defaultProps,
        video: {
          ...mockVideo,
          series: { name: 'Standalone', is_system: true },
        },
      }

      render(<VideoReadyDashboard {...propsWithSystemSeries} />)

      expect(screen.queryByText('Series: Standalone')).not.toBeInTheDocument()
    })

    it('displays creation time', () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      expect(screen.getByText(/Created 2 hours ago/)).toBeInTheDocument()
    })

    it('truncates long titles', () => {
      const propsWithLongTitle = {
        ...defaultProps,
        video: {
          ...mockVideo,
          title: 'A'.repeat(100),
        },
      }

      render(<VideoReadyDashboard {...propsWithLongTitle} />)

      expect(screen.getByText(/"A{60}\.\.\.\"/)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Free User Experience
  // ============================================================================
  describe('Free User Experience', () => {
    it('shows API key status bar for free users', () => {
      render(<VideoReadyDashboard {...defaultProps} subscriptionTier="free" />)

      expect(screen.getByTestId('api-key-status-bar')).toBeInTheDocument()
    })

    it('does not show API key status bar for premium users', () => {
      render(<VideoReadyDashboard {...defaultProps} subscriptionTier="premium" />)

      expect(screen.queryByTestId('api-key-status-bar')).not.toBeInTheDocument()
    })

    it('shows upgrade dialog when free user without API key clicks generate', () => {
      render(<VideoReadyDashboard {...defaultProps} subscriptionTier="free" />)

      // Find and click the generate button in the action card
      const generateCard = screen.getByTestId('action-card-generate-with-sora')
      const generateButton = within(generateCard).getByText('Locked')
      fireEvent.click(generateButton)

      // Upgrade dialog should appear
      expect(screen.getByText('Premium Feature')).toBeInTheDocument()
    })

    it('allows generation for free user with API key configured', async () => {
      render(<VideoReadyDashboard {...defaultProps} subscriptionTier="free" />)

      // Configure API key
      const selectKeyButton = screen.getByText('Select Key')
      fireEvent.click(selectKeyButton)

      // Now generate should work
      const generateCard = screen.getByTestId('action-card-generate-with-sora')
      const generateButton = within(generateCard).getByRole('button', { name: /action/i })
      fireEvent.click(generateButton)

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByTestId('sora-generation-modal')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Premium User Experience
  // ============================================================================
  describe('Premium User Experience', () => {
    it('allows direct generation for premium users', async () => {
      render(<VideoReadyDashboard {...defaultProps} subscriptionTier="premium" />)

      const generateCard = screen.getByTestId('action-card-generate-with-sora')
      const generateButton = within(generateCard).getByRole('button', { name: /action/i })
      fireEvent.click(generateButton)

      // Modal should appear directly
      await waitFor(() => {
        expect(screen.getByTestId('sora-generation-modal')).toBeInTheDocument()
      })
    })

    it('allows direct generation for enterprise users', async () => {
      render(<VideoReadyDashboard {...defaultProps} subscriptionTier="enterprise" />)

      const generateCard = screen.getByTestId('action-card-generate-with-sora')
      const generateButton = within(generateCard).getByRole('button', { name: /action/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByTestId('sora-generation-modal')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Copy Actions
  // ============================================================================
  describe('Copy Actions', () => {
    it('copies prompt to clipboard', async () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      const copyCard = screen.getByTestId('action-card-copy-prompt')
      const copyButton = within(copyCard).getByRole('button')
      fireEvent.click(copyButton)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockVideo.optimized_prompt)
    })
  })

  // ============================================================================
  // Collapsible Sections
  // ============================================================================
  describe('Collapsible Sections', () => {
    it('toggles prompt section', async () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      const promptTrigger = screen.getByText('View Optimized Prompt')
      fireEvent.click(promptTrigger)

      // Content should be visible after expanding
      await waitFor(() => {
        expect(screen.getByText(mockVideo.optimized_prompt)).toBeInTheDocument()
      })
    })

    it('toggles technical specs section', async () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      const specsTrigger = screen.getByText('View Technical Specifications')
      fireEvent.click(specsTrigger)

      await waitFor(() => {
        expect(screen.getByText('Format & Look')).toBeInTheDocument()
        expect(screen.getByText('16:9 cinematic')).toBeInTheDocument()
      })
    })

    it('toggles hashtags section', async () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      const hashtagsTrigger = screen.getByText('View Hashtags (4)')
      fireEvent.click(hashtagsTrigger)

      await waitFor(() => {
        expect(screen.getByText('#adventure')).toBeInTheDocument()
        expect(screen.getByText('#cinematic')).toBeInTheDocument()
      })
    })

    it('displays character count in prompt section', async () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      const promptTrigger = screen.getByText('View Optimized Prompt')
      fireEvent.click(promptTrigger)

      await waitFor(() => {
        expect(screen.getByText('150 characters')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Technical Specifications
  // ============================================================================
  describe('Technical Specifications', () => {
    it('displays all breakdown fields when available', async () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      const specsTrigger = screen.getByText('View Technical Specifications')
      fireEvent.click(specsTrigger)

      await waitFor(() => {
        expect(screen.getByText('Format & Look')).toBeInTheDocument()
        expect(screen.getByText('Lenses & Filtration')).toBeInTheDocument()
        expect(screen.getByText('Grade / Palette')).toBeInTheDocument()
        expect(screen.getByText('Lighting & Atmosphere')).toBeInTheDocument()
        expect(screen.getByText('Location & Framing')).toBeInTheDocument()
        expect(screen.getByText('Shot List Summary')).toBeInTheDocument()
        expect(screen.getByText('Camera Notes')).toBeInTheDocument()
      })
    })

    it('shows empty state when no breakdown data', async () => {
      const propsWithNoBreakdown = {
        ...defaultProps,
        video: {
          ...mockVideo,
          detailed_breakdown: null,
        },
      }

      render(<VideoReadyDashboard {...propsWithNoBreakdown} />)

      const specsTrigger = screen.getByText('View Technical Specifications')
      fireEvent.click(specsTrigger)

      await waitFor(() => {
        expect(screen.getByText('No technical specifications available.')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Hashtags
  // ============================================================================
  describe('Hashtags', () => {
    it('displays correct hashtag count', () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      expect(screen.getByText('View Hashtags (4)')).toBeInTheDocument()
    })

    it('renders all hashtags as badges', async () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      const hashtagsTrigger = screen.getByText('View Hashtags (4)')
      fireEvent.click(hashtagsTrigger)

      await waitFor(() => {
        mockHashtags.forEach((tag) => {
          expect(screen.getByText(tag)).toBeInTheDocument()
        })
      })
    })

    it('copies all hashtags when clicking copy button', async () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      // Expand hashtags section
      const hashtagsTrigger = screen.getByText('View Hashtags (4)')
      fireEvent.click(hashtagsTrigger)

      await waitFor(() => {
        expect(screen.getByText('Copy All Hashtags')).toBeInTheDocument()
      })

      // Click copy button
      const copyButton = screen.getByText('Copy All Hashtags')
      fireEvent.click(copyButton)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '#adventure #cinematic #mountains #nature'
      )
    })
  })

  // ============================================================================
  // Navigation
  // ============================================================================
  describe('Navigation', () => {
    it('has link back to discussion', () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      const backLink = screen.getByRole('link', { name: /back/i })
      expect(backLink).toHaveAttribute('href', '/dashboard/videos/video-123/roundtable')
    })

    it('shows step indicator at step 3 (Ready)', () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      // Step indicator should show we're on the "Ready" step
      expect(screen.getByText('Brief')).toBeInTheDocument()
      expect(screen.getByText('AI Discussion')).toBeInTheDocument()
      expect(screen.getByText('Ready')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Upgrade Dialog
  // ============================================================================
  describe('Upgrade Dialog', () => {
    it('displays upgrade benefits', async () => {
      render(<VideoReadyDashboard {...defaultProps} subscriptionTier="free" />)

      // Click generate to open upgrade dialog
      const generateCard = screen.getByTestId('action-card-generate-with-sora')
      const generateButton = within(generateCard).getByText('Locked')
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Premium Benefits')).toBeInTheDocument()
        expect(screen.getByText('Unlimited AI-powered video generation')).toBeInTheDocument()
        expect(screen.getByText('Priority generation queue')).toBeInTheDocument()
        expect(screen.getByText('HD video exports')).toBeInTheDocument()
      })
    })

    it('has link to add API key from upgrade dialog', async () => {
      render(<VideoReadyDashboard {...defaultProps} subscriptionTier="free" />)

      const generateCard = screen.getByTestId('action-card-generate-with-sora')
      const generateButton = within(generateCard).getByText('Locked')
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Add API Key' })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Add API Key' }))

      expect(mockPush).toHaveBeenCalledWith('/dashboard/settings?tab=api-keys')
    })

    it('has link to upgrade to premium', async () => {
      render(<VideoReadyDashboard {...defaultProps} subscriptionTier="free" />)

      const generateCard = screen.getByTestId('action-card-generate-with-sora')
      const generateButton = within(generateCard).getByText('Locked')
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Upgrade to Premium/i })).toHaveAttribute(
          'href',
          '/dashboard/settings?tab=subscription'
        )
      })
    })
  })

  // ============================================================================
  // Action Cards
  // ============================================================================
  describe('Action Cards', () => {
    it('renders all action cards', () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      expect(screen.getByTestId('action-card-copy-prompt')).toBeInTheDocument()
      expect(screen.getByTestId('action-card-generate-with-sora')).toBeInTheDocument()
      // Use heading role to find card titles (there may be button with same text)
      expect(screen.getByRole('heading', { name: 'Open in Sora' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Share & Export' })).toBeInTheDocument()
    })

    it('renders open in sora button', () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      expect(screen.getByTestId('open-in-sora-button')).toBeInTheDocument()
    })

    it('renders share export menu', () => {
      render(<VideoReadyDashboard {...defaultProps} />)

      expect(screen.getByTestId('share-export-menu')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Sora Modal
  // ============================================================================
  describe('Sora Modal', () => {
    it('opens modal for premium users', async () => {
      render(<VideoReadyDashboard {...defaultProps} subscriptionTier="premium" />)

      const generateCard = screen.getByTestId('action-card-generate-with-sora')
      const generateButton = within(generateCard).getByRole('button', { name: /action/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByTestId('sora-generation-modal')).toBeInTheDocument()
      })
    })

    it('closes modal when close button clicked', async () => {
      render(<VideoReadyDashboard {...defaultProps} subscriptionTier="premium" />)

      const generateCard = screen.getByTestId('action-card-generate-with-sora')
      const generateButton = within(generateCard).getByRole('button', { name: /action/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByTestId('sora-generation-modal')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Close Modal'))

      await waitFor(() => {
        expect(screen.queryByTestId('sora-generation-modal')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles video without series', () => {
      const propsWithoutSeries = {
        ...defaultProps,
        video: {
          ...mockVideo,
          series: null,
        },
      }

      render(<VideoReadyDashboard {...propsWithoutSeries} />)

      // Should not throw and should not show series badge
      expect(screen.queryByText(/Series:/)).not.toBeInTheDocument()
    })

    it('handles video without sora settings', () => {
      const propsWithoutSettings = {
        ...defaultProps,
        video: {
          ...mockVideo,
          sora_generation_settings: undefined,
        },
      }

      render(<VideoReadyDashboard {...propsWithoutSettings} />)

      // Should render without crashing
      expect(screen.getByText('Your Video Prompt is Ready!')).toBeInTheDocument()
    })

    it('handles empty hashtags array', () => {
      const propsWithNoHashtags = {
        ...defaultProps,
        hashtags: [],
      }

      render(<VideoReadyDashboard {...propsWithNoHashtags} />)

      expect(screen.getByText('View Hashtags (0)')).toBeInTheDocument()
    })

    it('uses prompt length when character_count is not provided', async () => {
      const propsWithNoCharCount = {
        ...defaultProps,
        video: {
          ...mockVideo,
          character_count: 0, // Falsy, should use prompt length
        },
      }

      render(<VideoReadyDashboard {...propsWithNoCharCount} />)

      const promptTrigger = screen.getByText('View Optimized Prompt')
      fireEvent.click(promptTrigger)

      await waitFor(() => {
        // Should show prompt length instead
        expect(
          screen.getByText(`${mockVideo.optimized_prompt.length} characters`)
        ).toBeInTheDocument()
      })
    })
  })
})
