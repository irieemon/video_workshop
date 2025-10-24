import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { analyzeCharacterImage, analyzeMultipleImages } from '@/lib/ai/vision-analysis'

// POST /api/series/[seriesId]/characters/[characterId]/analyze-image - Analyze character image with AI vision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; characterId: string }> }
) {
  try {
    const { seriesId, characterId } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership of character through series
    const { data: character, error: charError } = await supabase
      .from('series_characters')
      .select(`
        id,
        name,
        visual_reference_url,
        visual_cues,
        series:series!inner(id, user_id)
      `)
      .eq('id', characterId)
      .eq('series_id', seriesId)
      .single()

    if (charError) {
      if (charError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 })
      }
      throw charError
    }

    const seriesData = Array.isArray(character.series) ? character.series[0] : character.series
    if (seriesData.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if character has images to analyze
    if (!character.visual_reference_url && (!character.visual_cues || character.visual_cues.length === 0)) {
      return NextResponse.json(
        { error: 'No images found for this character. Upload a visual reference first.' },
        { status: 400 }
      )
    }

    // Collect all image URLs
    const imageUrls: string[] = []
    if (character.visual_reference_url) {
      imageUrls.push(character.visual_reference_url)
    }
    if (character.visual_cues && Array.isArray(character.visual_cues)) {
      character.visual_cues.forEach((cue: any) => {
        if (cue.url) imageUrls.push(cue.url)
      })
    }

    // Analyze images
    console.log(`Analyzing ${imageUrls.length} image(s) for character ${character.name}...`)
    const analysisResult = imageUrls.length === 1
      ? await analyzeCharacterImage(imageUrls[0])
      : await analyzeMultipleImages(imageUrls)

    // Update character with analyzed visual fingerprint
    const { data: updatedCharacter, error: updateError } = await supabase
      .from('series_characters')
      .update({
        visual_fingerprint: analysisResult.visual_fingerprint,
        // Database trigger will auto-update sora_prompt_template
      })
      .eq('id', characterId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    console.log(`✓ Character ${character.name} analyzed successfully`)

    return NextResponse.json({
      success: true,
      character: updatedCharacter,
      analysis: {
        confidence: analysisResult.confidence,
        notes: analysisResult.analysis_notes,
        images_analyzed: imageUrls.length,
      }
    })
  } catch (error: any) {
    console.error('Image analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze image' },
      { status: 500 }
    )
  }
}
