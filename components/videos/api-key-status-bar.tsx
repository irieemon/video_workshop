'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
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
  Key,
  Plus,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApiKey {
  id: string
  provider: string
  key_suffix: string
  key_name: string
  is_valid: boolean
}

interface ApiKeyStatusBarProps {
  onKeySelected?: (keyId: string | null) => void
  selectedKeyId?: string | null
  className?: string
}

export function ApiKeyStatusBar({
  onKeySelected,
  selectedKeyId,
  className,
}: ApiKeyStatusBarProps) {
  const router = useRouter()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quick add dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyName, setNewKeyName] = useState('Default')
  const [isAdding, setIsAdding] = useState(false)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/api-keys')
      if (!response.ok) {
        throw new Error('Failed to fetch API keys')
      }
      const data = await response.json()
      const openAiKeys = (data.keys || []).filter(
        (k: ApiKey) => k.provider === 'openai'
      )
      setKeys(openAiKeys)

      // Auto-select first valid key if none selected
      if (!selectedKeyId && openAiKeys.length > 0) {
        const validKey = openAiKeys.find((k: ApiKey) => k.is_valid)
        if (validKey && onKeySelected) {
          onKeySelected(validKey.id)
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAdd = async () => {
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
          provider: 'openai',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add API key')
      }

      const data = await response.json()

      // Add to local state and select
      await fetchKeys()
      if (onKeySelected && data.key?.id) {
        onKeySelected(data.key.id)
      }

      // Reset form
      setNewKeyValue('')
      setNewKeyName('Default')
      setIsAddDialogOpen(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsAdding(false)
    }
  }

  const selectedKey = keys.find((k) => k.id === selectedKeyId)

  if (loading) {
    return (
      <Card className={cn('bg-muted/30', className)}>
        <CardContent className="py-3 px-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // No keys state
  if (keys.length === 0) {
    return (
      <Card className={cn('bg-muted/30 border-dashed', className)}>
        <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Key className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No API key configured</p>
              <p className="text-xs text-muted-foreground">
                Add your OpenAI key to generate videos
              </p>
            </div>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add OpenAI API Key</DialogTitle>
                <DialogDescription>
                  Your API key will be encrypted and stored securely.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Key Name (Optional)</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Personal, Work"
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
                      placeholder="sk-..."
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
                  onClick={handleQuickAdd}
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
        </CardContent>
      </Card>
    )
  }

  // Has keys state
  return (
    <Card className={cn('bg-muted/30', className)}>
      <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center',
              selectedKey?.is_valid
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
            )}
          >
            <Key
              className={cn(
                'h-4 w-4',
                selectedKey?.is_valid
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Using your OpenAI key</p>
              {selectedKey?.is_valid ? (
                <Badge
                  variant="outline"
                  className="text-xs text-green-600 border-green-200 bg-green-50 dark:bg-green-900/30"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Valid
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs text-red-600 border-red-200 bg-red-50 dark:bg-red-900/30"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Invalid
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedKey?.key_name} (••••{selectedKey?.key_suffix})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {keys.length > 1 && (
            <Select
              value={selectedKeyId || ''}
              onValueChange={(val) => onKeySelected?.(val || null)}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Select key" />
              </SelectTrigger>
              <SelectContent>
                {keys.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    <div className="flex items-center gap-2">
                      <span>{key.key_name}</span>
                      <span className="text-muted-foreground">
                        ••••{key.key_suffix}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push('/dashboard/settings')}
            className="gap-1"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Manage</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
