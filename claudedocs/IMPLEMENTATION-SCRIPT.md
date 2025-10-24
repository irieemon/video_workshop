# Character Consistency - Complete Implementation Script

**Use this as a reference while implementing the remaining pieces**

---

## Step 1: Character Manager - Add Imports

**File**: `components/series/character-manager.tsx`
**Line**: After line 20

```typescript
import { CharacterConsistencyForm } from './character-consistency-form'
import type { VisualFingerprint, VoiceProfile } from '@/lib/types/character-consistency'
```

---

## Step 2: Character Manager - Update Interface

**File**: `components/series/character-manager.tsx`
**Line**: Update Character interface (around line 22)

```typescript
interface Character {
  id: string
  name: string
  description: string
  role: 'protagonist' | 'supporting' | 'background' | 'other' | null
  performance_style: string | null
  visual_reference_url?: string | null
  visual_cues?: VisualCue[]
  visual_fingerprint?: any  // ADD
  voice_profile?: any        // ADD
  sora_prompt_template?: string | null  // ADD
}
```

---

## Step 3: Character Manager - Update Form State

**File**: `components/series/character-manager.tsx`
**Line**: Around line 49, replace formData state

```typescript
const [formData, setFormData] = useState<{
  name: string
  description: string
  role: CharacterRole
  performance_style: string
  visual_fingerprint: Partial<VisualFingerprint>
  voice_profile: Partial<VoiceProfile>
}>({
  name: '',
  description: '',
  role: 'protagonist',
  performance_style: '',
  visual_fingerprint: {},
  voice_profile: {},
})
```

---

## Step 4: Character Manager - Update resetForm

**File**: `components/series/character-manager.tsx`
**Line**: Around line 61

```typescript
const resetForm = () => {
  setFormData({
    name: '',
    description: '',
    role: 'protagonist',
    performance_style: '',
    visual_fingerprint: {},    // ADD
    voice_profile: {},          // ADD
  })
  setEditingCharacter(null)
  setError(null)
}
```

---

## Step 5: Character Manager - Update handleEdit

**File**: `components/series/character-manager.tsx`
**Line**: Around line 72

```typescript
const handleEdit = (character: Character) => {
  setEditingCharacter(character)
  setFormData({
    name: character.name,
    description: character.description,
    role: character.role || 'protagonist',
    performance_style: character.performance_style || '',
    visual_fingerprint: character.visual_fingerprint || {},  // ADD
    voice_profile: character.voice_profile || {},            // ADD
  })
  setShowForm(true)
}
```

---

## Step 6: Character Manager - Add Consistency Handler

**File**: `components/series/character-manager.tsx`
**Line**: After handleEdit function (around line 81)

```typescript
const handleConsistencyChange = (data: {
  visualFingerprint: Partial<VisualFingerprint>
  voiceProfile: Partial<VoiceProfile>
}) => {
  setFormData(prev => ({
    ...prev,
    visual_fingerprint: data.visualFingerprint,
    voice_profile: data.voiceProfile,
  }))
}
```

---

## Step 7: Character Manager - Add Form to Dialog

**File**: `components/series/character-manager.tsx`
**Line**: In the DialogContent, after the performance_style field

Find this section (around line 200+):
```tsx
<div className="space-y-2">
  <Label htmlFor="performance_style">Performance Style</Label>
  <Input
    id="performance_style"
    placeholder="e.g., Confident and professional"
    value={formData.performance_style}
    onChange={(e) => setFormData({ ...formData, performance_style: e.target.value })}
  />
</div>
```

**Add after it:**
```tsx
{/* Character Consistency Section */}
<div className="border-t pt-4 mt-4">
  <h3 className="text-sm font-medium mb-4">Character Consistency (for Sora)</h3>
  <CharacterConsistencyForm
    visualFingerprint={formData.visual_fingerprint}
    voiceProfile={formData.voice_profile}
    generatedTemplate={editingCharacter?.sora_prompt_template || null}
    onChange={handleConsistencyChange}
  />
</div>
```

---

## Step 8: Character API - Update POST Handler

**File**: `app/api/series/[seriesId]/characters/route.ts`

Find the POST handler and update it:

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const {
      name,
      description,
      role,
      performance_style,
      visual_fingerprint,    // ADD
      voice_profile          // ADD
    } = body

    // Validation
    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      )
    }

    // Create character
    const { data: character, error } = await supabase
      .from('series_characters')
      .insert({
        series_id: seriesId,
        name,
        description,
        role: role || null,
        performance_style: performance_style || null,
        visual_fingerprint: visual_fingerprint || {},  // ADD
        voice_profile: voice_profile || {},            // ADD
      })
      .select('*, visual_fingerprint, voice_profile, sora_prompt_template')  // MODIFIED
      .single()

    if (error) throw error

    return NextResponse.json(character, { status: 201 })
  } catch (error: any) {
    console.error('Character creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create character' },
      { status: 500 }
    )
  }
}
```

---

## Step 9: Character API - Update GET Handler

**File**: `app/api/series/[seriesId]/characters/route.ts`

Update the select query to include new fields:

```typescript
.select('*, visual_fingerprint, voice_profile, sora_prompt_template')
```

---

## Step 10: Series Page - Update Query

**File**: `app/dashboard/projects/[id]/series/[seriesId]/page.tsx`
**Line**: Around 20-32

```typescript
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

## Step 11: Roundtable API - Add Character Injection

**File**: `app/api/agent/roundtable/route.ts`

**Add import at top**:
```typescript
import { generateCharacterPromptBlock } from '@/lib/types/character-consistency'
```

**After parsing request body** (around line 30), add:

```typescript
// Fetch and inject character fingerprints
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
    characterContext = `\n\nCHARACTERS IN THIS VIDEO:\n${characterBlocks.join('\n\n')}\n\nIMPORTANT: The character descriptions above are LOCKED. Use them exactly as provided for consistency across videos.\n\n`
  }
}
```

**Update system message** (around line 45):

```typescript
const systemMessage = {
  role: 'system',
  content: `You are a film production AI crew specialized in creating Sora video prompts...

${characterContext}User's video brief: ${brief}
Platform: ${platform}
...`
}
```

---

## Step 12: Advanced Roundtable - Same Character Injection

**File**: `app/api/agent/roundtable/advanced/route.ts`

Apply the **exact same changes** as Step 11 to this file.

---

## Testing Checklist

### Test 1: Create Character
- [ ] Navigate to series detail page
- [ ] Click "Add Character"
- [ ] Fill basic info (name, description, role)
- [ ] Scroll down to "Character Consistency" section
- [ ] Fill visual fingerprint fields
- [ ] Fill voice profile fields
- [ ] Save character
- [ ] Verify no errors

### Test 2: Verify Template Generation
```sql
SELECT name, sora_prompt_template
FROM series_characters
ORDER BY created_at DESC
LIMIT 1;
```
Should show auto-generated template!

### Test 3: Generate Video with Character
- [ ] Create new video
- [ ] Select series
- [ ] Select character from list
- [ ] Start roundtable
- [ ] Check agent discussion - should reference character details
- [ ] Check final prompt - should include character template

### Test 4: Multiple Characters
- [ ] Create 2+ characters with full profiles
- [ ] Create video selecting both
- [ ] Verify both templates in prompt

---

## Quick Reference

**Consistency Form Location**: After performance_style in character dialog
**Character API**: Add visual_fingerprint and voice_profile to insert/update
**Roundtable API**: Inject characterContext before user brief
**Database Template**: Auto-generated via trigger when fingerprints saved

---

**Estimated Time**: 2-3 hours to implement all steps
**Priority Order**: Steps 1-7 (UI) → Steps 8-10 (API) → Steps 11-12 (Roundtable)
