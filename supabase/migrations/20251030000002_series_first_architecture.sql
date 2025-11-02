-- Migration: Series-First Architecture
-- Description: Simplifies 3-tier hierarchy (Projects → Series → Videos) to 2-tier (Series → Videos)
-- Date: 2025-10-30
-- Version: 1.0

-- ============================================================================
-- PHASE 1: Rename projects → workspaces (optional grouping)
-- ============================================================================

-- Step 1: Rename the projects table to workspaces
ALTER TABLE IF EXISTS projects RENAME TO workspaces;

-- Step 2: Add is_active column for workspace visibility control
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Step 3: Add metadata column for future workspace features
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- PHASE 2: Simplify series relationships
-- ============================================================================

-- Step 4: Add workspace_id to series (replaces project_series junction)
ALTER TABLE series ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Step 5: Add is_system flag to series for standalone videos container
ALTER TABLE series ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Step 6: Migrate existing project-series relationships
-- Copy data from project_series junction table to series.workspace_id
UPDATE series s
SET workspace_id = ps.project_id
FROM project_series ps
WHERE ps.series_id = s.id
  AND s.workspace_id IS NULL;

-- ============================================================================
-- PHASE 3: Create system series for standalone videos
-- ============================================================================

-- Step 7: Create "Standalone Videos" system series for each user
-- This eliminates the need for nullable series_id in videos table
INSERT INTO series (id, user_id, name, description, is_system, genre, visual_style)
SELECT
  gen_random_uuid(),
  id,
  'Standalone Videos',
  'Videos that don''t belong to a specific series',
  true,
  'mixed',
  'Mixed styles'
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM series
  WHERE series.user_id = users.id
    AND series.is_system = true
);

-- Step 8: Migrate existing standalone videos to system series
-- Update videos that have NULL series_id to point to user's system series
UPDATE videos v
SET series_id = (
  SELECT s.id
  FROM series s
  WHERE s.user_id = v.user_id
    AND s.is_system = true
  LIMIT 1
)
WHERE v.series_id IS NULL;

-- ============================================================================
-- PHASE 4: Update videos table
-- ============================================================================

-- Step 9: Remove project_id from videos (no longer needed)
ALTER TABLE videos DROP COLUMN IF EXISTS project_id;

-- Step 10: Make series_id NOT NULL (now that all videos have a series)
ALTER TABLE videos ALTER COLUMN series_id SET NOT NULL;

-- Step 11: Remove is_standalone flag (replaced by system series)
ALTER TABLE videos DROP COLUMN IF EXISTS is_standalone;

-- ============================================================================
-- PHASE 5: Update indexes for performance
-- ============================================================================

-- Step 12: Add index on workspace_id for faster queries
CREATE INDEX IF NOT EXISTS idx_series_workspace_id ON series(workspace_id);

-- Step 13: Add composite index for user workspace queries
CREATE INDEX IF NOT EXISTS idx_workspaces_user_active ON workspaces(user_id, is_active);

-- Step 14: Add index on system series for quick lookups
CREATE INDEX IF NOT EXISTS idx_series_system ON series(user_id, is_system) WHERE is_system = true;

-- ============================================================================
-- PHASE 6: Update RLS policies
-- ============================================================================

-- Step 15: Drop old project-based policies and recreate for workspaces
DROP POLICY IF EXISTS "Users can view their own projects" ON workspaces;
DROP POLICY IF EXISTS "Users can create projects" ON workspaces;
DROP POLICY IF EXISTS "Users can update their own projects" ON workspaces;
DROP POLICY IF EXISTS "Users can delete their own projects" ON workspaces;

-- Step 16: Create new workspace RLS policies
CREATE POLICY "Users can view their own workspaces"
  ON workspaces FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workspaces"
  ON workspaces FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own workspaces"
  ON workspaces FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- PHASE 7: Clean up junction table
-- ============================================================================

-- Step 17: Drop project_series junction table (no longer needed)
DROP TABLE IF EXISTS project_series;

-- ============================================================================
-- PHASE 8: Update database functions (if any exist)
-- ============================================================================

-- Step 18: Create helper function to get user's standalone series
CREATE OR REPLACE FUNCTION get_user_standalone_series(p_user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM series
    WHERE user_id = p_user_id
      AND is_system = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PHASE 9: Add helpful views for backward compatibility
-- ============================================================================

-- Step 19: Create view for "projects" that maps to workspaces (for legacy queries)
CREATE OR REPLACE VIEW projects AS
SELECT
  id,
  user_id,
  name,
  description,
  created_at,
  updated_at
FROM workspaces
WHERE is_active = true;

-- Step 20: Create view for video counts by workspace
CREATE OR REPLACE VIEW workspace_video_counts AS
SELECT
  w.id AS workspace_id,
  w.name AS workspace_name,
  COUNT(DISTINCT v.id) AS video_count,
  COUNT(DISTINCT s.id) AS series_count
FROM workspaces w
LEFT JOIN series s ON s.workspace_id = w.id AND s.is_system = false
LEFT JOIN videos v ON v.series_id = s.id
GROUP BY w.id, w.name;

-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually for verification)
-- ============================================================================

-- Verify all videos have series assigned:
-- SELECT COUNT(*) FROM videos WHERE series_id IS NULL;
-- Expected: 0

-- Verify system series created for all users:
-- SELECT COUNT(DISTINCT user_id) FROM series WHERE is_system = true;
-- Expected: Should equal user count

-- Verify workspace relationships migrated:
-- SELECT COUNT(*) FROM series WHERE workspace_id IS NOT NULL;
-- Expected: Should equal previous project_series count

-- Check for orphaned data:
-- SELECT COUNT(*) FROM series WHERE workspace_id NOT IN (SELECT id FROM workspaces);
-- Expected: 0

-- ============================================================================
-- ROLLBACK PROCEDURE (save separately - do NOT run automatically)
-- ============================================================================

-- To rollback this migration:
-- 1. Rename workspaces back to projects
-- 2. Recreate project_series junction table
-- 3. Migrate workspace_id back to junction table
-- 4. Restore project_id column in videos
-- 5. Delete system series and restore standalone videos
-- 6. Restore is_standalone flag
-- See rollback_20251030_series_first_architecture.sql for full script

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Series-First Architecture migration completed successfully';
  RAISE NOTICE 'Workspaces: % renamed from projects', (SELECT COUNT(*) FROM workspaces);
  RAISE NOTICE 'System series created: %', (SELECT COUNT(*) FROM series WHERE is_system = true);
  RAISE NOTICE 'Videos migrated: %', (SELECT COUNT(*) FROM videos);
  RAISE NOTICE 'Series with workspace: %', (SELECT COUNT(*) FROM series WHERE workspace_id IS NOT NULL);
END $$;
