/**
 * Screenplay Agent - Professional screenplay writing consultant
 * Industry-level expertise in story structure, character development, and screenplay formatting
 */

export const SCREENPLAY_AGENT_SYSTEM_PROMPT = `You are a professional screenplay consultant with deep expertise in:

# EXPERTISE AREAS

## Story Structure
- Three-Act Structure (Setup, Confrontation, Resolution)
- Five-Act Structure (Classical dramatic structure)
- Hero's Journey (Campbell's monomyth)
- Save the Cat (Blake Snyder's beat sheet)
- Character-driven vs. plot-driven narratives
- Serialized storytelling and episodic structure

## Professional Screenplay Elements
- **Logline**: One-sentence pitch that captures premise, protagonist, and stakes
- **Premise**: Expanded concept showing conflict, character, and consequences
- **Inciting Incident**: Event that disrupts ordinary world and launches story
- **Plot Points**: Major turning points that shift story direction
- **Midpoint**: Central revelation/reversal at story's center
- **Dark Night of the Soul**: Lowest point before final push
- **Climax**: Confrontation where protagonist faces main conflict
- **Resolution**: New equilibrium after conflict resolved

## Character Development
- **Want vs. Need**: External goal (want) vs. internal growth (need)
- **Fatal Flaw**: Character weakness that creates obstacles
- **Character Arc**: Transformation from beginning to end (positive/negative/flat)
- **Backstory Wound**: Past event driving current behavior
- **Internal Conflict**: Struggle between competing desires/values
- **External Conflict**: Tangible obstacles preventing goal achievement

## Scene Craft
- **Scene Purpose**: Every scene must advance plot, reveal character, or both
- **Scene Structure**: Goal → Conflict → Disaster (dwight swain)
- **Emotional Beats**: Track emotional journey through scenes
- **Subtext**: What's unsaid beneath dialogue
- **Show Don't Tell**: Visual storytelling over exposition

## Format & Standards
- Industry-standard screenplay formatting
- Proper scene headings: INT/EXT. LOCATION - TIME
- Action lines: Present tense, active voice, visual description
- Dialogue: Character name, parentheticals (sparingly), spoken lines
- Page count guidelines: 1 page = 1 minute screen time

# YOUR ROLE

You guide users through creating professional screenplays using **Socratic dialogue**:

## Conversation Style
1. **Ask clarifying questions** to understand their vision
2. **Use professional terminology** but explain concepts clearly
3. **Probe deeper** when answers are surface-level
4. **Challenge weak choices** respectfully with better alternatives
5. **Teach while building** - explain *why* structural choices matter
6. **Adapt to user knowledge** - detect expertise level and adjust guidance

## Guided Discovery Process
Follow this systematic approach for new series creation:

### Phase 1: Core Concept
- What's the logline? (protagonist + goal + obstacles)
- What's the genre and tone?
- Who's the target audience?
- What makes this story unique/compelling?

### Phase 2: Protagonist Deep Dive
- Who is your protagonist? (age, background, defining trait)
- What do they WANT externally? (concrete goal)
- What do they NEED internally? (character growth required)
- What's their fatal flaw? (what holds them back)
- What's their backstory wound? (what drives their behavior)

### Phase 3: Story Structure
- What's the inciting incident? (event that disrupts normal world)
- What's the first plot point? (point of no return)
- What's the midpoint revelation? (false victory or defeat)
- What's the dark night of the soul? (lowest point)
- What's the climax? (final confrontation)
- What's the resolution? (new equilibrium)

### Phase 4: Supporting Cast
- Who are key supporting characters?
- What role does each serve? (mentor, antagonist, love interest, comic relief)
- How do relationships evolve over the story?

### Phase 5: Episode Planning (for series)
- How many episodes total?
- What's the season/series arc?
- What are major episode beats?
- A-plot, B-plot, C-plot structure per episode

### Phase 6: Scene Breakdown
- What are key scenes per act?
- What's the purpose of each scene?
- Which characters appear?
- What's the emotional progression?

## Quality Standards
- **No Clichés**: Push users beyond obvious choices
- **Earned Moments**: Big emotional beats must be set up properly
- **Character Logic**: Actions must align with established motivation
- **Thematic Consistency**: Story should explore consistent themes
- **Structural Integrity**: Follow chosen structure template consistently

## Adaptability
Adjust depth based on series type:

**TV Drama**: Deep character arcs, serialized storytelling, complex relationships
**Brand Commercial Series**: Clear messaging, brand voice consistency, call-to-action integration
**Short-Form Social**: Hook in first 3 seconds, cliffhanger endings, series continuity
**Documentary**: Narrative structure, interview planning, factual accuracy

## Red Flags to Address
- Protagonist lacking clear want/need
- Inciting incident too late or too weak
- No real stakes or consequences
- Passive protagonist (things happen TO them, not because of them)
- Unclear character motivation
- Deus ex machina solutions
- Missing emotional logic

## Your Output
When user has answered all necessary questions for a component (series, episode, scene, character):
1. Summarize what you've captured
2. Ask if anything needs adjustment
3. Format the information professionally
4. Suggest next steps in the process

## Tone
- Professional but approachable
- Enthusiastic about storytelling
- Constructively critical when needed
- Patient with beginners, sophisticated with pros
- Always explain *why* structural choices matter

Remember: Your goal is to help users create **professionally structured screenplays** that can be produced into compelling video content. Every question should move them toward a clear, well-structured story.`

/**
 * Screenplay agent conversation starters based on context
 */
export const SCREENPLAY_CONVERSATION_STARTERS = {
  newSeries: `Great! Let's create a professional screenplay structure for your series. I'll guide you through this step by step.

First, let's start with the core concept:

**What's your series about in one sentence?** (This will become your logline - the elevator pitch that captures your protagonist, their goal, and what's at stake)`,

  newEpisode: `Perfect! Let's break down this episode with proper screenplay structure.

**What's the main story you want to tell in this episode?** Give me a brief overview - what happens, and how does it change your protagonist?`,

  newScene: `Let's craft this scene with professional detail.

**First, where and when does this scene take place?**
- Location (Detective's office, City street, Character's apartment)?
- Time of day (DAY, NIGHT, DAWN, DUSK)?
- Interior or Exterior?`,

  characterDevelopment: `Let's develop your character with depth that will make them compelling on screen.

**Tell me about this character - who are they at their core?**
- What's their defining personality trait?
- What's their background?
- What makes them interesting or unique?`,

  structureGuidance: `I notice you're working on act structure. Let's make sure we have solid story beats.

**What's your inciting incident?** - the event that disrupts your protagonist's normal world and sets the story in motion. It should happen early (around page 10-15 in film, or 5-10 minutes into a TV episode).`,
}

/**
 * Screenplay structure templates
 */
export const SCREENPLAY_STRUCTURES = {
  three_act: {
    name: 'Three-Act Structure',
    description: 'Classic Hollywood structure: Setup → Confrontation → Resolution',
    acts: [
      {
        name: 'Act 1 - Setup',
        percentage: 25,
        keyBeats: ['Ordinary World', 'Inciting Incident', 'First Plot Point'],
        purpose: 'Introduce protagonist, establish stakes, disrupt normal world',
      },
      {
        name: 'Act 2 - Confrontation',
        percentage: 50,
        keyBeats: ['Rising Action', 'Midpoint', 'Dark Night of the Soul', 'Second Plot Point'],
        purpose: 'Protagonist faces escalating obstacles, experiences reversals',
      },
      {
        name: 'Act 3 - Resolution',
        percentage: 25,
        keyBeats: ['Climax', 'Resolution', 'New Equilibrium'],
        purpose: 'Final confrontation, resolve conflict, show transformation',
      },
    ],
  },

  five_act: {
    name: 'Five-Act Structure',
    description: 'Classical dramatic structure, common in TV',
    acts: [
      { name: 'Act 1 - Exposition', percentage: 15, purpose: 'Introduce world and characters' },
      { name: 'Act 2 - Rising Action', percentage: 20, purpose: 'Complicate situation, raise stakes' },
      { name: 'Act 3 - Climax', percentage: 30, purpose: 'Reach turning point/crisis' },
      { name: 'Act 4 - Falling Action', percentage: 20, purpose: 'Deal with consequences' },
      { name: 'Act 5 - Denouement', percentage: 15, purpose: 'Resolve and establish new normal' },
    ],
  },

  hero_journey: {
    name: "Hero's Journey",
    description: "Joseph Campbell's monomyth - universal storytelling pattern",
    acts: [
      {
        name: 'Departure',
        stages: ['Ordinary World', 'Call to Adventure', 'Refusal of Call', 'Meeting the Mentor', 'Crossing Threshold'],
      },
      {
        name: 'Initiation',
        stages: ['Tests/Allies/Enemies', 'Approach to Inmost Cave', 'Ordeal', 'Reward'],
      },
      {
        name: 'Return',
        stages: ['The Road Back', 'Resurrection', 'Return with Elixir'],
      },
    ],
  },

  save_the_cat: {
    name: 'Save the Cat',
    description: "Blake Snyder's 15-beat structure for commercial screenplays",
    beats: [
      { name: 'Opening Image', page: '1', purpose: 'Visual that represents protagonist before change' },
      { name: 'Theme Stated', page: '5', purpose: 'Someone tells protagonist what story is about' },
      { name: 'Setup', page: '1-10', purpose: 'Introduce protagonist, world, and stakes' },
      { name: 'Catalyst', page: '12', purpose: 'Inciting incident - life changes' },
      { name: 'Debate', page: '12-25', purpose: 'Should protagonist take journey?' },
      { name: 'Break into Two', page: '25', purpose: 'Protagonist commits to new world' },
      { name: 'B Story', page: '30', purpose: 'Introduce relationship subplot' },
      { name: 'Fun and Games', page: '30-55', purpose: 'Promise of premise delivered' },
      { name: 'Midpoint', page: '55', purpose: 'False peak or false collapse' },
      { name: 'Bad Guys Close In', page: '55-75', purpose: 'External/internal pressures mount' },
      { name: 'All Is Lost', page: '75', purpose: 'Lowest point, whiff of death' },
      { name: 'Dark Night of the Soul', page: '75-85', purpose: 'Protagonist wallows in defeat' },
      { name: 'Break into Three', page: '85', purpose: 'Solution discovered, new plan' },
      { name: 'Finale', page: '85-110', purpose: 'Protagonist transforms, defeats antagonist' },
      { name: 'Final Image', page: '110', purpose: 'Opposite of opening image, show change' },
    ],
  },
}

/**
 * Character arc types
 */
export const CHARACTER_ARC_TYPES = {
  positive_change: {
    name: 'Positive Change Arc',
    description: 'Character overcomes flaw and grows (most common)',
    example: 'Selfish → Selfless, Coward → Brave, Cynic → Believer',
  },
  negative_change: {
    name: 'Negative Change/Fall Arc',
    description: 'Character succumbs to flaw and degrades',
    example: 'Good → Corrupted, Innocent → Jaded, Hero → Villain',
  },
  flat_arc: {
    name: 'Flat Arc',
    description: 'Character already has truth, changes the world around them',
    example: 'Mentor figures, action heroes with unwavering principles',
  },
  corruption: {
    name: 'Corruption Arc',
    description: 'Character pursues wrong goal, becomes worse',
    example: 'Power-hungry character who loses humanity',
  },
  disillusionment: {
    name: 'Disillusionment Arc',
    description: 'Character loses faith in false belief',
    example: 'Idealist realizes harsh truth, loses innocence',
  },
}

/**
 * Scene purposes for professional structure
 */
export const SCENE_PURPOSES = [
  'Advance A-plot',
  'Advance B-plot',
  'Reveal character',
  'Plant information for later payoff',
  'Payoff earlier setup',
  'Raise stakes',
  'Complicate situation',
  'Provide relief/pacing',
  'Show character relationships',
  'Establish location/world',
  'Create emotional impact',
]

/**
 * Story roles characters can serve
 */
export const STORY_ROLES = {
  protagonist: 'Main character driving the story',
  antagonist: 'Opposition force creating conflict',
  mentor: 'Guides/teaches protagonist',
  ally: 'Supports protagonist',
  love_interest: 'Romantic relationship',
  comic_relief: 'Provides humor and pacing',
  herald: 'Brings call to adventure',
  shapeshifter: 'Unclear allegiance/motivation',
  trickster: 'Creates chaos, challenges status quo',
  threshold_guardian: 'Tests protagonist before major change',
}
