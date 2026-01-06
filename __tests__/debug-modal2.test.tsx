/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SoraGenerationModal } from '@/components/videos/sora-generation-modal'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// Mock modal provider  
jest.mock('@/components/providers/modal-provider', () => ({
  useModal: () => ({
    showConfirm: jest.fn(),
  }),
}))

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Spy on console.log to see internal component logs
const originalConsoleLog = console.log
const originalConsoleError = console.error

describe('Debug SoraGenerationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    // Capture console output
    console.log = (...args) => originalConsoleLog('[LOG]', ...args)
    console.error = (...args) => originalConsoleError('[ERR]', ...args)
  })

  afterEach(() => {
    console.log = originalConsoleLog
    console.error = originalConsoleError
  })

  it('calls handleGenerate when button clicked', async () => {
    const user = userEvent.setup()

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
    })

    render(
      <SoraGenerationModal
        open={true}
        onClose={jest.fn()}
        videoId="video-123"
        videoTitle="Test Video"
        finalPrompt="Test prompt"
        userApiKeyId="api-key-123"
      />
    )

    console.log('Initial render complete')
    console.log('Looking for Generate button...')

    const buttons = screen.getAllByRole('button')
    console.log('Found buttons:', buttons.map(b => b.textContent))

    const generateButton = buttons.find(btn => btn.textContent?.includes('Generate Video'))
    console.log('Generate button:', generateButton?.textContent)

    await user.click(generateButton!)

    console.log('Click complete')
    console.log('fetch called:', mockFetch.mock.calls.length, 'times')
    
    // Check if fetch was called - this tells us if handleGenerate ran
    expect(mockFetch).toHaveBeenCalled()
    
    console.log('DOM contains Generating:', !!screen.queryByText('Generating Your Video'))
    console.log('DOM contains Generate Video title:', !!screen.queryByText('Generate Video with Sora AI'))
  })
})
