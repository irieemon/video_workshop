'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CharacterRelationshipWithDetails } from '@/lib/types/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Network, User, Users, ArrowRight, ArrowLeftRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RelationshipForm } from './relationship-form'
import { RelationshipList } from './relationship-list'
import { RelationshipGraph } from './relationship-graph'

interface Character {
  id: string
  name: string
  role?: string | null
}

interface RelationshipManagerProps {
  seriesId: string
  characters: Character[]
}

export function RelationshipManager({ seriesId, characters }: RelationshipManagerProps) {
  const router = useRouter()
  const [relationships, setRelationships] = useState<CharacterRelationshipWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingRelationship, setEditingRelationship] = useState<CharacterRelationshipWithDetails | null>(null)
  const [activeTab, setActiveTab] = useState('graph')
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [showCharacterDetail, setShowCharacterDetail] = useState(false)

  const fetchRelationships = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/series/${seriesId}/relationships`)

      if (!response.ok) {
        throw new Error('Failed to fetch relationships')
      }

      const data = await response.json()
      setRelationships(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [seriesId])

  useEffect(() => {
    fetchRelationships()
  }, [fetchRelationships])

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingRelationship(null)
    fetchRelationships()
    router.refresh()
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingRelationship(null)
  }

  const handleEdit = (relationship: CharacterRelationshipWithDetails) => {
    setEditingRelationship(relationship)
    setShowForm(true)
  }

  const handleDelete = async (relationshipId: string) => {
    try {
      const response = await fetch(
        `/api/series/${seriesId}/relationships/${relationshipId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete relationship')
      }

      fetchRelationships()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAddNew = () => {
    setEditingRelationship(null)
    setShowForm(true)
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

  const getCharacterRelationships = (characterId: string) => {
    return relationships.filter(
      (r) => r.character_a_id === characterId || r.character_b_id === characterId
    )
  }

  if (characters.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Character Relationships
          </CardTitle>
          <CardDescription>
            Define relationships between characters for consistent dynamics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>You need at least 2 characters to define relationships.</p>
            <p className="text-sm mt-2">Add more characters above to get started.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Character Relationships
              </CardTitle>
              <CardDescription>
                Define and visualize how characters relate to each other
              </CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Relationship
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading relationships...</div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="graph">Graph View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>

              <TabsContent value="graph" className="mt-4">
                <RelationshipGraph
                  characters={characters}
                  relationships={relationships}
                  onNodeClick={(characterId) => {
                    const character = characters.find((c) => c.id === characterId)
                    if (character) {
                      setSelectedCharacter(character)
                      setShowCharacterDetail(true)
                    }
                  }}
                  onLinkClick={(relationshipId) => {
                    const rel = relationships.find((r) => r.id === relationshipId)
                    if (rel) {
                      handleEdit(rel)
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="list" className="mt-4">
                <RelationshipList
                  seriesId={seriesId}
                  relationships={relationships}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Relationship Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRelationship ? 'Edit Relationship' : 'Add New Relationship'}
            </DialogTitle>
            <DialogDescription>
              {editingRelationship
                ? 'Update the relationship details between these characters.'
                : 'Define how two characters relate to each other in your series.'}
            </DialogDescription>
          </DialogHeader>
          <RelationshipForm
            seriesId={seriesId}
            characters={characters}
            editingRelationship={editingRelationship}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Character Detail Dialog */}
      <Dialog open={showCharacterDetail} onOpenChange={setShowCharacterDetail}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <User className="h-6 w-6" />
              {selectedCharacter?.name}
              {selectedCharacter?.role && (
                <Badge variant="secondary" className="text-sm">
                  {selectedCharacter.role}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Character relationship overview and network connections
            </DialogDescription>
          </DialogHeader>

          {selectedCharacter && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">
                        {getCharacterRelationships(selectedCharacter.id).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Relationships</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Network className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">
                        {new Set(
                          getCharacterRelationships(selectedCharacter.id).flatMap((r) => [
                            r.character_a_id,
                            r.character_b_id,
                          ])
                        ).size - 1}
                      </div>
                      <div className="text-xs text-muted-foreground">Connected Characters</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">
                        {
                          getCharacterRelationships(selectedCharacter.id).filter((r) => r.is_symmetric)
                            .length
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">Mutual Relationships</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Relationships List */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Relationships
                </h3>
                {getCharacterRelationships(selectedCharacter.id).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No relationships defined for this character yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setShowCharacterDetail(false)
                        setShowForm(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Relationship
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getCharacterRelationships(selectedCharacter.id).map((rel) => {
                      const isCharacterA = rel.character_a_id === selectedCharacter.id
                      const otherCharacter = isCharacterA ? rel.character_b : rel.character_a

                      return (
                        <Card key={rel.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-medium text-muted-foreground">
                                  {selectedCharacter.name}
                                </span>
                                {rel.is_symmetric ? (
                                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ArrowRight
                                    className={`h-4 w-4 text-muted-foreground ${
                                      !isCharacterA ? 'rotate-180' : ''
                                    }`}
                                  />
                                )}
                                <span className="font-medium">{otherCharacter.name}</span>
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
                                <p className="text-sm text-muted-foreground mt-2">
                                  {rel.description}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
                                <span>
                                  {rel.is_symmetric ? 'Bidirectional' : isCharacterA ? 'Outgoing' : 'Incoming'}
                                </span>
                                {rel.evolution_notes && (
                                  <>
                                    <span>•</span>
                                    <span>Evolution notes available</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowCharacterDetail(false)
                                handleEdit(rel)
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
