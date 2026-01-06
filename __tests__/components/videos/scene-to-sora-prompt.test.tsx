/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SceneToSoraPrompt } from '@/components/videos/scene-to-sora-prompt'
import { StructuredScreenplay, Scene } from '@/lib/types/database.types'

// Mock the utility functions
jest.mock('@/lib/utils/screenplay-to-sora', () => ({
  sceneToSoraPrompt: jest.fn().mockReturnValue({
    prompt: 'Generated Sora prompt for test scene',
    sceneInfo: {
      sceneNumber: 1,
      location: 'Test Location',
      timeOfDay: 'DAY',
    },
  }),
  generateScenePreview: jest.fn().mockReturnValue('Preview of the scene content...'),
  buildCharacterDescriptions: jest.fn().mockReturnValue({}),
}))

describe('SceneToSoraPrompt', () => {
  const mockScene: Scene = {
    scene_id: 'scene-1',
    scene_number: 1,
    location: 'Coffee Shop',
    time_of_day: 'DAY',
    time_period: 'PRESENT',
    description: 'A cozy coffee shop with morning light streaming through windows.',
    characters: ['Sarah', 'Mike'],
    dialogue: [
      { character: 'Sarah', lines: ['Good morning!', 'How are you?'] },
      { character: 'Mike', lines: ['Great, thanks!'] },
    ],
    action: ['Sarah waves from across the room', 'Mike approaches with coffee'],
    duration_estimate: 6,
    visual_style: 'warm and inviting',
    camera_direction: 'medium shot',
    transition: 'cut',
    notes: 'Establish character relationship',
    emotional_beat: 'friendly reunion',
  }

  const mockScene2: Scene = {
    scene_id: 'scene-2',
    scene_number: 2,
    location: 'City Street',
    time_of_day: 'NIGHT',
    time_period: 'PRESENT',
    description: 'Busy city street with neon lights.',
    characters: ['Sarah'],
    dialogue: [],
    action: ['Sarah walks down the street'],
    duration_estimate: 8,
  }

  const mockScreenplay: StructuredScreenplay = {
    title: 'Test Screenplay',
    scenes: [mockScene, mockScene2],
  }

  const mockCharacters = [
    { id: 'char-1', name: 'Sarah', description: 'A young woman in her 20s', role: 'Lead' },
    { id: 'char-2', name: 'Mike', description: 'A friendly barista', role: 'Supporting' },
  ]

  const defaultProps = {
    episodeId: 'episode-1',
    structuredScreenplay: mockScreenplay,
    characters: mockCharacters,
    onPromptGenerated: jest.fn(),
    disabled: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('renders empty state when no screenplay provided', () => {
      render(
        <SceneToSoraPrompt
          {...defaultProps}
          structuredScreenplay={null}
        />
      )

      expect(screen.getByText(/no screenplay scenes available/i)).toBeInTheDocument()
      expect(screen.getByText(/generate a screenplay for this episode first/i)).toBeInTheDocument()
    })

    it('renders empty state when screenplay has no scenes', () => {
      render(
        <SceneToSoraPrompt
          {...defaultProps}
          structuredScreenplay={{ title: 'Empty', scenes: [] }}
        />
      )

      expect(screen.getByText(/no screenplay scenes available/i)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Scene Selection
  // ============================================================================
  describe('Scene Selection', () => {
    it('renders scene selection card with title', () => {
      render(<SceneToSoraPrompt {...defaultProps} />)

      expect(screen.getByText('Select Scene from Screenplay')).toBeInTheDocument()
      expect(screen.getByText(/choose which scene to convert/i)).toBeInTheDocument()
    })

    it('displays all scenes from screenplay', () => {
      render(<SceneToSoraPrompt {...defaultProps} />)

      expect(screen.getByText(/scene 1: coffee shop/i)).toBeInTheDocument()
      expect(screen.getByText(/scene 2: city street/i)).toBeInTheDocument()
    })

    it('displays scene time of day badges', () => {
      render(<SceneToSoraPrompt {...defaultProps} />)

      expect(screen.getByText(/day present/i)).toBeInTheDocument()
      expect(screen.getByText(/night present/i)).toBeInTheDocument()
    })

    it('calls generateScenePreview for each scene', () => {
      const { generateScenePreview } = require('@/lib/utils/screenplay-to-sora')

      render(<SceneToSoraPrompt {...defaultProps} />)

      expect(generateScenePreview).toHaveBeenCalledWith(mockScene)
      expect(generateScenePreview).toHaveBeenCalledWith(mockScene2)
    })

    it('selects scene when clicked', async () => {
      const user = userEvent.setup()
      render(<SceneToSoraPrompt {...defaultProps} />)

      const sceneCard = screen.getByText(/scene 1: coffee shop/i).closest('div')!
      await user.click(sceneCard)

      // After selection, Sora options should appear
      await waitFor(() => {
        expect(screen.getByText('Sora Video Options')).toBeInTheDocument()
      })
    })

    it('selects scene when checkbox is clicked', async () => {
      const user = userEvent.setup()
      render(<SceneToSoraPrompt {...defaultProps} />)

      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      await waitFor(() => {
        expect(screen.getByText('Sora Video Options')).toBeInTheDocument()
      })
    })

    it('does not select when disabled', async () => {
      const user = userEvent.setup()
      render(<SceneToSoraPrompt {...defaultProps} disabled={true} />)

      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      // Options should not appear
      expect(screen.queryByText('Sora Video Options')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Sora Options Configuration
  // ============================================================================
  describe('Sora Options Configuration', () => {
    async function selectFirstScene() {
      const user = userEvent.setup()
      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)
      await waitFor(() => {
        expect(screen.getByText('Sora Video Options')).toBeInTheDocument()
      })
      return user
    }

    it('shows options card only when scene is selected', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)

      expect(screen.queryByText('Sora Video Options')).not.toBeInTheDocument()

      await selectFirstScene()

      expect(screen.getByText('Sora Video Options')).toBeInTheDocument()
    })

    it('renders duration input with default value', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      const durationInput = screen.getByLabelText(/duration/i)
      expect(durationInput).toHaveValue(6)
    })

    it('shows recommended duration from scene', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      expect(screen.getByText(/recommended: 6 seconds/i)).toBeInTheDocument()
    })

    it('updates duration when input changes', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      const user = await selectFirstScene()

      const durationInput = screen.getByLabelText(/duration/i)
      await user.clear(durationInput)
      await user.type(durationInput, '8')

      expect(durationInput).toHaveValue(8)
    })

    it('renders aspect ratio buttons', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      expect(screen.getByRole('button', { name: /9:16.*vertical/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /16:9.*wide/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /1:1.*square/i })).toBeInTheDocument()
    })

    it('defaults to 9:16 aspect ratio', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      const verticalButton = screen.getByRole('button', { name: /9:16.*vertical/i })
      // Check if it has the selected styling (bg-scenra-amber)
      expect(verticalButton).toHaveClass('bg-scenra-amber')
    })

    it('changes aspect ratio when button is clicked', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      const user = await selectFirstScene()

      const wideButton = screen.getByRole('button', { name: /16:9.*wide/i })
      await user.click(wideButton)

      await waitFor(() => {
        expect(wideButton).toHaveClass('bg-scenra-amber')
      })
    })

    it('renders camera style input', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      const cameraInput = screen.getByLabelText(/camera style/i)
      expect(cameraInput).toHaveValue('ARRI ALEXA 35')
    })

    it('renders lighting mood input', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      const lightingInput = screen.getByLabelText(/lighting mood/i)
      expect(lightingInput).toHaveValue('Natural')
    })

    it('renders color palette input', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      const colorInput = screen.getByLabelText(/color palette/i)
      expect(colorInput).toHaveValue('Neutral')
    })
  })

  // ============================================================================
  // Generate Button
  // ============================================================================
  describe('Generate Button', () => {
    async function selectFirstScene() {
      const user = userEvent.setup()
      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)
      await waitFor(() => {
        expect(screen.getByText('Sora Video Options')).toBeInTheDocument()
      })
      return user
    }

    it('renders generate button when scene is selected', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      expect(screen.getByRole('button', { name: /generate sora prompt from scene/i })).toBeInTheDocument()
    })

    it('disables button when disabled prop is true', async () => {
      render(<SceneToSoraPrompt {...defaultProps} disabled={true} />)

      // We can't select scene when disabled, so no generate button appears
      expect(screen.queryByRole('button', { name: /generate sora prompt/i })).not.toBeInTheDocument()
    })

    it('calls sceneToSoraPrompt when generate is clicked', async () => {
      const { sceneToSoraPrompt } = require('@/lib/utils/screenplay-to-sora')

      render(<SceneToSoraPrompt {...defaultProps} />)
      const user = await selectFirstScene()

      await user.click(screen.getByRole('button', { name: /generate sora prompt from scene/i }))

      expect(sceneToSoraPrompt).toHaveBeenCalledWith(mockScene, expect.objectContaining({
        duration: 6,
        aspectRatio: '9:16',
        resolution: '1080p',
        cameraStyle: 'ARRI ALEXA 35',
        lightingMood: 'Natural',
        colorPalette: 'Neutral',
      }))
    })

    it('calls buildCharacterDescriptions with characters', async () => {
      const { buildCharacterDescriptions } = require('@/lib/utils/screenplay-to-sora')

      render(<SceneToSoraPrompt {...defaultProps} />)
      const user = await selectFirstScene()

      await user.click(screen.getByRole('button', { name: /generate sora prompt from scene/i }))

      expect(buildCharacterDescriptions).toHaveBeenCalledWith(mockCharacters)
    })

    it('calls onPromptGenerated callback with result', async () => {
      const mockOnPromptGenerated = jest.fn()
      render(<SceneToSoraPrompt {...defaultProps} onPromptGenerated={mockOnPromptGenerated} />)
      const user = await selectFirstScene()

      await user.click(screen.getByRole('button', { name: /generate sora prompt from scene/i }))

      expect(mockOnPromptGenerated).toHaveBeenCalledWith(
        'Generated Sora prompt for test scene',
        expect.objectContaining({
          sceneNumber: 1,
          location: 'Test Location',
        })
      )
    })

    // Note: The 'generating' loading state is untestable in isolation because
    // handleGeneratePrompt is synchronous - setGenerating(true) -> sync work ->
    // setGenerating(false) all happen in a single render cycle. React batches these
    // state updates, so the intermediate "Generating Prompt..." state is never visible
    // in tests. The component does set this state correctly (verified by code inspection),
    // but testing it would require converting handleGeneratePrompt to be async.

    it('handles errors gracefully', async () => {
      const { sceneToSoraPrompt } = require('@/lib/utils/screenplay-to-sora')
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      sceneToSoraPrompt.mockImplementation(() => {
        throw new Error('Generation failed')
      })

      render(<SceneToSoraPrompt {...defaultProps} />)
      const user = await selectFirstScene()

      await user.click(screen.getByRole('button', { name: /generate sora prompt from scene/i }))

      expect(consoleSpy).toHaveBeenCalledWith('Failed to generate Sora prompt:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // Scene Preview
  // ============================================================================
  describe('Scene Preview', () => {
    async function selectFirstScene() {
      const user = userEvent.setup()
      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)
      await waitFor(() => {
        expect(screen.getByText('Scene Preview')).toBeInTheDocument()
      })
      return user
    }

    it('shows preview card when scene is selected', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      expect(screen.getByText('Scene Preview')).toBeInTheDocument()
    })

    it('displays scene description', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      expect(screen.getByText(mockScene.description)).toBeInTheDocument()
    })

    it('displays characters as badges', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      expect(screen.getByText('Sarah')).toBeInTheDocument()
      expect(screen.getByText('Mike')).toBeInTheDocument()
    })

    it('displays dialogue with character names', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      // Check that dialogue section exists
      expect(screen.getByText('Dialogue')).toBeInTheDocument()
      // Check for dialogue content
      expect(screen.getByText(/sarah:/i)).toBeInTheDocument()
      expect(screen.getByText(/good morning/i)).toBeInTheDocument()
    })

    it('displays action items', async () => {
      render(<SceneToSoraPrompt {...defaultProps} />)
      await selectFirstScene()

      expect(screen.getByText('Actions')).toBeInTheDocument()
      expect(screen.getByText('Sarah waves from across the room')).toBeInTheDocument()
      expect(screen.getByText('Mike approaches with coffee')).toBeInTheDocument()
    })

    it('does not show dialogue section when empty', async () => {
      // Select scene 2 which has no dialogue
      const user = userEvent.setup()
      render(<SceneToSoraPrompt {...defaultProps} />)

      const checkbox = screen.getAllByRole('checkbox')[1] // Second scene
      await user.click(checkbox)

      await waitFor(() => {
        expect(screen.getByText('Scene Preview')).toBeInTheDocument()
      })

      expect(screen.queryByText('Dialogue')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Option State Persistence
  // ============================================================================
  describe('Option State Persistence', () => {
    it('preserves options when switching scenes', async () => {
      const user = userEvent.setup()
      render(<SceneToSoraPrompt {...defaultProps} />)

      // Select first scene
      await user.click(screen.getAllByRole('checkbox')[0])
      await waitFor(() => {
        expect(screen.getByText('Sora Video Options')).toBeInTheDocument()
      })

      // Change aspect ratio
      await user.click(screen.getByRole('button', { name: /16:9.*wide/i }))

      // Change duration
      const durationInput = screen.getByLabelText(/duration/i)
      await user.clear(durationInput)
      await user.type(durationInput, '8')

      // Select second scene
      await user.click(screen.getAllByRole('checkbox')[1])

      // Options should still be preserved (aspect ratio and duration)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /16:9.*wide/i })).toHaveClass('bg-scenra-amber')
      })
      expect(screen.getByLabelText(/duration/i)).toHaveValue(8)
    })
  })
})
