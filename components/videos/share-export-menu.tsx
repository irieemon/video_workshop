'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Share2,
  Link2,
  FileDown,
  FileJson,
  FileText,
  Copy,
  Loader2,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

interface VideoData {
  id: string
  title: string
  optimizedPrompt: string
  hashtags?: string[]
  technicalSpecs?: {
    aspectRatio?: string
    duration?: number
    resolution?: string
    style?: string
  }
  createdAt?: string
  platform?: string
}

interface ShareExportMenuProps {
  video: VideoData
  onShareLinkGenerated?: (shareUrl: string) => void
  className?: string
}

/**
 * ShareExportMenu - Dropdown menu for sharing and exporting video prompts
 *
 * Provides multiple export formats:
 * - Copy Link (shareable URL)
 * - Download PDF (formatted document)
 * - Export JSON (raw data for developers)
 * - Copy as Markdown (formatted text)
 */
export function ShareExportMenu({
  video,
  onShareLinkGenerated,
  className = '',
}: ShareExportMenuProps) {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  // Helper to show copied state temporarily
  const showCopied = (item: string) => {
    setCopiedItem(item)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  /**
   * Generate a shareable link for the video prompt
   */
  const handleGenerateShareLink = async () => {
    setIsGeneratingLink(true)

    try {
      const response = await fetch(`/api/videos/${video.id}/share`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to generate share link')
      }

      const { shareUrl } = await response.json()

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)
      showCopied('link')

      toast.success('Share link copied!', {
        description: 'Anyone with this link can view the prompt',
      })

      onShareLinkGenerated?.(shareUrl)
    } catch (error) {
      console.error('Failed to generate share link:', error)
      toast.error('Failed to generate share link', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setIsGeneratingLink(false)
    }
  }

  /**
   * Export video data as PDF
   */
  const handleExportPdf = async () => {
    setIsExportingPdf(true)

    try {
      const response = await fetch(`/api/videos/${video.id}/export/pdf`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      // Get the PDF blob and download it
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${video.title || 'video-prompt'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('PDF downloaded!')
    } catch (error) {
      console.error('Failed to export PDF:', error)
      toast.error('Failed to export PDF', {
        description: 'Please try again',
      })
    } finally {
      setIsExportingPdf(false)
    }
  }

  /**
   * Export video data as JSON
   */
  const handleExportJson = () => {
    try {
      const exportData = {
        title: video.title,
        prompt: video.optimizedPrompt,
        hashtags: video.hashtags || [],
        technicalSpecs: video.technicalSpecs || {},
        createdAt: video.createdAt,
        platform: video.platform,
        exportedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${video.title || 'video-prompt'}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('JSON exported!')
    } catch (error) {
      console.error('Failed to export JSON:', error)
      toast.error('Failed to export JSON')
    }
  }

  /**
   * Copy video data as formatted Markdown
   */
  const handleCopyMarkdown = async () => {
    try {
      const markdown = generateMarkdown(video)
      await navigator.clipboard.writeText(markdown)
      showCopied('markdown')
      toast.success('Markdown copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy markdown:', error)
      toast.error('Failed to copy markdown')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          <Share2 className="h-4 w-4 mr-2" />
          Share & Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={handleGenerateShareLink}
          disabled={isGeneratingLink}
        >
          {isGeneratingLink ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : copiedItem === 'link' ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Link2 className="h-4 w-4 mr-2" />
          )}
          {copiedItem === 'link' ? 'Link Copied!' : 'Copy Share Link'}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleExportPdf} disabled={isExportingPdf}>
          {isExportingPdf ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          Download PDF
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleExportJson}>
          <FileJson className="h-4 w-4 mr-2" />
          Export JSON
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCopyMarkdown}>
          {copiedItem === 'markdown' ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          {copiedItem === 'markdown' ? 'Copied!' : 'Copy as Markdown'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Generate formatted markdown from video data
 */
function generateMarkdown(video: VideoData): string {
  const lines: string[] = []

  lines.push(`# ${video.title || 'Video Prompt'}`)
  lines.push('')

  if (video.platform) {
    lines.push(`**Platform:** ${video.platform}`)
  }

  if (video.createdAt) {
    const date = new Date(video.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    lines.push(`**Created:** ${date}`)
  }

  lines.push('')
  lines.push('## Optimized Prompt')
  lines.push('')
  lines.push(video.optimizedPrompt)
  lines.push('')

  if (video.technicalSpecs && Object.keys(video.technicalSpecs).length > 0) {
    lines.push('## Technical Specifications')
    lines.push('')

    const specs = video.technicalSpecs
    if (specs.aspectRatio) lines.push(`- **Aspect Ratio:** ${specs.aspectRatio}`)
    if (specs.duration) lines.push(`- **Duration:** ${specs.duration}s`)
    if (specs.resolution) lines.push(`- **Resolution:** ${specs.resolution}`)
    if (specs.style) lines.push(`- **Style:** ${specs.style}`)

    lines.push('')
  }

  if (video.hashtags && video.hashtags.length > 0) {
    lines.push('## Hashtags')
    lines.push('')
    lines.push(video.hashtags.map((tag) => `#${tag.replace(/^#/, '')}`).join(' '))
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push('*Generated with Scenra Video Generator*')

  return lines.join('\n')
}
