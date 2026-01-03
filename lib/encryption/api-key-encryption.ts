/**
 * API Key Encryption Utilities
 *
 * Provides secure encryption/decryption for user API keys using AES-256-GCM.
 * Keys are stored encrypted in the database and only decrypted when needed
 * for API calls.
 *
 * Security considerations:
 * - Uses AES-256-GCM for authenticated encryption
 * - Random IV generated for each encryption
 * - Auth tag prevents tampering
 * - Encryption key derived from environment variable
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const KEY_LENGTH = 32 // 256 bits

/**
 * Get the encryption key from environment variable.
 * Derives a 256-bit key using SHA-256 hash.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET

  if (!secret) {
    throw new Error(
      'API_KEY_ENCRYPTION_SECRET environment variable is not set. ' +
      'Generate a secure random string (min 32 characters) and set it in your environment.'
    )
  }

  // Use SHA-256 to derive a consistent 256-bit key from the secret
  return createHash('sha256').update(secret).digest()
}

export interface EncryptedData {
  /** Base64 encoded string containing iv:ciphertext:authTag */
  encrypted: string
  /** Last 4 characters of the original key for display purposes */
  suffix: string
}

/**
 * Encrypt an API key for secure storage.
 *
 * @param apiKey - The plaintext API key to encrypt
 * @returns Encrypted data with the key suffix for identification
 *
 * @example
 * const { encrypted, suffix } = encryptApiKey('sk-abc123xyz789...')
 * // encrypted: "base64encodedstring..."
 * // suffix: "9..."
 */
export function encryptApiKey(apiKey: string): EncryptedData {
  if (!apiKey || apiKey.length < 10) {
    throw new Error('Invalid API key: must be at least 10 characters')
  }

  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Combine iv:ciphertext:authTag and encode as base64
  const combined = Buffer.concat([
    iv,
    Buffer.from(encrypted, 'hex'),
    authTag,
  ])

  return {
    encrypted: combined.toString('base64'),
    suffix: apiKey.slice(-4),
  }
}

/**
 * Decrypt an encrypted API key.
 *
 * @param encryptedData - Base64 encoded encrypted data (iv:ciphertext:authTag)
 * @returns The decrypted plaintext API key
 *
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decryptApiKey(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('No encrypted data provided')
  }

  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedData, 'base64')

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted data: too short')
  }

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * Validate that an API key can be decrypted successfully.
 * Does not return the key, just confirms it can be decrypted.
 *
 * @param encryptedData - Base64 encoded encrypted data
 * @returns true if decryption succeeds, false otherwise
 */
export function canDecryptApiKey(encryptedData: string): boolean {
  try {
    decryptApiKey(encryptedData)
    return true
  } catch {
    return false
  }
}

/**
 * Mask an API key for safe display.
 * Shows only first 4 and last 4 characters.
 *
 * @param apiKey - The plaintext API key
 * @returns Masked string like "sk-a...xyz9"
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '••••••••'
  }
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
}

/**
 * Validate the format of an OpenAI API key.
 * Does not verify the key works, just checks format.
 */
export function isValidOpenAIKeyFormat(apiKey: string): boolean {
  // OpenAI keys start with 'sk-' and are typically 51 characters
  // Newer keys might have different formats (sk-proj-, etc.)
  return /^sk-[a-zA-Z0-9-_]{20,}$/.test(apiKey)
}

/**
 * Validate the format of an Anthropic API key.
 */
export function isValidAnthropicKeyFormat(apiKey: string): boolean {
  // Anthropic keys start with 'sk-ant-'
  return /^sk-ant-[a-zA-Z0-9-_]{20,}$/.test(apiKey)
}

/**
 * Get the provider from an API key based on its format.
 */
export function detectKeyProvider(apiKey: string): 'openai' | 'anthropic' | 'unknown' {
  if (apiKey.startsWith('sk-ant-')) {
    return 'anthropic'
  }
  if (apiKey.startsWith('sk-')) {
    return 'openai'
  }
  return 'unknown'
}
