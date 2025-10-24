# Single Variable Model Control

**Status**: ✅ Configured
**Model**: `gpt-5-chat-latest`
**Control**: One environment variable (`OPENAI_MODEL`)

---

## How It Works

**ONE variable controls EVERYTHING:**

```bash
# .env.local
OPENAI_MODEL=gpt-5-chat-latest
```

This single line controls:
- ✅ All 6 agent responses (Director, Cinematographer, Editor, Colorist, Platform Expert, Music Producer)
- ✅ Final prompt synthesis
- ✅ Character image analysis (vision API)
- ✅ Shot list generation
- ✅ Every OpenAI API call in the application

---

## Quick Reference

### Current Setup
```bash
# .env.local (current)
OPENAI_MODEL=gpt-5-chat-latest
```

### To Switch Models

**Use GPT-4o (stable fallback)**:
```bash
# .env.local
OPENAI_MODEL=gpt-4o
```

**Use GPT-4o-mini (faster, cheaper)**:
```bash
# .env.local
OPENAI_MODEL=gpt-4o-mini
```

**Use latest GPT-5**:
```bash
# .env.local
OPENAI_MODEL=gpt-5-chat-latest
```

**After changing**: Restart your dev server
```bash
npm run dev
```

---

## Supported Models

| Model | Description | Cost (Input/Output per 1M) | Speed | Quality |
|-------|-------------|---------------------------|-------|---------|
| `gpt-5-chat-latest` | Latest GPT-5, best quality | $1.25 / $10.00 | Medium | Highest |
| `gpt-4o` | Stable GPT-4, reliable | $2.50 / $10.00 | Fast | High |
| `gpt-4o-mini` | Lightweight, economical | $0.30 / $0.60 | Fastest | Good |

---

## How to Change Models

### Step 1: Edit .env.local
```bash
# Open your .env.local file
# Find the line:
OPENAI_MODEL=gpt-5-chat-latest

# Change to any supported model:
OPENAI_MODEL=gpt-4o
```

### Step 2: Restart Server
```bash
# Stop current server (Ctrl+C)
# Or kill process:
pkill -f "next dev"

# Start again:
npm run dev
```

### Step 3: Verify
```bash
# Check server logs on startup
# You should see the model being used
# Or test by creating a video and watching agent responses
```

---

## Verification

### Check Current Model
Add this to any API route to log the current model:

```typescript
import { getConfigSummary } from '@/lib/ai/config'

console.log('AI Config:', getConfigSummary())
// Output:
// {
//   model: 'gpt-5-chat-latest',
//   source: 'environment',
//   appliesTo: ['agent responses', 'prompt synthesis', 'vision analysis', 'all AI operations']
// }
```

### Test All Features
1. **Agent Responses**: Create new video → Watch 6 agents respond
2. **Synthesis**: Check final prompt generation
3. **Vision**: Upload character image → Verify analysis
4. **Shot List**: Verify shot list generation

All should use the same model specified in `OPENAI_MODEL`.

---

## Code Structure

### Configuration File
```typescript
// lib/ai/config.ts
export const AI_CONFIG = {
  MODEL: process.env.OPENAI_MODEL || 'gpt-5-chat-latest',
}

export function getModelForFeature(feature?: string): string {
  return AI_CONFIG.MODEL  // Always returns same model
}
```

### Usage in Code
```typescript
// lib/ai/agent-orchestrator.ts
import { getModelForFeature } from './config'

const response = await openai.chat.completions.create({
  model: getModelForFeature('agent'),  // Uses OPENAI_MODEL
  messages: [...],
})
```

All 11 OpenAI API calls use `getModelForFeature()` which returns `AI_CONFIG.MODEL`.

---

## Files Affected

### Configuration
- `lib/ai/config.ts` - Central configuration
- `.env.local` - Environment variable
- `.env.local.example` - Documentation

### AI Services (all use getModelForFeature)
- `lib/ai/agent-orchestrator.ts` - Agent roundtable (4 calls)
- `lib/ai/agent-orchestrator-stream.ts` - Streaming (6 calls)
- `lib/ai/vision-analysis.ts` - Image analysis (1 call)

**Total**: 11 API calls, all controlled by one variable

---

## Troubleshooting

### Streaming Stalls
**Symptom**: Agents show "typing" but no messages appear

**Fix**: Model may not be available
```bash
# In .env.local
OPENAI_MODEL=gpt-4o  # Use stable fallback
```

### "Model not found" Error
**Symptom**: API returns 404 or model error

**Cause**: Model name incorrect or not available in your account

**Fix**: Use a known stable model
```bash
OPENAI_MODEL=gpt-4o
```

### No Environment Variable
**Symptom**: Unsure what model is being used

**Check**:
```bash
grep OPENAI_MODEL .env.local
```

**If empty**: Uses default (`gpt-5-chat-latest`)

---

## Migration Guide

### From Old Configuration (with feature flags)
**Before**:
```bash
USE_GPT5_VISION=true
USE_GPT5_SYNTHESIS=true
USE_GPT5_AGENTS=false
OPENAI_MODEL_VISION=gpt-4o
```

**After** (simpler):
```bash
OPENAI_MODEL=gpt-5-chat-latest
```

All features now use the same model.

### Testing New Models
1. **Backup**: Note current model
2. **Change**: Edit `OPENAI_MODEL` in .env.local
3. **Restart**: `npm run dev`
4. **Test**: Create a video
5. **Verify**: Watch all agents complete successfully
6. **Rollback if needed**: Restore backup model value

---

## Best Practices

### Development
- Use `gpt-4o` for stable, fast development
- Switch to `gpt-5-chat-latest` for quality testing
- Use `gpt-4o-mini` for rapid iteration (cheaper)

### Production
- Start with `gpt-4o` (proven stable)
- Test `gpt-5-chat-latest` in staging first
- Monitor costs and quality before full rollout

### Cost Optimization
```bash
# Development (fast, cheap)
OPENAI_MODEL=gpt-4o-mini

# Staging (quality testing)
OPENAI_MODEL=gpt-5-chat-latest

# Production (balance)
OPENAI_MODEL=gpt-4o  # or gpt-5-chat-latest when proven
```

---

## Examples

### Switch to GPT-4o
```bash
# Edit .env.local
OPENAI_MODEL=gpt-4o

# Restart
npm run dev

# Test - create video, all agents use GPT-4o
```

### Switch to GPT-5
```bash
# Edit .env.local
OPENAI_MODEL=gpt-5-chat-latest

# Restart
npm run dev

# Test - create video, all agents use GPT-5
```

### Verify Change Worked
```typescript
// Add to any file temporarily
import { getConfigSummary } from '@/lib/ai/config'
console.log(getConfigSummary())
```

---

## Summary

✅ **Single Variable**: `OPENAI_MODEL` in `.env.local`
✅ **Controls Everything**: All 11 API calls use same model
✅ **Easy to Change**: Edit one line, restart server
✅ **Current Model**: `gpt-5-chat-latest`
✅ **Fallback**: `gpt-4o` if issues occur

**To change model**: Edit `OPENAI_MODEL` in `.env.local` → Restart → Done!

---

**Last Updated**: 2025-10-23
**Current Model**: gpt-5-chat-latest
**Configuration File**: `lib/ai/config.ts`
**Environment File**: `.env.local`
