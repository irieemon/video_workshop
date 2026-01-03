'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import {
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApiKey {
  id: string
  provider: 'openai' | 'anthropic' | 'stability' | 'replicate'
  key_suffix: string
  key_name: string
  is_valid: boolean
  last_validated_at: string | null
  last_used_at: string | null
  created_at: string
}

const PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    description: 'For Sora video generation and GPT models',
    placeholder: 'sk-...',
    color: 'bg-emerald-500',
  },
  anthropic: {
    name: 'Anthropic',
    description: 'For Claude AI models',
    placeholder: 'sk-ant-...',
    color: 'bg-orange-500',
  },
  stability: {
    name: 'Stability AI',
    description: 'For image generation',
    placeholder: 'sk-...',
    color: 'bg-purple-500',
  },
  replicate: {
    name: 'Replicate',
    description: 'For various AI models',
    placeholder: 'r8_...',
    color: 'bg-blue-500',
  },
}

export function ApiKeysSettings() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add key dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyName, setNewKeyName] = useState('Default')
  const [newKeyProvider, setNewKeyProvider] = useState<string>('openai')
  const [isAdding, setIsAdding] = useState(false)
  const [showKey, setShowKey] = useState(false)

  // Validation state
  const [validatingId, setValidatingId] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/api-keys')
      if (!response.ok) {
        throw new Error('Failed to fetch API keys')
      }
      const data = await response.json()
      setKeys(data.keys || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleAddKey = async () => {
    if (!newKeyValue.trim()) return

    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: newKeyValue.trim(),
          key_name: newKeyName.trim() || 'Default',
          provider: newKeyProvider,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add API key')
      }

      // Refresh keys list
      await fetchKeys()

      // Reset form
      setNewKeyValue('')
      setNewKeyName('Default')
      setNewKeyProvider('openai')
      setIsAddDialogOpen(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete API key')
      }

      // Remove from local state
      setKeys((prev) => prev.filter((k) => k.id !== keyId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleValidateKey = async (keyId: string) => {
    setValidatingId(keyId)
    try {
      const response = await fetch(`/api/user/api-keys/${keyId}/validate`, {
        method: 'POST',
      })

      const data = await response.json()

      // Update the key in local state
      setKeys((prev) =>
        prev.map((k) =>
          k.id === keyId
            ? {
                ...k,
                is_valid: data.valid,
                last_validated_at: new Date().toISOString(),
              }
            : k
        )
      )

      if (!data.valid) {
        setError(`Validation failed: ${data.error}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setValidatingId(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Add your own API keys to use for video generation
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add API Key</DialogTitle>
                <DialogDescription>
                  Your API key will be encrypted and stored securely. We never
                  log or expose your keys.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={newKeyProvider}
                    onValueChange={setNewKeyProvider}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'h-2 w-2 rounded-full',
                                info.color
                              )}
                            />
                            {info.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {PROVIDER_INFO[newKeyProvider as keyof typeof PROVIDER_INFO]?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keyName">Key Name (Optional)</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Work, Personal, Project X"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showKey ? 'text' : 'password'}
                      placeholder={
                        PROVIDER_INFO[newKeyProvider as keyof typeof PROVIDER_INFO]?.placeholder
                      }
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your key is encrypted before storage and never logged.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddKey}
                  disabled={!newKeyValue.trim() || isAdding}
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Key'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No API keys added yet. Add your own keys to use Sora without a
              premium subscription.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add your first key
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center',
                      PROVIDER_INFO[key.provider]?.color || 'bg-gray-500'
                    )}
                  >
                    <Key className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.key_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {PROVIDER_INFO[key.provider]?.name || key.provider}
                      </Badge>
                      {key.is_valid ? (
                        <Badge
                          variant="outline"
                          className="text-xs text-green-600 border-green-200 bg-green-50"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Valid
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs text-red-600 border-red-200 bg-red-50"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Invalid
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ••••{key.key_suffix} · Added {formatDate(key.created_at)}
                      {key.last_used_at && ` · Last used ${formatDate(key.last_used_at)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleValidateKey(key.id)}
                    disabled={validatingId === key.id}
                    title="Validate key"
                  >
                    {validatingId === key.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the "{key.key_name}"
                          key? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteKey(key.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !isAddDialogOpen && (
          <div className="mt-4 flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
