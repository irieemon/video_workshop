import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { VideoReadyDashboard } from '@/components/videos/video-ready-dashboard'

export default async function VideoReadyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: videoId } = await params
  const supabase = await createClient()

  // Get current user to fetch subscription tier
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile for subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  // Fetch video with all details including hashtags
  const { data: video, error } = await supabase
    .from('videos')
    .select(
      `
      id,
      title,
      user_brief,
      platform,
      optimized_prompt,
      detailed_breakdown,
      character_count,
      created_at,
      status,
      series:series!videos_series_id_fkey(name, is_system),
      hashtags:hashtags(tag)
    `
    )
    .eq('id', videoId)
    .single()

  if (error || !video) {
    notFound()
  }

  // If video doesn't have an optimized prompt yet, redirect back to roundtable
  if (!video.optimized_prompt) {
    redirect(`/dashboard/videos/${videoId}/roundtable`)
  }

  // Transform hashtags from array of objects to array of strings
  const hashtagsArray = video.hashtags?.map((h: any) => h.tag) || []

  // Ensure detailed_breakdown is an object
  const detailedBreakdown = typeof video.detailed_breakdown === 'string'
    ? JSON.parse(video.detailed_breakdown)
    : video.detailed_breakdown || {}

  // Handle series which might be an array from the join
  const seriesData = Array.isArray(video.series) ? video.series[0] : video.series

  return (
    <VideoReadyDashboard
      video={{
        id: video.id,
        title: video.title,
        user_brief: video.user_brief,
        platform: video.platform,
        optimized_prompt: video.optimized_prompt,
        detailed_breakdown: detailedBreakdown,
        character_count: video.character_count,
        created_at: video.created_at,
        series: seriesData,
      }}
      hashtags={hashtagsArray}
      subscriptionTier={profile?.subscription_tier || 'free'}
    />
  )
}
