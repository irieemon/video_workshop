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
import { Plus, MapPin, Edit, Trash2, Star } from 'lucide-react'
import { useModal } from '@/components/providers/modal-provider'
import { useToast } from '@/hooks/use-toast'

interface Setting {
  id: string
  name: string
  description: string
  environment_type: 'interior' | 'exterior' | 'mixed' | 'other' | null
  time_of_day: string | null
  atmosphere: string | null
  is_primary: boolean
}

interface SettingManagerProps {
  seriesId: string
  settings: Setting[]
}

export function SettingManager({ seriesId, settings: initialSettings }: SettingManagerProps) {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [showForm, setShowForm] = useState(false)
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { showConfirm } = useModal()
  const { toast } = useToast()

  type EnvironmentType = 'interior' | 'exterior' | 'mixed' | 'other'

  const [formData, setFormData] = useState<{
    name: string
    description: string
    environment_type: EnvironmentType
    time_of_day: string
    atmosphere: string
    is_primary: boolean
  }>({
    name: '',
    description: '',
    environment_type: 'interior',
    time_of_day: '',
    atmosphere: '',
    is_primary: false,
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      environment_type: 'interior',
      time_of_day: '',
      atmosphere: '',
      is_primary: false,
    })
    setEditingSetting(null)
    setError(null)
  }

  const handleEdit = (setting: Setting) => {
    setEditingSetting(setting)
    setFormData({
      name: setting.name,
      description: setting.description,
      environment_type: setting.environment_type || 'interior',
      time_of_day: setting.time_of_day || '',
      atmosphere: setting.atmosphere || '',
      is_primary: setting.is_primary,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = editingSetting
        ? `/api/series/${seriesId}/settings/${editingSetting.id}`
        : `/api/series/${seriesId}/settings`

      const method = editingSetting ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save setting')
      }

      const savedSetting = await response.json()

      // Update local state
      if (editingSetting) {
        setSettings(settings.map(s => s.id === savedSetting.id ? savedSetting : s))
      } else {
        setSettings([...settings, savedSetting])
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

  const handleDelete = async (settingId: string) => {
    const setting = settings.find(s => s.id === settingId)
    const settingName = setting ? setting.name : 'this setting'

    const confirmed = await showConfirm(
      'Delete Setting',
      `Are you sure you want to delete ${settingName}? This action cannot be undone.`,
      {
        variant: 'destructive',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel'
      }
    )

    if (!confirmed) return

    try {
      const response = await fetch(`/api/series/${seriesId}/settings/${settingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete setting')
      }

      setSettings(settings.filter(s => s.id !== settingId))
      router.refresh()
      toast({
        title: 'Setting Deleted',
        description: `${settingName} has been successfully deleted.`,
      })
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete setting. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const envColors: Record<string, string> = {
    interior: 'bg-blue-100 text-blue-800',
    exterior: 'bg-green-100 text-green-800',
    mixed: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Settings & Locations
          </h3>
          <p className="text-sm text-muted-foreground">
            Define locations and environments for your series
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Setting
        </Button>
      </div>

      {settings.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No settings defined yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {settings.map((setting) => (
            <Card key={setting.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{setting.name}</CardTitle>
                      {setting.is_primary && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {setting.environment_type && (
                        <Badge variant="secondary" className={`text-xs ${envColors[setting.environment_type]}`}>
                          {setting.environment_type}
                        </Badge>
                      )}
                      {setting.time_of_day && (
                        <Badge variant="outline" className="text-xs">
                          {setting.time_of_day}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(setting)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(setting.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {setting.description}
                </p>
                {setting.atmosphere && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-medium">Atmosphere:</span> {setting.atmosphere}
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
            <DialogTitle>{editingSetting ? 'Edit Setting' : 'Add Setting'}</DialogTitle>
            <DialogDescription>
              Define a location or environment for your series
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
                <Label htmlFor="set-name">Setting Name *</Label>
                <Input
                  id="set-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Coffee Shop, City Street, Maya's Apartment"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="set-description">Description *</Label>
                <textarea
                  id="set-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the location, props, mood..."
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="set-env">Environment Type</Label>
                  <select
                    id="set-env"
                    value={formData.environment_type}
                    onChange={(e) => setFormData({ ...formData, environment_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
                  >
                    <option value="interior">Interior</option>
                    <option value="exterior">Exterior</option>
                    <option value="mixed">Mixed</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="set-time">Time of Day</Label>
                  <Input
                    id="set-time"
                    value={formData.time_of_day}
                    onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                    placeholder="e.g., morning, evening"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="set-atmosphere">Atmosphere</Label>
                <Input
                  id="set-atmosphere"
                  value={formData.atmosphere}
                  onChange={(e) => setFormData({ ...formData, atmosphere: e.target.value })}
                  placeholder="e.g., cozy, bustling, serene"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="set-primary"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  className="rounded border-input"
                />
                <Label htmlFor="set-primary" className="text-sm font-normal cursor-pointer">
                  Mark as primary/recurring setting
                </Label>
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
                {loading ? 'Saving...' : editingSetting ? 'Update Setting' : 'Add Setting'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
