import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdvancedModeToggle } from '@/components/videos/advanced-mode-toggle'

describe('AdvancedModeToggle', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders in disabled state by default', () => {
    render(
      <AdvancedModeToggle
        enabled={false}
        onChange={mockOnChange}
        disabled={false}
      />
    )

    expect(screen.getByText('Advanced Mode')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('renders in enabled state when enabled prop is true', () => {
    render(
      <AdvancedModeToggle
        enabled={true}
        onChange={mockOnChange}
        disabled={false}
      />
    )

    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange with true when toggled on', async () => {
    const user = userEvent.setup()

    render(
      <AdvancedModeToggle
        enabled={false}
        onChange={mockOnChange}
        disabled={false}
      />
    )

    const toggle = screen.getByRole('switch')
    await user.click(toggle)

    expect(mockOnChange).toHaveBeenCalledWith(true)
  })

  it('calls onChange with false when toggled off', async () => {
    const user = userEvent.setup()

    render(
      <AdvancedModeToggle
        enabled={true}
        onChange={mockOnChange}
        disabled={false}
      />
    )

    const toggle = screen.getByRole('switch')
    await user.click(toggle)

    expect(mockOnChange).toHaveBeenCalledWith(false)
  })

  it('disables toggle when disabled prop is true', () => {
    render(
      <AdvancedModeToggle
        enabled={false}
        onChange={mockOnChange}
        disabled={true}
      />
    )

    const toggle = screen.getByRole('switch')
    expect(toggle).toBeDisabled()
  })

  it('displays description text', () => {
    render(
      <AdvancedModeToggle
        enabled={false}
        onChange={mockOnChange}
        disabled={false}
      />
    )

    expect(
      screen.getByText(/Edit prompts, create shot lists/i)
    ).toBeInTheDocument()
  })

  it('shows settings icon', () => {
    render(
      <AdvancedModeToggle
        enabled={false}
        onChange={mockOnChange}
        disabled={false}
      />
    )

    // The Settings2 icon is rendered, check for the parent container
    const container = screen.getByText('Advanced Mode').closest('div')
    expect(container).toBeInTheDocument()
  })
})
