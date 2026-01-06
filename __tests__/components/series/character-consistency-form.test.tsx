/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterConsistencyForm } from '@/components/series/character-consistency-form'
import type { VisualFingerprint, VoiceProfile } from '@/lib/types/character-consistency'

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Eye: () => <div data-testid="eye-icon" />,
  Mic: () => <div data-testid="mic-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
}))

describe('CharacterConsistencyForm', () => {
  const mockOnChange = jest.fn()

  const defaultProps = {
    visualFingerprint: {},
    voiceProfile: {},
    generatedTemplate: null,
    onChange: mockOnChange,
  }

  const filledVisualFingerprint: Partial<VisualFingerprint> = {
    age: 'early 30s',
    ethnicity: 'South Asian',
    hair: 'shoulder-length wavy black hair',
    eyes: 'amber eyes',
    face_shape: 'oval',
    body_type: 'slim',
    height: 'average',
    skin_tone: 'deep brown with warm undertones',
    default_clothing: 'business casual blazer',
    distinctive_features: ['dimples', 'beauty mark'],
  }

  const filledVoiceProfile: Partial<VoiceProfile> = {
    age_sound: 'sounds late 20s',
    accent: 'neutral American',
    pitch: 'medium',
    pace: 'moderate',
    energy: 'calm',
    tone: 'warm',
    distinctive_traits: ['slight rasp', 'laughs easily'],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders visual appearance section', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      expect(screen.getByText('Visual Appearance')).toBeInTheDocument()
      expect(
        screen.getByText('Detailed physical characteristics for Sora consistency')
      ).toBeInTheDocument()
    })

    it('renders voice characteristics section', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      expect(screen.getByText('Voice Characteristics')).toBeInTheDocument()
      expect(screen.getByText('Audio consistency for character voice')).toBeInTheDocument()
    })

    it('renders eye icon for visual section', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      expect(screen.getByTestId('eye-icon')).toBeInTheDocument()
    })

    it('renders mic icon for voice section', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      expect(screen.getByTestId('mic-icon')).toBeInTheDocument()
    })

    it('renders consistency tips section', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      expect(screen.getByText('💡 Consistency Tips:')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Visual Fingerprint Fields
  // ============================================================================
  describe('Visual Fingerprint Fields', () => {
    it('renders all required visual fields', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      // Use negative lookahead to exclude "Age Sound" from voice section
      expect(screen.getByLabelText(/^Age(?!\s*Sound)/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Ethnicity/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Hair/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Eyes/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Body Type/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Skin Tone/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Default Clothing/)).toBeInTheDocument()
    })

    it('renders optional visual fields', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      expect(screen.getByLabelText('Face Shape')).toBeInTheDocument()
      expect(screen.getByLabelText('Height')).toBeInTheDocument()
      expect(screen.getByLabelText(/Distinctive Features/)).toBeInTheDocument()
    })

    it('displays initial visual values', () => {
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          visualFingerprint={filledVisualFingerprint}
        />
      )

      expect(screen.getByLabelText(/^Age(?!\s*Sound)/)).toHaveValue('early 30s')
      expect(screen.getByLabelText(/^Ethnicity/)).toHaveValue('South Asian')
      expect(screen.getByLabelText(/^Hair/)).toHaveValue('shoulder-length wavy black hair')
      expect(screen.getByLabelText(/^Eyes/)).toHaveValue('amber eyes')
    })

    it('displays distinctive features as comma-separated string when array', () => {
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          visualFingerprint={{ distinctive_features: ['dimples', 'beauty mark'] }}
        />
      )

      expect(screen.getByLabelText(/Distinctive Features/)).toHaveValue('dimples, beauty mark')
    })

    it('displays distinctive features as string when not array', () => {
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          visualFingerprint={{ distinctive_features: 'has a scar' as any }}
        />
      )

      expect(screen.getByLabelText(/Distinctive Features/)).toHaveValue('has a scar')
    })
  })

  // ============================================================================
  // Voice Profile Fields
  // ============================================================================
  describe('Voice Profile Fields', () => {
    it('renders all required voice fields', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      expect(screen.getByLabelText(/^Age Sound/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Accent/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Pitch/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Pace/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Energy/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Tone/)).toBeInTheDocument()
    })

    it('renders optional voice field', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      expect(screen.getByLabelText(/Distinctive Traits/)).toBeInTheDocument()
    })

    it('displays initial voice values', () => {
      render(
        <CharacterConsistencyForm {...defaultProps} voiceProfile={filledVoiceProfile} />
      )

      expect(screen.getByLabelText(/^Age Sound/)).toHaveValue('sounds late 20s')
      expect(screen.getByLabelText(/^Accent/)).toHaveValue('neutral American')
      expect(screen.getByLabelText(/^Tone/)).toHaveValue('warm')
    })

    it('displays pitch select with correct value', () => {
      render(
        <CharacterConsistencyForm {...defaultProps} voiceProfile={{ pitch: 'medium' }} />
      )

      expect(screen.getByLabelText(/^Pitch/)).toHaveValue('medium')
    })

    it('displays pace select with correct value', () => {
      render(
        <CharacterConsistencyForm {...defaultProps} voiceProfile={{ pace: 'moderate' }} />
      )

      expect(screen.getByLabelText(/^Pace/)).toHaveValue('moderate')
    })

    it('displays energy select with correct value', () => {
      render(
        <CharacterConsistencyForm {...defaultProps} voiceProfile={{ energy: 'calm' }} />
      )

      expect(screen.getByLabelText(/^Energy/)).toHaveValue('calm')
    })

    it('displays distinctive traits as comma-separated string', () => {
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          voiceProfile={{ distinctive_traits: ['slight rasp', 'laughs easily'] }}
        />
      )

      expect(screen.getByLabelText(/Distinctive Traits/)).toHaveValue(
        'slight rasp, laughs easily'
      )
    })
  })

  // ============================================================================
  // Visual Field Updates
  // ============================================================================
  describe('Visual Field Updates', () => {
    it('calls onChange when age field changes', async () => {
      const user = userEvent.setup()
      render(<CharacterConsistencyForm {...defaultProps} />)

      await user.type(screen.getByLabelText(/^Age(?!\s*Sound)/), 'early 30s')

      expect(mockOnChange).toHaveBeenCalled()
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      expect(lastCall.visualFingerprint.age).toContain('early 30s')
    })

    it('calls onChange when hair field changes', async () => {
      const user = userEvent.setup()
      render(<CharacterConsistencyForm {...defaultProps} />)

      await user.type(screen.getByLabelText(/^Hair/), 'dark brown')

      expect(mockOnChange).toHaveBeenCalled()
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      expect(lastCall.visualFingerprint.hair).toContain('dark brown')
    })

    it('calls onChange when skin tone field changes', async () => {
      const user = userEvent.setup()
      render(<CharacterConsistencyForm {...defaultProps} />)

      await user.type(screen.getByLabelText(/^Skin Tone/), 'fair')

      expect(mockOnChange).toHaveBeenCalled()
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      expect(lastCall.visualFingerprint.skin_tone).toContain('fair')
    })

    it('preserves other visual fields when one changes', async () => {
      const user = userEvent.setup()
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          visualFingerprint={{ age: 'existing age', hair: 'existing hair' }}
        />
      )

      await user.type(screen.getByLabelText(/^Eyes/), 'blue')

      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      expect(lastCall.visualFingerprint.age).toBe('existing age')
      expect(lastCall.visualFingerprint.hair).toBe('existing hair')
    })
  })

  // ============================================================================
  // Voice Field Updates
  // ============================================================================
  describe('Voice Field Updates', () => {
    it('calls onChange when age sound field changes', async () => {
      const user = userEvent.setup()
      render(<CharacterConsistencyForm {...defaultProps} />)

      await user.type(screen.getByLabelText(/^Age Sound/), 'sounds late 20s')

      expect(mockOnChange).toHaveBeenCalled()
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      expect(lastCall.voiceProfile.age_sound).toContain('sounds late 20s')
    })

    it('calls onChange when pitch select changes', async () => {
      const user = userEvent.setup()
      render(<CharacterConsistencyForm {...defaultProps} />)

      await user.selectOptions(screen.getByLabelText(/^Pitch/), 'high')

      expect(mockOnChange).toHaveBeenCalled()
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      expect(lastCall.voiceProfile.pitch).toBe('high')
    })

    it('calls onChange when pace select changes', async () => {
      const user = userEvent.setup()
      render(<CharacterConsistencyForm {...defaultProps} />)

      await user.selectOptions(screen.getByLabelText(/^Pace/), 'fast')

      expect(mockOnChange).toHaveBeenCalled()
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      expect(lastCall.voiceProfile.pace).toBe('fast')
    })

    it('calls onChange when energy select changes', async () => {
      const user = userEvent.setup()
      render(<CharacterConsistencyForm {...defaultProps} />)

      await user.selectOptions(screen.getByLabelText(/^Energy/), 'calm')

      expect(mockOnChange).toHaveBeenCalled()
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      expect(lastCall.voiceProfile.energy).toBe('calm')
    })

    it('parses distinctive traits as array', async () => {
      const user = userEvent.setup()
      render(<CharacterConsistencyForm {...defaultProps} />)

      await user.type(screen.getByLabelText(/Distinctive Traits/), 'rasp, precise')

      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      expect(lastCall.voiceProfile.distinctive_traits).toBeInstanceOf(Array)
    })

    it('preserves visual fingerprint when voice changes', async () => {
      const user = userEvent.setup()
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          visualFingerprint={{ age: 'existing age' }}
        />
      )

      await user.type(screen.getByLabelText(/^Tone/), 'warm')

      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      expect(lastCall.visualFingerprint.age).toBe('existing age')
    })
  })

  // ============================================================================
  // Generated Template
  // ============================================================================
  describe('Generated Template', () => {
    it('does not show template section when null', () => {
      render(<CharacterConsistencyForm {...defaultProps} generatedTemplate={null} />)

      expect(screen.queryByText('Sora Prompt Template')).not.toBeInTheDocument()
    })

    it('shows template section when provided', () => {
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          generatedTemplate="A person in their early 30s with dark hair..."
        />
      )

      expect(screen.getByText('Sora Prompt Template')).toBeInTheDocument()
    })

    it('displays the generated template text', () => {
      const template = 'A person in their early 30s with dark hair and brown eyes.'
      render(<CharacterConsistencyForm {...defaultProps} generatedTemplate={template} />)

      expect(screen.getByText(template)).toBeInTheDocument()
    })

    it('shows auto-generated badge', () => {
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          generatedTemplate="Some template text"
        />
      )

      expect(screen.getByText('Auto-generated')).toBeInTheDocument()
    })

    it('shows description about auto-injection', () => {
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          generatedTemplate="Some template text"
        />
      )

      expect(
        screen.getByText('This description will be auto-injected into every video prompt')
      ).toBeInTheDocument()
    })

    it('renders sparkles icon in template section', () => {
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          generatedTemplate="Some template text"
        />
      )

      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Helper Text
  // ============================================================================
  describe('Helper Text', () => {
    it('shows helper text for age field', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      expect(
        screen.getByText(/Specific age or range \(e.g., "early 30s", "late 20s"\)/)
      ).toBeInTheDocument()
    })

    it('shows helper text for hair field', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      expect(
        screen.getByText(/Color, length, texture, style/)
      ).toBeInTheDocument()
    })

    it('shows helper text for skin tone field', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      expect(
        screen.getByText(/prevents Sora from making up character appearance/)
      ).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Select Options
  // ============================================================================
  describe('Select Options', () => {
    it('pitch select has all options', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      const pitchSelect = screen.getByLabelText(/^Pitch/) as HTMLSelectElement
      const options = Array.from(pitchSelect.options).map((o) => o.value)

      expect(options).toContain('high')
      expect(options).toContain('medium')
      expect(options).toContain('low')
    })

    it('pace select has all options', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      const paceSelect = screen.getByLabelText(/^Pace/) as HTMLSelectElement
      const options = Array.from(paceSelect.options).map((o) => o.value)

      expect(options).toContain('fast')
      expect(options).toContain('moderate')
      expect(options).toContain('slow')
    })

    it('energy select has all options', () => {
      render(<CharacterConsistencyForm {...defaultProps} />)

      const energySelect = screen.getByLabelText(/^Energy/) as HTMLSelectElement
      const options = Array.from(energySelect.options).map((o) => o.value)

      expect(options).toContain('high')
      expect(options).toContain('moderate')
      expect(options).toContain('calm')
      expect(options).toContain('low')
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles empty initial visual fingerprint', () => {
      render(<CharacterConsistencyForm {...defaultProps} visualFingerprint={{}} />)

      expect(screen.getByLabelText(/^Age(?!\s*Sound)/)).toHaveValue('')
    })

    it('handles empty initial voice profile', () => {
      render(<CharacterConsistencyForm {...defaultProps} voiceProfile={{}} />)

      expect(screen.getByLabelText(/^Age Sound/)).toHaveValue('')
    })

    it('handles undefined distinctive_traits in voice profile', () => {
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          voiceProfile={{ distinctive_traits: undefined }}
        />
      )

      expect(screen.getByLabelText(/Distinctive Traits/)).toHaveValue('')
    })

    it('handles null distinctive_features in visual fingerprint', () => {
      render(
        <CharacterConsistencyForm
          {...defaultProps}
          visualFingerprint={{ distinctive_features: null as any }}
        />
      )

      // Should not crash
      expect(screen.getByLabelText(/Distinctive Features/)).toBeInTheDocument()
    })
  })
})
