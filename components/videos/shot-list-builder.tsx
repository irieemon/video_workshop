'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ChevronUp, ChevronDown, X, Plus } from 'lucide-react'
import { Shot } from '@/lib/types/database.types'

interface ShotListBuilderProps {
  shots: Shot[]
  onChange: (shots: Shot[]) => void
  onAISuggest?: () => void
}

export function ShotListBuilder({ shots, onChange, onAISuggest }: ShotListBuilderProps) {
  const addShot = () => {
    const newShot: Shot = {
      timing: `${shots.length * 4}-${(shots.length + 1) * 4}s`,
      description: '',
      camera: '',
      order: shots.length + 1,
    }
    onChange([...shots, newShot])
  }

  const removeShot = (index: number) => {
    const updated = shots.filter((_, i) => i !== index)
    // Re-order remaining shots
    const reordered = updated.map((shot, i) => ({ ...shot, order: i + 1 }))
    onChange(reordered)
  }

  const moveShot = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === shots.length - 1)
    ) {
      return
    }

    const newShots = [...shots]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newShots[index], newShots[targetIndex]] = [newShots[targetIndex], newShots[index]]

    // Update order values
    const reordered = newShots.map((shot, i) => ({ ...shot, order: i + 1 }))
    onChange(reordered)
  }

  const updateShot = (index: number, field: keyof Shot, value: string) => {
    const updated = [...shots]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Shot List</Label>
        {onAISuggest && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAISuggest}
            className="text-xs"
          >
            AI Suggest Shots
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {shots.length === 0 ? (
          <Card className="p-6 text-center border-dashed">
            <p className="text-sm text-muted-foreground mb-3">
              No shots added yet. Click &quot;Add Shot&quot; to build your shot list.
            </p>
            <Button type="button" onClick={addShot} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add First Shot
            </Button>
          </Card>
        ) : (
          shots.map((shot, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                {/* Shot header with controls */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Shot {shot.order}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveShot(index, 'up')}
                      disabled={index === 0}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveShot(index, 'down')}
                      disabled={index === shots.length - 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeShot(index)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Timing */}
                <div>
                  <Label htmlFor={`timing-${index}`} className="text-xs">
                    Timing
                  </Label>
                  <input
                    id={`timing-${index}`}
                    type="text"
                    value={shot.timing}
                    onChange={(e) => updateShot(index, 'timing', e.target.value)}
                    placeholder="0-3s"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor={`description-${index}`} className="text-xs">
                    Scene Description
                  </Label>
                  <textarea
                    id={`description-${index}`}
                    value={shot.description}
                    onChange={(e) => updateShot(index, 'description', e.target.value)}
                    placeholder="Wide establishing shot, golden hour lighting..."
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                {/* Camera */}
                <div>
                  <Label htmlFor={`camera-${index}`} className="text-xs">
                    Camera Angle/Movement
                  </Label>
                  <input
                    id={`camera-${index}`}
                    type="text"
                    value={shot.camera}
                    onChange={(e) => updateShot(index, 'camera', e.target.value)}
                    placeholder="Slow dolly in, eye level..."
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>

                {/* Optional: Lighting */}
                <div>
                  <Label htmlFor={`lighting-${index}`} className="text-xs text-muted-foreground">
                    Lighting (Optional)
                  </Label>
                  <input
                    id={`lighting-${index}`}
                    type="text"
                    value={shot.lighting || ''}
                    onChange={(e) => updateShot(index, 'lighting', e.target.value)}
                    placeholder="Natural, warm, soft shadows..."
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>

                {/* Optional: Notes */}
                <div>
                  <Label htmlFor={`notes-${index}`} className="text-xs text-muted-foreground">
                    Additional Notes (Optional)
                  </Label>
                  <textarea
                    id={`notes-${index}`}
                    value={shot.notes || ''}
                    onChange={(e) => updateShot(index, 'notes', e.target.value)}
                    placeholder="Any specific visual details..."
                    className="flex min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {shots.length > 0 && (
        <Button type="button" onClick={addShot} variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Shot
        </Button>
      )}
    </div>
  )
}
