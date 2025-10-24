# Cleanup Checklist - 2025-10-23

Quick reference for cleaning up the workspace after this extensive development session.

## Immediate Actions

### 1. Git Workflow (Critical)
```bash
# ⚠️ FIRST: Create feature branch to get work off main
git checkout -b feature/character-consistency-streaming-integration

# Review what's being moved
git status

# Stage changes in logical groups (see commit strategy below)
```

### 2. Root Directory Cleanup

**Delete These (Temporary/Duplicates)**:
- [ ] `server.log` (add to .gitignore first)
- [ ] `verify-db-columns.sql` (if not needed)
- [ ] `check-db-state.js` (if not needed, or move to scripts/)

**Consolidate These into claudedocs/**:
- [ ] Review `APPLY-FIX-TO-PRODUCTION.md` - merge into session docs if duplicate
- [ ] Review `COMPREHENSIVE-ERROR-ANALYSIS.md` - merge into session docs if duplicate
- [ ] Review `CRITICAL-DIAGNOSIS.md` - merge into session docs if duplicate
- [ ] Review `DECOUPLED_MODEL.md` - keep if architectural doc, or merge
- [ ] Review `FINAL-SOLUTION.md` - merge into session docs if duplicate
- [ ] Review `IMPLEMENTATION_SUMMARY.md` - merge into session docs if duplicate

### 3. Update .gitignore

Add if not present:
```
# Logs
server.log
*.log

# Database dumps and diagnostic scripts
verify-db-columns.sql
check-db-state.js

# Temporary scripts
run-*.sh
```

### 4. Migration Files Organization

```bash
# Review what's in archive
ls -la supabase-migrations/archive-2025-10-23/

# Keep active migrations, ensure they're documented
# Consider consolidating diagnostic queries into a single file
```

---

## Commit Strategy

Break the changes into logical commits:

### Commit 1: Database optimizations
```bash
git add supabase-migrations/optimize-rls-performance.sql
git add supabase-migrations/fix-function-search-path-security.sql
git commit -m "perf: optimize RLS policies and fix function security

- Optimize RLS policies for better query performance
- Fix function search_path security vulnerabilities
- Add performance monitoring queries"
```

### Commit 2: Series decoupling
```bash
git add supabase-migrations/decouple-series-from-projects.sql
git add supabase-migrations/create-series-assets-bucket.sql
git add app/api/series/route.ts
git add components/series/create-series-dialog.tsx
git commit -m "feat: decouple series from projects for independent management

- Allow series creation without project requirement
- Add series assets storage bucket
- Create dedicated series API route
- Add series creation dialog component"
```

### Commit 3: Character consistency system
```bash
git add supabase-migrations/add-character-consistency-fields.sql
git add supabase-migrations/add-skin-tone-*.sql
git add components/series/character-consistency-form.tsx
git add components/series/character-visual-cues.tsx
git add lib/types/character-consistency.ts
git add lib/ai/vision-analysis.ts
git add app/api/series/[seriesId]/characters/[characterId]/analyze-image/
git add app/api/series/[seriesId]/characters/[characterId]/upload-visual-cue/
git commit -m "feat: add character visual consistency tracking system

- Add character consistency fields (skin tone, visual cues)
- Implement AI-powered image analysis for character verification
- Create visual cue upload and management interface
- Add character consistency validation form"
```

### Commit 4: Character relationships
```bash
git add supabase-migrations/add-character-relationships.sql
git add components/series/relationship-*.tsx
git add app/api/series/[seriesId]/relationships/
git commit -m "feat: add character relationships management

- Create character relationships schema
- Build relationship graph visualization
- Add relationship CRUD operations
- Implement relationship manager UI"
```

### Commit 5: Streaming AI collaboration
```bash
git add app/api/agent/roundtable/stream/
git add components/agents/streaming-roundtable*.tsx
git add lib/ai/agent-orchestrator-stream.ts
git commit -m "feat: implement streaming AI collaboration interface

- Add streaming API endpoint for agent roundtable
- Create real-time streaming UI components
- Enhance agent orchestrator with streaming support
- Improve user experience with live collaboration updates"
```

### Commit 6: Ultra-detailed prompts
```bash
git add lib/ai/ultra-detailed-prompt-template.ts
# Add any related prompt generation updates
git commit -m "feat: enhance prompt generation with ultra-detailed templates

- Create comprehensive prompt template system
- Improve shot list generation quality
- Add detailed specification support"
```

### Commit 7: Sora settings
```bash
git add supabase-migrations/add-sora-settings-to-series.sql
git add components/series/sora-settings-manager.tsx
git add app/api/series/[seriesId]/sora-settings/
git commit -m "feat: add Sora-specific settings at series level

- Add Sora settings schema to series
- Create settings management interface
- Implement settings API endpoints"
```

### Commit 8: Voice integration fixes
```bash
git add supabase-migrations/fix-character-template-trigger.sql
git add supabase-migrations/fix-column-types.sql
# Add any related voice fixes
git commit -m "fix: resolve voice profile persistence issues

- Fix character template trigger for voice data
- Correct column types in series_characters table
- Verify voice profile storage and retrieval
- Add diagnostic queries for troubleshooting"
```

### Commit 9: API route updates
```bash
git add app/api/projects/
git add app/api/videos/
git add app/api/agent/roundtable/advanced/route.ts
git add app/api/agent/roundtable/route.ts
git commit -m "refactor: update API routes for new features

- Update projects API for series integration
- Enhance videos API with new metadata
- Improve agent roundtable endpoints"
```

### Commit 10: Dashboard & UI updates
```bash
git add app/dashboard/
git add components/series/character-manager.tsx
git add components/agents/agent-roundtable.tsx
git add components/videos/prompt-output.tsx
git add components/series/index.ts
git add components/ui/tabs.tsx
git commit -m "feat: update dashboard and components for new features

- Update dashboard pages for series management
- Enhance character manager with consistency features
- Improve agent roundtable UI
- Update video prompt display"
```

### Commit 11: Configuration & dependencies
```bash
git add next.config.ts
git add package*.json
git add lib/types/database.types.ts
git commit -m "chore: update configuration and dependencies

- Update Next.js configuration
- Add new dependencies for features
- Update database type definitions"
```

### Commit 12: Documentation
```bash
git add claudedocs/
git commit -m "docs: add session documentation and analysis

- Add session summaries for 2025-10-23 work
- Document character consistency system
- Add performance and security analysis
- Include troubleshooting guides"
```

---

## Verification Steps

### After Each Commit
```bash
# Ensure TypeScript compiles
npx tsc --noEmit

# Run linter
npm run lint

# Quick test run
npm run test -- --passWithNoTests
```

### After All Commits
```bash
# Full test suite
npm run test:ci

# Build verification
npm run build

# E2E tests if applicable
npm run test:e2e
```

---

## Final Cleanup Tasks

- [ ] Remove temporary scripts from root
- [ ] Update .gitignore for logs and temp files
- [ ] Consolidate duplicate documentation
- [ ] Archive old migration files
- [ ] Run full test suite
- [ ] Update ARCHITECTURE.md with new systems
- [ ] Update PRD.md with completed features
- [ ] Create PR description from session save doc

---

## Estimated Time

- **Git workflow setup**: 10 minutes
- **Root directory cleanup**: 15 minutes
- **Commit creation** (12 commits): 60-90 minutes
- **Testing & verification**: 30 minutes
- **Documentation updates**: 30 minutes

**Total**: 2.5-3 hours

---

## Notes

- This is a LARGE amount of changes to commit at once
- Consider getting code review before merging to main
- May want to split into multiple PRs by feature area
- Ensure staging deployment before production
- Consider feature flags for gradual rollout

---

**Created**: 2025-10-23
**For Session**: Comprehensive character consistency & streaming integration
**Priority**: High - Get work off main branch ASAP
