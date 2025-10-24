'use client'

import { useState } from 'react'
import { CharacterRelationshipWithDetails } from '@/lib/types/database.types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Edit, Trash2, ArrowRight, ArrowLeftRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface RelationshipListProps {
  seriesId: string
  relationships: CharacterRelationshipWithDetails[]
  onEdit: (relationship: CharacterRelationshipWithDetails) => void
  onDelete: (relationshipId: string) => void
}

export function RelationshipList({
  seriesId,
  relationships,
  onEdit,
  onDelete,
}: RelationshipListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteConfirm = async () => {
    if (!deletingId) return

    setDeleteLoading(true)
    try {
      await onDelete(deletingId)
      setDeletingId(null)
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setDeleteLoading(false)
    }
  }

  const getRelationshipLabel = (rel: CharacterRelationshipWithDetails) => {
    if (rel.relationship_type === 'custom' && rel.custom_label) {
      return rel.custom_label
    }
    return rel.relationship_type.replace('_', ' ')
  }

  const getRelationshipColor = (type: string) => {
    const colors: Record<string, string> = {
      friends: 'bg-green-500/10 text-green-700 dark:text-green-400',
      rivals: 'bg-red-500/10 text-red-700 dark:text-red-400',
      romantic: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
      family: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      allies: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      enemies: 'bg-red-600/10 text-red-800 dark:text-red-500',
      mentor_student: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      custom: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
    }
    return colors[type] || colors.custom
  }

  if (!relationships.length) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <p>No relationships defined yet.</p>
        <p className="text-sm mt-2">Click "Add Relationship" to create one.</p>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {relationships.map((rel) => (
          <Card key={rel.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium">{rel.character_a.name}</span>
                  {rel.is_symmetric ? (
                    <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{rel.character_b.name}</span>
                  <Badge
                    className={getRelationshipColor(rel.relationship_type)}
                    variant="secondary"
                  >
                    {getRelationshipLabel(rel)}
                  </Badge>
                  {rel.intensity && (
                    <Badge variant="outline" className="text-xs">
                      Intensity: {rel.intensity}/10
                    </Badge>
                  )}
                </div>

                {rel.description && (
                  <p className="text-sm text-muted-foreground mt-2">{rel.description}</p>
                )}

                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <span>
                    {rel.is_symmetric ? 'Bidirectional' : 'One-way'} relationship
                  </span>
                  {rel.evolution_notes && (
                    <>
                      <span>•</span>
                      <span>Evolution notes available</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(rel)}
                  title="Edit relationship"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingId(rel.id)}
                  title="Delete relationship"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Relationship</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this character relationship? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
