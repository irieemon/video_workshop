'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { RelationshipType } from '@/lib/types/database.types'

interface Character {
  id: string
  name: string
}

interface Relationship {
  id: string
  character_a_id: string
  character_b_id: string
  relationship_type: RelationshipType
  custom_label: string | null
  is_symmetric: boolean
  description: string | null
  intensity: number | null
}

interface RelationshipFormProps {
  seriesId: string
  characters: Character[]
  editingRelationship?: Relationship | null
  onSuccess: () => void
  onCancel: () => void
}

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'friends', label: 'Friends' },
  { value: 'rivals', label: 'Rivals' },
  { value: 'romantic', label: 'Romantic Interest' },
  { value: 'family', label: 'Family' },
  { value: 'allies', label: 'Allies / Partners' },
  { value: 'enemies', label: 'Enemies' },
  { value: 'mentor_student', label: 'Mentor & Student' },
  { value: 'custom', label: 'Custom...' },
]

export function RelationshipForm({
  seriesId,
  characters,
  editingRelationship,
  onSuccess,
  onCancel,
}: RelationshipFormProps) {
  const [formData, setFormData] = useState({
    character_a_id: '',
    character_b_id: '',
    relationship_type: 'friends' as RelationshipType,
    custom_label: '',
    is_symmetric: true,
    description: '',
    intensity: '' as string,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editingRelationship) {
      setFormData({
        character_a_id: editingRelationship.character_a_id,
        character_b_id: editingRelationship.character_b_id,
        relationship_type: editingRelationship.relationship_type,
        custom_label: editingRelationship.custom_label || '',
        is_symmetric: editingRelationship.is_symmetric,
        description: editingRelationship.description || '',
        intensity: editingRelationship.intensity?.toString() || '',
      })
    }
  }, [editingRelationship])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = editingRelationship
        ? `/api/series/${seriesId}/relationships/${editingRelationship.id}`
        : `/api/series/${seriesId}/relationships`

      const method = editingRelationship ? 'PATCH' : 'POST'

      const payload: any = {
        relationship_type: formData.relationship_type,
        is_symmetric: formData.is_symmetric,
        description: formData.description || null,
        intensity: formData.intensity ? parseInt(formData.intensity) : null,
      }

      if (!editingRelationship) {
        payload.character_a_id = formData.character_a_id
        payload.character_b_id = formData.character_b_id
      }

      if (formData.relationship_type === 'custom') {
        payload.custom_label = formData.custom_label
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save relationship')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const availableCharactersForA = characters.filter(
    (c) => c.id !== formData.character_b_id
  )
  const availableCharactersForB = characters.filter(
    (c) => c.id !== formData.character_a_id
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {!editingRelationship && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="character_a">Character A</Label>
              <Select
                value={formData.character_a_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, character_a_id: value })
                }
                required
              >
                <SelectTrigger id="character_a">
                  <SelectValue placeholder="Select character" />
                </SelectTrigger>
                <SelectContent>
                  {availableCharactersForA.map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="character_b">Character B</Label>
              <Select
                value={formData.character_b_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, character_b_id: value })
                }
                required
              >
                <SelectTrigger id="character_b">
                  <SelectValue placeholder="Select character" />
                </SelectTrigger>
                <SelectContent>
                  {availableCharactersForB.map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="relationship_type">Relationship Type</Label>
        <Select
          value={formData.relationship_type}
          onValueChange={(value: RelationshipType) =>
            setFormData({ ...formData, relationship_type: value })
          }
        >
          <SelectTrigger id="relationship_type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.relationship_type === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="custom_label">Custom Label</Label>
          <Input
            id="custom_label"
            value={formData.custom_label}
            onChange={(e) =>
              setFormData({ ...formData, custom_label: e.target.value })
            }
            placeholder="e.g., Former Colleagues"
            required
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_symmetric"
          checked={formData.is_symmetric}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, is_symmetric: !!checked })
          }
        />
        <Label htmlFor="is_symmetric" className="font-normal cursor-pointer">
          Bidirectional relationship (both characters feel the same way)
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Describe the nature of this relationship..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="intensity">Intensity (Optional)</Label>
        <Input
          id="intensity"
          type="number"
          min="1"
          max="10"
          value={formData.intensity}
          onChange={(e) =>
            setFormData({ ...formData, intensity: e.target.value })
          }
          placeholder="1-10"
        />
        <p className="text-xs text-muted-foreground">
          Rate the strength of this relationship from 1 (weak) to 10 (strong)
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : editingRelationship ? 'Update' : 'Create'} Relationship
        </Button>
      </div>
    </form>
  )
}
