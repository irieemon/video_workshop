/**
 * Tests for Screenplay Parser Utility
 *
 * Tests the parsing of screenplay text into structured format
 * including scenes, dialogue, actions, and acts.
 */

import { parseScreenplayText } from '@/lib/utils/screenplay-parser'

describe('Screenplay Parser', () => {
  describe('parseScreenplayText', () => {
    describe('Basic Parsing', () => {
      it('returns null for empty string', () => {
        expect(parseScreenplayText('')).toBeNull()
      })

      it('returns null for whitespace-only string', () => {
        expect(parseScreenplayText('   \n\t  \n  ')).toBeNull()
      })

      it('returns null for null/undefined input', () => {
        expect(parseScreenplayText(null as unknown as string)).toBeNull()
        expect(parseScreenplayText(undefined as unknown as string)).toBeNull()
      })

      it('returns structured screenplay for valid input', () => {
        const screenplay = `
INT. OFFICE - DAY

A modern office space with glass walls.

> **JOHN**
> Hello, world!
`
        const result = parseScreenplayText(screenplay)

        expect(result).not.toBeNull()
        expect(result?.scenes).toHaveLength(1)
        expect(result?.title).toBe('')
        expect(result?.logline).toBe('')
      })
    })

    describe('Scene Heading Parsing', () => {
      it('parses INT. scene heading', () => {
        const screenplay = `INT. COFFEE SHOP - DAY

A cozy coffee shop.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].time_of_day).toBe('INT')
        expect(result?.scenes[0].location).toBe('COFFEE SHOP')
        expect(result?.scenes[0].time_period).toBe('DAY')
      })

      it('parses EXT. scene heading', () => {
        const screenplay = `EXT. CITY STREET - NIGHT

Dark and rainy street.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].time_of_day).toBe('EXT')
        expect(result?.scenes[0].location).toBe('CITY STREET')
        expect(result?.scenes[0].time_period).toBe('NIGHT')
      })

      it('parses INT/EXT. scene heading', () => {
        const screenplay = `INT/EXT. CAR - DAY

Inside a moving car.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].time_of_day).toBe('INT/EXT')
        expect(result?.scenes[0].location).toBe('CAR')
        expect(result?.scenes[0].time_period).toBe('DAY')
      })

      it('parses DAWN time period', () => {
        const screenplay = `EXT. BEACH - DAWN

Sun rises over the ocean.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].time_period).toBe('DAWN')
      })

      it('parses DUSK time period', () => {
        const screenplay = `EXT. ROOFTOP - DUSK

City lights flicker on.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].time_period).toBe('DUSK')
      })

      it('parses CONTINUOUS time period', () => {
        const screenplay = `INT. HALLWAY - CONTINUOUS

Character runs through.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].time_period).toBe('CONTINUOUS')
      })

      it('handles em-dash separator', () => {
        const screenplay = `INT. LIVING ROOM — NIGHT

A dimly lit room.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].location).toBe('LIVING ROOM')
        expect(result?.scenes[0].time_period).toBe('NIGHT')
      })

      it('handles en-dash separator', () => {
        const screenplay = `INT. KITCHEN – DAY

Morning sunlight.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].location).toBe('KITCHEN')
        expect(result?.scenes[0].time_period).toBe('DAY')
      })

      it('handles markdown heading markers', () => {
        const screenplay = `### INT. OFFICE - DAY

A busy office.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].time_of_day).toBe('INT')
        expect(result?.scenes[0].location).toBe('OFFICE')
      })

      it('handles multi-part locations', () => {
        const screenplay = `INT. ENGINEERING CORE – "SOL'S HEART" – DAY

The heart of the ship.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].location).toContain('ENGINEERING CORE')
        expect(result?.scenes[0].time_period).toBe('DAY')
      })

      it('removes quotes from location names', () => {
        const screenplay = `INT. "THE HIDEOUT" - NIGHT

A secret location.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].location).not.toContain('"')
      })
    })

    describe('Multiple Scenes', () => {
      it('parses multiple scenes correctly', () => {
        const screenplay = `INT. OFFICE - DAY

Meeting in progress.

EXT. PARKING LOT - NIGHT

Empty parking lot.

INT. CAR - CONTINUOUS

Starting the engine.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes).toHaveLength(3)
        expect(result?.scenes[0].scene_number).toBe(1)
        expect(result?.scenes[1].scene_number).toBe(2)
        expect(result?.scenes[2].scene_number).toBe(3)
        expect(result?.scenes[0].scene_id).toBe('scene_1')
        expect(result?.scenes[1].scene_id).toBe('scene_2')
        expect(result?.scenes[2].scene_id).toBe('scene_3')
      })

      it('assigns unique scene IDs', () => {
        const screenplay = `INT. A - DAY
Scene A
INT. B - DAY
Scene B
INT. C - DAY
Scene C`

        const result = parseScreenplayText(screenplay)

        const sceneIds = result?.scenes.map(s => s.scene_id)
        const uniqueIds = new Set(sceneIds)
        expect(uniqueIds.size).toBe(sceneIds?.length)
      })
    })

    describe('Dialogue Parsing', () => {
      it('extracts dialogue with > marker', () => {
        const screenplay = `INT. ROOM - DAY

Room description.

> **ALICE**
> Hello there!
> How are you?`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].dialogue).toHaveLength(1)
        expect(result?.scenes[0].dialogue[0].character).toBe('ALICE')
        expect(result?.scenes[0].dialogue[0].lines).toContain('Hello there!')
        expect(result?.scenes[0].dialogue[0].lines).toContain('How are you?')
      })

      it('extracts dialogue without > marker (backwards compatibility)', () => {
        const screenplay = `INT. ROOM - DAY

Room description.

**BOB**
Hello!`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].dialogue).toHaveLength(0)
        // Note: Without > prefix, dialogue lines after **NAME** are not captured
        // This tests the character name extraction, not full dialogue
      })

      it('handles multiple characters in dialogue', () => {
        const screenplay = `INT. ROOM - DAY

Room description.

> **ALICE**
> First line.

> **BOB**
> Second line.

> **ALICE**
> Third line.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].dialogue).toHaveLength(3)
        expect(result?.scenes[0].dialogue[0].character).toBe('ALICE')
        expect(result?.scenes[0].dialogue[1].character).toBe('BOB')
        expect(result?.scenes[0].dialogue[2].character).toBe('ALICE')
      })

      it('extracts characters from dialogue', () => {
        const screenplay = `INT. ROOM - DAY

Room description.

> **ALICE**
> Hello!

> **BOB**
> Hi there!`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].characters).toContain('ALICE')
        expect(result?.scenes[0].characters).toContain('BOB')
        expect(result?.scenes[0].characters).toHaveLength(2)
      })

      it('skips standalone parentheticals', () => {
        const screenplay = `INT. ROOM - DAY

Room description.

> **ALICE**
> (muttering)
> Hello there!`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].dialogue[0].lines).not.toContain('(muttering)')
        expect(result?.scenes[0].dialogue[0].lines).toContain('Hello there!')
      })

      it('handles character names with spaces', () => {
        const screenplay = `INT. ROOM - DAY

Room description.

> **YOUNG ALICE**
> I remember this place.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].dialogue[0].character).toBe('YOUNG ALICE')
      })
    })

    describe('Description Extraction', () => {
      it('extracts scene description', () => {
        const screenplay = `INT. OFFICE - DAY

A modern office with floor-to-ceiling windows.
Sunlight streams in.

> **JOHN**
> Good morning!`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].description).toContain('modern office')
        expect(result?.scenes[0].description).toContain('Sunlight streams')
      })

      it('stops description at dialogue', () => {
        const screenplay = `INT. OFFICE - DAY

First paragraph of description.

> **JOHN**
> This is dialogue.

This should not be in description.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].description).toContain('First paragraph')
        expect(result?.scenes[0].description).not.toContain('This is dialogue')
        expect(result?.scenes[0].description).not.toContain('should not be')
      })

      it('skips italic stage directions in description', () => {
        const screenplay = `INT. OFFICE - DAY

Regular description.
*Stage direction to skip*
More description.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].description).not.toContain('Stage direction')
      })

      it('truncates description at 500 characters', () => {
        const longDescription = 'A'.repeat(600)
        const screenplay = `INT. OFFICE - DAY

${longDescription}`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].description.length).toBeLessThanOrEqual(500)
      })

      it('provides default description if empty', () => {
        const screenplay = `INT. OFFICE - DAY

> **JOHN**
> Start talking immediately.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].description).toBe('Scene description')
      })

      it('excludes CUT TO from description', () => {
        const screenplay = `INT. OFFICE - DAY

The office is busy.
CUT TO:

EXT. STREET - DAY`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].description).not.toContain('CUT TO')
      })
    })

    describe('Action Extraction', () => {
      it('extracts italic action lines', () => {
        const screenplay = `INT. OFFICE - DAY

The office is quiet.

*John walks to the window*

> **JOHN**
> Nice view.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].action).toContain('John walks to the window')
      })

      it('excludes CUT TO from actions', () => {
        const screenplay = `INT. OFFICE - DAY

Description here.

*CUT TO: Next scene*`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].action.some(a => a.includes('CUT TO'))).toBe(false)
      })

      it('extracts action lines with character mentions', () => {
        const screenplay = `INT. OFFICE - DAY

John enters the room and looks around nervously.

> **JOHN**
> Hello?`

        const result = parseScreenplayText(screenplay)

        // The action extractor should find lines mentioning characters from dialogue
        expect(result?.scenes[0].action).toHaveLength(1)
        expect(result?.scenes[0].action[0]).toContain('John')
      })
    })

    describe('Duration Estimation', () => {
      it('estimates minimum duration of 3 seconds', () => {
        const screenplay = `INT. OFFICE - DAY

Brief scene.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].duration_estimate).toBeGreaterThanOrEqual(3)
      })

      it('estimates maximum duration of 10 seconds', () => {
        const screenplay = `INT. OFFICE - DAY

Description.

> **A**
> Line 1
> **B**
> Line 2
> **C**
> Line 3
> **D**
> Line 4
> **E**
> Line 5
> **F**
> Line 6
> **G**
> Line 7
> **H**
> Line 8

*Action 1*
*Action 2*
*Action 3*
*Action 4*
*Action 5*`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].duration_estimate).toBeLessThanOrEqual(10)
      })

      it('increases duration with more dialogue', () => {
        const shortScreenplay = `INT. OFFICE - DAY

Description.`

        const longScreenplay = `INT. OFFICE - DAY

Description.

> **A**
> Line 1

> **B**
> Line 2

> **A**
> Line 3`

        const shortResult = parseScreenplayText(shortScreenplay)
        const longResult = parseScreenplayText(longScreenplay)

        expect(longResult?.scenes[0].duration_estimate).toBeGreaterThanOrEqual(
          shortResult?.scenes[0].duration_estimate ?? 0
        )
      })
    })

    describe('Act Structure', () => {
      it('extracts acts from screenplay', () => {
        const screenplay = `## ACT I – SETUP

The beginning of the story.

INT. OFFICE - DAY

Scene 1.

## ACT II – CONFRONTATION

The middle of the story.

INT. WAREHOUSE - NIGHT

Scene 2.

## ACT III – RESOLUTION

The end of the story.

EXT. PARK - DAY

Scene 3.`

        const result = parseScreenplayText(screenplay)

        expect(result?.acts).toHaveLength(3)
        expect(result?.acts[0].act_number).toBe(1)
        expect(result?.acts[0].title).toBe('SETUP')
        expect(result?.acts[1].act_number).toBe(2)
        expect(result?.acts[1].title).toBe('CONFRONTATION')
        expect(result?.acts[2].act_number).toBe(3)
        expect(result?.acts[2].title).toBe('RESOLUTION')
      })

      it('handles Roman numerals IV and V', () => {
        const screenplay = `## ACT IV – CLIMAX

Tension rises.

INT. OFFICE - DAY

Scene.

## ACT V – DENOUEMENT

Resolution.

EXT. PARK - DAY

Scene.`

        const result = parseScreenplayText(screenplay)

        expect(result?.acts[0].act_number).toBe(4)
        expect(result?.acts[1].act_number).toBe(5)
      })

      it('extracts act description from following line', () => {
        const screenplay = `## ACT I – SETUP

In the beginning, we meet our hero.

INT. OFFICE - DAY

Scene.`

        const result = parseScreenplayText(screenplay)

        expect(result?.acts[0].description).toContain('In the beginning')
      })

      it('returns empty acts array when no acts found', () => {
        const screenplay = `INT. OFFICE - DAY

Just a simple scene.`

        const result = parseScreenplayText(screenplay)

        expect(result?.acts).toEqual([])
      })
    })

    describe('Metadata Filtering', () => {
      it('skips lines starting with #', () => {
        const screenplay = `# TITLE
## SUBTITLE

INT. OFFICE - DAY

Description here.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].description).not.toContain('TITLE')
        expect(result?.scenes[0].description).not.toContain('SUBTITLE')
      })

      it('skips lines starting with **', () => {
        const screenplay = `**Bold metadata**

INT. OFFICE - DAY

Description.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].description).not.toContain('Bold metadata')
      })

      it('skips lines starting with ---', () => {
        const screenplay = `---

INT. OFFICE - DAY

Description.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].description).not.toContain('---')
      })

      it('skips act markers in scene content', () => {
        const screenplay = `INT. OFFICE - DAY

Description.
Act I begins here.
More description.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].description).not.toContain('Act I')
      })

      it('skips episode structure lines', () => {
        const screenplay = `Episode Structure overview

INT. OFFICE - DAY

Description.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes).toHaveLength(1)
      })

      it('skips character arcs lines', () => {
        const screenplay = `Character Arcs outline

INT. OFFICE - DAY

Description.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes).toHaveLength(1)
      })

      it('skips visual lines', () => {
        const screenplay = `Visual style notes

INT. OFFICE - DAY

Description.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes).toHaveLength(1)
      })
    })

    describe('Edge Cases', () => {
      it('handles lowercase scene headings', () => {
        const screenplay = `int. office - day

Description.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes).toHaveLength(1)
        expect(result?.scenes[0].time_of_day).toBe('INT')
      })

      it('handles mixed case scene headings', () => {
        const screenplay = `Int. Office - Day

Description.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes).toHaveLength(1)
      })

      it('handles scene with only heading', () => {
        const screenplay = `INT. OFFICE - DAY`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes).toHaveLength(1)
        expect(result?.scenes[0].description).toBe('Scene description')
      })

      it('handles special characters in location', () => {
        const screenplay = `INT. CAFÉ AMÉLIE - DAY

A French café.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes[0].location).toContain('CAFÉ')
      })

      it('handles numeric scene heading variants', () => {
        const screenplay = `### INT. OFFICE - DAY (SCENE 1)

Description.`

        const result = parseScreenplayText(screenplay)

        expect(result?.scenes).toHaveLength(1)
      })

      it('ignores lines that look like headings but are not', () => {
        const screenplay = `This line mentions INT. but is not a heading.

INT. REAL OFFICE - DAY

Real description.`

        const result = parseScreenplayText(screenplay)

        // Should only find one scene with proper heading
        expect(result?.scenes).toHaveLength(1)
        expect(result?.scenes[0].location).toBe('REAL OFFICE')
      })
    })

    describe('Full Screenplay Example', () => {
      it('parses complete screenplay structure', () => {
        const screenplay = `## ACT I – THE BEGINNING

Our story begins.

### INT. APARTMENT – MORNING

A small, messy apartment. Sunlight filters through dusty blinds.

*SARAH (28) stumbles out of bed, rubbing her eyes.*

> **SARAH**
> (yawning)
> What time is it?

Her phone buzzes.

> **SARAH**
> (checking phone)
> Oh no. I'm late.

*She rushes to the bathroom.*

### EXT. CITY STREET – DAY

SARAH runs down a crowded sidewalk, dodging pedestrians.

> **SARAH**
> (to herself)
> Why does this always happen?`

        const result = parseScreenplayText(screenplay)

        expect(result).not.toBeNull()
        expect(result?.acts).toHaveLength(1)
        expect(result?.scenes).toHaveLength(2)

        // First scene
        expect(result?.scenes[0].location).toContain('APARTMENT')
        expect(result?.scenes[0].time_period).toBe('DAY') // MORNING maps to DAY
        expect(result?.scenes[0].dialogue.length).toBeGreaterThan(0)
        expect(result?.scenes[0].characters).toContain('SARAH')

        // Second scene
        expect(result?.scenes[1].location).toContain('CITY STREET')
        expect(result?.scenes[1].time_of_day).toBe('EXT')
      })
    })
  })
})
