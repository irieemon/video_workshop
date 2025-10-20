'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, Edit, Trash2 } from 'lucide-react'

interface Character {
  id: string
  name: string
  description: string
  role: 'protagonist' | 'supporting' | 'background' | 'other' | null
  performance_style: string | null
}

interface CharacterManagerProps {
  seriesId: string
  characters: Character[]
}

export function CharacterManager({ seriesId, characters: initialCharacters }: CharacterManagerProps) {
  const router = useRouter()
  const [characters, setCharacters] = useState(initialCharacters)
  const [showForm, setShowForm] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  type CharacterRole = 'protagonist' | 'supporting' | 'background' | 'other'

  const [formData, setFormData] = useState<{
    name: string
    description: string
    role: CharacterRole
    performance_style: string
  }>({
    name: '',
    description: '',
    role: 'protagonist',
    performance_style: '',
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      role: 'protagonist',
      performance_style: '',
    })
    setEditingCharacter(null)
    setError(null)
  }

  const handleEdit = (character: Character) => {
    setEditingCharacter(character)
    setFormData({
      name: character.name,
      description: character.description,
      role: character.role || 'protagonist',
      performance_style: character.performance_style || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = editingCharacter
        ? `/api/series/${seriesId}/characters/${editingCharacter.id}`
        : `/api/series/${seriesId}/characters`

      const method = editingCharacter ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save character')
      }

      const savedCharacter = await response.json()

      // Update local state
      if (editingCharacter) {
        setCharacters(characters.map(c => c.id === savedCharacter.id ? savedCharacter : c))
      } else {
        setCharacters([...characters, savedCharacter])
      }

      setShowForm(false)
      resetForm()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (characterId: string) => {
    if (!confirm('Are you sure you want to delete this character?')) return

    try {
      const response = await fetch(`/api/series/${seriesId}/characters/${characterId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete character')
      }

      setCharacters(characters.filter(c => c.id !== characterId))
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const roleColors: Record<string, string> = {
    protagonist: 'bg-blue-100 text-blue-800',
    supporting: 'bg-green-100 text-green-800',
    background: 'bg-gray-100 text-gray-800',
    other: 'bg-purple-100 text-purple-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Characters
          </h3>
          <p className="text-sm text-muted-foreground">
            Define characters that appear across episodes
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Character
        </Button>
      </div>

      {characters.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No characters defined yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {characters.map((character) => (
            <Card key={character.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{character.name}</CardTitle>
                    {character.role && (
                      <Badge variant="secondary" className={`mt-2 text-xs ${roleColors[character.role]}`}>
                        {character.role}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(character)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(character.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {character.description}
                </p>
                {character.performance_style && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-medium">Performance:</span> {character.performance_style}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCharacter ? 'Edit Character' : 'Add Character'}</DialogTitle>
            <DialogDescription>
              Define a character that will appear across multiple episodes
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="char-name">Character Name *</Label>
                <Input
                  id="char-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Maya, The Hero"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="char-description">Description *</Label>
                <textarea
                  id="char-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Physical appearance, clothing, distinctive features..."
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="char-role">Role</Label>
                <select
                  id="char-role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
                >
                  <option value="protagonist">Protagonist</option>
                  <option value="supporting">Supporting</option>
                  <option value="background">Background</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="char-performance">Performance Style</Label>
                <Input
                  id="char-performance"
                  value={formData.performance_style}
                  onChange={(e) => setFormData({ ...formData, performance_style: e.target.value })}
                  placeholder="e.g., deliberate and unhurried, energetic"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); resetForm() }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingCharacter ? 'Update Character' : 'Add Character'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
