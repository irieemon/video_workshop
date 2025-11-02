/**
 * Test screenplay extraction with actual AI output
 */

import {
  extractStructuredScreenplay,
  validateStructuredScreenplay,
  formatValidationErrors,
} from '../lib/utils/screenplay-extraction'

const sampleAIResponse = `**Episode Concept:**
*Temporal distortions threaten the crew's sanity.*

Crew members age and de-age unpredictably.  Lukas Vance sacrifices himself to stabilize the reactor, revealing the signal's human origin.


Let's develop this into a detailed screenplay. I'll help you structure the acts, create compelling scenes, and ensure everything aligns with your established characters and world.

**To start: What emotional journey do you want the main character(s) to go through in this episode?**

Excellent — I'll take the episode concept **"Tides of Time"** and craft it into a complete, production-ready screenplay structure that fits seamlessly within *Beyond The Stars*' world, tone, and serialized arc.

This episode follows **Lukas Vance** and **Elias Chen** as they confront time distortions aboard the *Ardent Horizon*. Lukas's rebellion and sacrifice expose a haunting truth: the signal guiding them was *sent by humanity itself*.

Below is the **fully structured screenplay JSON**, conforming to all professional and formatting requirements.

---

---STRUCTURED-SCREENPLAY-START---
\`\`\`json
{
  "acts": [
    {
      "act_number": 1,
      "title": "Act 1 - The Fracture in Time",
      "description": "Temporal anomalies begin aboard the Ardent Horizon, disrupting the crew's perception of time and reality.",
      "scenes": ["scene-1", "scene-2", "scene-3"]
    }
  ],
  "scenes": [
    {
      "scene_id": "scene-1",
      "scene_number": 1,
      "location": "Observation Deck",
      "time_of_day": "INT",
      "time_period": "NIGHT",
      "description": "The panoramic expanse of the Observation Deck glows faintly under starlight. The stars outside flicker and warp, bending like reflections on water.",
      "characters": ["Elias Chen", "Sol"],
      "dialogue": [
        {
          "character": "Elias Chen",
          "lines": ["Sol, are you seeing this distortion in the starfield?"]
        },
        {
          "character": "Sol",
          "lines": ["Confirmed. Spatial coordinates are looping. Time signatures are inconsistent."]
        }
      ],
      "action": [
        "Elias stands silently before the viewport, his reflection rippling as though submerged.",
        "A faint hum reverberates through the deck.",
        "Sol's holographic avatar flickers, cycling between calm and static."
      ],
      "duration_estimate": 75
    }
  ],
  "beats": [
    {
      "beat_id": "beat-1",
      "act_number": 1,
      "scene_id": "scene-1",
      "beat_type": "turning-point",
      "description": "Elias discovers that space-time around the ship is looping.",
      "emotional_tone": "mysterious, tense"
    }
  ],
  "notes": [
    "The visual style should emphasize distortion—frames subtly looping, aging effects blending seamlessly."
  ]
}
\`\`\`
---STRUCTURED-SCREENPLAY-END---

---

Would you like me to generate a **short teaser narration** (the one-minute cold open voiceover) to emotionally set up this episode's theme of time, memory, and sacrifice?`

console.log('Testing screenplay extraction...\n')

// Test extraction
const extracted = extractStructuredScreenplay(sampleAIResponse)

if (!extracted) {
  console.error('❌ Extraction FAILED - no screenplay found')
  process.exit(1)
}

console.log('✅ Extraction SUCCEEDED')
console.log(`   - Found ${extracted.scenes.length} scenes`)
console.log(`   - Found ${extracted.acts?.length || 0} acts`)
console.log(`   - Found ${extracted.beats?.length || 0} beats\n`)

// Test validation
const validation = validateStructuredScreenplay(extracted)

if (!validation.valid) {
  console.error('❌ Validation FAILED:')
  console.error(formatValidationErrors(validation.errors))
  process.exit(1)
}

console.log('✅ Validation SUCCEEDED')

if (validation.warnings && validation.warnings.length > 0) {
  console.log('\n⚠️  Warnings:')
  validation.warnings.forEach(w => console.log(`   - ${w}`))
}

console.log('\n✅ All tests passed! Extraction system working correctly.')
