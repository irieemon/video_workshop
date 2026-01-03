-- Create user_api_keys table for BYOK (Bring Your Own Key) functionality
-- Allows users to securely store their API keys for video generation
-- Part of Phase 3: BYOK System

-- ============================================================================
-- Create user_api_keys table
-- ============================================================================

CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Provider identification
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'stability', 'replicate')),

  -- Encrypted key storage (AES-256-GCM)
  -- Format: base64(iv:ciphertext:authTag)
  encrypted_key TEXT NOT NULL,

  -- Display-safe key info
  key_suffix TEXT NOT NULL, -- Last 4 chars for user identification
  key_name TEXT DEFAULT 'Default', -- User-friendly name: "Work Key", "Personal"

  -- Validation status
  is_valid BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT, -- Last validation error message if any

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_provider_name UNIQUE(user_id, provider, key_name)
);

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_provider ON user_api_keys(provider);
CREATE INDEX idx_user_api_keys_user_provider ON user_api_keys(user_id, provider);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only view their own API keys
CREATE POLICY "Users can view own API keys"
  ON user_api_keys FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own API keys
CREATE POLICY "Users can insert own API keys"
  ON user_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys
CREATE POLICY "Users can update own API keys"
  ON user_api_keys FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own API keys"
  ON user_api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_user_api_keys_updated_at();

-- ============================================================================
-- Add share functionality to videos table
-- ============================================================================

-- Add share_token and is_public columns to videos table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'videos' AND column_name = 'share_token') THEN
    ALTER TABLE videos ADD COLUMN share_token TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'videos' AND column_name = 'is_public') THEN
    ALTER TABLE videos ADD COLUMN is_public BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index for share token lookups
CREATE INDEX IF NOT EXISTS idx_videos_share_token
  ON videos(share_token)
  WHERE share_token IS NOT NULL;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE user_api_keys IS 'Stores encrypted API keys for BYOK (Bring Your Own Key) functionality';
COMMENT ON COLUMN user_api_keys.encrypted_key IS 'AES-256-GCM encrypted API key in format: base64(iv:ciphertext:authTag)';
COMMENT ON COLUMN user_api_keys.key_suffix IS 'Last 4 characters of API key for user identification';
COMMENT ON COLUMN user_api_keys.provider IS 'API provider: openai, anthropic, stability, replicate';
COMMENT ON COLUMN user_api_keys.is_valid IS 'Whether the key passed last validation check';
COMMENT ON COLUMN user_api_keys.validation_error IS 'Error message from last failed validation';
