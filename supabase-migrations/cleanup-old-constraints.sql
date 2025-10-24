-- Cleanup Script: Remove Old Constraints from Failed Migration Attempts
--
-- Run this BEFORE running the decouple-series-from-projects.sql migration
-- if you previously attempted to run the migration and it failed.
--
-- This removes any partially-created constraints that might conflict.

-- Drop problematic CHECK constraints if they exist
ALTER TABLE public.series DROP CONSTRAINT IF EXISTS series_project_same_user;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS project_default_series_same_user;

-- Verify constraints are removed
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN ('public.series'::regclass, 'public.projects'::regclass)
AND contype = 'c';  -- c = CHECK constraint

-- Expected output: Only valid CHECK constraints should remain
-- For videos table: videos_must_have_project_or_series
