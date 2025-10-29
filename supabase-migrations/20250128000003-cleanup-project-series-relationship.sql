-- ============================================================================
-- Migration: Cleanup Project-Series Relationship
-- Date: 2025-01-28
-- Phase: 1.3 - Database Schema Unification
--
-- Purpose: Remove series.project_id column and rely exclusively on
--          project_series junction table for many-to-many relationships.
--          This clarifies that projects are portfolios that can contain
--          multiple series, and series can belong to multiple projects.
-- ============================================================================

-- Step 1: Migrate any existing series.project_id relationships to project_series junction table
-- This ensures we don't lose any existing associations
INSERT INTO project_series (project_id, series_id, display_order, created_at)
SELECT
  s.project_id,
  s.id as series_id,
  0 as display_order, -- Default order, can be updated later
  NOW() as created_at
FROM series s
WHERE s.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_series ps
    WHERE ps.project_id = s.project_id
      AND ps.series_id = s.id
  )
ON CONFLICT (project_id, series_id) DO NOTHING;

-- Step 2: Drop the foreign key constraint on series.project_id
ALTER TABLE series
DROP CONSTRAINT IF EXISTS series_project_id_fkey;

-- Step 3: Drop the project_id column from series table
ALTER TABLE series
DROP COLUMN IF EXISTS project_id CASCADE;

-- Step 4: Drop the default_series_id column from projects table
-- (This was a circular reference that created confusion)
ALTER TABLE projects
DROP COLUMN IF EXISTS default_series_id CASCADE;

-- Step 5: Add display_order to project_series if it doesn't exist
-- (This allows users to organize series within projects)
ALTER TABLE project_series
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Step 6: Create function to auto-increment display_order for new series in projects
CREATE OR REPLACE FUNCTION auto_increment_series_display_order()
RETURNS TRIGGER AS $$
BEGIN
  -- If display_order is not set, auto-increment based on existing series in project
  IF NEW.display_order IS NULL OR NEW.display_order = 0 THEN
    SELECT COALESCE(MAX(display_order), 0) + 1
    INTO NEW.display_order
    FROM project_series
    WHERE project_id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for auto-incrementing display_order
DROP TRIGGER IF EXISTS trigger_auto_increment_series_display_order ON project_series;
CREATE TRIGGER trigger_auto_increment_series_display_order
  BEFORE INSERT ON project_series
  FOR EACH ROW
  EXECUTE FUNCTION auto_increment_series_display_order();

-- Step 8: Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_project_series_project_order ON project_series(project_id, display_order);
CREATE INDEX IF NOT EXISTS idx_project_series_series_id ON project_series(series_id);

-- Step 9: Create view for projects with their series
CREATE OR REPLACE VIEW projects_with_series AS
SELECT
  p.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', s.id,
        'name', s.name,
        'description', s.description,
        'genre', s.genre,
        'display_order', ps.display_order,
        'created_at', s.created_at,
        'updated_at', s.updated_at
      ) ORDER BY ps.display_order, s.created_at DESC
    ) FILTER (WHERE s.id IS NOT NULL),
    '[]'::json
  ) as series
FROM projects p
LEFT JOIN project_series ps ON ps.project_id = p.id
LEFT JOIN series s ON s.id = ps.series_id
GROUP BY p.id;

COMMENT ON VIEW projects_with_series IS 'Projects with their associated series (ordered by display_order)';

-- Step 10: Create view for series with their projects
CREATE OR REPLACE VIEW series_with_projects AS
SELECT
  s.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'created_at', p.created_at
      ) ORDER BY p.created_at DESC
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'::json
  ) as projects,
  COUNT(p.id) as project_count
FROM series s
LEFT JOIN project_series ps ON ps.series_id = s.id
LEFT JOIN projects p ON p.id = ps.project_id
GROUP BY s.id;

COMMENT ON VIEW series_with_projects IS 'Series with their associated projects';

-- Step 11: Create helper function to associate series with project
CREATE OR REPLACE FUNCTION associate_series_with_project(
  p_project_id UUID,
  p_series_id UUID,
  p_display_order INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_association_id UUID;
BEGIN
  INSERT INTO project_series (project_id, series_id, display_order)
  VALUES (p_project_id, p_series_id, p_display_order)
  ON CONFLICT (project_id, series_id) DO UPDATE
    SET display_order = COALESCE(EXCLUDED.display_order, project_series.display_order)
  RETURNING id INTO v_association_id;

  RETURN v_association_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION associate_series_with_project IS 'Helper function to associate a series with a project';

-- Step 12: Create helper function to remove series from project
CREATE OR REPLACE FUNCTION remove_series_from_project(
  p_project_id UUID,
  p_series_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM project_series
  WHERE project_id = p_project_id
    AND series_id = p_series_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION remove_series_from_project IS 'Helper function to remove a series from a project';

-- Step 13: Update series table comment
COMMENT ON TABLE series IS 'Content series - can belong to zero or more projects via project_series junction table. Series are standalone entities that define characters, settings, and visual style.';

-- Step 14: Update project_series table comment
COMMENT ON TABLE project_series IS 'Many-to-many junction table linking projects and series. A series can belong to multiple projects (portfolio organization), and a project can contain multiple series.';
