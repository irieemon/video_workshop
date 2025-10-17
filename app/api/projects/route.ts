import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/projects - List all projects for authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch projects with video and series counts
    const { data: projects, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        videos:videos(count),
        series:series(count)
      `
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Transform the data to include counts
    const transformedProjects = projects.map((project: any) => ({
      ...project,
      video_count: project.videos[0]?.count || 0,
      series_count: project.series[0]?.count || 0,
      videos: undefined,
      series: undefined,
    }))

    return NextResponse.json(transformedProjects)
  } catch (error: any) {
    console.error('Projects fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project
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

    // Check user's profile and tier limits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, usage_quota, usage_current')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Check free tier project limit
    if (profile.subscription_tier === 'free') {
      const currentProjects = profile.usage_current?.projects || 0
      const maxProjects = profile.usage_quota?.projects || 3

      if (currentProjects >= maxProjects) {
        return NextResponse.json(
          {
            error: 'Project limit reached',
            code: 'QUOTA_EXCEEDED',
            message: `Free tier is limited to ${maxProjects} projects. Upgrade to Premium for unlimited projects.`,
          },
          { status: 429 }
        )
      }
    }

    // Parse request body
    const body = await request.json()
    const { name, description } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single()

    if (error) throw error

    // Increment project count
    await supabase
      .from('profiles')
      .update({
        usage_current: {
          ...profile.usage_current,
          projects: (profile.usage_current?.projects || 0) + 1,
        },
      })
      .eq('id', user.id)

    return NextResponse.json(project, { status: 201 })
  } catch (error: any) {
    console.error('Project creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 500 }
    )
  }
}
