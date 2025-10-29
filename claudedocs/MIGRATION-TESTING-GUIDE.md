# Phase 1 Migration Testing Guide

**Purpose**: Step-by-step guide for testing database schema migrations safely before production deployment.

**Date**: January 28, 2025
**Phase**: 1 - Database Schema Unification

---

## Prerequisites

### Required Tools
- [ ] Local Supabase instance running (`npx supabase start`)
- [ ] PostgreSQL client (psql) or Supabase Studio
- [ ] Application development environment (Node.js, npm)
- [ ] Git repository with uncommitted changes (for rollback)

### Backup Strategy
- [ ] Create full database dump before migrations
- [ ] Document current record counts for all tables
- [ ] Export critical series_episodes data to CSV
- [ ] Commit all code changes to feature branch

---

## Testing Environment Setup

### 1. Create Test Database Snapshot

```bash
# Stop any running instances
npx supabase stop

# Start fresh Supabase instance
npx supabase start

# Optionally seed with test data
npx supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/postgres
```

### 2. Verify Initial State

```sql
-- Connect to local database
psql postgresql://postgres:postgres@localhost:54322/postgres

-- Check table counts
SELECT 'projects' as table_name, COUNT(*) as count FROM projects
UNION ALL
SELECT 'series', COUNT(*) FROM series
UNION ALL
SELECT 'episodes', COUNT(*) FROM episodes
UNION ALL
SELECT 'series_episodes', COUNT(*) FROM series_episodes
UNION ALL
SELECT 'videos', COUNT(*) FROM videos
UNION ALL
SELECT 'project_series', COUNT(*) FROM project_series;

-- Verify series_episodes exists
\d series_episodes

-- Check for project-series relationships
SELECT COUNT(*) FROM series WHERE project_id IS NOT NULL;
SELECT COUNT(*) FROM projects WHERE default_series_id IS NOT NULL;
```

**Document these counts** - you'll verify against them after migration.

---

## Migration Execution

### Step 1: Run Migration 20250128000001 (Unify Episodes)

```bash
# Execute first migration
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase-migrations/20250128000001-unify-episodes-table.sql
```

**Verify**:
```sql
-- Check new columns added to episodes
\d episodes

-- Verify columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'episodes'
AND column_name IN ('story_beat', 'emotional_arc', 'characters_used', 'settings_used', 'timeline_position', 'is_key_episode');

-- Check episode_video_mapping created
SELECT COUNT(*) FROM episode_video_mapping;

-- Verify no data loss
SELECT COUNT(*) FROM episodes;
```

**Expected Results**:
- ✅ 8 new columns added to episodes table
- ✅ episode_video_mapping table created
- ✅ Episode count unchanged or increased (series_episodes merged)
- ✅ No errors in migration output

---

### Step 2: Run Migration 20250128000002 (Update Videos Schema)

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase-migrations/20250128000002-update-videos-schema.sql
```

**Verify**:
```sql
-- Check is_standalone column added
\d videos

-- Verify trigger created
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_auto_populate_video_series_id';

-- Check views created
\dv

-- Test auto-population trigger
-- Create test episode
INSERT INTO episodes (series_id, user_id, season_number, episode_number, title)
VALUES (
  (SELECT id FROM series LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  1, 999, 'Test Episode'
) RETURNING id AS test_episode_id \gset

-- Create video with episode_id
INSERT INTO videos (user_id, episode_id, title, user_brief, agent_discussion, detailed_breakdown, optimized_prompt, character_count)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  :'test_episode_id',
  'Test Video',
  'Test brief',
  '{"round1":[],"round2":[]}'::jsonb,
  '{"scene_structure":"","visual_specs":"","audio":"","platform_optimization":"","hashtags":[]}'::jsonb,
  'Test prompt',
  0
) RETURNING id AS test_video_id, series_id \gset

-- Verify series_id was auto-populated
SELECT id, episode_id, series_id, is_standalone FROM videos WHERE id = :'test_video_id';
-- Expected: series_id should match the series_id from test_episode

-- Cleanup test data
DELETE FROM videos WHERE id = :'test_video_id';
DELETE FROM episodes WHERE id = :'test_episode_id';
```

**Expected Results**:
- ✅ is_standalone column added to videos
- ✅ Trigger auto-populates series_id from episode
- ✅ views_with_context view created
- ✅ Helper function video_has_series_context exists

---

### Step 3: Run Migration 20250128000003 (Cleanup Project-Series)

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase-migrations/20250128000003-cleanup-project-series-relationship.sql
```

**Verify**:
```sql
-- Check series.project_id removed
\d series
-- Expected: project_id column should NOT exist

-- Check projects.default_series_id removed
\d projects
-- Expected: default_series_id column should NOT exist

-- Verify project_series has display_order
\d project_series
-- Expected: display_order column exists

-- Check project-series relationships migrated
SELECT COUNT(*) FROM project_series;

-- Verify views created
SELECT * FROM projects_with_series LIMIT 1;
SELECT * FROM series_with_projects LIMIT 1;

-- Test helper function
SELECT associate_series_with_project(
  (SELECT id FROM projects LIMIT 1),
  (SELECT id FROM series LIMIT 1),
  1
);
```

**Expected Results**:
- ✅ series.project_id column removed
- ✅ projects.default_series_id column removed
- ✅ display_order added to project_series
- ✅ All series-project relationships preserved in junction table
- ✅ Views and helper functions work correctly

---

### Step 4: Run Migration 20250128000004 (Drop series_episodes)

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase-migrations/20250128000004-drop-series-episodes-table.sql
```

**Verify**:
```sql
-- Verify series_episodes table dropped
\dt series_episodes
-- Expected: table does not exist

-- Verify backup created
SELECT COUNT(*) FROM series_episodes_backup;

-- Check migration_history
SELECT * FROM migration_history WHERE migration_name LIKE '%20250128%';

-- Verify episodes table has all data
SELECT COUNT(*) FROM episodes;

-- Check videos.episode_id references valid
SELECT COUNT(*) FROM videos v
WHERE v.episode_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM episodes WHERE id = v.episode_id);
-- Expected: 0 (no invalid references)
```

**Expected Results**:
- ✅ series_episodes table dropped
- ✅ series_episodes_backup created
- ✅ migration_history tracking created
- ✅ No orphaned video references
- ✅ Final verification report shows correct counts

---

## Data Integrity Verification

### Comprehensive Data Checks

```sql
-- 1. Verify all episodes have required fields
SELECT COUNT(*) FROM episodes
WHERE series_id IS NULL OR user_id IS NULL OR season_number IS NULL OR episode_number IS NULL;
-- Expected: 0

-- 2. Verify unique constraint on (series_id, season_number, episode_number)
SELECT series_id, season_number, episode_number, COUNT(*)
FROM episodes
GROUP BY series_id, season_number, episode_number
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)

-- 3. Verify videos with episodes have series_id populated
SELECT COUNT(*) FROM videos
WHERE episode_id IS NOT NULL AND series_id IS NULL;
-- Expected: 0

-- 4. Verify standalone videos are properly marked
SELECT COUNT(*) FROM videos
WHERE is_standalone = true AND (episode_id IS NOT NULL OR series_id IS NOT NULL);
-- Expected: 0 (standalone videos shouldn't have episode/series)

-- 5. Verify project_series relationships
SELECT p.name, COUNT(ps.series_id) as series_count
FROM projects p
LEFT JOIN project_series ps ON ps.project_id = p.id
GROUP BY p.id, p.name
ORDER BY series_count DESC;
-- Expected: Counts should match pre-migration state

-- 6. Check foreign key integrity
SELECT
  'episodes → series' as relationship,
  COUNT(*) as orphaned
FROM episodes e
WHERE NOT EXISTS (SELECT 1 FROM series WHERE id = e.series_id)
UNION ALL
SELECT
  'videos → episodes',
  COUNT(*)
FROM videos v
WHERE v.episode_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM episodes WHERE id = v.episode_id)
UNION ALL
SELECT
  'project_series → projects',
  COUNT(*)
FROM project_series ps
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE id = ps.project_id)
UNION ALL
SELECT
  'project_series → series',
  COUNT(*)
FROM project_series ps
WHERE NOT EXISTS (SELECT 1 FROM series WHERE id = ps.series_id);
-- Expected: All counts should be 0
```

---

## Application Integration Testing

### 1. Update Application Code

**Before running the application**, ensure TypeScript types are updated (already done):
- [x] lib/types/database.types.ts - Updated with new schema

### 2. Start Development Server

```bash
npm run dev
```

### 3. Test Core Workflows

#### Test 1: Series Creation
- [ ] Navigate to /dashboard/series
- [ ] Create new series
- [ ] Verify series saved without project_id
- [ ] Check database: `SELECT * FROM series ORDER BY created_at DESC LIMIT 1;`

#### Test 2: Project-Series Association
- [ ] Navigate to /dashboard/projects/[id]
- [ ] Associate existing series with project
- [ ] Verify junction table: `SELECT * FROM project_series WHERE project_id = '<project-id>';`
- [ ] Verify display_order auto-incremented

#### Test 3: Episode Creation
- [ ] Navigate to series detail page
- [ ] Create new episode
- [ ] Verify new metadata fields saved:
  ```sql
  SELECT id, title, story_beat, emotional_arc, characters_used, settings_used
  FROM episodes
  ORDER BY created_at DESC LIMIT 1;
  ```

#### Test 4: Video Creation from Episode
- [ ] Navigate to episode detail
- [ ] Generate video from episode
- [ ] Verify series_id auto-populated:
  ```sql
  SELECT id, episode_id, series_id, is_standalone
  FROM videos
  ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify is_standalone = false

#### Test 5: Standalone Video Creation
- [ ] Create video without episode
- [ ] Verify is_standalone = true
- [ ] Verify episode_id and series_id are NULL

#### Test 6: AI Agent Context
- [ ] Create video from episode with characters/settings
- [ ] Verify agent roundtable receives series context
- [ ] Check agent_discussion contains character/setting references

### 4. API Route Testing

```bash
# Test agent roundtable with series context
curl -X POST http://localhost:3000/api/agent/roundtable \
  -H "Content-Type: application/json" \
  -d '{
    "brief": "Test video with series context",
    "platform": "tiktok",
    "seriesId": "<series-id>",
    "selectedCharacters": ["<character-id>"],
    "selectedSettings": ["<setting-id>"]
  }'

# Verify response includes character/setting data in agent responses
```

---

## Performance Testing

### Index Verification

```sql
-- Check indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('episodes', 'videos', 'project_series')
ORDER BY tablename, indexname;

-- Verify index usage
EXPLAIN ANALYZE
SELECT * FROM episodes WHERE series_id = '<some-uuid>';

EXPLAIN ANALYZE
SELECT * FROM videos WHERE episode_id = '<some-uuid>' AND series_id = '<some-uuid>';
```

**Expected**:
- ✅ Indexes exist for all foreign keys
- ✅ GIN indexes for array fields (characters_used, settings_used)
- ✅ Query plans use indexes (Index Scan, not Seq Scan)

---

## Rollback Testing (Optional but Recommended)

### Test Rollback Script

**Warning**: This will revert all migrations. Only test if you have good backups.

```bash
# On a separate test database instance
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase-migrations/rollback-20250128-schema-changes.sql
```

**Verify Rollback**:
```sql
-- series_episodes should exist again
\dt series_episodes

-- series.project_id should exist
\d series

-- New columns should be removed from episodes
\d episodes

-- is_standalone should be removed from videos
\d videos
```

**After verifying rollback works**:
- Re-run migrations to get back to new schema
- OR restore from backup and start fresh

---

## Production Deployment Checklist

Before deploying to production:

### Pre-Deployment
- [ ] All test scenarios pass in local environment
- [ ] Data integrity checks show 0 orphaned records
- [ ] Application integration tests pass
- [ ] Performance tests show acceptable query times
- [ ] Rollback script tested and verified working
- [ ] Full database backup created
- [ ] Deployment plan documented with rollback procedures

### Deployment Steps
- [ ] **Maintenance Window**: Schedule downtime (estimated 15-30 min)
- [ ] **Backup**: Create full production database backup
- [ ] **Export**: Export series_episodes table to CSV (extra safety)
- [ ] **Record Counts**: Document current record counts for verification
- [ ] **Run Migrations**: Execute all 4 migrations in sequence
- [ ] **Verify**: Run data integrity SQL checks
- [ ] **Deploy Code**: Update application with new TypeScript types
- [ ] **Smoke Test**: Test critical user workflows
- [ ] **Monitor**: Watch logs and error reporting for 24 hours

### Post-Deployment
- [ ] Verify record counts match pre-migration
- [ ] Test series creation workflow
- [ ] Test episode creation workflow
- [ ] Test video generation from episodes
- [ ] Verify AI agents receive full series context
- [ ] Monitor application logs for errors
- [ ] Keep series_episodes_backup for 7 days before deletion

---

## Troubleshooting

### Common Issues

#### Issue: Migration fails on Step 1
**Symptoms**: Error about duplicate keys or foreign key violations
**Solution**:
```sql
-- Check for duplicate episodes
SELECT series_id, season_number, episode_number, COUNT(*)
FROM episodes
GROUP BY series_id, season_number, episode_number
HAVING COUNT(*) > 1;

-- Manually resolve duplicates before re-running
```

#### Issue: Trigger doesn't auto-populate series_id
**Symptoms**: Videos have NULL series_id even with episode_id set
**Solution**:
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_populate_video_series_id';

-- Manually populate for existing videos
UPDATE videos v
SET series_id = e.series_id
FROM episodes e
WHERE v.episode_id = e.id AND v.series_id IS NULL;
```

#### Issue: Series references lost after project_id removal
**Symptoms**: Series don't appear in projects
**Solution**:
```sql
-- Check project_series junction table
SELECT COUNT(*) FROM project_series;

-- Verify migration 3 ran completely
SELECT * FROM migration_history WHERE migration_name LIKE '%cleanup-project%';

-- Re-run migration 3 if needed
```

#### Issue: Application errors after TypeScript update
**Symptoms**: Type errors, undefined properties
**Solution**:
1. Clear Next.js cache: `rm -rf .next`
2. Restart dev server: `npm run dev`
3. Verify database.types.ts matches new schema
4. Check for hardcoded references to removed fields

---

## Success Criteria

Migration is considered successful if:

- ✅ All 4 migrations execute without errors
- ✅ Zero orphaned records (all foreign keys valid)
- ✅ Record counts preserved (or increased for merged tables)
- ✅ Application starts without errors
- ✅ All core workflows function correctly
- ✅ AI agents receive full series context
- ✅ Performance is acceptable (no slow queries)
- ✅ Rollback script works (tested in separate environment)

---

## Next Steps After Successful Migration

1. **Phase 2: UI/UX Restructuring**
   - Update navigation for series-first workflow
   - Create episode → video generation UI
   - Consolidate redundant pages

2. **Phase 3: API Updates**
   - Update agent orchestrator to guarantee context flow
   - Simplify video creation API
   - Implement automatic series context injection

3. **Documentation Updates**
   - Update API documentation
   - Create user guide for new workflow
   - Update developer onboarding docs

4. **Cleanup**
   - After 7 days: Drop series_episodes_backup table
   - Archive migration scripts
   - Update ARCHITECTURE.md with new schema

---

## Support

If you encounter issues during migration:

1. **Check Logs**: Review migration output for specific errors
2. **Verify Prerequisites**: Ensure all tools and backups in place
3. **Consult Documentation**: Review DATABASE-SCHEMA-MIGRATION-2025-01-28.md
4. **Rollback if Needed**: Use rollback script to restore previous state
5. **Report Issues**: Document errors for troubleshooting

**Emergency Rollback**:
```bash
# Restore from backup immediately
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase-migrations/rollback-20250128-schema-changes.sql
```

---

**Testing Status**: ⏳ Awaiting Execution
**Last Updated**: 2025-01-28
**Next Review**: After local testing complete
