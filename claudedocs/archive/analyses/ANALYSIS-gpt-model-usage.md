# GPT Model Usage Analysis

**Date**: 2025-10-23
**Current Model**: `gpt-4o` (GPT-4 Optimized)
**Requested Upgrade**: GPT-5 (not yet available as of Jan 2025 knowledge cutoff)

---

## Current Model Configuration

### Files Using `gpt-4o`

#### 1. `/lib/ai/agent-orchestrator.ts`
**Usage**: Core AI agent roundtable system
**Instances**: 3 calls

**Line 346** - `callAgent()` function:
```typescript
model: 'gpt-4o', // Will use GPT-5 when available
temperature: 0.8,
max_tokens: 300,
```
- **Purpose**: Individual agent responses in Round 1
- **Temperature**: 0.8 (creative)
- **Tokens**: 300 (short responses)

**Line 389** - `callAgentWithContext()` function:
```typescript
model: 'gpt-4o',
temperature: 0.8,
max_tokens: 250,
```
- **Purpose**: Round 2 debate/challenge responses
- **Temperature**: 0.8 (creative debate)
- **Tokens**: 250 (concise challenges)

**Line 665** - `synthesizeRoundtable()` function:
```typescript
model: 'gpt-4o',
temperature: 0.3,
response_format: { type: 'json_object' },
```
- **Purpose**: Final ultra-detailed prompt synthesis
- **Temperature**: 0.3 (precise, structured)
- **Format**: JSON object (structured data)
- **Tokens**: Not specified (default)

#### 2. `/lib/ai/agent-orchestrator-stream.ts`
**Usage**: Streaming AI collaboration interface
**Instances**: 6 calls

**Lines 257, 311** - Agent conversational & technical responses:
```typescript
// Conversational stream (line 257)
model: 'gpt-4o',
temperature: 0.8, // Higher temp for natural conversation
max_tokens: 300,
stream: true,

// Technical analysis (line 311)
model: 'gpt-4o',
temperature: 0.7,
max_tokens: 500,
```
- **Purpose**: Dual responses (conversational UI + technical data)
- **Temperature**: 0.8 conversational, 0.7 technical
- **Streaming**: Yes for conversational, no for technical

**Lines 393, 440** - Debate streaming:
```typescript
model: 'gpt-4o',
temperature: 0.8,
max_tokens: 150,
stream: true,
```
- **Purpose**: Real-time debate between agents
- **Temperature**: 0.8 (natural debate)
- **Tokens**: 150 (brief exchanges)

**Line 569** - Synthesis streaming:
```typescript
model: 'gpt-4o',
temperature: 0.5, // Lower temperature for consistent technical output
max_tokens: 2000, // Increased for comprehensive technical prompt
stream: true,
```
- **Purpose**: Final prompt generation with streaming
- **Temperature**: 0.5 (balanced creativity/consistency)
- **Tokens**: 2000 (comprehensive output)

**Line 642** - Shot list generation:
```typescript
model: 'gpt-4o',
temperature: 0.5, // Lower temperature for consistent technical format
max_tokens: 800, // Increased for detailed shot descriptions
stream: true,
```
- **Purpose**: Generate technical shot list
- **Temperature**: 0.5 (consistent formatting)
- **Tokens**: 800 (detailed shots)

#### 3. `/lib/ai/vision-analysis.ts`
**Usage**: Character image analysis with GPT-4 Vision
**Instances**: 1 call

**Line 53** - `analyzeCharacterImage()`:
```typescript
model: 'gpt-4o',
response_format: { type: 'json_object' },
max_tokens: 1000,
temperature: 0.3, // Lower temperature for more consistent analysis
```
- **Purpose**: Extract visual fingerprint from character images
- **Temperature**: 0.3 (precise analysis)
- **Format**: JSON object
- **Tokens**: 1000
- **Special**: Uses Vision API with image input

---

## Model Upgrade Considerations

### When GPT-5 Becomes Available

#### Breaking Changes Risk: **LOW**
- OpenAI maintains API compatibility across model versions
- Model name is the only required change
- Parameters (temperature, max_tokens, etc.) remain compatible

#### Expected Improvements
1. **Better Reasoning**: More accurate prompt generation and synthesis
2. **Improved Consistency**: Better character consistency across generations
3. **Context Understanding**: Enhanced understanding of complex briefs
4. **Vision Capabilities**: Potentially better image analysis (if vision API included)
5. **Cost/Speed**: Unknown until release (could be more expensive or slower)

#### Potential Issues
1. **Cost Increase**: GPT-5 will likely cost more per token
2. **Latency**: May have higher response times initially
3. **Rate Limits**: New model may have different rate limit tiers
4. **Output Changes**: Different creative style may require prompt tuning
5. **Streaming Performance**: Streaming latency may differ

---

## Upgrade Strategy

### Option 1: Global Environment Variable (RECOMMENDED)
**Pros**:
- Single point of configuration
- Easy A/B testing
- No code changes required
- Can roll back instantly

**Implementation**:
```typescript
// lib/ai/config.ts
export const AI_CONFIG = {
  MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  MODEL_VISION: process.env.OPENAI_MODEL_VISION || 'gpt-4o',
}

// Then in all files:
model: AI_CONFIG.MODEL,
```

**Environment Variables**:
```bash
# .env.local
OPENAI_MODEL=gpt-5  # When available
OPENAI_MODEL_VISION=gpt-5-vision  # If vision has separate model
```

### Option 2: Gradual Rollout by Feature
**Pros**:
- Test GPT-5 on specific features first
- Minimize cost impact during testing
- Isolate any quality issues

**Implementation**:
```typescript
// lib/ai/config.ts
export const AI_CONFIG = {
  MODEL_AGENT_CHAT: process.env.OPENAI_MODEL_AGENT || 'gpt-4o',
  MODEL_SYNTHESIS: process.env.OPENAI_MODEL_SYNTHESIS || 'gpt-4o',
  MODEL_VISION: process.env.OPENAI_MODEL_VISION || 'gpt-4o',
}
```

**Rollout Phases**:
1. **Phase 1**: Vision analysis only (lowest volume)
2. **Phase 2**: Synthesis (most critical quality)
3. **Phase 3**: Agent responses (highest volume)

### Option 3: Direct Code Changes
**Pros**:
- Simple and direct
- No additional configuration

**Cons**:
- Requires code changes for each model switch
- A/B testing harder
- Rollback requires code deployment

**Implementation**:
Search and replace all instances:
```bash
# Find all occurrences
grep -r "model: 'gpt-4o'" lib/ai/

# Replace (manual or scripted)
model: 'gpt-5'
```

---

## Cost Impact Analysis

### Current Estimated Usage
Based on your application structure:

**Agent Roundtable** (per video generation):
- Round 1: 6 agents × 300 tokens = 1,800 tokens
- Round 2: ~2 responses × 250 tokens = 500 tokens
- Synthesis: ~2,000 tokens output
- **Total per generation**: ~4,300 tokens output (~8,000 tokens total with input)

**Vision Analysis** (per character image):
- ~1,000 tokens per image
- Images count as ~85 tokens per image for gpt-4o vision

**Monthly Estimates** (example):
- 100 videos/month: 800,000 tokens
- 50 character images/month: 50,000 tokens
- **Total**: ~850,000 tokens/month

### GPT-5 Cost Projection (ESTIMATED)
Assuming GPT-5 costs 2-3x more than GPT-4o:

**Current GPT-4o Pricing** (as of knowledge cutoff):
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

**Estimated GPT-5 Pricing** (speculative):
- Input: $5.00 - $7.50 per 1M tokens (2-3x)
- Output: $20.00 - $30.00 per 1M tokens (2-3x)

**Monthly Cost Comparison**:
- GPT-4o: ~$10-15/month (current)
- GPT-5: ~$20-45/month (estimated)
- **Increase**: ~$10-30/month additional cost

---

## Recommended Action Plan

### Immediate Actions (Now)
1. ✅ **Document current state** (this analysis)
2. ⏳ **Verify GPT-5 availability** (check OpenAI docs/announcements)
3. ⏳ **Set up configuration system** (Option 1 - env variables)

### When GPT-5 Becomes Available
1. **Phase 1: Testing** (Week 1)
   - Enable GPT-5 for vision analysis only
   - Test character consistency quality
   - Monitor costs and latency
   - Compare output quality with GPT-4o

2. **Phase 2: Synthesis** (Week 2)
   - Enable for synthesis if vision tests pass
   - A/B test prompt quality (GPT-4o vs GPT-5)
   - Gather user feedback on video quality

3. **Phase 3: Full Rollout** (Week 3-4)
   - Enable for all agent responses if synthesis quality improved
   - Monitor total cost impact
   - Adjust temperature/parameters if needed

4. **Phase 4: Optimization** (Ongoing)
   - Fine-tune prompts for GPT-5's capabilities
   - Optimize token usage
   - Consider hybrid approach (GPT-5 for synthesis, GPT-4o for simple tasks)

---

## Implementation Code

### Recommended: Environment Variable Configuration

**Create**: `/lib/ai/config.ts`
```typescript
/**
 * AI Model Configuration
 * Allows easy switching between models via environment variables
 */

export const AI_CONFIG = {
  // Agent models
  MODEL_DEFAULT: process.env.OPENAI_MODEL || 'gpt-4o',
  MODEL_VISION: process.env.OPENAI_MODEL_VISION || 'gpt-4o',

  // Feature flags for gradual rollout
  USE_GPT5_FOR_VISION: process.env.USE_GPT5_VISION === 'true',
  USE_GPT5_FOR_SYNTHESIS: process.env.USE_GPT5_SYNTHESIS === 'true',
  USE_GPT5_FOR_AGENTS: process.env.USE_GPT5_AGENTS === 'true',
} as const

export function getModelForFeature(feature: 'vision' | 'synthesis' | 'agent'): string {
  switch (feature) {
    case 'vision':
      return AI_CONFIG.USE_GPT5_FOR_VISION ? 'gpt-5' : AI_CONFIG.MODEL_DEFAULT
    case 'synthesis':
      return AI_CONFIG.USE_GPT5_FOR_SYNTHESIS ? 'gpt-5' : AI_CONFIG.MODEL_DEFAULT
    case 'agent':
      return AI_CONFIG.USE_GPT5_FOR_AGENTS ? 'gpt-5' : AI_CONFIG.MODEL_DEFAULT
    default:
      return AI_CONFIG.MODEL_DEFAULT
  }
}
```

**Update**: `/lib/ai/agent-orchestrator.ts`
```typescript
import { getModelForFeature } from './config'

// Line 346 - callAgent()
model: getModelForFeature('agent'),

// Line 389 - callAgentWithContext()
model: getModelForFeature('agent'),

// Line 665 - synthesizeRoundtable()
model: getModelForFeature('synthesis'),
```

**Update**: `/lib/ai/vision-analysis.ts`
```typescript
import { getModelForFeature } from './config'

// Line 53 - analyzeCharacterImage()
model: getModelForFeature('vision'),
```

**Environment Variables** (`.env.local`):
```bash
# Global model override (when GPT-5 available)
OPENAI_MODEL=gpt-5

# OR: Gradual rollout with feature flags
USE_GPT5_VISION=true        # Start with vision only
USE_GPT5_SYNTHESIS=false    # Keep synthesis on GPT-4o
USE_GPT5_AGENTS=false       # Keep agents on GPT-4o
```

---

## Testing Checklist

When GPT-5 becomes available, test these scenarios:

### Vision Analysis
- [ ] Character image analysis accuracy
- [ ] Visual fingerprint extraction completeness
- [ ] Ethnicity and skin tone detection precision
- [ ] Response time vs GPT-4o
- [ ] Cost per analysis

### Agent Roundtable
- [ ] Agent response quality and creativity
- [ ] Conversational naturalness
- [ ] Technical accuracy in responses
- [ ] Debate quality and coherence
- [ ] Response time for 6-agent roundtable

### Synthesis
- [ ] Ultra-detailed prompt quality
- [ ] Structured section formatting
- [ ] Technical specification accuracy
- [ ] Character consistency in prompts
- [ ] Shot list quality

### Integration
- [ ] No breaking changes in API responses
- [ ] JSON parsing still works
- [ ] Streaming functionality intact
- [ ] Error handling unchanged

---

## Monitoring Metrics

Track these metrics after GPT-5 upgrade:

### Quality Metrics
- Video generation success rate
- User satisfaction scores
- Prompt rejection rate (if prompts fail)
- Character consistency scores

### Performance Metrics
- Average response time per agent
- Total roundtable completion time
- Vision analysis latency
- Streaming chunk delivery speed

### Cost Metrics
- Tokens per video generation
- Daily/monthly token usage
- Cost per video
- Cost per character analysis

### Reliability Metrics
- API error rate
- Timeout frequency
- Rate limit hits
- Retry attempts

---

## FAQs

**Q: Should I upgrade to GPT-5 immediately when available?**
A: No. Use gradual rollout strategy starting with low-volume features (vision analysis first).

**Q: Will my prompts need to be rewritten?**
A: Possibly. GPT-5 may interpret prompts differently. Plan for prompt optimization phase.

**Q: Can I A/B test GPT-4o vs GPT-5?**
A: Yes. Use the feature flag approach to run both models simultaneously and compare.

**Q: What if GPT-5 is worse for some features?**
A: Use hybrid approach - GPT-5 where it excels, GPT-4o where it doesn't.

**Q: How do I roll back if there are issues?**
A: With env variable approach, just change the variable and restart. No code deployment needed.

---

## Conclusion

**Current State**: You're using `gpt-4o` across all AI features - this is the current best model available.

**GPT-5 Status**: Not yet released as of knowledge cutoff. When it becomes available:
1. Implement environment variable configuration (recommended)
2. Test gradually by feature
3. Monitor quality, cost, and performance
4. Optimize prompts for GPT-5's capabilities
5. Use hybrid approach if needed

**Comment in Code**: The comment on line 346 "Will use GPT-5 when available" is accurate - you're prepared for the upgrade.

---

**Next Steps**:
1. Verify if GPT-5 has been released since Jan 2025 knowledge cutoff
2. If released, check OpenAI's migration guide
3. Implement configuration system for easy switching
4. Follow gradual rollout plan

**Files to Update When Ready**:
- Create `/lib/ai/config.ts` (new file)
- Update `/lib/ai/agent-orchestrator.ts` (3 changes)
- Update `/lib/ai/agent-orchestrator-stream.ts` (6 changes)
- Update `/lib/ai/vision-analysis.ts` (1 change)
- Add environment variables to `.env.local`
- Update documentation

**Total Changes Required**: 10 model references + 1 config file + env variables
