# Character Consistency System for Sora Prompts

**Date**: 2025-10-20
**Feature**: Enhanced character profiles for visual and audio consistency across videos
**Status**: 🔄 **IN PROGRESS** - Migration ready, UI pending

---

## Problem Statement

**User Requirement**: "Characters look and sound different from video to video despite uploading visual references"

**Root Cause**: Sora interprets prompts with variation when character descriptions aren't precise and consistent enough.

**Solution**: Create detailed "character fingerprints" that are auto-injected into every prompt, giving Sora strict constraints for consistency.

---

## System Architecture

### 1. Enhanced Character Schema

**New Database Fields**:
```typescript
visual_fingerprint: {
  age: "early 30s",
  ethnicity: "South Asian",
  hair: "shoulder-length wavy black hair",
  eyes: "amber eyes",
  face_shape: "oval",
  distinctive_features: ["dimples"],
  body_type: "slim",
  height: "average",
  default_clothing: "business casual blazer and slacks",
  additional_cues: ["notes from uploaded images"]
}

voice_profile: {
  age_sound: "sounds late 20s",
  accent: "neutral American",
  pitch: "medium",
  tone: "warm",
  pace: "moderate",
  energy: "moderate",
  distinctive_traits: ["slight rasp"]
}

sora_prompt_template: "Emma: early 30s, South Asian, shoulder-length wavy black hair, amber eyes, oval face, slim build, wearing business casual blazer and slacks. Voice: sounds late 20s, neutral American accent, medium pitch, warm tone. Performance: confident, professional demeanor."
```

### 2. Auto-Generated Prompt Templates

**Database Trigger**: Automatically generates `sora_prompt_template` whenever character profiles are updated.

**Template Generation Logic**:
1. Combine all visual fingerprint fields into cohesive description
2. Add voice characteristics
3. Include performance style
4. Create locked template that's injected into every prompt

**Example Output**:
```
Character: Sarah Chen
Description: Early 30s South Asian woman, shoulder-length wavy black hair, amber eyes, oval face with dimples, slim build, average height, wearing business casual blazer and slacks. Voice sounds late 20s with neutral American accent, medium pitch, warm tone, moderate pace and energy, slight rasp. Performance: Confident and professional demeanor with occasional playful moments.
```

### 3. Relationship Context (Phase 1 Complete)

**Basic Implementation**: `interaction_context` field captures:
- `how_they_know`: "college roommates", "coworkers", etc.
- `familiarity_level`: strangers → family
- `communication_style`: formal, casual, professional
- `typical_dynamics`: playful banter, respectful distance

---

## Implementation Status

### ✅ Completed

1. **Migration Script Created**: `supabase-migrations/add-character-consistency-fields.sql`
   - Adds `visual_fingerprint` JSONB column
   - Adds `voice_profile` JSONB column
   - Adds `sora_prompt_template` TEXT column
   - Adds `interaction_context` to relationships table
   - Creates `generate_sora_character_template()` function
   - Creates auto-update trigger for template generation
   - Adds GIN indexes for JSONB fields

2. **TypeScript Types**: `lib/types/character-consistency.ts`
   - `VisualFingerprint` interface (detailed level)
   - `VoiceProfile` interface
   - `InteractionContext` interface
   - `CharacterWithConsistency` type
   - Helper functions for prompt generation

3. **Documentation**: This file!

### 🔄 In Progress

4. **Character Manager UI Enhancement** (Next Step)
   - Form fields for all visual fingerprint attributes
   - Form fields for voice profile
   - Visual reference upload integration
   - Preview of generated Sora prompt template
   - Save/update functionality

5. **Roundtable API Integration** (After UI)
   - Fetch selected characters with fingerprints
   - Auto-inject character templates into prompts
   - Lock character descriptions during agent discussion
   - Add relationship context when multiple characters

### 📋 Planned

6. **Relationship Manager Enhancement**
   - UI for editing interaction context
   - Relationship dynamics in prompts

7. **Visual-to-Text Pipeline** (Future)
   - Use vision AI to analyze uploaded images
   - Auto-populate visual fingerprint from images
   - Suggest improvements to descriptions

---

## Migration Instructions

### Step 1: Run Migration

```bash
# Open Supabase Studio SQL Editor
# Paste contents of: supabase-migrations/add-character-consistency-fields.sql
# Execute the migration
```

**Expected Output**:
```
Character consistency migration completed!
```

### Step 2: Verify Migration

```sql
-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'series_characters'
AND column_name IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template');

-- Should return 3 rows
```

### Step 3: Test Template Generation

```sql
-- Update a character with test data
UPDATE series_characters
SET
  visual_fingerprint = '{
    "age": "early 30s",
    "ethnicity": "South Asian",
    "hair": "shoulder-length wavy black hair",
    "eyes": "amber eyes",
    "face_shape": "oval",
    "body_type": "slim",
    "default_clothing": "business casual blazer"
  }'::jsonb,
  voice_profile = '{
    "age_sound": "sounds late 20s",
    "accent": "neutral American",
    "pitch": "medium",
    "tone": "warm"
  }'::jsonb
WHERE id = 'YOUR_CHARACTER_ID';

-- Check generated template
SELECT name, sora_prompt_template
FROM series_characters
WHERE id = 'YOUR_CHARACTER_ID';
```

---

## Usage Workflow

### For Users

1. **Create/Edit Character**:
   - Fill out detailed visual fingerprint form
   - Specify voice characteristics
   - Upload reference image (stores URL)
   - Preview auto-generated Sora template

2. **Create Video with Character**:
   - Select series
   - Select characters to appear
   - System auto-injects character templates into prompt
   - Sora receives consistent, detailed character descriptions

3. **Maintain Consistency**:
   - Character templates are locked once created
   - Any updates to visual/voice profiles regenerate template
   - All future videos use updated template

### For Developers

**Fetching Character with Fingerprint**:
```typescript
const { data: character } = await supabase
  .from('series_characters')
  .select('*, visual_fingerprint, voice_profile, sora_prompt_template')
  .eq('id', characterId)
  .single()
```

**Using in Prompts**:
```typescript
import { generateCharacterPromptBlock } from '@/lib/types/character-consistency'

const characterBlock = generateCharacterPromptBlock(character)
// Returns: "Sarah: early 30s, South Asian, shoulder-length..."

const fullPrompt = `
${characterBlock}

[User's video brief here]

[Scene description]
`
```

---

## Files Modified/Created

### Database
1. `supabase-migrations/add-character-consistency-fields.sql` - Migration script

### Types
2. `lib/types/character-consistency.ts` - TypeScript interfaces and helpers

### Documentation
3. `claudedocs/character-consistency-system.md` - This file

### Pending (Next Steps)
4. Enhanced character manager UI component
5. Roundtable API integration for auto-injection
6. Series context selector updates

---

## Benefits

### For Users
- ✅ **Consistent Characters**: Same appearance and voice across all videos
- ✅ **Detailed Control**: Precise control over every aspect of character
- ✅ **Time Saving**: Set once, use everywhere automatically
- ✅ **Quality**: Professional-grade character consistency

### For Sora
- ✅ **Clear Constraints**: Detailed descriptions reduce interpretation variance
- ✅ **Structured Input**: Consistent format helps AI understand requirements
- ✅ **Reference Anchoring**: Locked templates provide stable baseline

### For System
- ✅ **Scalable**: Works for any number of characters/series
- ✅ **Maintainable**: Auto-generation via triggers reduces manual work
- ✅ **Flexible**: Easy to extend with new fields as Sora capabilities evolve

---

## Next Implementation Phase

**Ready to build**: Character Manager UI Enhancement

**Scope**:
1. Create detailed form component for visual fingerprint
2. Create voice profile form component
3. Add reference image upload with preview
4. Show real-time Sora template preview
5. Integrate with existing character manager

**Estimated effort**: 2-3 hours
**Blocker**: Migration must be run first

---

**Last Updated**: 2025-10-20
**Version**: 1.0
**Status**: Ready for migration
