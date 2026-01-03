import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import React from 'react'

// Register a clean font for better PDF rendering
Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff2',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2',
      fontWeight: 700,
    },
  ],
})

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Inter',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #8b5cf6',
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    borderLeft: '4px solid #8b5cf6',
  },
  promptText: {
    fontSize: 11,
    color: '#1f2937',
    lineHeight: 1.6,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specItem: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 12,
    minWidth: '45%',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  specValue: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1f2937',
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtag: {
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
    fontSize: 10,
    padding: '4px 8px',
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 9,
    borderTop: '1px solid #e5e7eb',
    paddingTop: 12,
  },
  brandText: {
    color: '#8b5cf6',
    fontWeight: 600,
  },
})

interface VideoData {
  id: string
  title: string
  optimized_prompt: string
  hashtags?: string[]
  sora_generation_settings?: {
    aspect_ratio?: string
    duration?: number
    resolution?: string
    model?: string
  }
  created_at: string
  target_platform?: string
}

// PDF Document creation function
function createVideoPdfDocument(video: VideoData): React.ReactElement {
  const specs = video.sora_generation_settings || {}
  const hashtags = video.hashtags || []
  const createdDate = new Date(video.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Build page children array
  const pageChildren: React.ReactNode[] = [
    // Header
    React.createElement(
      View,
      { key: 'header', style: styles.header },
      React.createElement(Text, { style: styles.title }, video.title || 'Video Prompt'),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `${video.target_platform ? `${video.target_platform} • ` : ''}Created ${createdDate}`
      )
    ),
    // Optimized Prompt Section
    React.createElement(
      View,
      { key: 'prompt', style: styles.section },
      React.createElement(Text, { style: styles.sectionTitle }, 'Optimized Prompt'),
      React.createElement(
        View,
        { style: styles.promptBox },
        React.createElement(Text, { style: styles.promptText }, video.optimized_prompt)
      )
    ),
  ]

  // Technical Specifications
  if (specs && Object.keys(specs).length > 0) {
    const specItems: React.ReactNode[] = []
    if (specs.aspect_ratio) {
      specItems.push(
        React.createElement(
          View,
          { key: 'aspect', style: styles.specItem },
          React.createElement(Text, { style: styles.specLabel }, 'Aspect Ratio'),
          React.createElement(Text, { style: styles.specValue }, specs.aspect_ratio)
        )
      )
    }
    if (specs.duration) {
      specItems.push(
        React.createElement(
          View,
          { key: 'duration', style: styles.specItem },
          React.createElement(Text, { style: styles.specLabel }, 'Duration'),
          React.createElement(Text, { style: styles.specValue }, `${specs.duration} seconds`)
        )
      )
    }
    if (specs.resolution) {
      specItems.push(
        React.createElement(
          View,
          { key: 'resolution', style: styles.specItem },
          React.createElement(Text, { style: styles.specLabel }, 'Resolution'),
          React.createElement(Text, { style: styles.specValue }, specs.resolution)
        )
      )
    }
    if (specs.model) {
      specItems.push(
        React.createElement(
          View,
          { key: 'model', style: styles.specItem },
          React.createElement(Text, { style: styles.specLabel }, 'Model'),
          React.createElement(Text, { style: styles.specValue }, specs.model)
        )
      )
    }
    if (specItems.length > 0) {
      pageChildren.push(
        React.createElement(
          View,
          { key: 'specs', style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, 'Technical Specifications'),
          React.createElement(View, { style: styles.specGrid }, ...specItems)
        )
      )
    }
  }

  // Hashtags
  if (hashtags.length > 0) {
    pageChildren.push(
      React.createElement(
        View,
        { key: 'hashtags', style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Suggested Hashtags'),
        React.createElement(
          View,
          { style: styles.hashtagContainer },
          ...hashtags.map((tag, index) =>
            React.createElement(
              Text,
              { key: index, style: styles.hashtag },
              `#${tag.replace(/^#/, '')}`
            )
          )
        )
      )
    )
  }

  // Footer
  pageChildren.push(
    React.createElement(
      View,
      { key: 'footer', style: styles.footer, fixed: true },
      React.createElement(
        Text,
        null,
        'Generated with Scenra • sora-video-generator.vercel.app'
      )
    )
  )

  return React.createElement(
    Document,
    {},
    React.createElement(Page, { size: 'A4', style: styles.page }, ...pageChildren)
  )
}

/**
 * POST /api/videos/[id]/export/pdf
 * Generates and returns a PDF document of the video prompt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: videoId } = await params

    // Fetch video data
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (!video.optimized_prompt) {
      return NextResponse.json(
        { error: 'Video has no optimized prompt to export' },
        { status: 400 }
      )
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(createVideoPdfDocument(video) as any)

    // Convert Node.js Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer)

    // Return PDF as downloadable file
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${video.title || 'video-prompt'}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('PDF export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    )
  }
}
