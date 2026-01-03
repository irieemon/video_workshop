-- Migration: Add video sharing capabilities
-- Created: 2025-01-03
-- Description: Adds share_token and is_public columns to videos table for shareable links

-- Add sharing columns to videos table
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- Create index for fast share token lookups
CREATE INDEX IF NOT EXISTS idx_videos_share_token
  ON videos(share_token)
  WHERE share_token IS NOT NULL;

-- Create index for public videos
CREATE INDEX IF NOT EXISTS idx_videos_is_public
  ON videos(is_public)
  WHERE is_public = true;

-- Function to generate a unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 12-character alphanumeric token
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- RLS Policy for public video access (anyone can read if share_token matches)
-- First, check if policy exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'videos' AND policyname = 'Public videos are viewable by anyone'
  ) THEN
    DROP POLICY "Public videos are viewable by anyone" ON videos;
  END IF;
END $$;

-- Create policy for public video access
CREATE POLICY "Public videos are viewable by anyone"
  ON videos FOR SELECT
  USING (
    is_public = true
    AND share_token IS NOT NULL
  );

-- Comments for documentation
COMMENT ON COLUMN videos.share_token IS 'Unique token for shareable public link';
COMMENT ON COLUMN videos.is_public IS 'Whether the video prompt is publicly accessible via share link';
COMMENT ON COLUMN videos.shared_at IS 'Timestamp when the video was first shared';
