/**
 * OpenAI Mock Utilities
 *
 * Centralized OpenAI SDK mocking for consistent, reusable test patterns.
 * Provides type-safe mocks for chat completions, streaming, and image generation.
 *
 * Usage in test files:
 * ```typescript
 * import { setupOpenAIMock, mockChatCompletion, mockStreamingResponse } from '../helpers/openai-mock'
 *
 * // At top of file, before any imports that use OpenAI
 * const { mockCreate, mockOpenAI } = setupOpenAIMock()
 *
 * // In tests
 * mockChatCompletion(mockCreate, 'Your response text')
 * ```
 */

import type { ChatCompletion, ChatCompletionChunk } from 'openai/resources/chat/completions'

// ============================================================================
// Types
// ============================================================================

export interface MockChatCompletionOptions {
  content?: string
  role?: 'assistant' | 'user' | 'system'
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null
  model?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface MockStreamChunk {
  content: string
  finishReason?: 'stop' | 'length' | null
}

export interface MockImageResponse {
  url?: string
  b64_json?: string
  revised_prompt?: string
}

export interface OpenAIMockInstance {
  mockCreate: jest.Mock
  mockImagesGenerate: jest.Mock
  mockOpenAI: jest.MockedClass<any>
}

// ============================================================================
// Mock Setup
// ============================================================================

/**
 * Sets up the OpenAI mock for a test file.
 * Call this at the module level, before importing any modules that use OpenAI.
 *
 * @returns Mock functions for configuring responses
 *
 * @example
 * ```typescript
 * // At the TOP of your test file, before other imports
 * jest.mock('openai', () => require('../helpers/openai-mock').createOpenAIMockFactory())
 *
 * import { getOpenAIMocks } from '../helpers/openai-mock'
 * const { mockCreate } = getOpenAIMocks()
 * ```
 */
export function createOpenAIMockFactory() {
  const mockCreate = jest.fn()
  const mockImagesGenerate = jest.fn()

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
      images: {
        generate: mockImagesGenerate,
      },
    })),
    // Export mocks for access in tests
    _mocks: {
      mockCreate,
      mockImagesGenerate,
    },
  }
}

// Singleton for accessing mocks after setup
let _mockInstance: OpenAIMockInstance | null = null

/**
 * Get the mock functions after jest.mock has been called.
 * Use this in your test setup.
 */
export function getOpenAIMocks(): OpenAIMockInstance {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OpenAI = require('openai')
  const mocks = OpenAI._mocks

  if (!mocks) {
    throw new Error(
      'OpenAI mock not properly set up. Make sure to call jest.mock("openai", () => require("../helpers/openai-mock").createOpenAIMockFactory()) before imports.'
    )
  }

  _mockInstance = {
    mockCreate: mocks.mockCreate,
    mockImagesGenerate: mocks.mockImagesGenerate,
    mockOpenAI: OpenAI.default,
  }

  return _mockInstance
}

// ============================================================================
// Chat Completion Mocks
// ============================================================================

/**
 * Create a mock chat completion response object
 */
export function createMockChatCompletion(
  options: MockChatCompletionOptions = {}
): ChatCompletion {
  const {
    content = 'Mock response',
    role = 'assistant',
    finishReason = 'stop',
    model = 'gpt-4',
    usage = { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  } = options

  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
          content,
          refusal: null,
        },
        logprobs: null,
        finish_reason: finishReason,
      },
    ],
    usage,
  }
}

/**
 * Configure mock to return a simple text response
 */
export function mockChatCompletion(
  mockCreate: jest.Mock,
  content: string,
  options: Omit<MockChatCompletionOptions, 'content'> = {}
): void {
  mockCreate.mockResolvedValue(createMockChatCompletion({ content, ...options }))
}

/**
 * Configure mock to return a JSON response (auto-parses in tests)
 */
export function mockChatCompletionJSON<T>(
  mockCreate: jest.Mock,
  data: T,
  options: Omit<MockChatCompletionOptions, 'content'> = {}
): void {
  mockCreate.mockResolvedValue(
    createMockChatCompletion({
      content: JSON.stringify(data),
      ...options,
    })
  )
}

/**
 * Configure mock to reject with an error
 */
export function mockChatCompletionError(
  mockCreate: jest.Mock,
  error: Error | string
): void {
  const err = typeof error === 'string' ? new Error(error) : error
  mockCreate.mockRejectedValue(err)
}

/**
 * Configure mock for sequential responses (useful for multi-turn conversations)
 */
export function mockChatCompletionSequence(
  mockCreate: jest.Mock,
  responses: (string | MockChatCompletionOptions)[]
): void {
  responses.forEach((response, index) => {
    const options = typeof response === 'string' ? { content: response } : response
    if (index === 0) {
      mockCreate.mockResolvedValueOnce(createMockChatCompletion(options))
    } else {
      mockCreate.mockResolvedValueOnce(createMockChatCompletion(options))
    }
  })
}

// ============================================================================
// Streaming Response Mocks
// ============================================================================

/**
 * Create a mock streaming response chunk
 */
export function createStreamChunk(
  content: string,
  finishReason: 'stop' | 'length' | null = null
): ChatCompletionChunk {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        delta: {
          content,
          role: finishReason ? undefined : 'assistant',
        },
        logprobs: null,
        finish_reason: finishReason,
      },
    ],
  }
}

/**
 * Create an async iterator that simulates streaming responses
 */
export async function* createMockStream(
  chunks: MockStreamChunk[]
): AsyncGenerator<ChatCompletionChunk> {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const isLast = i === chunks.length - 1
    yield createStreamChunk(
      chunk.content,
      isLast ? (chunk.finishReason ?? 'stop') : null
    )
    // Small delay to simulate real streaming
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

/**
 * Create a mock streaming response from full text
 * Splits text into word-by-word chunks
 */
export function createMockStreamFromText(text: string): AsyncGenerator<ChatCompletionChunk> {
  const words = text.split(' ')
  const chunks: MockStreamChunk[] = words.map((word, i) => ({
    content: i === 0 ? word : ' ' + word,
    finishReason: i === words.length - 1 ? 'stop' : null,
  }))
  return createMockStream(chunks)
}

/**
 * Configure mock to return a streaming response
 */
export function mockStreamingResponse(
  mockCreate: jest.Mock,
  text: string
): void {
  mockCreate.mockImplementation(async () => createMockStreamFromText(text))
}

/**
 * Configure mock to return a streaming response with custom chunks
 */
export function mockStreamingChunks(
  mockCreate: jest.Mock,
  chunks: MockStreamChunk[]
): void {
  mockCreate.mockImplementation(async () => createMockStream(chunks))
}

// ============================================================================
// Image Generation Mocks
// ============================================================================

/**
 * Configure mock for image generation response
 */
export function mockImageGeneration(
  mockImagesGenerate: jest.Mock,
  images: MockImageResponse[] = [{ url: 'https://example.com/image.png' }]
): void {
  mockImagesGenerate.mockResolvedValue({
    created: Math.floor(Date.now() / 1000),
    data: images.map((img) => ({
      url: img.url,
      b64_json: img.b64_json,
      revised_prompt: img.revised_prompt,
    })),
  })
}

/**
 * Configure mock for image generation error
 */
export function mockImageGenerationError(
  mockImagesGenerate: jest.Mock,
  error: Error | string
): void {
  const err = typeof error === 'string' ? new Error(error) : error
  mockImagesGenerate.mockRejectedValue(err)
}

// ============================================================================
// Specialized Response Builders
// ============================================================================

/**
 * Mock a response that looks like it came from a specific agent
 */
export function mockAgentResponse(
  mockCreate: jest.Mock,
  agentName: string,
  response: string
): void {
  mockChatCompletion(mockCreate, `[${agentName}]: ${response}`)
}

/**
 * Mock a validation-style response (yes/no with reasoning)
 */
export function mockValidationResponse(
  mockCreate: jest.Mock,
  isValid: boolean,
  reasoning: string
): void {
  mockChatCompletionJSON(mockCreate, {
    valid: isValid,
    reasoning,
    suggestions: isValid ? [] : ['Fix the issue'],
  })
}

/**
 * Mock an analysis response with structured data
 */
export function mockAnalysisResponse<T extends Record<string, unknown>>(
  mockCreate: jest.Mock,
  analysis: T
): void {
  mockChatCompletionJSON(mockCreate, analysis)
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset all OpenAI mocks between tests
 */
export function resetOpenAIMocks(): void {
  if (_mockInstance) {
    _mockInstance.mockCreate.mockReset()
    _mockInstance.mockImagesGenerate.mockReset()
  }
}

/**
 * Get the calls made to the chat completions API
 */
export function getChatCompletionCalls(mockCreate: jest.Mock): any[] {
  return mockCreate.mock.calls.map((call) => call[0])
}

/**
 * Assert that a specific system prompt was used
 */
export function expectSystemPrompt(
  mockCreate: jest.Mock,
  expectedContent: string | RegExp,
  callIndex = 0
): void {
  const call = mockCreate.mock.calls[callIndex]?.[0]
  const systemMessage = call?.messages?.find((m: any) => m.role === 'system')

  if (typeof expectedContent === 'string') {
    expect(systemMessage?.content).toContain(expectedContent)
  } else {
    expect(systemMessage?.content).toMatch(expectedContent)
  }
}

/**
 * Assert that a specific user message was sent
 */
export function expectUserMessage(
  mockCreate: jest.Mock,
  expectedContent: string | RegExp,
  callIndex = 0
): void {
  const call = mockCreate.mock.calls[callIndex]?.[0]
  const userMessage = call?.messages?.find((m: any) => m.role === 'user')

  if (typeof expectedContent === 'string') {
    expect(userMessage?.content).toContain(expectedContent)
  } else {
    expect(userMessage?.content).toMatch(expectedContent)
  }
}
