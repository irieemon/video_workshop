import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { VideoRoundtableClient } from '@/components/videos/video-roundtable-client'

export default async function VideoRoundtablePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: videoId } = await params
  const supabase = await createClient()

  // Fetch video with all details including hashtags
  const { data: video, error } = await supabase
    .from('videos')
    .select(
      `
      *,
      series:series!videos_series_id_fkey(*),
      hashtags:hashtags(tag)
    `
    )
    .eq('id', videoId)
    .single()

  if (error || !video) {
    notFound()
  }

  // Transform hashtags from array of objects to array of strings
  const hashtagsArray = video.hashtags?.map((h: any) => h.tag) || []

  // Parse agent_discussion if it's a string (stored as JSON in database)
  let agentDiscussion = null
  try {
    const parsed = typeof video.agent_discussion === 'string'
      ? JSON.parse(video.agent_discussion)
      : video.agent_discussion

    // Validate that the parsed discussion has the required structure
    if (parsed && typeof parsed === 'object' && parsed.round1 && parsed.round2) {
      agentDiscussion = parsed
    }
  } catch (error) {
    console.error('Failed to parse agent_discussion:', error)
    // agentDiscussion remains null, component won't render
  }

  return (
    <VideoRoundtableClient
      video={video}
      agentDiscussion={agentDiscussion}
      hashtagsArray={hashtagsArray}
    />
  )
}
