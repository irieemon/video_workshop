import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/series/standalone - Get user's standalone series ID
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use the database function to get user's standalone series
    const { data, error } = await supabase.rpc('get_user_standalone_series', {
      p_user_id: user.id,
    })

    if (error) {
      // If the function fails, try direct query as fallback
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('series')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_system', true)
        .single()

      if (fallbackError) {
        // No standalone series exists, create one
        const { data: newSeries, error: createError } = await supabase
          .from('series')
          .insert({
            user_id: user.id,
            name: 'Standalone Videos',
            description: 'Videos not associated with any series',
            is_system: true,
            genre: null,
          })
          .select('id, name')
          .single()

        if (createError) throw createError
        return NextResponse.json({ id: newSeries.id, name: newSeries.name })
      }

      return NextResponse.json({ id: fallbackData.id, name: fallbackData.name })
    }

    // data is the UUID returned from the RPC function
    return NextResponse.json({ id: data, name: 'Standalone Videos' })
  } catch (error: any) {
    console.error('Standalone series fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch standalone series' },
      { status: 500 }
    )
  }
}
