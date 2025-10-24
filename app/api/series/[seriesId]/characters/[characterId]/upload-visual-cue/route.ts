import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { VisualCue, VisualCueType } from '@/lib/types/database.types'
import { analyzeCharacterImage } from '@/lib/ai/vision-analysis'

// POST /api/series/[seriesId]/characters/[characterId]/upload-visual-cue - Upload visual reference image
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
      .select(
        `
        id,
        visual_cues,
        series:series!inner(id, user_id)
      `
      )
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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const caption = formData.get('caption') as string
    const type = formData.get('type') as VisualCueType
    const isPrimary = formData.get('isPrimary') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed types: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Validate visual cue type
    const validTypes: VisualCueType[] = ['full-body', 'face', 'costume', 'expression', 'other']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create file path: user_id/series_id/characters/character_id/filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${seriesId}/characters/${characterId}/${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('series-assets')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error('Failed to upload file')
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('series-assets').getPublicUrl(uploadData.path)

    // If this is the primary image, update visual_reference_url
    // Otherwise, add to visual_cues array
    if (isPrimary) {
      const { data: updatedCharacter, error: updateError } = await supabase
        .from('series_characters')
        .update({ visual_reference_url: publicUrl })
        .eq('id', characterId)
        .select()
        .single()

      if (updateError) throw updateError

      // Auto-analyze the primary image to extract visual characteristics
      try {
        console.log(`Auto-analyzing primary image for character ${characterId}...`)
        const analysisResult = await analyzeCharacterImage(publicUrl)

        // Update character with analyzed visual fingerprint
        const { error: fingerprintError } = await supabase
          .from('series_characters')
          .update({
            visual_fingerprint: analysisResult.visual_fingerprint,
            // Database trigger will auto-update sora_prompt_template
          })
          .eq('id', characterId)

        if (fingerprintError) {
          console.error('Failed to update visual fingerprint:', fingerprintError)
          // Don't fail the upload if analysis fails
        } else {
          console.log(`✓ Character visual fingerprint auto-generated`)
        }
      } catch (analysisError) {
        console.error('Auto-analysis failed:', analysisError)
        // Don't fail the upload if analysis fails - user can manually trigger it
      }

      return NextResponse.json({
        url: publicUrl,
        isPrimary: true,
        character: updatedCharacter,
      })
    } else {
      // Add to visual_cues array
      const existingCues = (character.visual_cues as VisualCue[]) || []

      const newCue: VisualCue = {
        url: publicUrl,
        caption: caption || '',
        type: type || 'other',
        uploaded_at: new Date().toISOString(),
      }

      const updatedCues = [...existingCues, newCue]

      const { data: updatedCharacter, error: updateError } = await supabase
        .from('series_characters')
        .update({ visual_cues: updatedCues })
        .eq('id', characterId)
        .select()
        .single()

      if (updateError) throw updateError

      return NextResponse.json({
        url: publicUrl,
        cue: newCue,
        isPrimary: false,
        character: updatedCharacter,
      })
    }
  } catch (error: any) {
    console.error('Visual cue upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload visual cue' },
      { status: 500 }
    )
  }
}

// DELETE /api/series/[seriesId]/characters/[characterId]/upload-visual-cue - Delete visual cue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; characterId: string }> }
) {
  try {
    const { seriesId, characterId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the URL to delete from query params
    const url = new URL(request.url)
    const imageUrl = url.searchParams.get('url')
    const isPrimary = url.searchParams.get('isPrimary') === 'true'

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
    }

    // Verify ownership through series
    const { data: character, error: charError } = await supabase
      .from('series_characters')
      .select(
        `
        id,
        visual_reference_url,
        visual_cues,
        series:series!inner(id, user_id)
      `
      )
      .eq('id', characterId)
      .eq('series_id', seriesId)
      .single()

    if (charError) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    const seriesData = Array.isArray(character.series) ? character.series[0] : character.series

    if (seriesData.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Extract file path from URL
    const urlObj = new URL(imageUrl)
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/series-assets\/(.+)/)
    if (!pathMatch) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
    }
    const filePath = pathMatch[1]

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('series-assets')
      .remove([filePath])

    if (deleteError) {
      console.error('Storage deletion error:', deleteError)
      // Continue even if storage deletion fails
    }

    // Update database
    if (isPrimary) {
      const { error: updateError } = await supabase
        .from('series_characters')
        .update({ visual_reference_url: null })
        .eq('id', characterId)

      if (updateError) throw updateError
    } else {
      // Remove from visual_cues array
      const existingCues = (character.visual_cues as VisualCue[]) || []
      const updatedCues = existingCues.filter((cue) => cue.url !== imageUrl)

      const { error: updateError } = await supabase
        .from('series_characters')
        .update({ visual_cues: updatedCues })
        .eq('id', characterId)

      if (updateError) throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Visual cue deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete visual cue' },
      { status: 500 }
    )
  }
}
