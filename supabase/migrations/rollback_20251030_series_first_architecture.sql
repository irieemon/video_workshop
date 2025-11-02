-- ROLLBACK SCRIPT: Series-First Architecture
-- Description: Reverts migration back to 3-tier hierarchy (Projects → Series → Videos)
-- Date: 2025-10-30
-- Version: 1.0
-- WARNING: Only run this if you need to revert the Series-First Architecture migration

-- ============================================================================
-- SAFETY CHECK: Verify this is the correct database
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspaces') THEN
    RAISE EXCEPTION 'Workspaces table does not exist. Migration may not have been applied.';
  END IF;

  RAISE NOTICE 'Starting rollback of Series-First Architecture migration...';
END $$;

-- ============================================================================
-- PHASE 1: Restore projects table
-- ============================================================================

-- Step 1: Rename workspaces back to projects
ALTER TABLE workspaces RENAME TO projects;

-- Step 2: Remove new columns added in migration
ALTER TABLE projects DROP COLUMN IF EXISTS is_active;
ALTER TABLE projects DROP COLUMN IF EXISTS settings;

-- ============================================================================
-- PHASE 2: Recreate project_series junction table
-- ============================================================================

-- Step 3: Recreate the junction table
CREATE TABLE IF NOT EXISTS project_series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: a series can only belong to a project once
  UNIQUE(project_id, series_id)
);

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_project_series_project ON project_series(project_id);
CREATE INDEX IF NOT EXISTS idx_project_series_series ON project_series(series_id);

-- Step 5: Migrate data from series.workspace_id back to junction table
INSERT INTO project_series (project_id, series_id, display_order)
SELECT
  workspace_id,
  id,
  ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at) - 1
FROM series
WHERE workspace_id IS NOT NULL
  AND is_system = false
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 3: Restore series table structure
-- ============================================================================

-- Step 6: Remove new columns from series
ALTER TABLE series DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE series DROP COLUMN IF EXISTS is_system;

-- Step 7: Drop helper function
DROP FUNCTION IF EXISTS get_user_standalone_series(UUID);

-- ============================================================================
-- PHASE 4: Restore videos table structure
-- ============================================================================

-- Step 8: Add back project_id column
ALTER TABLE videos ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Step 9: Populate project_id from series relationships
UPDATE videos v
SET project_id = ps.project_id
FROM series s
JOIN project_series ps ON ps.series_id = s.id
WHERE v.series_id = s.id;

-- Step 10: Add back is_standalone flag
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_standalone BOOLEAN DEFAULT false;

-- Step 11: Mark videos from system series as standalone
UPDATE videos v
SET is_standalone = true,
    series_id = NULL
WHERE series_id IN (
  SELECT id FROM series WHERE name = 'Standalone Videos'
);

-- Step 12: Delete system series for standalone videos
DELETE FROM series WHERE name = 'Standalone Videos';

-- Step 13: Allow series_id to be NULL again
ALTER TABLE videos ALTER COLUMN series_id DROP NOT NULL;

-- ============================================================================
-- PHASE 5: Restore indexes
-- ============================================================================

-- Step 14: Drop new indexes
DROP INDEX IF EXISTS idx_series_workspace_id;
DROP INDEX IF EXISTS idx_workspaces_user_active;
DROP INDEX IF EXISTS idx_series_system;

-- Step 15: Recreate original indexes (if they were different)
CREATE INDEX IF NOT EXISTS idx_videos_project ON videos(project_id);

-- ============================================================================
-- PHASE 6: Restore RLS policies
-- ============================================================================

-- Step 16: Drop workspace policies
DROP POLICY IF EXISTS "Users can view their own workspaces" ON projects;
DROP POLICY IF EXISTS "Users can create workspaces" ON projects;
DROP POLICY IF EXISTS "Users can update their own workspaces" ON projects;
DROP POLICY IF EXISTS "Users can delete their own workspaces" ON projects;

-- Step 17: Recreate original project policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (user_id = auth.uid());

-- Step 18: Enable RLS on project_series
ALTER TABLE project_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project series"
  ON project_series FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage project series"
  ON project_series FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- ============================================================================
-- PHASE 7: Drop new views
-- ============================================================================

-- Step 19: Drop compatibility views
DROP VIEW IF EXISTS projects;
DROP VIEW IF EXISTS workspace_video_counts;

-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually)
-- ============================================================================

-- Verify project_series junction table populated:
-- SELECT COUNT(*) FROM project_series;

-- Verify standalone videos restored:
-- SELECT COUNT(*) FROM videos WHERE is_standalone = true AND series_id IS NULL;

-- Verify project_id populated in videos:
-- SELECT COUNT(*) FROM videos WHERE project_id IS NOT NULL;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Series-First Architecture rollback completed';
  RAISE NOTICE 'Projects restored: %', (SELECT COUNT(*) FROM projects);
  RAISE NOTICE 'Project-Series relationships: %', (SELECT COUNT(*) FROM project_series);
  RAISE NOTICE 'Standalone videos: %', (SELECT COUNT(*) FROM videos WHERE is_standalone = true);
  RAISE NOTICE 'Videos with projects: %', (SELECT COUNT(*) FROM videos WHERE project_id IS NOT NULL);
END $$;
