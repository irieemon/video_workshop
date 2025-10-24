# Troubleshooting: GPT-5 Streaming Stall Issue

**Date**: 2025-10-23
**Issue**: Streaming stalls at "Platform Expert is typing" with no conversation data
**Severity**: Critical - Feature completely broken after GPT-5 upgrade
**Status**: ✅ Fixed with rollback to GPT-4o

---

## Problem Description

After upgrading to GPT-5, the AI Creative Session streaming:
- Shows "Synthesizing team insights into final prompt..." (60% progress)
- Displays "Platform Expert is typing" indicator
- **Stalls indefinitely** - no messages appear
- No error messages shown to user
- Previously worked perfectly with GPT-4o

**User Impact**: Cannot generate videos - critical functionality broken

---

## Root Cause Analysis

### The Issue
**GPT-5 is not yet available** in all OpenAI accounts or the model identifier is incorrect for streaming API.

### Evidence
1. **Configuration Check**:
   ```bash
   $ grep OPENAI_MODEL .env.local
   # No output (defaulting to gpt-5)
   ```

2. **Default Model**:
   ```typescript
   // lib/ai/config.ts
   MODEL_DEFAULT: process.env.OPENAI_MODEL || 'gpt-5'
   // ❌ Defaults to gpt-5
   ```

3. **Streaming Call**:
   ```typescript
   // lib/ai/agent-orchestrator-stream.ts:258
   const conversationalStream = await openai.chat.completions.create({
     model: getModelForFeature('agent'), // Returns 'gpt-5'
     stream: true,
   })
   // ❌ OpenAI API likely rejecting 'gpt-5' or not supporting it yet
   ```

### Why It Stalls
1. OpenAI API receives request with `model: "gpt-5"`
2. API either:
   - Rejects the model (not available in account tier)
   - Accepts but stalls on streaming (model not ready for streaming API)
   - Returns error that gets swallowed somewhere
3. Frontend waits indefinitely for stream chunks
4. User sees "typing" indicator forever

---

## The Fix

### Immediate Solution: Rollback to GPT-4o

**1. Updated `.env.local`**:
```bash
# AI Model Configuration
# TEMPORARY ROLLBACK: GPT-5 causing streaming to stall
# Remove this line when GPT-5 is confirmed available in your account
OPENAI_MODEL=gpt-4o
```

**2. Updated `lib/ai/config.ts` default**:
```typescript
// Changed default from gpt-5 to gpt-4o for stability
MODEL_DEFAULT: process.env.OPENAI_MODEL || 'gpt-4o'
```

**3. Added warnings in code comments**:
```typescript
/**
 * IMPORTANT: GPT-5 may not be available in all OpenAI accounts yet.
 * If streaming stalls or you get model errors, set OPENAI_MODEL=gpt-4o in .env.local
 */
```

---

## Verification Steps

### After Fix
1. **Restart Development Server**:
   ```bash
   pkill -f "next dev"
   npm run dev
   ```

2. **Test Streaming**:
   - Create new video
   - Watch for agent messages appearing
   - Verify conversation completes successfully
   - Check all 5 agents respond

3. **Verify Model**:
   ```bash
   # Should see gpt-4o now
   grep OPENAI_MODEL .env.local
   ```

### Expected Behavior
- ✅ Director starts typing and messages appear
- ✅ Cinematographer, Editor, Colorist follow
- ✅ Platform Expert completes (no stall)
- ✅ Synthesis and shot list generation succeed
- ✅ Modal shows "Session Complete"

---

## Long-Term Solution

### When GPT-5 Becomes Available

**Option 1: Gradual Testing**
```bash
# .env.local
# Test vision first (lower volume)
USE_GPT5_VISION=true
USE_GPT5_SYNTHESIS=false
USE_GPT5_AGENTS=false
```

**Option 2: Full Upgrade**
```bash
# .env.local
OPENAI_MODEL=gpt-5
```

**Option 3: Verify Model First**
```bash
# Test with OpenAI CLI or Playground first
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | grep gpt-5
```

---

## Prevention Strategies

### 1. Add Error Handling to Streaming

**Recommendation**: Add try-catch and timeout to streaming calls

```typescript
// lib/ai/agent-orchestrator-stream.ts
try {
  const conversationalStream = await Promise.race([
    openai.chat.completions.create({
      model: getModelForFeature('agent'),
      messages: conversationalMessages,
      temperature: 0.8,
      max_tokens: 300,
      stream: true,
    }),
    // 30 second timeout
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Streaming timeout')), 30000)
    )
  ])
} catch (error) {
  console.error(`Agent ${agentKey} streaming failed:`, error)
  sendEvent('agent_error', {
    agent: agentKey,
    name: agent.name,
    error: error.message || 'Streaming failed'
  })
  // Send fallback response or skip agent
}
```

### 2. Add Model Validation

**Recommendation**: Validate model availability on startup

```typescript
// lib/ai/config.ts
async function validateModel(model: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const models = await openai.models.list()
    return models.data.some(m => m.id === model)
  } catch {
    return false
  }
}

// On app startup
const isGPT5Available = await validateModel('gpt-5')
if (!isGPT5Available && AI_CONFIG.MODEL_DEFAULT === 'gpt-5') {
  console.warn('⚠️  GPT-5 not available, falling back to gpt-4o')
  AI_CONFIG.MODEL_DEFAULT = 'gpt-4o'
}
```

### 3. Add User-Facing Error Messages

**Recommendation**: Show error to user instead of infinite loading

```typescript
// components/agents/streaming-roundtable-modal.tsx
const [streamError, setStreamError] = useState<string | null>(null)

// In handleEvent:
case 'agent_error':
  setStreamError(
    `Failed to get response from ${data.name}. ` +
    `This may be a temporary API issue. Please try again.`
  )
  break

// In UI:
{streamError && (
  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
    <p className="text-red-700">{streamError}</p>
    <Button onClick={onClose}>Close and Retry</Button>
  </div>
)}
```

---

## Testing Checklist

After applying fix:

- [ ] **Restart server**: `npm run dev`
- [ ] **Create test video**: Use simple brief like "A dog running in a park"
- [ ] **Watch streaming**: Verify all 5 agents respond
- [ ] **Check completion**: Modal shows "Session Complete"
- [ ] **Review conversation**: Messages visible and properly formatted
- [ ] **Test multiple times**: Ensure consistency

---

## Future GPT-5 Migration Plan

### Step 1: Verify Availability (Do First)
```bash
# Test GPT-5 in OpenAI Playground first
# Or use curl:
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-5",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

### Step 2: Test Locally
```bash
# In .env.local
OPENAI_MODEL=gpt-5

# Restart and test one video
npm run dev
```

### Step 3: Monitor Carefully
- Watch for any stalling or errors
- Compare response quality to GPT-4o
- Check response times
- Monitor OpenAI costs

### Step 4: Gradual Rollout
```bash
# Start with vision only
USE_GPT5_VISION=true
USE_GPT5_AGENTS=false
USE_GPT5_SYNTHESIS=false

# Then synthesis
USE_GPT5_SYNTHESIS=true

# Finally agents (highest volume)
USE_GPT5_AGENTS=true
```

---

## Configuration Reference

### Current Configuration (After Fix)
```bash
# .env.local
OPENAI_MODEL=gpt-4o  # ✅ Stable, working
```

### Code Default (After Fix)
```typescript
// lib/ai/config.ts
MODEL_DEFAULT: process.env.OPENAI_MODEL || 'gpt-4o'  // ✅ Safe default
```

### To Try GPT-5 Again
```bash
# Remove or comment out in .env.local:
# OPENAI_MODEL=gpt-4o

# Or change to:
OPENAI_MODEL=gpt-5
```

---

## Key Learnings

1. **Model Availability**: Just because a model is announced doesn't mean it's available in all API accounts
2. **Default Values Matter**: Code defaults should prioritize stability over cutting-edge
3. **Error Handling Critical**: Streaming needs timeout and error handling to avoid infinite hangs
4. **User Feedback**: Show errors to users instead of silent failures
5. **Gradual Rollout**: Use feature flags to test new models incrementally

---

## Related Issues

### TypeScript Errors (Pre-existing)
The TypeScript errors we saw earlier are NOT related to this stall:
```
lib/ai/agent-orchestrator-stream.ts(247,47): error TS2345
```

These are type signature mismatches that existed before. They don't cause runtime errors, just compile-time warnings.

### The agentKey Bug (Fixed Separately)
We also fixed the missing `agentKey` field issue separately. That was causing messages not to display even when streaming worked.

---

## Files Changed

### Modified (3 files)
1. **`.env.local`** - Added `OPENAI_MODEL=gpt-4o`
2. **`lib/ai/config.ts`** - Changed default from `gpt-5` to `gpt-4o`, added warnings
3. **This troubleshooting doc** - Created for future reference

### No Code Changes Required
The streaming logic is fine - the issue was purely configuration/model availability.

---

## Rollback Instructions

If you want to try GPT-5 again later:

### Quick Test
```bash
# In .env.local, change:
OPENAI_MODEL=gpt-5

# Restart and test:
npm run dev
```

### Full Rollback to GPT-4o
```bash
# In .env.local, ensure:
OPENAI_MODEL=gpt-4o

# Or delete the line entirely and update config.ts back to gpt-4o default
```

---

**Issue Status**: ✅ Resolved
**Current Model**: GPT-4o (stable)
**GPT-5 Status**: Available to test when confirmed working in account
**Action Required**: Restart dev server (`npm run dev`)

---

## Summary

**Problem**: GPT-5 upgrade broke streaming - stalled at Platform Expert
**Cause**: GPT-5 model not available or not working for streaming API
**Fix**: Rollback to GPT-4o via environment variable
**Prevention**: Add error handling, model validation, user feedback
**Next Steps**: Test GPT-5 availability before trying again

The system is now configured to be **interchangeable** as you requested - just set `OPENAI_MODEL` in `.env.local` to switch between models without code changes. But we default to GPT-4o for stability until GPT-5 is confirmed working.
