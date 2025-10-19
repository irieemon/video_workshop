import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditablePromptField } from '@/components/videos/editable-prompt-field'

describe('EditablePromptField', () => {
  const mockOnChange = jest.fn()
  const mockOnRevert = jest.fn()
  const originalPrompt = 'Original AI-generated prompt for the video'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the editable prompt field', () => {
    render(
      <EditablePromptField
        value={originalPrompt}
        originalValue={originalPrompt}
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    expect(screen.getByText('Edit Sora Prompt')).toBeInTheDocument()
    expect(screen.getByDisplayValue(originalPrompt)).toBeInTheDocument()
  })

  it('shows character count with optimal status', () => {
    render(
      <EditablePromptField
        value="Short prompt"
        originalValue="Short prompt"
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    expect(screen.getByText(/12 characters/)).toBeInTheDocument()
    expect(screen.getByText('Optimal')).toBeInTheDocument()
  })

  it('shows warning status for prompts over 500 characters', () => {
    const longPrompt = 'a'.repeat(550)

    render(
      <EditablePromptField
        value={longPrompt}
        originalValue={longPrompt}
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    expect(screen.getByText(/550 characters/)).toBeInTheDocument()
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('shows error status for prompts over 700 characters', () => {
    const veryLongPrompt = 'a'.repeat(750)

    render(
      <EditablePromptField
        value={veryLongPrompt}
        originalValue={veryLongPrompt}
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    expect(screen.getByText(/750 characters/)).toBeInTheDocument()
    expect(screen.getByText('Too long')).toBeInTheDocument()
  })

  it('calls onChange when user types', async () => {
    const user = userEvent.setup()

    render(
      <EditablePromptField
        value={originalPrompt}
        originalValue={originalPrompt}
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'New edited prompt')

    expect(mockOnChange).toHaveBeenCalled()
  })

  it('shows revert button when prompt is modified', () => {
    render(
      <EditablePromptField
        value="Modified prompt"
        originalValue={originalPrompt}
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    expect(screen.getByText(/Revert to AI version/i)).toBeInTheDocument()
  })

  it('does not show revert button when prompt is unchanged', () => {
    render(
      <EditablePromptField
        value={originalPrompt}
        originalValue={originalPrompt}
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    expect(screen.queryByText(/Revert to AI version/i)).not.toBeInTheDocument()
  })

  it('calls onRevert when revert button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <EditablePromptField
        value="Modified prompt"
        originalValue={originalPrompt}
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    const revertButton = screen.getByText(/Revert to AI version/i)
    await user.click(revertButton)

    expect(mockOnRevert).toHaveBeenCalled()
  })

  it('detects copyright violations with brand names', async () => {
    const user = userEvent.setup()

    render(
      <EditablePromptField
        value=""
        originalValue=""
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'A video featuring Nike shoes and Apple iPhone')

    // Copyright warning should appear
    expect(screen.getByText(/Copyright Warning/i)).toBeInTheDocument()
  })

  it('detects copyright violations with celebrity names', async () => {
    const user = userEvent.setup()

    render(
      <EditablePromptField
        value=""
        originalValue=""
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Taylor Swift dancing to music')

    expect(screen.getByText(/Copyright Warning/i)).toBeInTheDocument()
  })

  it('detects copyright violations with movie/show references', async () => {
    const user = userEvent.setup()

    render(
      <EditablePromptField
        value=""
        originalValue=""
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'A scene from Star Wars with lightsabers')

    expect(screen.getByText(/Copyright Warning/i)).toBeInTheDocument()
  })

  it('does not show copyright warning for generic content', async () => {
    const user = userEvent.setup()

    render(
      <EditablePromptField
        value=""
        originalValue=""
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'A person walking through a park on a sunny day')

    expect(screen.queryByText(/Copyright Warning/i)).not.toBeInTheDocument()
  })

  it('shows help text about editing capabilities', () => {
    render(
      <EditablePromptField
        value={originalPrompt}
        originalValue={originalPrompt}
        onChange={mockOnChange}
        onRevert={mockOnRevert}
      />
    )

    expect(screen.getByText(/Edit the AI-generated prompt/i)).toBeInTheDocument()
  })
})
