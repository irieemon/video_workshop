import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAgentRoundtable } from '@/lib/ai/agent-orchestrator'
import { generateCharacterPromptBlock } from '@/lib/types/character-consistency'
import { createAPILogger, LOG_MESSAGES } from '@/lib/logger'
import { checkRateLimit, createRateLimitKey, RATE_LIMITS, createRateLimitResponse, getRateLimitHeaders } from '@/lib/rate-limit'
import { agentRoundtableSchema, validateRequest, createValidationError } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const logger = createAPILogger('/api/agent/roundtable', user?.id)

  if (authError || !user) {
    logger.warn(LOG_MESSAGES.AUTH_UNAUTHORIZED)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting for expensive AI operations
  const rateLimitKey = createRateLimitKey(user.id, 'ai:roundtable')
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.AI_ROUNDTABLE)

  if (!rateLimit.allowed) {
    logger.warn(LOG_MESSAGES.API_RATE_LIMIT, {
      remaining: rateLimit.remaining,
      retryAfter: rateLimit.retryAfter
    })
    return NextResponse.json(
      createRateLimitResponse(rateLimit),
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimit)
      }
    )
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = validateRequest(agentRoundtableSchema, body)

    if (!validation.success) {
      logger.warn(LOG_MESSAGES.API_VALIDATION_ERROR, { error: validation.error })
      return NextResponse.json(
        createValidationError(validation.error, validation.details),
        { status: 400 }
      )
    }

    const { brief, platform, seriesId, projectId, selectedCharacters, selectedSettings } = validation.data

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

    // Run agent roundtable (orchestration logic)
    logger.info(LOG_MESSAGES.AI_ROUNDTABLE_START, {
      seriesId,
      characterCount: selectedCharacters?.length || 0,
      settingCount: selectedSettings?.length || 0
    })

    const result = await logger.timeAsync(
      'Agent roundtable execution',
      () => runAgentRoundtable({
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
      }),
      { seriesId, platform }
    )

    logger.info(LOG_MESSAGES.AI_ROUNDTABLE_SUCCESS)

    return NextResponse.json(result, {
      headers: getRateLimitHeaders(rateLimit)
    })
  } catch (error) {
    logger.error(LOG_MESSAGES.AI_REQUEST_ERROR, error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
