'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useTheme } from '@/app/providers/theme-provider'

interface Profile {
  id: string
  email: string
  full_name: string | null
  subscription_tier: string
  usage_quota: {
    projects: number
    videos_per_month: number
    consultations_per_month: number
  }
  usage_current: {
    projects: number
    videos_this_month: number
    consultations_this_month: number
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const { theme } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setProfile(profileData as Profile)
      setFullName(profileData.full_name || '')
    } catch (err: any) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profile?.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold mb-6">Settings</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={saving}
                  />
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 text-sm text-scenra-dark bg-sage-50 border border-sage-200 rounded-md">
                    Profile updated successfully!
                  </div>
                )}

                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Subscription & Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Usage</CardTitle>
              <CardDescription>
                Your current plan and usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
                <div>
                  <p className="font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {profile?.subscription_tier || 'Free'} Tier
                  </p>
                </div>
                {profile?.subscription_tier === 'free' && (
                  <Button variant="outline" size="sm">
                    Upgrade to Premium
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">Projects</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.usage_current.projects} / {profile?.usage_quota.projects}
                    </p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-scenra-amber"
                      style={{
                        width: `${((profile?.usage_current.projects || 0) / (profile?.usage_quota.projects || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">Videos this month</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.usage_current.videos_this_month} / {profile?.usage_quota.videos_per_month}
                    </p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-scenra-amber"
                      style={{
                        width: `${((profile?.usage_current.videos_this_month || 0) / (profile?.usage_quota.videos_per_month || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">AI consultations this month</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.usage_current.consultations_this_month} / {profile?.usage_quota.consultations_per_month}
                    </p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-scenra-amber"
                      style={{
                        width: `${((profile?.usage_current.consultations_this_month || 0) / (profile?.usage_quota.consultations_per_month || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how Scenra Studio looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Current theme: <span className="capitalize">{theme}</span>
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Manage your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" onClick={handleSignOut} className="w-full">
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
