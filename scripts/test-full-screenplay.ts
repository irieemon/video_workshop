/**
 * Test with full screenplay containing invalid beat types
 */

import {
  extractStructuredScreenplay,
  validateStructuredScreenplay,
  formatValidationErrors,
} from '../lib/utils/screenplay-extraction'

const fullScreenplayResponse = `Excellent — I'll take the episode concept **"Tides of Time"** and craft it into a complete, production-ready screenplay structure.

---STRUCTURED-SCREENPLAY-START---
\`\`\`json
{
  "acts": [
    {
      "act_number": 1,
      "title": "Act 1",
      "description": "Test",
      "scenes": ["scene-1"]
    }
  ],
  "scenes": [
    {
      "scene_id": "scene-1",
      "scene_number": 1,
      "location": "Bridge",
      "time_of_day": "INT",
      "time_period": "DAY",
      "description": "The bridge.",
      "characters": ["Elias"],
      "dialogue": [
        {
          "character": "Elias",
          "lines": ["Test"]
        }
      ],
      "action": ["Elias enters"],
      "duration_estimate": 60
    }
  ],
  "beats": [
    {
      "beat_id": "beat-1",
      "act_number": 1,
      "scene_id": "scene-1",
      "beat_type": "inciting-incident",
      "description": "Invalid beat type",
      "emotional_tone": "tense"
    },
    {
      "beat_id": "beat-2",
      "act_number": 1,
      "scene_id": "scene-1",
      "beat_type": "climax",
      "description": "Another invalid beat type",
      "emotional_tone": "intense"
    },
    {
      "beat_id": "beat-3",
      "act_number": 1,
      "scene_id": "scene-1",
      "beat_type": "turning-point",
      "description": "Valid beat type",
      "emotional_tone": "dramatic"
    }
  ],
  "notes": []
}
\`\`\`
---STRUCTURED-SCREENPLAY-END---`

console.log('Testing screenplay with INVALID beat types...\n')

const extracted = extractStructuredScreenplay(fullScreenplayResponse)

if (!extracted) {
  console.error('❌ Extraction FAILED')
  process.exit(1)
}

console.log('✅ Extraction succeeded\n')

const validation = validateStructuredScreenplay(extracted)

if (!validation.valid) {
  console.log('❌ Validation FAILED (as expected):')
  console.log('\nErrors:\n' + formatValidationErrors(validation.errors))
  console.log('\nThis demonstrates the validation catching invalid beat types!')
  process.exit(0) // Exit successfully since we expected this
}

console.log('❌ Validation unexpectedly passed - this is wrong!')
process.exit(1)
