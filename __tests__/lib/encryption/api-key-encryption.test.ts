/**
 * Tests for API Key Encryption Utilities
 *
 * Tests the secure encryption/decryption functionality for user API keys.
 * This is security-critical code - comprehensive testing is essential.
 */

import {
  encryptApiKey,
  decryptApiKey,
  canDecryptApiKey,
  maskApiKey,
  isValidOpenAIKeyFormat,
  isValidAnthropicKeyFormat,
  detectKeyProvider,
  EncryptedData,
} from '@/lib/encryption/api-key-encryption'

describe('API Key Encryption', () => {
  const ORIGINAL_ENV = process.env

  // Valid test API keys
  const validOpenAIKey = 'sk-abcdefghij1234567890abcdefghij1234567890abcdef'
  const validAnthropicKey = 'sk-ant-abcdefghij1234567890abcdefghij1234567890'
  const shortApiKey = 'sk-short12' // 10 chars minimum

  beforeEach(() => {
    // Reset environment to known state
    jest.resetModules()
    process.env = { ...ORIGINAL_ENV }
    process.env.API_KEY_ENCRYPTION_SECRET = 'test-encryption-secret-at-least-32-chars'
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  describe('encryptApiKey', () => {
    describe('Basic Encryption', () => {
      it('encrypts an API key and returns encrypted data with suffix', () => {
        const result = encryptApiKey(validOpenAIKey)

        expect(result).toHaveProperty('encrypted')
        expect(result).toHaveProperty('suffix')
        expect(result.encrypted).toBeTruthy()
        expect(typeof result.encrypted).toBe('string')
      })

      it('returns base64-encoded encrypted data', () => {
        const result = encryptApiKey(validOpenAIKey)

        // Base64 pattern: only contains A-Za-z0-9+/=
        expect(result.encrypted).toMatch(/^[A-Za-z0-9+/=]+$/)
      })

      it('extracts the last 4 characters as suffix', () => {
        const result = encryptApiKey(validOpenAIKey)

        expect(result.suffix).toBe(validOpenAIKey.slice(-4))
        expect(result.suffix).toHaveLength(4)
      })

      it('produces different ciphertext for same input (random IV)', () => {
        const result1 = encryptApiKey(validOpenAIKey)
        const result2 = encryptApiKey(validOpenAIKey)

        expect(result1.encrypted).not.toBe(result2.encrypted)
        expect(result1.suffix).toBe(result2.suffix)
      })

      it('handles minimum length API key (10 chars)', () => {
        const result = encryptApiKey(shortApiKey)

        expect(result.encrypted).toBeTruthy()
        expect(result.suffix).toBe(shortApiKey.slice(-4))
      })

      it('handles long API keys', () => {
        const longKey = 'sk-' + 'a'.repeat(200)
        const result = encryptApiKey(longKey)

        expect(result.encrypted).toBeTruthy()
        expect(result.suffix).toBe('aaaa')
      })
    })

    describe('Input Validation', () => {
      it('throws error for empty string', () => {
        expect(() => encryptApiKey('')).toThrow('Invalid API key: must be at least 10 characters')
      })

      it('throws error for key shorter than 10 characters', () => {
        expect(() => encryptApiKey('sk-short')).toThrow(
          'Invalid API key: must be at least 10 characters'
        )
      })

      it('throws error for 9-character key', () => {
        expect(() => encryptApiKey('123456789')).toThrow(
          'Invalid API key: must be at least 10 characters'
        )
      })

      it('accepts exactly 10 characters', () => {
        expect(() => encryptApiKey('1234567890')).not.toThrow()
      })
    })

    describe('Special Characters', () => {
      it('handles API keys with hyphens', () => {
        const keyWithHyphens = 'sk-proj-abc-123-def-456-ghi-789'
        const result = encryptApiKey(keyWithHyphens)

        expect(result.encrypted).toBeTruthy()
        const decrypted = decryptApiKey(result.encrypted)
        expect(decrypted).toBe(keyWithHyphens)
      })

      it('handles API keys with underscores', () => {
        const keyWithUnderscores = 'sk_test_abc_123_def_456_ghi_789'
        const result = encryptApiKey(keyWithUnderscores)

        const decrypted = decryptApiKey(result.encrypted)
        expect(decrypted).toBe(keyWithUnderscores)
      })

      it('handles unicode characters', () => {
        // Edge case - not realistic for API keys but good to verify encoding
        const unicodeKey = 'sk-测试密钥-1234567890'
        const result = encryptApiKey(unicodeKey)

        const decrypted = decryptApiKey(result.encrypted)
        expect(decrypted).toBe(unicodeKey)
      })
    })

    describe('Environment Variable', () => {
      it('throws error when encryption secret is not set', () => {
        delete process.env.API_KEY_ENCRYPTION_SECRET

        expect(() => encryptApiKey(validOpenAIKey)).toThrow(
          'API_KEY_ENCRYPTION_SECRET environment variable is not set'
        )
      })

      it('throws error for empty encryption secret', () => {
        process.env.API_KEY_ENCRYPTION_SECRET = ''

        expect(() => encryptApiKey(validOpenAIKey)).toThrow(
          'API_KEY_ENCRYPTION_SECRET environment variable is not set'
        )
      })
    })
  })

  describe('decryptApiKey', () => {
    describe('Basic Decryption', () => {
      it('decrypts to original plaintext', () => {
        const { encrypted } = encryptApiKey(validOpenAIKey)

        const decrypted = decryptApiKey(encrypted)

        expect(decrypted).toBe(validOpenAIKey)
      })

      it('correctly decrypts multiple different keys', () => {
        const keys = [
          validOpenAIKey,
          validAnthropicKey,
          'sk-test-1234567890',
          'sk-proj-abcdefghij1234567890',
        ]

        for (const key of keys) {
          const { encrypted } = encryptApiKey(key)
          const decrypted = decryptApiKey(encrypted)
          expect(decrypted).toBe(key)
        }
      })

      it('handles the minimum length key correctly', () => {
        const { encrypted } = encryptApiKey(shortApiKey)

        const decrypted = decryptApiKey(encrypted)

        expect(decrypted).toBe(shortApiKey)
      })
    })

    describe('Error Handling', () => {
      it('throws error for empty encrypted data', () => {
        expect(() => decryptApiKey('')).toThrow('No encrypted data provided')
      })

      it('throws error for data too short', () => {
        const shortData = Buffer.from('short').toString('base64')

        expect(() => decryptApiKey(shortData)).toThrow('Invalid encrypted data: too short')
      })

      it('throws error for corrupted data', () => {
        const { encrypted } = encryptApiKey(validOpenAIKey)

        // Corrupt the data by changing a character
        const corrupted = encrypted.slice(0, -5) + 'XXXXX'

        expect(() => decryptApiKey(corrupted)).toThrow()
      })

      it('throws error for tampered auth tag', () => {
        const { encrypted } = encryptApiKey(validOpenAIKey)

        // Decode, modify auth tag, re-encode
        const buffer = Buffer.from(encrypted, 'base64')
        buffer[buffer.length - 1] ^= 0xff // Flip bits in auth tag

        expect(() => decryptApiKey(buffer.toString('base64'))).toThrow()
      })

      it('throws error for invalid base64', () => {
        // Invalid base64 characters
        expect(() => decryptApiKey('!!!invalid$$$')).toThrow()
      })
    })

    describe('Cross-Key Security', () => {
      it('cannot decrypt with different encryption secret', () => {
        const { encrypted } = encryptApiKey(validOpenAIKey)

        // Change the secret
        process.env.API_KEY_ENCRYPTION_SECRET = 'different-secret-key-for-testing'

        expect(() => decryptApiKey(encrypted)).toThrow()
      })
    })
  })

  describe('canDecryptApiKey', () => {
    it('returns true for valid encrypted data', () => {
      const { encrypted } = encryptApiKey(validOpenAIKey)

      expect(canDecryptApiKey(encrypted)).toBe(true)
    })

    it('returns false for invalid encrypted data', () => {
      expect(canDecryptApiKey('invalid-data')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(canDecryptApiKey('')).toBe(false)
    })

    it('returns false for corrupted data', () => {
      const { encrypted } = encryptApiKey(validOpenAIKey)
      const corrupted = encrypted.slice(0, -10) + 'XXXXXXXXXX'

      expect(canDecryptApiKey(corrupted)).toBe(false)
    })

    it('does not expose decrypted value', () => {
      const { encrypted } = encryptApiKey(validOpenAIKey)

      // The function should only return boolean, not the key
      const result = canDecryptApiKey(encrypted)

      expect(typeof result).toBe('boolean')
      expect(result).not.toBe(validOpenAIKey)
    })
  })

  describe('maskApiKey', () => {
    it('masks the middle of a valid key', () => {
      const result = maskApiKey(validOpenAIKey)

      expect(result).toBe(`${validOpenAIKey.slice(0, 4)}...${validOpenAIKey.slice(-4)}`)
    })

    it('shows first 4 and last 4 characters', () => {
      const key = 'sk-abcdefghij1234567890'
      const result = maskApiKey(key)

      expect(result).toMatch(/^sk-a\.\.\.7890$/)
    })

    it('returns mask placeholder for empty string', () => {
      expect(maskApiKey('')).toBe('••••••••')
    })

    it('returns mask placeholder for short string', () => {
      expect(maskApiKey('short')).toBe('••••••••')
    })

    it('returns mask placeholder for 7-character string', () => {
      expect(maskApiKey('1234567')).toBe('••••••••')
    })

    it('handles exactly 8 characters', () => {
      const result = maskApiKey('12345678')

      expect(result).toBe('1234...5678')
    })

    it('handles null/undefined gracefully', () => {
      expect(maskApiKey(null as unknown as string)).toBe('••••••••')
      expect(maskApiKey(undefined as unknown as string)).toBe('••••••••')
    })
  })

  describe('isValidOpenAIKeyFormat', () => {
    it('validates correct OpenAI key format', () => {
      expect(isValidOpenAIKeyFormat(validOpenAIKey)).toBe(true)
    })

    it('validates sk-proj- format', () => {
      expect(isValidOpenAIKeyFormat('sk-proj-abcdefghij1234567890')).toBe(true)
    })

    it('rejects keys not starting with sk-', () => {
      expect(isValidOpenAIKeyFormat('pk-abcdefghij1234567890')).toBe(false)
    })

    it('rejects keys that are too short', () => {
      expect(isValidOpenAIKeyFormat('sk-short')).toBe(false)
      expect(isValidOpenAIKeyFormat('sk-12345678901234567890')).toBe(true) // Exactly 23 chars total
    })

    it('technically accepts Anthropic keys (both start with sk-)', () => {
      // Note: isValidOpenAIKeyFormat only checks if key starts with sk-
      // For proper provider detection, use detectKeyProvider()
      expect(isValidOpenAIKeyFormat(validAnthropicKey)).toBe(true)
    })

    it('rejects empty string', () => {
      expect(isValidOpenAIKeyFormat('')).toBe(false)
    })

    it('accepts keys with hyphens and underscores', () => {
      expect(isValidOpenAIKeyFormat('sk-abc-def_ghi_123_456_789')).toBe(true)
    })
  })

  describe('isValidAnthropicKeyFormat', () => {
    it('validates correct Anthropic key format', () => {
      expect(isValidAnthropicKeyFormat(validAnthropicKey)).toBe(true)
    })

    it('rejects keys not starting with sk-ant-', () => {
      expect(isValidAnthropicKeyFormat('sk-abcdefghij1234567890')).toBe(false)
    })

    it('rejects keys that are too short', () => {
      expect(isValidAnthropicKeyFormat('sk-ant-short')).toBe(false)
    })

    it('rejects OpenAI keys', () => {
      expect(isValidAnthropicKeyFormat(validOpenAIKey)).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isValidAnthropicKeyFormat('')).toBe(false)
    })
  })

  describe('detectKeyProvider', () => {
    it('detects OpenAI keys', () => {
      expect(detectKeyProvider(validOpenAIKey)).toBe('openai')
      expect(detectKeyProvider('sk-proj-123456789')).toBe('openai')
    })

    it('detects Anthropic keys', () => {
      expect(detectKeyProvider(validAnthropicKey)).toBe('anthropic')
    })

    it('returns unknown for unrecognized format', () => {
      expect(detectKeyProvider('api-key-123456789')).toBe('unknown')
      expect(detectKeyProvider('pk-test-123456789')).toBe('unknown')
    })

    it('returns unknown for empty string', () => {
      expect(detectKeyProvider('')).toBe('unknown')
    })

    it('prioritizes Anthropic detection over OpenAI', () => {
      // sk-ant- should be Anthropic, not OpenAI (even though it starts with sk-)
      expect(detectKeyProvider('sk-ant-test123')).toBe('anthropic')
    })
  })

  describe('Encryption Round-Trip Integrity', () => {
    it('maintains exact byte-level integrity', () => {
      const testCases = [
        validOpenAIKey,
        validAnthropicKey,
        'sk-' + '0'.repeat(100),
        'sk-' + 'a'.repeat(50) + '-' + 'b'.repeat(50),
      ]

      for (const original of testCases) {
        const { encrypted } = encryptApiKey(original)
        const decrypted = decryptApiKey(encrypted)
        expect(decrypted).toBe(original)
        expect(decrypted.length).toBe(original.length)
      }
    })

    it('handles rapid successive encryptions', () => {
      const results: EncryptedData[] = []

      for (let i = 0; i < 10; i++) {
        results.push(encryptApiKey(validOpenAIKey))
      }

      // All encrypted values should be unique
      const encryptedSet = new Set(results.map((r) => r.encrypted))
      expect(encryptedSet.size).toBe(10)

      // All should decrypt to same value
      for (const result of results) {
        expect(decryptApiKey(result.encrypted)).toBe(validOpenAIKey)
      }
    })
  })

  describe('Security Properties', () => {
    it('encrypted data is longer than plaintext (IV + auth tag overhead)', () => {
      const { encrypted } = encryptApiKey(shortApiKey)

      // Base64 decoded length should be greater than original
      const encryptedBuffer = Buffer.from(encrypted, 'base64')
      expect(encryptedBuffer.length).toBeGreaterThan(shortApiKey.length)
    })

    it('encrypted data contains no plaintext fragments', () => {
      const { encrypted } = encryptApiKey(validOpenAIKey)

      // The encrypted data should not contain the original key or its substring
      expect(encrypted).not.toContain('sk-')
      expect(encrypted).not.toContain(validOpenAIKey.slice(0, 10))
      expect(encrypted).not.toContain(validOpenAIKey.slice(-10))
    })

    it('different keys produce vastly different ciphertext', () => {
      const key1 = 'sk-aaaaaaaaaa1234567890'
      const key2 = 'sk-aaaaaaaaab1234567890' // Only one character different

      const encrypted1 = encryptApiKey(key1).encrypted
      const encrypted2 = encryptApiKey(key2).encrypted

      // Should be completely different (avalanche effect)
      expect(encrypted1).not.toBe(encrypted2)

      // Measure similarity - should be very low
      let matchingChars = 0
      const minLen = Math.min(encrypted1.length, encrypted2.length)
      for (let i = 0; i < minLen; i++) {
        if (encrypted1[i] === encrypted2[i]) matchingChars++
      }
      // Should have less than 25% matching characters (random noise level)
      expect(matchingChars / minLen).toBeLessThan(0.25)
    })
  })
})
