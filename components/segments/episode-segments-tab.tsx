'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PlayCircle, PlusCircle } from 'lucide-react'
import { SegmentList } from './segment-list'
import { CreateSegmentsDialog } from './create-segments-dialog'
import { BatchGenerationDialog } from './batch-generation-dialog'

interface EpisodeSegmentsTabProps {
  episodeId: string
  seriesId: string
  episodeTitle: string
  screenplay?: string
}

export function EpisodeSegmentsTab({
  episodeId,
  seriesId,
  episodeTitle,
  screenplay
}: EpisodeSegmentsTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleSegmentsCreated = () => {
    setCreateDialogOpen(false)
    setRefreshTrigger(prev => prev + 1) // Trigger refresh of segment list
  }

  const handleBatchGenerationComplete = () => {
    setBatchDialogOpen(false)
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Video Segments</h2>
          <p className="text-sm text-muted-foreground">
            Break down episodes into segments for sequential generation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCreateDialogOpen(true)}
            disabled={!screenplay}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Segments
          </Button>
          <Button
            onClick={() => setBatchDialogOpen(true)}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Generate Batch
          </Button>
        </div>
      </div>

      {/* No Screenplay Warning */}
      {!screenplay && (
        <Card className="p-6 border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 mt-0.5">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-900">No Screenplay Available</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Add screenplay text to this episode before creating segments. The screenplay
                is used to automatically generate segment boundaries and narrative beats.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Segment List */}
      <SegmentList
        episodeId={episodeId}
        seriesId={seriesId}
        refreshTrigger={refreshTrigger}
        onBatchGenerate={() => setBatchDialogOpen(true)}
      />

      {/* Dialogs */}
      <CreateSegmentsDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        episodeId={episodeId}
        seriesId={seriesId}
        episodeTitle={episodeTitle}
        screenplay={screenplay || ''}
        onSuccess={handleSegmentsCreated}
      />

      <BatchGenerationDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        episodeId={episodeId}
        seriesId={seriesId}
        onSuccess={handleBatchGenerationComplete}
      />
    </div>
  )
}
