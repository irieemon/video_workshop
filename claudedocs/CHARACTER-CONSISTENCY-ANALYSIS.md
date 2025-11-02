# Character Visual Consistency Analysis

## Issue Summary
Visual characteristics from character database are not being properly integrated into the final Sora prompt output, despite being correctly fetched and passed to the AI agents.

## Example Scenario
**Characters in Database:**
- **Tom**: White early teens, short light brown hair, blue eyes, average build with round face, short. Wearing white shirt with a gray sweater vest. Skin tone: fair with neutral undertones.
- **Lyle**: Black young child, short black hair, brown eyes, average build with round face. Wearing denim shirt. Skin tone: deep brown with warm undertones.

**Problem in Generated Prompt:**
The **Wardrobe / Props / Extras** section describes:
- Tom (13): Tousled brown hair, bright blue T-shirt with a cartoon print
- Lyle (13): Curly blond hair, striped pajama top

**Discrepancies:**
1. Lyle's hair: Database says "short black hair" → Prompt says "curly blond hair" ❌
2. Lyle's ethnicity: Database says "Black" → No mention in prompt ❌
3. Lyle's skin tone: Database says "deep brown with warm undertones" → No mention in prompt ❌
4. Tom's clothing: Database says "white shirt with a gray sweater vest" → Prompt says "bright blue T-shirt" ❌
5. Lyle's clothing: Database says "denim shirt" → Prompt says "striped pajama top" ❌

## Root Cause Analysis

### Data Flow Investigation

#### Step 1: Character Data Retrieval ✅ WORKING
**Location**: `/app/api/agent/roundtable/route.ts:131-145`

```typescript
// Fetch selected characters
if (selectedCharacters && selectedCharacters.length > 0) {
  const { data: characters } = await supabase
    .from('series_characters')
    .select('*')
    .in('id', selectedCharacters)
  seriesCharacters = characters

  // Generate character consistency blocks
  if (characters && characters.length > 0) {
    const characterBlocks = characters.map(char =>
      char.sora_prompt_template || generateCharacterPromptBlock(char)
    )
    characterContext = `\n\nCHARACTERS IN THIS VIDEO:\n${characterBlocks.join('\n\n')}\n\nIMPORTANT: The character descriptions above are LOCKED. Use them exactly as provided for consistency across videos.\n\n`
  }
}
```

**Status**: ✅ Characters are correctly fetched from database
**Status**: ✅ Character prompt blocks are correctly generated
**Status**: ✅ characterContext string is properly formatted with LOCKED instruction

#### Step 2: Context Injection to Agents ✅ WORKING
**Location**: `/lib/ai/agent-orchestrator-stream.ts:185-196`

```typescript
let contextString = ''
if (visualTemplate) {
  contextString += `\n\nVISUAL TEMPLATE:\n${visualTemplate}`
}
if (characterContext) {
  contextString += characterContext  // ← Character data added here
}
if (screenplayContext) {
  contextString += screenplayContext
}
if (seriesSettings && seriesSettings.length > 0) {
  contextString += `\n\nSETTINGS:\n${seriesSettings.map(s => `- ${s.name}: ${s.description}`).join('\n')}`
}
```

**Status**: ✅ characterContext is appended to contextString
**Status**: ✅ contextString is passed to each agent's technical prompt (line 248)

#### Step 3: Agent Technical Prompts ⚠️ POTENTIAL ISSUE
**Location**: `/lib/ai/agent-orchestrator-stream.ts:37-38, 66-67, 93-94`

```typescript
// Director technical prompt
technicalPrompt: (brief: string) =>
  `You are a creative director. Provide technical narrative specs...
  Brief: ${brief}`,

// Cinematographer technical prompt
technicalPrompt: (brief: string) =>
  `You are a cinematographer. Provide precise technical specs...
  Brief: ${brief}`,
```

**Status**: ⚠️ Technical prompts accept `brief` parameter but characterContext is appended AFTER
**Issue**: Technical prompts don't explicitly instruct agents to PRESERVE character descriptions

#### Step 4: Final Prompt Synthesis 🔴 MAIN ISSUE
**Location**: `/lib/ai/agent-orchestrator-stream.ts:520-560`

The final Sora prompt is synthesized from all agent responses without explicit character preservation enforcement.

**The Problem:**
1. Character context is passed to agents as supplementary information
2. Agents focus on their domain expertise (cinematography, editing, etc.)
3. AI agents generate creative variations that override character specifications
4. **No enforcement mechanism** ensures LOCKED character data appears verbatim in final output
5. Final synthesis step doesn't validate character consistency

## Verified Character Data

**Database Query Results:**
```sql
SELECT name, visual_fingerprint, sora_prompt_template
FROM series_characters
WHERE name IN ('Tom', 'Lyle');
```

**Tom:**
- Age: early teens
- Ethnicity: White
- Hair: short light brown hair
- Eyes: blue eyes
- Face: round face
- Build: average
- Height: short
- Clothing: white shirt with a gray sweater vest
- Skin tone: fair with neutral undertones
- Voice: sounds early teens, neutral American accent, neutral tone, medium pitch

**Lyle:**
- Age: young child
- Ethnicity: Black
- Hair: short black hair
- Eyes: brown eyes
- Face: round face
- Build: average
- Clothing: denim shirt
- Skin tone: deep brown with warm undertones
- Voice: sounds young child, neutral American accent, playful tone, high pitch

## Technical Analysis

### Why Character Consistency Fails

1. **Agent Autonomy vs. Constraints**
   - Each AI agent (Director, Cinematographer, etc.) operates with creative autonomy
   - Character context is provided as "information" not "constraints"
   - Agents prioritize their creative domain over character preservation

2. **Prompt Priority Hierarchy**
   - User brief is the primary input
   - Character context is supplementary
   - AI model prioritizes creative coherence over explicit character data

3. **No Validation Layer**
   - No post-generation check that LOCKED character attributes appear in final prompt
   - No diff comparison between character database and generated output
   - No rejection/regeneration if character specs are violated

4. **Creative Override Pattern**
   - AI tends to create "better" or "more interesting" character descriptions
   - "Tousled brown hair" sounds more dynamic than "short light brown hair"
   - "Curly blond hair" for Lyle creates contrast with Tom (but contradicts database)

### Current Character Context Format

```
CHARACTERS IN THIS VIDEO:
Lyle: Black young child, short black hair, brown eyes, average build with round face, not applicable. Wearing denim shirt. Skin tone: deep brown with warm undertones. Voice: sounds young child, neutral American accent, playful tone, high pitch. Performance: funny and over exageratted.

Tom: White early teens, short light brown hair, blue eyes, average build with round face, short. Wearing white shirt with a gray sweater vest. Skin tone: fair with neutral undertones. Voice: sounds early teens, neutral American accent, neutral tone, medium pitch. Performance: animated and silly.

IMPORTANT: The character descriptions above are LOCKED. Use them exactly as provided for consistency across videos.
```

**Problem**: The "IMPORTANT" instruction is treated as guidance, not enforcement.

## Solution Architecture

### Immediate Fixes (High Impact, Low Effort)

#### Fix 1: Strengthen Character Prompt Instructions
**File**: `/lib/ai/agent-orchestrator-stream.ts`

**Change the character context format to be MORE EXPLICIT:**

```typescript
characterContext = `
═══════════════════════════════════════════════════════
🔒 LOCKED CHARACTER SPECIFICATIONS - DO NOT MODIFY 🔒
═══════════════════════════════════════════════════════

${characterBlocks.join('\n\n')}

⚠️ CRITICAL REQUIREMENTS ⚠️
1. Use EXACT character descriptions above - no creative variations
2. Do NOT change hair color, style, or length
3. Do NOT change ethnicity or skin tone
4. Do NOT change clothing unless brief explicitly requests different attire
5. Do NOT change ages or physical characteristics
6. These specifications ensure visual consistency across the video series

If the brief conflicts with character specs, prioritize CHARACTER SPECS.
═══════════════════════════════════════════════════════
`
```

#### Fix 2: Add Character Preservation to Agent Technical Prompts
**File**: `/lib/ai/agent-orchestrator-stream.ts:37-38, 66-67, etc.`

**Modify each technical prompt to explicitly reference character constraints:**

```typescript
technicalPrompt: (brief: string) =>
  `You are a creative director. Provide technical narrative specs: story structure (three-act, vignette, montage), emotional beat timing and progression, character motivation and arc, visual metaphors or symbolic elements, wardrobe/prop storytelling function, location narrative purpose, and sound design narrative role.

  CRITICAL: If character specifications are provided in the context, you MUST preserve them EXACTLY as stated. Do not alter hair, clothing, ethnicity, skin tone, or any physical characteristics. Focus your creative input on storytelling elements that don't conflict with character consistency.

  Focus on story mechanics. Brief: ${brief}`,
```

#### Fix 3: Post-Generation Character Validation
**File**: `/lib/ai/agent-orchestrator-stream.ts` (new function)

**Add validation function:**

```typescript
function validateCharacterConsistency(
  finalPrompt: string,
  characters: CharacterWithConsistency[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = []

  for (const char of characters) {
    const vf = char.visual_fingerprint
    if (!vf) continue

    const charSection = finalPrompt.toLowerCase()

    // Check hair
    if (vf.hair && !charSection.includes(vf.hair.toLowerCase())) {
      violations.push(`${char.name}: Hair "${vf.hair}" not found in prompt`)
    }

    // Check ethnicity
    if (vf.ethnicity && !charSection.includes(vf.ethnicity.toLowerCase())) {
      violations.push(`${char.name}: Ethnicity "${vf.ethnicity}" not mentioned`)
    }

    // Check skin tone
    if (vf.skin_tone && !charSection.includes('skin tone')) {
      violations.push(`${char.name}: Skin tone not specified in prompt`)
    }

    // Check clothing (if not brief-specific)
    if (vf.default_clothing && !charSection.includes('wearing')) {
      violations.push(`${char.name}: Default clothing may not be preserved`)
    }
  }

  return {
    valid: violations.length === 0,
    violations
  }
}
```

### Medium-Term Enhancements

#### Enhancement 1: Dedicated Character Agent
Create a specialized "Character Consistency Agent" that:
1. Runs AFTER all other agents
2. Reviews the full generated prompt
3. Identifies any character description discrepancies
4. Rewrites character sections to match database exactly
5. Returns validated, character-consistent prompt

#### Enhancement 2: Template-Based Character Sections
Instead of letting agents generate character descriptions:
1. Use LOCKED template sections from database
2. Insert them verbatim into specific prompt sections
3. Allow agents to only modify non-character elements

#### Enhancement 3: Two-Pass Generation
1. **Pass 1**: Generate creative direction WITHOUT character details
2. **Pass 2**: Inject character specs into specific sections
3. Ensures character data can't be overridden by creative decisions

### Long-Term Improvements

#### Improvement 1: Structured Prompt Generation
Move from free-form text to structured JSON:
```typescript
interface SoraPrompt {
  story: string // from Director
  camera: string // from Cinematographer
  editing: string // from Editor
  color: string // from Colorist
  characters: CharacterSpec[] // LOCKED from database
  settings: SettingSpec[] // from database
}
```

Then compile into final text format with character specs protected.

#### Improvement 2: Character-Aware AI Model
Fine-tune or use RAG system where:
1. Character database is embedded as knowledge
2. Model is trained to preserve character consistency
3. Character specs are treated as immutable facts

#### Improvement 3: Visual Reference Integration
When characters have visual_reference_url:
1. Pass images to multimodal AI (GPT-4 Vision, Claude 3.5)
2. Validate generated descriptions match reference images
3. Use image-to-text for automatic description generation

## Recommendations

### Priority 1: Immediate Implementation (This Week)
1. ✅ Implement Fix 1: Strengthen character prompt instructions with explicit visual markers
2. ✅ Implement Fix 2: Update all agent technical prompts to emphasize character preservation
3. ✅ Test with Tom & Lyle example to verify improvement

### Priority 2: Short-Term Implementation (Next Sprint)
1. Implement Fix 3: Post-generation validation function
2. Add validation logging to identify when character specs are violated
3. Create character consistency quality score

### Priority 3: Medium-Term (1-2 months)
1. Build dedicated Character Consistency Agent
2. Implement template-based character sections
3. Add visual reference image analysis for multimodal validation

## Testing Plan

### Test Case 1: Tom & Lyle Breakfast Experiment
**Expected Character Specs:**
- Tom: White, early teens, short light brown hair, blue eyes, white shirt with gray sweater vest
- Lyle: Black, young child, short black hair, brown eyes, denim shirt, deep brown skin tone

**Validation Criteria:**
- [ ] Hair colors match database exactly
- [ ] Ethnicities are explicitly stated
- [ ] Skin tones are mentioned
- [ ] Default clothing is preserved (unless brief specifies otherwise)
- [ ] Ages match database

### Test Case 2: Character with Visual Reference
**Setup**: Character with uploaded image
**Validation**: Generated description matches image analysis

### Test Case 3: Conflicting Brief
**Setup**: Brief says "Tom wearing a superhero costume"
**Expected**: Character physical specs preserved, clothing updated per brief

## Metrics to Track

1. **Character Consistency Score**: % of character attributes preserved from database to final prompt
2. **Violation Rate**: # of character spec violations per generated prompt
3. **Manual Override Rate**: % of prompts requiring manual character correction
4. **User Satisfaction**: Feedback on character visual consistency across series

## Conclusion

The character consistency system has a solid foundation:
- ✅ Database schema supports rich character specifications
- ✅ Character data is correctly fetched and passed to agents
- ✅ sora_prompt_template field contains accurate character descriptions

**The core issue**: AI agents treat character specs as suggestions rather than constraints, leading to creative variations that break series visual consistency.

**The solution**: Strengthen enforcement mechanisms through:
1. More explicit prompt instructions with visual emphasis
2. Agent-level character preservation requirements
3. Post-generation validation and correction
4. Potentially dedicated character consistency agent

**Impact**: High - This is critical for series-based content where character visual consistency is a core value proposition.

**Effort**: Medium - Fixes can be implemented incrementally without major architecture changes.
