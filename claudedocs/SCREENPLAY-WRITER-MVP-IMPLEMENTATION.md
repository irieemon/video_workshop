# Screenplay Writer Feature - MVP Implementation Plan
**Date**: 2025-10-23
**Status**: Foundation Complete - Ready for UI Development

## Overview
Professional screenplay writing assistant integrated into the video generation platform. Helps users create series and episodes with industry-standard structure that automatically converts to video prompts.

## Requirements Gathered (Brainstorming Session)

### ✅ Confirmed Decisions
1. **Creation Flow**: Guided Discovery (agent asks questions, builds from answers)
2. **Expertise Level**: Industry Professional (real screenplay terminology and structure)
3. **Series Types**: Universal Foundation (works for TV, commercials, social media)
4. **Integration**: Enhancement Layer (optional tool that enhances existing series)
5. **Scene Workflow**: Scenes automatically become video prompts
6. **Character System**: Extend existing characters with dramatic arc fields
7. **User Interface**: Pure Dialogue Mode (conversational agent)
8. **Output**: Dual Export (production breakdown + screenplay documents)

### 🎯 MVP Scope
**Phase 1 Features** (Current Implementation):
- ✅ Screenplay agent dialogue interface
- ✅ Series creation through guided conversation
- ✅ Episode structure with act breaks
- ✅ Character profiles with dramatic arcs (want/need/flaw)
- ✅ Scene breakdown with automatic video prompt generation
- ✅ Basic export: production breakdown

**Deferred to Phase 2**:
- Full screenplay document export (PDF/Fountain)
- A/B/C plot visualization
- Series bible auto-generation
- Character arc timeline view
- Episode-to-episode continuity checker

## Database Schema

### New Tables Created

#### 1. **episodes** - Professional Episode Structure
```sql
Fields:
- id, series_id, episode_number, title, logline
- structure_type (three_act, five_act, hero_journey, save_the_cat)
- act_breakdown (JSONB - acts with scenes and beats)
- plots (JSONB - A/B/C plot tracking)
- story_beats (JSONB - inciting incident, midpoint, climax, etc.)
- character_development (JSONB - character changes per episode)
- runtime_minutes, status, notes
```

#### 2. **scenes** - Individual Scenes → Video Prompts
```sql
Fields:
- id, episode_id, scene_number
- scene_heading (INT/EXT. LOCATION - TIME)
- location, time_of_day, interior_exterior
- action_description, dialogue (JSONB), emotional_beat
- act_number, plot_line (A/B/C), scene_purpose, story_function
- characters_present (UUID[]), props_needed
- video_id (links to generated video)
- video_prompt (auto-generated from scene details)
```

#### 3. **screenplay_sessions** - Agent Dialogue Tracking
```sql
Fields:
- id, series_id, user_id
- conversation_history (JSONB - full chat)
- current_step, completed_steps
- target_type (series/episode/scene/character), target_id
```

### Extended Existing Tables

#### **series** - Added Screenplay Metadata
```sql
New Fields:
- screenplay_data (JSONB - logline, premise, genre, tone, audience, template)
- series_bible (TEXT - character profiles, world rules)
- overall_story_arc (TEXT - long-term narrative)
```

#### **series_characters** - Added Dramatic Profiles
```sql
New Fields:
- dramatic_profile (JSONB - want, need, flaw, backstory wound, arc type, role)
- character_bio (TEXT - rich description)
```

### Automatic Features
- **Auto-generate video prompts**: Trigger on scene insert/update
- **RLS policies**: Users only access their own screenplay data
- **Helper function**: `generate_scene_video_prompt(scene_id)` creates prompts from scene elements
- **View**: `episode_overview` shows episodes with scene counts and production status

## Screenplay Agent System

### Professional Expertise
The agent is configured with deep knowledge in:

**Story Structure**:
- Three-Act Structure (Setup → Confrontation → Resolution)
- Five-Act Structure (Classical dramatic structure)
- Hero's Journey (Campbell's monomyth)
- Save the Cat (Blake Snyder's beat sheet)

**Character Development**:
- Want vs. Need (external goal vs. internal growth)
- Fatal Flaw (character weakness)
- Character Arc (positive/negative/flat transformation)
- Backstory Wound (past event driving behavior)

**Scene Craft**:
- Scene Purpose (advance plot, reveal character)
- Scene Structure (Goal → Conflict → Disaster)
- Emotional Beats tracking
- Show Don't Tell principles

**Professional Format**:
- INT/EXT scene headings
- Action lines (present tense, visual)
- Proper dialogue formatting
- Page count guidelines (1 page = 1 min)

### Guided Discovery Process

The agent follows this systematic flow:

**Phase 1: Core Concept**
- Logline (protagonist + goal + obstacles)
- Genre and tone
- Target audience
- Unique selling point

**Phase 2: Protagonist Deep Dive**
- Who they are (background, defining trait)
- What they WANT (concrete external goal)
- What they NEED (internal growth required)
- Fatal flaw (what holds them back)
- Backstory wound (what drives behavior)

**Phase 3: Story Structure**
- Inciting incident (disrupts normal world)
- First plot point (point of no return)
- Midpoint revelation (false victory/defeat)
- Dark night of the soul (lowest point)
- Climax (final confrontation)
- Resolution (new equilibrium)

**Phase 4: Supporting Cast**
- Key characters and their roles
- Character relationships
- Relationship evolution

**Phase 5: Episode Planning**
- Total episode count
- Season/series arc
- Major episode beats
- A/B/C plot structure

**Phase 6: Scene Breakdown**
- Key scenes per act
- Scene purpose
- Character appearances
- Emotional progression

### Conversation Style
- **Socratic questioning**: Ask clarifying questions to understand vision
- **Professional terminology**: Use industry terms with clear explanations
- **Probe deeper**: Challenge surface-level answers
- **Teach while building**: Explain *why* choices matter
- **Adaptive expertise**: Detect user knowledge level and adjust

### Red Flags the Agent Catches
- Protagonist lacking clear want/need
- Weak or late inciting incident
- No real stakes or consequences
- Passive protagonist
- Unclear motivation
- Deus ex machina solutions
- Missing emotional logic

## Data Flow: Screenplay → Video Production

### 1. Series Creation
```
User starts dialogue with agent
↓
Agent asks guided questions
↓
Series screenplay_data populated
- Logline
- Premise
- Genre/tone
- Structure template
```

### 2. Character Development
```
Agent explores character depth
↓
series_characters extended with dramatic_profile
- Want vs Need
- Fatal flaw
- Arc type
- Backstory wound
```

### 3. Episode Structure
```
Agent breaks down episode
↓
episodes table created with
- Act breakdown
- Story beats
- A/B/C plots
```

### 4. Scene Creation
```
Agent crafts individual scenes
↓
scenes table populated with
- Scene heading (INT/EXT. LOCATION - TIME)
- Action description
- Dialogue
- Characters present
↓
Trigger automatically generates video_prompt
↓
User clicks "Generate Video" on scene
↓
Existing video generation system takes over
- Uses scene's video_prompt
- References characters_present for consistency
- AI roundtable refines prompt
- Sora generates video
↓
video_id linked back to scene
```

### 5. Production Tracking
```
Episode view shows:
- Total scenes
- Scenes with videos generated
- Estimated runtime
- Production status
```

## Integration Points with Existing System

### ✅ Leverages Current Features
1. **Character System**:
   - Uses existing `series_characters` table
   - Extends with dramatic_profile for screenplay
   - Visual fingerprints + voice profiles work with screenplay character development

2. **Video Generation**:
   - Scene prompts feed into existing video creation flow
   - AI roundtable can refine screenplay-generated prompts
   - Sora integration unchanged

3. **Series Structure**:
   - Built on existing `series` table
   - Episodes nest under series
   - Scenes nest under episodes

### 🆕 New Capabilities Added
1. **Professional Structure**: Act breaks, story beats, character arcs
2. **Dialogue Interface**: Conversational creation flow
3. **Automatic Prompt Generation**: Scenes → video prompts
4. **Production Breakdown**: Scene-by-scene planning

## Next Steps for Full Implementation

### Immediate (To Complete MVP)
1. **Create API Routes**:
   - `POST /api/screenplay/session/start` - Begin agent dialogue
   - `POST /api/screenplay/session/message` - Send/receive agent messages
   - `GET /api/screenplay/session/:id` - Resume session
   - `POST /api/screenplay/export/breakdown` - Generate production breakdown

2. **Build UI Components**:
   - Screenplay chat interface (like existing roundtable)
   - Episode structure visualizer
   - Scene list with video generation buttons
   - Character dramatic profile editor

3. **Connect to OpenAI**:
   - Use existing agent orchestrator pattern
   - Add screenplay agent to roster
   - Stream responses like roundtable

### Phase 2 Enhancements
1. Full screenplay PDF export (Final Draft format)
2. Fountain format export (plain text screenplay)
3. A/B/C plot timeline visualization
4. Character arc graph per episode
5. Series bible auto-generation
6. Continuity checker between episodes

### Phase 3 Advanced Features
1. Multiple structure templates with wizard
2. Collaborative editing (multiple writers)
3. Version control and script revisions
4. Budget estimation from screenplay
5. Production calendar integration

## Technical Architecture

### Frontend Stack
```
React 19 + TypeScript
- Screenplay chat UI (similar to roundtable modal)
- Episode/scene management views
- Character dramatic profile forms
- Production breakdown viewer
```

### Backend Stack
```
Next.js 15 API Routes
- Screenplay session management
- OpenAI streaming integration
- Export generation (PDF/Fountain)
- Scene → video prompt conversion
```

### Database
```
Supabase PostgreSQL
- New tables: episodes, scenes, screenplay_sessions
- Extended: series, series_characters
- JSONB for flexible screenplay data
- Triggers for auto-prompt generation
```

### AI Integration
```
OpenAI GPT-4
- Screenplay agent persona
- Streaming dialogue responses
- Professional structure validation
- Export document generation
```

## Success Metrics (MVP)

### User Engagement
- % of series that use screenplay writer
- Average session length (indicates depth of planning)
- Completion rate (series → episodes → scenes)

### Production Impact
- Scenes created per series (screenplay vs non-screenplay)
- Video generation rate from screenplay scenes
- User retention (do they come back to expand screenplay)

### Quality Indicators
- Character dramatic profiles completed
- Episodes with full act structure
- Scenes with proper formatting
- User feedback on agent guidance quality

## Migration Strategy

### Existing Users
1. No disruption to current workflow
2. Screenplay writer appears as optional enhancement
3. Can add screenplay structure to existing series retroactively

### New Users
1. Can choose quick path (current) or screenplay path
2. Guided to screenplay writer for series with >3 episodes
3. Onboarding highlights screenplay benefits for serious creators

## Documentation Needed

1. **User Guide**: "Creating Professional Screenplays"
2. **Screenplay Terminology Reference**
3. **Video Tutorial**: Screenplay agent walkthrough
4. **API Documentation**: Screenplay endpoints
5. **Developer Guide**: Extending screenplay features

## Risks & Mitigations

### Risk: Complexity Overwhelms Users
**Mitigation**:
- Keep agent conversational and patient
- Explain jargon in plain language
- Allow skipping advanced features
- Progressive disclosure of options

### Risk: Performance Issues with Large Screenplays
**Mitigation**:
- Paginate scene lists
- Lazy load episode details
- Index optimization on screenplay_sessions
- Cache generated prompts

### Risk: Agent Produces Poor Guidance
**Mitigation**:
- Extensive system prompt with examples
- Test with various screenplay types
- User feedback mechanism
- Human review of agent suggestions

## Summary

**Status**: Foundation complete ✅
- Database schema designed and ready to migrate
- Screenplay agent system prompt created with professional expertise
- Data flow mapped from screenplay → video production
- Integration points identified with existing system

**Next Actions**:
1. Run database migration
2. Create API routes for screenplay sessions
3. Build chat UI for agent dialogue
4. Connect OpenAI with screenplay agent persona
5. Test end-to-end flow: series → episode → scene → video

**Timeline Estimate**:
- API Routes: 1-2 days
- UI Components: 2-3 days
- OpenAI Integration: 1 day
- Testing & Refinement: 1-2 days
**Total MVP**: ~1 week of development

This foundation provides everything needed to build a professional screenplay writing tool that seamlessly integrates with the existing video generation platform.
