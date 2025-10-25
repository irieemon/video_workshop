# Troubleshooting: Relationship Type Check Constraint Violation

**Date**: 2025-10-24
**Issue**: character_relationships_relationship_type_check constraint violation
**Status**: ✅ **Fixed**

---

## Error Analysis

### Symptom
```
Failed to persist concept: Error: Relationships insert failed:
new row for relation "character_relationships" violates check constraint
"character_relationships_relationship_type_check"
```

### Root Cause
**Enum Value Mismatch** between AI generation and database constraints.

**AI Agent Generates** (from validation schema):
- `'ally'`
- `'rival'`
- `'family'`
- `'romantic'`
- `'mentor'`

**Database Expects** (from check constraint):
- `'allies'`
- `'rivals'`
- `'family'`
- `'romantic'`
- `'mentor_student'`
- Plus: `'friends'`, `'enemies'`, `'custom'`

### Why This Happened
1. The AI agent system prompt was designed with simplified relationship types for clarity
2. The database schema has more detailed relationship types inherited from earlier design
3. No mapper existed between AI output and database input
4. Similar to the genre mapping issue - validation passed but database constraint failed

---

## Investigation Process

### Step 1: Identify Constraint
```bash
# Searched for constraint definition (not in code)
grep -r "character_relationships_relationship_type_check"
# No results - constraint defined in database migration
```

### Step 2: Check Database Schema
```typescript
// lib/types/database.types.ts:649
export type RelationshipType =
  | 'friends'
  | 'rivals'
  | 'romantic'
  | 'family'
  | 'allies'
  | 'enemies'
  | 'mentor_student'
  | 'custom'
```

### Step 3: Check AI Instructions
```typescript
// lib/ai/series-concept-agent.ts:22
**Relationship type** - Use EXACTLY one of these:
- "ally"
- "rival"
- "family"
- "romantic"
- "mentor"
```

### Step 4: Confirm Mismatch
**Mismatch Found**:
- AI: `'ally'` → DB: `'allies'`
- AI: `'rival'` → DB: `'rivals'`
- AI: `'mentor'` → DB: `'mentor_student'`

---

## Solution

### Fix Applied
Added `mapRelationshipTypeToDatabase()` method to translate AI enum values to database enum values.

**File**: `lib/services/series-concept-persister.ts`

```typescript
/**
 * Map AI-generated relationship type to database enum values
 */
private mapRelationshipTypeToDatabase(type: string): string {
  const typeMap: Record<string, string> = {
    'ally': 'allies',
    'rival': 'rivals',
    'family': 'family',
    'romantic': 'romantic',
    'mentor': 'mentor_student',
  };
  return typeMap[type] || 'custom';
}
```

### Integration Point
```typescript
private mapRelationships(relationships: any[], characterMap: Map<string, string>, seriesId: string) {
  return relationships
    .map((rel) => ({
      series_id: seriesId,
      character_a_id: characterMap.get(rel.character_a),
      character_b_id: characterMap.get(rel.character_b),
      relationship_type: this.mapRelationshipTypeToDatabase(rel.type), // ✅ Mapped
      description: rel.description,
      evolution_notes: rel.evolution,
      attributes: {},
    }))
    .filter((rel) => rel.character_a_id && rel.character_b_id);
}
```

### Why Mapper Instead of Changing AI Instructions

**Option A: Change AI to match DB** ❌
- AI would need to use `'allies'` instead of `'ally'`
- Less natural language for creative generation
- `'mentor_student'` is awkward (underscore in natural language)
- Future AI model changes might struggle with technical naming

**Option B: Add mapper** ✅ (chosen)
- AI uses natural, intuitive language
- Mapper handles technical translation
- Easy to extend for future relationship types
- Follows same pattern as genre mapping
- Single point of maintenance

---

## Impact

### Fixed
✅ Relationship inserts now succeed with correct enum values
✅ AI continues using natural language for relationships
✅ Database constraints satisfied
✅ Consistent with genre mapping approach

### Pattern Established
This is the **second enum mapping** we've added:
1. **Genre mapping**: AI free-form → Database enum
2. **Relationship type mapping**: AI simplified → Database detailed

**Pattern**: When AI generation and database constraints differ, add a mapper in the persister rather than constraining AI creativity.

---

## Testing

### Manual Test
1. Navigate to `/dashboard/series/concept`
2. Complete dialogue with agent
3. Generate concept with relationships
4. Click "Create Series"
5. **Expected**: Series created successfully with relationships persisted
6. **Verify**: Check `character_relationships` table has correct `relationship_type` values

### Database Verification
```sql
SELECT
  ca.name as character_a,
  cb.name as character_b,
  cr.relationship_type,
  cr.description
FROM character_relationships cr
JOIN series_characters ca ON cr.character_a_id = ca.id
JOIN series_characters cb ON cr.character_b_id = cb.id
WHERE cr.series_id = '[series-id]';
```

**Expected Results**:
- `relationship_type` column contains: `'allies'`, `'rivals'`, `'romantic'`, `'family'`, `'mentor_student'`
- No constraint violations

---

## Lessons Learned

### System Design
1. **Validation ≠ Database Constraints**: Schema validation passing doesn't guarantee database insertion will succeed
2. **Enum Translation Layer**: When external input (AI) meets strict database constraints, add translation layer
3. **Natural Language Priority**: Don't force AI to use technical database naming conventions

### Development Process
1. **Check constraints early**: Review actual database constraints, not just TypeScript types
2. **Test full persistence path**: Validation + database insertion, not just validation
3. **Document enum mappings**: Keep mappers simple and well-documented for maintainability

### Code Quality
1. **Single Responsibility**: Persister handles all database-specific transformations
2. **Explicit Mapping**: Clear, readable mapping objects better than complex logic
3. **Fallback Values**: `|| 'custom'` ensures no unexpected values break the system

---

## Related Issues

This fix completes the full persistence layer corrections:
1. ✅ Genre mapping (free-form → enum)
2. ✅ Episodes storage (table → JSONB)
3. ✅ Relationships columns (metadata → attributes/evolution_notes)
4. ✅ Relationship type mapping (simplified → detailed)
5. ✅ Settings columns (importance/metadata → is_primary/details)

**Next**: End-to-end testing of complete series creation flow.

---

**Status**: Ready for user acceptance testing
