import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdditionalGuidance } from '@/components/videos/additional-guidance'

describe('AdditionalGuidance', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the additional guidance component', () => {
    render(
      <AdditionalGuidance
        value=""
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Additional Creative Guidance')).toBeInTheDocument()
  })

  it('displays the current value in textarea', () => {
    const testValue = 'Focus on vibrant colors and fast pacing'

    render(
      <AdditionalGuidance
        value={testValue}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByDisplayValue(testValue)).toBeInTheDocument()
  })

  it('calls onChange when user types', async () => {
    const user = userEvent.setup()

    render(
      <AdditionalGuidance
        value=""
        onChange={mockOnChange}
      />
    )

    const textarea = screen.getByPlaceholderText(/Example: Focus more on emotional journey/i)
    await user.type(textarea, 'New guidance text')

    expect(mockOnChange).toHaveBeenCalled()
  })

  it('shows help text about persistence', () => {
    render(
      <AdditionalGuidance
        value=""
        onChange={mockOnChange}
      />
    )

    expect(
      screen.getByText(/This guidance will persist across all regenerations/i)
    ).toBeInTheDocument()
  })

  it('displays tip about being specific', () => {
    render(
      <AdditionalGuidance
        value=""
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText(/Tip:/)).toBeInTheDocument()
    expect(
      screen.getByText(/Be specific about mood, pacing, visual style/i)
    ).toBeInTheDocument()
  })

  it('renders placeholder text', () => {
    render(
      <AdditionalGuidance
        value=""
        onChange={mockOnChange}
      />
    )

    expect(
      screen.getByPlaceholderText(/Focus more on emotional journey, ensure vibrant colors/i)
    ).toBeInTheDocument()
  })

  it('allows multiline input', () => {
    const multilineValue = `Line 1: Focus on emotions
Line 2: Use vibrant colors
Line 3: Fast pacing`

    render(
      <AdditionalGuidance
        value={multilineValue}
        onChange={mockOnChange}
      />
    )

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveValue(multilineValue)
  })
})
