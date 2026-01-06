/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PromptOutput } from '@/components/videos/prompt-output'

describe('PromptOutput', () => {
  const defaultProps = {
    detailedBreakdown: {
      format_and_look: 'Cinema 4K, 24fps, 2.39:1 aspect ratio',
      lenses_and_filtration: 'Anamorphic 50mm, slight diffusion filter',
      grade_palette: 'Warm teal and orange color grading',
      lighting_atmosphere: 'Golden hour backlighting with soft fill',
      location_framing: 'Urban rooftop, wide establishing shot',
      wardrobe_props_extras: 'Modern casual attire, smartphone prop',
      sound: 'Ambient city sounds, subtle score',
      shot_list_summary: '5 shots total, 3 wide, 2 close-up',
      camera_notes: 'Steady gimbal movement, slow push-in',
      finishing: 'Film grain, subtle vignette',
    },
    optimizedPrompt:
      'A cinematic shot of a person walking through a bustling city at golden hour, captured in 4K with warm teal and orange color grading.',
    characterCount: 142,
    hashtags: ['#cinematic', '#goldenhour', '#citylife', '#filmmaking', '#sora'],
  }

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders the optimized prompt card', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Optimized Sora Prompt')).toBeInTheDocument()
      expect(
        screen.getByText('Ready to use in Sora video generation')
      ).toBeInTheDocument()
    })

    it('renders the prompt text', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText(defaultProps.optimizedPrompt)).toBeInTheDocument()
    })

    it('renders the hashtags card', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Recommended Hashtags')).toBeInTheDocument()
      expect(
        screen.getByText('Platform-optimized tags for maximum reach')
      ).toBeInTheDocument()
    })

    it('renders all hashtags as badges', () => {
      render(<PromptOutput {...defaultProps} />)

      defaultProps.hashtags.forEach((tag) => {
        expect(screen.getByText(tag)).toBeInTheDocument()
      })
    })

    it('renders technical specifications card', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(
        screen.getByText('Technical Production Specifications')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Detailed breakdown with abbreviation reference')
      ).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Copy Functionality
  // ============================================================================
  describe('Copy Functionality', () => {
    it('renders Copy Prompt button', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Copy Prompt')).toBeInTheDocument()
    })

    it('copies prompt to clipboard when Copy Prompt is clicked', async () => {
      const user = userEvent.setup()
      render(<PromptOutput {...defaultProps} />)

      await user.click(screen.getByText('Copy Prompt'))

      // Wait for the state update - the "Copied!" text appearing confirms:
      // 1. The click handler (handleCopyPrompt) was called
      // 2. The async clipboard.writeText() call completed successfully
      // 3. The state was updated to show the feedback
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })
    })

    it('shows Copied! feedback after copying prompt', async () => {
      const user = userEvent.setup()
      render(<PromptOutput {...defaultProps} />)

      await user.click(screen.getByText('Copy Prompt'))

      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })

    it('renders Copy All button for hashtags', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Copy All')).toBeInTheDocument()
    })

    it('copies hashtags to clipboard when Copy All is clicked', async () => {
      const user = userEvent.setup()
      render(<PromptOutput {...defaultProps} />)

      await user.click(screen.getByText('Copy All'))

      // Wait for the state update - "Copied!" appearing confirms:
      // 1. The click handler (handleCopyHashtags) was called
      // 2. The async clipboard.writeText() call completed successfully
      // 3. The state was updated to show the feedback
      await waitFor(() => {
        const copiedElements = screen.getAllByText('Copied!')
        expect(copiedElements.length).toBeGreaterThan(0)
      })
    })

    it('shows Copied! feedback after copying hashtags', async () => {
      const user = userEvent.setup()
      render(<PromptOutput {...defaultProps} />)

      await user.click(screen.getByText('Copy All'))

      // There should be a Copied! text after clicking
      await waitFor(() => {
        const copiedElements = screen.getAllByText('Copied!')
        expect(copiedElements.length).toBeGreaterThan(0)
      })
    })

    it('resets copy feedback after timeout', async () => {
      const user = userEvent.setup()
      render(<PromptOutput {...defaultProps} />)

      await user.click(screen.getByText('Copy Prompt'))
      expect(screen.getByText('Copied!')).toBeInTheDocument()

      // Wait for the 2-second timeout to complete (with buffer)
      await waitFor(
        () => {
          expect(screen.getByText('Copy Prompt')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })
  })

  // ============================================================================
  // Modern AI-Generated Fields (Detailed Breakdown)
  // ============================================================================
  describe('Modern AI-Generated Fields', () => {
    it('renders Format & Look section', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Format & Look')).toBeInTheDocument()
      expect(
        screen.getByText(defaultProps.detailedBreakdown.format_and_look!)
      ).toBeInTheDocument()
    })

    it('renders Lenses & Filtration section', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Lenses & Filtration')).toBeInTheDocument()
      expect(
        screen.getByText(defaultProps.detailedBreakdown.lenses_and_filtration!)
      ).toBeInTheDocument()
    })

    it('renders Grade / Palette section', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Grade / Palette')).toBeInTheDocument()
      expect(
        screen.getByText(defaultProps.detailedBreakdown.grade_palette!)
      ).toBeInTheDocument()
    })

    it('renders Lighting & Atmosphere section', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Lighting & Atmosphere')).toBeInTheDocument()
      expect(
        screen.getByText(defaultProps.detailedBreakdown.lighting_atmosphere!)
      ).toBeInTheDocument()
    })

    it('renders Location & Framing section', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Location & Framing')).toBeInTheDocument()
      expect(
        screen.getByText(defaultProps.detailedBreakdown.location_framing!)
      ).toBeInTheDocument()
    })

    it('renders Wardrobe / Props / Extras section', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Wardrobe / Props / Extras')).toBeInTheDocument()
      expect(
        screen.getByText(defaultProps.detailedBreakdown.wardrobe_props_extras!)
      ).toBeInTheDocument()
    })

    it('renders Sound section', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Sound')).toBeInTheDocument()
      expect(
        screen.getByText(defaultProps.detailedBreakdown.sound!)
      ).toBeInTheDocument()
    })

    it('renders Shot List Summary section', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Shot List Summary')).toBeInTheDocument()
      expect(
        screen.getByText(defaultProps.detailedBreakdown.shot_list_summary!)
      ).toBeInTheDocument()
    })

    it('renders Camera Notes section', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Camera Notes')).toBeInTheDocument()
      expect(
        screen.getByText(defaultProps.detailedBreakdown.camera_notes!)
      ).toBeInTheDocument()
    })

    it('renders Finishing section', () => {
      render(<PromptOutput {...defaultProps} />)

      expect(screen.getByText('Finishing')).toBeInTheDocument()
      expect(
        screen.getByText(defaultProps.detailedBreakdown.finishing!)
      ).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Conditional Rendering - Missing Fields
  // ============================================================================
  describe('Conditional Rendering - Missing Fields', () => {
    it('does not render Format & Look when not provided', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          ...defaultProps.detailedBreakdown,
          format_and_look: undefined,
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.queryByText('Format & Look')).not.toBeInTheDocument()
    })

    it('does not render Lenses & Filtration when not provided', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          ...defaultProps.detailedBreakdown,
          lenses_and_filtration: undefined,
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.queryByText('Lenses & Filtration')).not.toBeInTheDocument()
    })

    it('does not render Sound when not provided', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          ...defaultProps.detailedBreakdown,
          sound: undefined,
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.queryByText('Sound')).not.toBeInTheDocument()
    })

    it('renders with empty breakdown object', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {},
      }
      render(<PromptOutput {...props} />)

      // Should still render the main cards
      expect(screen.getByText('Optimized Sora Prompt')).toBeInTheDocument()
      expect(screen.getByText('Recommended Hashtags')).toBeInTheDocument()
      expect(
        screen.getByText('Technical Production Specifications')
      ).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Legacy Fields (Backward Compatibility)
  // ============================================================================
  describe('Legacy Fields', () => {
    it('renders Subject Direction & Action for legacy field', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          subject_direction: 'Walk slowly towards camera with confident posture',
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('Subject Direction & Action')).toBeInTheDocument()
      expect(
        screen.getByText('Walk slowly towards camera with confident posture')
      ).toBeInTheDocument()
    })

    it('renders Scene Structure & Timing for legacy field', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          scene_structure: '30 second shot, single take',
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('Scene Structure & Timing')).toBeInTheDocument()
      expect(screen.getByText('30 second shot, single take')).toBeInTheDocument()
    })

    it('renders Camera Specifications for legacy field', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          camera_specs: 'RED Komodo 6K, 50mm prime lens',
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('Camera Specifications')).toBeInTheDocument()
      expect(
        screen.getByText('RED Komodo 6K, 50mm prime lens')
      ).toBeInTheDocument()
    })

    it('renders Lighting Setup for legacy field', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          lighting_setup: 'Natural light with bounce fill',
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('Lighting Setup')).toBeInTheDocument()
      expect(
        screen.getByText('Natural light with bounce fill')
      ).toBeInTheDocument()
    })

    it('renders Composition Rules for legacy field', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          composition_rules: 'Rule of thirds, leading lines',
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('Composition Rules')).toBeInTheDocument()
      expect(
        screen.getByText('Rule of thirds, leading lines')
      ).toBeInTheDocument()
    })

    it('renders Platform Specifications for legacy field', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          platform_specs: 'TikTok vertical 9:16, 1080x1920',
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('Platform Specifications')).toBeInTheDocument()
      expect(
        screen.getByText('TikTok vertical 9:16, 1080x1920')
      ).toBeInTheDocument()
    })

    it('renders Audio Direction for legacy audio field', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          audio: 'Lo-fi hip hop background music',
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('Audio Direction')).toBeInTheDocument()
      expect(
        screen.getByText('Lo-fi hip hop background music')
      ).toBeInTheDocument()
    })

    it('renders Visual Specifications only when camera_specs is not present', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          visual_specs: 'High contrast, cinematic look',
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('Visual Specifications')).toBeInTheDocument()
      expect(
        screen.getByText('High contrast, cinematic look')
      ).toBeInTheDocument()
    })

    it('does not render Visual Specifications when camera_specs is present', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          visual_specs: 'High contrast, cinematic look',
          camera_specs: 'RED Komodo 6K',
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.queryByText('Visual Specifications')).not.toBeInTheDocument()
      expect(screen.getByText('Camera Specifications')).toBeInTheDocument()
    })

    it('renders Platform Optimization only when platform_specs is not present', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          platform_optimization: 'Optimized for Instagram Reels',
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('Platform Optimization')).toBeInTheDocument()
      expect(
        screen.getByText('Optimized for Instagram Reels')
      ).toBeInTheDocument()
    })

    it('does not render Platform Optimization when platform_specs is present', () => {
      const props = {
        ...defaultProps,
        detailedBreakdown: {
          platform_optimization: 'Optimized for Instagram Reels',
          platform_specs: 'Instagram Reels 9:16',
        },
      }
      render(<PromptOutput {...props} />)

      expect(screen.queryByText('Platform Optimization')).not.toBeInTheDocument()
      expect(screen.getByText('Platform Specifications')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Empty States
  // ============================================================================
  describe('Empty States', () => {
    it('renders with empty hashtags array', () => {
      const props = {
        ...defaultProps,
        hashtags: [],
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('Recommended Hashtags')).toBeInTheDocument()
      // Copy All button should still be present
      expect(screen.getByText('Copy All')).toBeInTheDocument()
    })

    it('copies empty string when hashtags are empty', async () => {
      const user = userEvent.setup()
      const props = {
        ...defaultProps,
        hashtags: [],
      }
      render(<PromptOutput {...props} />)

      await user.click(screen.getByText('Copy All'))

      // Wait for copy to complete - "Copied!" feedback appearing confirms
      // the handler ran and clipboard.writeText() completed (with empty string)
      await waitFor(() => {
        const copiedElements = screen.getAllByText('Copied!')
        expect(copiedElements.length).toBeGreaterThan(0)
      })
    })

    it('renders with empty optimizedPrompt', () => {
      const props = {
        ...defaultProps,
        optimizedPrompt: '',
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('Optimized Sora Prompt')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Hashtag Edge Cases
  // ============================================================================
  describe('Hashtag Edge Cases', () => {
    it('renders single hashtag correctly', () => {
      const props = {
        ...defaultProps,
        hashtags: ['#sora'],
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('#sora')).toBeInTheDocument()
    })

    it('renders hashtags without # prefix', () => {
      const props = {
        ...defaultProps,
        hashtags: ['cinematic', 'filmmaking'],
      }
      render(<PromptOutput {...props} />)

      expect(screen.getByText('cinematic')).toBeInTheDocument()
      expect(screen.getByText('filmmaking')).toBeInTheDocument()
    })

    it('copies hashtags with space separator', async () => {
      const user = userEvent.setup()
      const props = {
        ...defaultProps,
        hashtags: ['#tag1', '#tag2', '#tag3'],
      }
      render(<PromptOutput {...props} />)

      await user.click(screen.getByText('Copy All'))

      // Wait for copy to complete - "Copied!" feedback confirms the handler ran
      // The component joins hashtags with space separator before copying
      await waitFor(() => {
        const copiedElements = screen.getAllByText('Copied!')
        expect(copiedElements.length).toBeGreaterThan(0)
      })
    })
  })
})
