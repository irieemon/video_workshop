/**
 * AI Model Configuration
 *
 * SINGLE ENVIRONMENT VARIABLE CONTROLS EVERYTHING
 * Set OPENAI_MODEL in .env.local to switch models globally across all AI operations.
 *
 * Supported Models:
 * - gpt-5-chat-latest: Latest GPT-5 model (current default)
 * - gpt-4o: GPT-4 optimized model (stable fallback)
 * - gpt-4o-mini: Lightweight GPT-4 variant
 *
 * USAGE:
 * 1. Edit .env.local
 * 2. Set OPENAI_MODEL=gpt-5-chat-latest (or any other model)
 * 3. Restart your dev server
 * 4. ALL AI operations now use the new model
 *
 * This controls:
 * - Agent responses (Director, Cinematographer, Editor, Colorist, Platform Expert)
 * - Final prompt synthesis
 * - Character image analysis (vision API)
 * - All OpenAI API calls throughout the application
 */

export const AI_CONFIG = {
  /**
   * Single model for ALL AI operations
   * Environment: OPENAI_MODEL
   * Default: gpt-5-chat-latest
   */
  MODEL: process.env.OPENAI_MODEL || 'gpt-5-chat-latest',
} as const

/**
 * Get the model for any feature
 * Always returns the same model (controlled by single OPENAI_MODEL variable)
 *
 * @param feature - The feature type (kept for API compatibility, but all return same model)
 * @returns Model identifier string
 */
export function getModelForFeature(
  feature?: 'vision' | 'synthesis' | 'agent' | 'default'
): string {
  // All features use the same model - controlled by single environment variable
  return AI_CONFIG.MODEL
}

/**
 * Model pricing information (per 1M tokens)
 * Updated as of GPT-5 release (August 2025)
 */
export const MODEL_PRICING = {
  'gpt-5-chat-latest': { input: 1.25, output: 10.0 },
  'gpt-5': { input: 1.25, output: 10.0 },
  'gpt-5-mini': { input: 0.40, output: 1.60 }, // Estimated
  'gpt-4o': { input: 2.50, output: 10.0 },
  'gpt-4o-mini': { input: 0.30, output: 0.60 },
} as const

/**
 * Get current configuration summary for debugging
 */
export function getConfigSummary() {
  return {
    model: AI_CONFIG.MODEL,
    source: process.env.OPENAI_MODEL ? 'environment' : 'default',
    appliesTo: [
      'agent responses',
      'prompt synthesis',
      'vision analysis',
      'all AI operations'
    ],
  }
}
