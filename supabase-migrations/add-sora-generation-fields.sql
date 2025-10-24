-- Add Sora Video Generation Fields to Videos Table
-- This migration adds fields to track Sora API video generation status and results

-- ============================================================================
-- STEP 1: Add Sora generation tracking fields
-- ============================================================================

DO $$
BEGIN
    -- Sora job ID from OpenAI API
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'videos' AND column_name = 'sora_job_id'
    ) THEN
        ALTER TABLE public.videos
        ADD COLUMN sora_job_id TEXT;

        COMMENT ON COLUMN public.videos.sora_job_id IS
        'OpenAI Sora API job ID for tracking video generation';
    END IF;

    -- Sora generation status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'videos' AND column_name = 'sora_generation_status'
    ) THEN
        ALTER TABLE public.videos
        ADD COLUMN sora_generation_status TEXT CHECK (sora_generation_status IN ('pending', 'queued', 'in_progress', 'completed', 'failed', NULL));

        COMMENT ON COLUMN public.videos.sora_generation_status IS
        'Status of Sora video generation: pending, queued, in_progress, completed, failed';
    END IF;

    -- Sora video URL (after generation completes)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'videos' AND column_name = 'sora_video_url'
    ) THEN
        ALTER TABLE public.videos
        ADD COLUMN sora_video_url TEXT;

        COMMENT ON COLUMN public.videos.sora_video_url IS
        'URL to the generated Sora video (Supabase Storage or OpenAI)';
    END IF;

    -- Sora generation settings used
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'videos' AND column_name = 'sora_generation_settings'
    ) THEN
        ALTER TABLE public.videos
        ADD COLUMN sora_generation_settings JSONB DEFAULT '{}'::jsonb;

        COMMENT ON COLUMN public.videos.sora_generation_settings IS
        'Settings used for Sora generation: duration, aspect_ratio, resolution, model';
    END IF;

    -- Sora generation cost tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'videos' AND column_name = 'sora_generation_cost'
    ) THEN
        ALTER TABLE public.videos
        ADD COLUMN sora_generation_cost DECIMAL(10, 4);

        COMMENT ON COLUMN public.videos.sora_generation_cost IS
        'Estimated or actual cost of Sora video generation in USD';
    END IF;

    -- Error message if generation fails
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'videos' AND column_name = 'sora_error_message'
    ) THEN
        ALTER TABLE public.videos
        ADD COLUMN sora_error_message TEXT;

        COMMENT ON COLUMN public.videos.sora_error_message IS
        'Error message if Sora generation fails';
    END IF;

    -- Timestamps for generation tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'videos' AND column_name = 'sora_started_at'
    ) THEN
        ALTER TABLE public.videos
        ADD COLUMN sora_started_at TIMESTAMP WITH TIME ZONE;

        COMMENT ON COLUMN public.videos.sora_started_at IS
        'Timestamp when Sora generation was initiated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'videos' AND column_name = 'sora_completed_at'
    ) THEN
        ALTER TABLE public.videos
        ADD COLUMN sora_completed_at TIMESTAMP WITH TIME ZONE;

        COMMENT ON COLUMN public.videos.sora_completed_at IS
        'Timestamp when Sora generation completed (success or failure)';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_videos_sora_job_id
ON public.videos(sora_job_id)
WHERE sora_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_videos_sora_status
ON public.videos(sora_generation_status)
WHERE sora_generation_status IS NOT NULL;

-- ============================================================================
-- STEP 3: Create helper function to calculate generation cost
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_sora_generation_cost(
    p_duration INTEGER,
    p_resolution TEXT,
    p_model TEXT DEFAULT 'sora-2'
)
RETURNS DECIMAL AS $$
DECLARE
    base_cost DECIMAL := 1.00; -- Base cost per video
    duration_multiplier DECIMAL := 1.0;
    resolution_multiplier DECIMAL := 1.0;
BEGIN
    -- Duration pricing (per second over base 5s)
    IF p_duration > 5 THEN
        duration_multiplier := 1.0 + ((p_duration - 5) * 0.1);
    END IF;

    -- Resolution pricing
    CASE p_resolution
        WHEN '1080p' THEN resolution_multiplier := 1.5;
        WHEN '720p' THEN resolution_multiplier := 1.0;
        WHEN '480p' THEN resolution_multiplier := 0.7;
        ELSE resolution_multiplier := 1.0;
    END CASE;

    -- Calculate total cost
    RETURN ROUND(base_cost * duration_multiplier * resolution_multiplier, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_sora_generation_cost IS
'Calculate estimated Sora video generation cost based on duration and resolution';

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Sora generation fields migration completed!' as status;
