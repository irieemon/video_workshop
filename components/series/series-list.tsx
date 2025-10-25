'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SeriesCard } from './series-card'
import { SeriesForm } from './series-form'
import { CreateSeriesDialog } from './create-series-dialog'
import { AssociateSeriesDialog } from './associate-series-dialog'
import { Plus, ListVideo, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface SeriesListProps {
  projectId: string
  series: Array<{
    id: string
    name: string
    description: string | null
    genre: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null
    episode_count: number
    character_count: number
    setting_count: number
    updated_at: string
  }>
}

export function SeriesList({ projectId, series }: SeriesListProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Series</h2>
          <p className="text-scenra-gray">
            Manage your video series with consistent characters and settings
          </p>
        </div>
        <div className="flex gap-2">
          <AssociateSeriesDialog projectId={projectId} />
          <Button variant="outline" asChild>
            <Link href={`/dashboard/projects/${projectId}/series/concept`}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI-Assisted
            </Link>
          </Button>
          <CreateSeriesDialog defaultProjectId={projectId} />
        </div>
      </div>

      {series.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <ListVideo className="h-12 w-12 text-scenra-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No series yet</h3>
          <p className="text-scenra-light mb-4">
            Create your first video series to maintain consistency across episodes
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <AssociateSeriesDialog projectId={projectId} />
            <Button variant="outline" asChild>
              <Link href={`/dashboard/projects/${projectId}/series/concept`}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI-Assisted Creation
              </Link>
            </Button>
            <CreateSeriesDialog defaultProjectId={projectId} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <SeriesCard key={s.id} series={s} projectId={projectId} />
          ))}
        </div>
      )}

      <SeriesForm
        open={showForm}
        onOpenChange={setShowForm}
        projectId={projectId}
      />
    </div>
  )
}
