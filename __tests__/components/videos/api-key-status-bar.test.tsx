/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiKeyStatusBar } from '@/components/videos/api-key-status-bar'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock data
const mockValidKey = {
  id: 'key-1',
  provider: 'openai',
  key_suffix: 'abc1',
  key_name: 'Production Key',
  is_valid: true,
}

const mockInvalidKey = {
  id: 'key-2',
  provider: 'openai',
  key_suffix: 'xyz9',
  key_name: 'Test Key',
  is_valid: false,
}

const mockNonOpenAIKey = {
  id: 'key-3',
  provider: 'anthropic',
  key_suffix: 'def3',
  key_name: 'Claude Key',
  is_valid: true,
}

describe('ApiKeyStatusBar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('renders loading spinner while fetching keys', async () => {
      // Never resolve to keep loading state
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { container } = render(<ApiKeyStatusBar />)

      // Should show loader (SVG has aria-hidden so we query by class)
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('displays loading indicator in card', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { container } = render(<ApiKeyStatusBar />)

      // Check for the loader class
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  // ============================================================================
  // No Keys State
  // ============================================================================
  describe('No Keys State', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [] }),
      })
    })

    it('renders empty state when no keys exist', async () => {
      render(<ApiKeyStatusBar />)

      await waitFor(() => {
        expect(screen.getByText('No API key configured')).toBeInTheDocument()
      })

      expect(screen.getByText('Add your OpenAI key to generate videos')).toBeInTheDocument()
    })

    it('shows Add Key button in empty state', async () => {
      render(<ApiKeyStatusBar />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Key/i })).toBeInTheDocument()
      })
    })

    it('opens add dialog when Add Key is clicked', async () => {
      const user = userEvent.setup()
      render(<ApiKeyStatusBar />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Key/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Key/i }))

      await waitFor(() => {
        expect(screen.getByText('Add OpenAI API Key')).toBeInTheDocument()
      })
    })

    it('filters out non-OpenAI keys', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [mockNonOpenAIKey] }),
      })

      render(<ApiKeyStatusBar />)

      await waitFor(() => {
        expect(screen.getByText('No API key configured')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Has Keys State - Valid Key
  // ============================================================================
  describe('Has Keys State - Valid Key', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [mockValidKey] }),
      })
    })

    it('renders valid key with success styling', async () => {
      render(<ApiKeyStatusBar selectedKeyId="key-1" />)

      await waitFor(() => {
        expect(screen.getByText('Using your OpenAI key')).toBeInTheDocument()
      })

      expect(screen.getByText('Valid')).toBeInTheDocument()
    })

    it('displays key name and suffix', async () => {
      render(<ApiKeyStatusBar selectedKeyId="key-1" />)

      await waitFor(() => {
        expect(screen.getByText('Production Key (••••abc1)')).toBeInTheDocument()
      })
    })

    it('shows Manage button', async () => {
      render(<ApiKeyStatusBar selectedKeyId="key-1" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Manage/i })).toBeInTheDocument()
      })
    })

    it('navigates to settings when Manage is clicked', async () => {
      const user = userEvent.setup()
      render(<ApiKeyStatusBar selectedKeyId="key-1" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Manage/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Manage/i }))

      expect(mockPush).toHaveBeenCalledWith('/dashboard/settings')
    })

    it('does not show key selector with single key', async () => {
      render(<ApiKeyStatusBar selectedKeyId="key-1" />)

      await waitFor(() => {
        expect(screen.getByText('Using your OpenAI key')).toBeInTheDocument()
      })

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Has Keys State - Invalid Key
  // ============================================================================
  describe('Has Keys State - Invalid Key', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [mockInvalidKey] }),
      })
    })

    it('renders invalid key with error styling', async () => {
      render(<ApiKeyStatusBar selectedKeyId="key-2" />)

      await waitFor(() => {
        expect(screen.getByText('Using your OpenAI key')).toBeInTheDocument()
      })

      expect(screen.getByText('Invalid')).toBeInTheDocument()
    })

    it('shows red styling for invalid key icon', async () => {
      const { container } = render(<ApiKeyStatusBar selectedKeyId="key-2" />)

      await waitFor(() => {
        expect(screen.getByText('Invalid')).toBeInTheDocument()
      })

      // Check for red background class on the icon container
      const iconContainer = container.querySelector('.bg-red-100')
      expect(iconContainer).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Multiple Keys
  // ============================================================================
  describe('Multiple Keys', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [mockValidKey, mockInvalidKey] }),
      })
    })

    it('shows key selector when multiple keys exist', async () => {
      render(<ApiKeyStatusBar selectedKeyId="key-1" />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })
    })

    it('calls onKeySelected when different key is selected', async () => {
      const onKeySelected = jest.fn()
      const user = userEvent.setup()

      render(
        <ApiKeyStatusBar
          selectedKeyId="key-1"
          onKeySelected={onKeySelected}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Open dropdown
      await user.click(screen.getByRole('combobox'))

      // Select the other key
      await waitFor(() => {
        expect(screen.getByText('Test Key')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Test Key'))

      expect(onKeySelected).toHaveBeenCalledWith('key-2')
    })
  })

  // ============================================================================
  // Auto-Selection
  // ============================================================================
  describe('Auto-Selection', () => {
    it('auto-selects first valid key when none selected', async () => {
      const onKeySelected = jest.fn()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [mockInvalidKey, mockValidKey] }),
      })

      render(<ApiKeyStatusBar onKeySelected={onKeySelected} />)

      await waitFor(() => {
        expect(onKeySelected).toHaveBeenCalledWith('key-1')
      })
    })

    it('does not auto-select if key already selected', async () => {
      const onKeySelected = jest.fn()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [mockValidKey, mockInvalidKey] }),
      })

      render(
        <ApiKeyStatusBar
          selectedKeyId="key-2"
          onKeySelected={onKeySelected}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Using your OpenAI key')).toBeInTheDocument()
      })

      // Should not call onKeySelected since we already have a selection
      expect(onKeySelected).not.toHaveBeenCalled()
    })

    it('does not auto-select if no valid keys', async () => {
      const onKeySelected = jest.fn()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [mockInvalidKey] }),
      })

      render(<ApiKeyStatusBar onKeySelected={onKeySelected} />)

      await waitFor(() => {
        expect(screen.getByText('Using your OpenAI key')).toBeInTheDocument()
      })

      // Should not call onKeySelected since no valid keys
      expect(onKeySelected).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Add Key Dialog
  // ============================================================================
  describe('Add Key Dialog', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [] }),
      })
    })

    it('shows dialog content when opened', async () => {
      const user = userEvent.setup()
      render(<ApiKeyStatusBar />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Key/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Key/i }))

      await waitFor(() => {
        expect(screen.getByText('Your API key will be encrypted and stored securely.')).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/Key Name/i)).toBeInTheDocument()
      // Use specific ID to avoid matching dialog title "Add OpenAI API Key"
      expect(document.getElementById('apiKey')).toBeInTheDocument()
    })

    it('toggles API key visibility', async () => {
      const user = userEvent.setup()
      render(<ApiKeyStatusBar />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Key/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Key/i }))

      await waitFor(() => {
        expect(document.getElementById('apiKey')).toBeInTheDocument()
      })

      const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement
      expect(apiKeyInput).toHaveAttribute('type', 'password')

      // Find and click the visibility toggle button (inside the dialog, has an SVG icon)
      const dialogContent = screen.getByRole('dialog')
      const visibilityButton = within(dialogContent).getAllByRole('button').find(
        (btn) => btn.querySelector('svg.lucide-eye')
      )

      if (visibilityButton) {
        await user.click(visibilityButton)
        // After click, input type should change to text
        expect(apiKeyInput).toHaveAttribute('type', 'text')
      }
    })

    it('disables Add button when API key field is empty', async () => {
      const user = userEvent.setup()
      render(<ApiKeyStatusBar />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Key/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Key/i }))

      await waitFor(() => {
        const dialogButtons = within(screen.getByRole('dialog')).getAllByRole('button', { name: /Add Key/i })
        const submitButton = dialogButtons[dialogButtons.length - 1]
        expect(submitButton).toBeDisabled()
      })
    })

    it('enables Add button when API key is entered', async () => {
      const user = userEvent.setup()
      render(<ApiKeyStatusBar />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Key/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Key/i }))

      await waitFor(() => {
        expect(document.getElementById('apiKey')).toBeInTheDocument()
      })

      const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement
      await user.type(apiKeyInput, 'sk-test-key-12345')

      const dialogButtons = within(screen.getByRole('dialog')).getAllByRole('button', { name: /Add Key/i })
      const submitButton = dialogButtons[dialogButtons.length - 1]
      expect(submitButton).not.toBeDisabled()
    })

    it('closes dialog when Cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<ApiKeyStatusBar />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Key/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Key/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Cancel/i }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Add Key Submission
  // ============================================================================
  describe('Add Key Submission', () => {
    it('submits new key successfully', async () => {
      const onKeySelected = jest.fn()
      const user = userEvent.setup()

      // First call: empty keys, second call: POST to add, third call: fetch updated keys
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ keys: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ key: { id: 'new-key-1' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ keys: [mockValidKey] }),
        })

      render(<ApiKeyStatusBar onKeySelected={onKeySelected} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Key/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Key/i }))

      await waitFor(() => {
        expect(document.getElementById('apiKey')).toBeInTheDocument()
      })

      const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement
      const keyNameInput = document.getElementById('keyName') as HTMLInputElement

      await user.type(apiKeyInput, 'sk-test-key-12345')
      await user.clear(keyNameInput)
      await user.type(keyNameInput, 'My New Key')

      const dialogButtons = within(screen.getByRole('dialog')).getAllByRole('button', { name: /Add Key/i })
      const submitButton = dialogButtons[dialogButtons.length - 1]

      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/user/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: 'sk-test-key-12345',
            key_name: 'My New Key',
            provider: 'openai',
          }),
        })
      })

      // Should call onKeySelected with new key ID
      await waitFor(() => {
        expect(onKeySelected).toHaveBeenCalledWith('new-key-1')
      })
    })

    it('shows error message on submission failure', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ keys: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Invalid API key format' }),
        })

      render(<ApiKeyStatusBar />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Key/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Key/i }))

      await waitFor(() => {
        expect(document.getElementById('apiKey')).toBeInTheDocument()
      })

      const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement
      await user.type(apiKeyInput, 'invalid-key')

      const dialogButtons = within(screen.getByRole('dialog')).getAllByRole('button', { name: /Add Key/i })
      const submitButton = dialogButtons[dialogButtons.length - 1]

      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid API key format')).toBeInTheDocument()
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ keys: [] }),
        })
        .mockImplementationOnce(() => new Promise(() => {})) // Never resolves

      render(<ApiKeyStatusBar />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Key/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Key/i }))

      await waitFor(() => {
        expect(document.getElementById('apiKey')).toBeInTheDocument()
      })

      const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement
      await user.type(apiKeyInput, 'sk-test-key')

      const dialogButtons = within(screen.getByRole('dialog')).getAllByRole('button', { name: /Add Key/i })
      const submitButton = dialogButtons[dialogButtons.length - 1]

      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Adding...')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('handles fetch error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(<ApiKeyStatusBar />)

      // Component should handle error without crashing
      // May show error state or empty state depending on implementation
      await waitFor(() => {
        // Wait for loading to complete
        expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
      })
    })

    it('handles non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      })

      render(<ApiKeyStatusBar />)

      // Should complete loading without crashing
      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // className Prop
  // ============================================================================
  describe('className Prop', () => {
    it('applies custom className to loading state', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { container } = render(<ApiKeyStatusBar className="custom-class" />)

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('applies custom className to empty state', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [] }),
      })

      const { container } = render(<ApiKeyStatusBar className="custom-class" />)

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class')
      })
    })

    it('applies custom className to has-keys state', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [mockValidKey] }),
      })

      const { container } = render(
        <ApiKeyStatusBar selectedKeyId="key-1" className="custom-class" />
      )

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class')
      })
    })
  })
})
