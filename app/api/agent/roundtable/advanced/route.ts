import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAdvancedRoundtable } from '@/lib/ai/agent-orchestrator'
import { generateCharacterPromptBlock } from '@/lib/types/character-consistency'
import { enforceQuota, incrementUsage } from '@/lib/stripe/usage'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check consultation quota
    const quotaCheck = await enforceQuota(supabase, user.id, 'consultations')
    if (!quotaCheck.allowed) {
      return quotaCheck.response
    }

    const body = await request.json()
    const {
      brief,
      platform,
      seriesId,
      selectedCharacters,
      selectedSettings,
      userPromptEdits,
      shotList,
      additionalGuidance,
    } = body

    // Validate required fields
    if (!brief || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: brief, platform' },
        { status: 400 }
      )
    }

    // Fetch series context if applicable
    let visualTemplate = null
    let seriesCharacters = null
    let seriesSettings = null
    let visualAssets = null
    let characterRelationships = null
    let seriesSoraSettings = null
    let characterContext = ''

    if (seriesId) {
      const { data: series } = await supabase
        .from('series')
        .select('visual_template, sora_camera_style, sora_lighting_mood, sora_color_palette, sora_overall_tone, sora_narrative_prefix')
        .eq('id', seriesId)
        .single()

      visualTemplate = series?.visual_template

      // Extract Sora settings
      if (series) {
        seriesSoraSettings = {
          sora_camera_style: series.sora_camera_style,
          sora_lighting_mood: series.sora_lighting_mood,
          sora_color_palette: series.sora_color_palette,
          sora_overall_tone: series.sora_overall_tone,
          sora_narrative_prefix: series.sora_narrative_prefix,
        }
      }

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

        // Fetch character relationships for selected characters
        const { data: relationships } = await supabase
          .from('character_relationships')
          .select(`
            *,
            character_a:series_characters!character_relationships_character_a_id_fkey(id, name),
            character_b:series_characters!character_relationships_character_b_id_fkey(id, name)
          `)
          .eq('series_id', seriesId)
          .or(`character_a_id.in.(${selectedCharacters.join(',')}),character_b_id.in.(${selectedCharacters.join(',')})`)
        characterRelationships = relationships
      }

      // Fetch selected settings
      if (selectedSettings && selectedSettings.length > 0) {
        const { data: settings } = await supabase
          .from('series_settings')
          .select('*')
          .in('id', selectedSettings)
        seriesSettings = settings
      }

      // Fetch all visual assets for this series
      const { data: assets } = await supabase
        .from('series_visual_assets')
        .select('*')
        .eq('series_id', seriesId)
        .order('display_order', { ascending: true })
      visualAssets = assets
    }

    // Run advanced agent roundtable with user edits
    const result = await runAdvancedRoundtable({
      brief,
      platform,
      visualTemplate: visualTemplate || undefined,
      seriesCharacters: seriesCharacters || undefined,
      seriesSettings: seriesSettings || undefined,
      visualAssets: visualAssets || undefined,
      characterRelationships: characterRelationships || undefined,
      seriesSoraSettings: seriesSoraSettings || undefined,
      characterContext: characterContext || undefined,
      userId: user.id,
      userPromptEdits,
      shotList,
      additionalGuidance,
    })

    // Increment consultation usage after successful completion
    await incrementUsage(supabase, user.id, 'consultations')

    return NextResponse.json(result)
  } catch (error) {
    console.error('Advanced roundtable error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
