# Character Consistency - Remaining Implementation Steps

**Current Status**: Foundation complete, database types updated ✅
**Remaining Work**: 3-4 hours total

---

## ✅ Completed

1. Database migration (all fields added, trigger working)
2. TypeScript types for consistency (`lib/types/character-consistency.ts`)
3. UI form component (`components/series/character-consistency-form.tsx`)
4. Database types updated (`lib/types/database.types.ts`)
5. Complete documentation

---

## 🔄 Step 1: Integrate Form into Character Manager (1-2 hours)

### File: `components/series/character-manager.tsx`

**Changes needed**:

1. **Import consistency form**:
```typescript
import { CharacterConsistencyForm } from './character-consistency-form'
import type { VisualFingerprint, VoiceProfile } from '@/lib/types/character-consistency'
```

2. **Add state for fingerprints**:
```typescript
const [formData, setFormData] = useState<{
  name: string
  description: string
  role: CharacterRole
  performance_style: string
  visual_fingerprint: Partial<VisualFingerprint>  // ADD THIS
  voice_profile: Partial<VoiceProfile>             // ADD THIS
}>({
  name: '',
  description: '',
  role: 'supporting',
  performance_style: '',
  visual_fingerprint: {},  // ADD THIS
  voice_profile: {}        // ADD THIS
})
```

3. **Add fingerprint handler**:
```typescript
const handleConsistencyChange = (data: {
  visualFingerprint: Partial<VisualFingerprint>
  voiceProfile: Partial<VoiceProfile>
}) => {
  setFormData(prev => ({
    ...prev,
    visual_fingerprint: data.visualFingerprint,
    voice_profile: data.voiceProfile
  }))
}
```

4. **Add form to dialog** (after performance_style field):
```tsx
<CharacterConsistencyForm
  visualFingerprint={formData.visual_fingerprint}
  voiceProfile={formData.voice_profile}
  generatedTemplate={null}  // Will show preview after save
  onChange={handleConsistencyChange}
/>
```

5. **Update submit to include fingerprints**:
```typescript
const handleSubmit = async () => {
  // ... existing code ...
  const payload = {
    series_id: seriesId,
    name: formData.name,
    description: formData.description,
    role: formData.role,
    performance_style: formData.performance_style,
    visual_fingerprint: formData.visual_fingerprint,  // ADD THIS
    voice_profile: formData.voice_profile              // ADD THIS
  }
  // ... rest of submit logic
}
```

---

## 🔄 Step 2: Update Character API (30 min)

### File: `app/api/series/[seriesId]/characters/route.ts`

**POST handler changes**:
```typescript
const body = await request.json()
const {
  name,
  description,
  role,
  performance_style,
  visual_fingerprint,  // ADD THIS
  voice_profile         // ADD THIS
} = body

const { data, error } = await supabase
  .from('series_characters')
  .insert({
    series_id: seriesId,
    name,
    description,
    role,
    performance_style,
    visual_fingerprint,  // ADD THIS
    voice_profile         // ADD THIS
  })
  .select('*, visual_fingerprint, voice_profile, sora_prompt_template')  // Fetch template
  .single()
```

**Update GET to fetch new fields**:
```typescript
.select('*, visual_fingerprint, voice_profile, sora_prompt_template')
```

---

## 🔄 Step 3: Update Series Detail Page (10 min)

### File: `app/dashboard/projects/[id]/series/[seriesId]/page.tsx`

**Update query to fetch fingerprints**:
```typescript
// Line 20-32
const { data: series, error } = await supabase
  .from('series')
  .select(`
    *,
    project:projects!series_project_id_fkey(id, name),
    characters:series_characters(*, visual_fingerprint, voice_profile, sora_prompt_template),
    settings:series_settings(*)
  `)
  .eq('id', seriesId)
  .eq('project_id', projectId)
  .single()
```

---

## 🔄 Step 4: Roundtable API Integration (1 hour)

### File: `app/api/agent/roundtable/route.ts`

**Add character fingerprint injection**:

1. **Import helper**:
```typescript
import { generateCharacterPromptBlock } from '@/lib/types/character-consistency'
```

2. **Fetch characters with fingerprints** (after line 30):
```typescript
let characterContext = ''
if (selectedCharacters && selectedCharacters.length > 0) {
  const { data: characters } = await supabase
    .from('series_characters')
    .select('*, visual_fingerprint, voice_profile, sora_prompt_template')
    .in('id', selectedCharacters)

  if (characters && characters.length > 0) {
    const characterBlocks = characters.map(char =>
      char.sora_prompt_template || generateCharacterPromptBlock(char)
    )
    characterContext = `\n\nCHARACTERS IN THIS VIDEO:\n${characterBlocks.join('\n\n')}\n`
  }
}
```

3. **Inject into system message** (around line 45):
```typescript
const systemMessage = {
  role: 'system',
  content: `You are a film production AI crew...

${characterContext}  // ADD THIS - characters come before user brief

IMPORTANT: The character descriptions above are LOCKED. Do not modify or reinterpret them. Use them exactly as provided for consistency.

User's video brief: ${brief}
Platform: ${platform}
...`
}
```

### File: `app/api/agent/roundtable/advanced/route.ts`

**Same changes as above** - add character injection before user brief.

---

## 🔄 Step 5: Testing Checklist (30 min)

### Test Scenario 1: Create Character with Fingerprints
1. Navigate to series detail page
2. Create new character
3. Fill out visual fingerprint (age, ethnicity, hair, eyes, etc.)
4. Fill out voice profile (age_sound, accent, pitch, tone)
5. Save character
6. **Verify**: `sora_prompt_template` generated in database
7. **Verify**: Template visible on character detail/edit

### Test Scenario 2: Generate Video with Character
1. Create new video
2. Select series with fingerprinted character
3. Select character from list
4. Generate prompt via roundtable
5. **Verify**: Character template appears in agent discussion
6. **Verify**: Final prompt includes locked character description
7. **Verify**: Character details are NOT modified by agents

### Test Scenario 3: Multiple Characters
1. Create 2+ characters with fingerprints
2. Create video selecting both characters
3. Generate prompt
4. **Verify**: Both character templates injected
5. **Verify**: Relationship context (if defined) included

### Database Verification
```sql
-- Check template generation
SELECT name, sora_prompt_template
FROM series_characters
WHERE series_id = 'YOUR_SERIES_ID';

-- Should show auto-generated templates like:
-- "Sarah: early 30s, South Asian, shoulder-length wavy black hair..."
```

---

## 📊 Progress Tracking

- [x] Database migration
- [x] TypeScript types
- [x] UI form component
- [x] Database types updated
- [ ] Integrate form into character manager
- [ ] Update character API
- [ ] Update series detail page query
- [ ] Inject into roundtable API
- [ ] Inject into advanced roundtable API
- [ ] End-to-end testing

---

## 🎯 Expected Outcome

**Before**:
```
User: "Sarah walks into office"
Prompt: "A woman walks into office"
Sora: *different woman each time*
```

**After**:
```
User: "Sarah walks into office"
Auto-injected: "Sarah: early 30s South Asian woman, shoulder-length wavy black hair, amber eyes, oval face, slim build, business casual blazer. Voice: sounds late 20s, neutral American accent, medium pitch, warm tone."
Final Prompt: "[Sarah's locked description] Sarah walks into office"
Sora: *same Sarah every time* ✨
```

---

## 🚀 Quick Start for Next Session

1. Open `components/series/character-manager.tsx`
2. Add imports for consistency types and form
3. Add fingerprint state to formData
4. Integrate CharacterConsistencyForm component
5. Update submit handler
6. Test character creation
7. Move to API updates

**Estimated time to complete**: 3-4 hours total

---

**Last Updated**: 2025-10-20 (End of Session 1)
**Status**: Ready for Phase 2 implementation
