'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Crown,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Receipt,
  Sparkles,
  Calendar,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useConfetti } from '@/lib/hooks/use-confetti'
import { Fade, Scale } from '@/components/ui/motion'

interface SubscriptionData {
  tier: string
  status: string
  expiresAt: string | null
  hasActiveSubscription: boolean
  usage: {
    quota: {
      projects: number
      videos_per_month: number
      consultations_per_month: number
    }
    current: {
      projects: number
      videos_this_month: number
      consultations_this_month: number
    }
  }
  subscription?: {
    id: string
    status: string
    cancelAtPeriodEnd: boolean
    currentPeriodEnd: string
    currentPeriodStart: string
  }
  recentInvoices?: Array<{
    id: string
    amount: number
    currency: string
    status: string
    date: string | null
    url: string | null
  }>
}

export function BillingSettings() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { successBurst, celebrate } = useConfetti()

  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Check for checkout success
  useEffect(() => {
    const checkout = searchParams.get('checkout')
    if (checkout === 'success') {
      setShowSuccess(true)
      celebrate()
      // Clear the URL parameter
      router.replace('/dashboard/settings', { scroll: false })
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }, [searchParams, celebrate, router])

  // Load subscription data
  useEffect(() => {
    async function loadSubscription() {
      try {
        setLoading(true)
        const response = await fetch('/api/stripe/subscription')
        if (response.ok) {
          const data = await response.json()
          setSubscription(data)
        } else {
          throw new Error('Failed to load subscription')
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadSubscription()
  }, [])

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to open billing portal')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (err: any) {
      setError(err.message)
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing & Subscription</CardTitle>
          <CardDescription>Manage your subscription and billing</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const isPremium = subscription?.tier === 'premium'
  const usageQuota = subscription?.usage.quota
  const usageCurrent = subscription?.usage.current

  // Calculate usage percentages
  const videoUsagePercent = usageQuota && usageCurrent
    ? (usageCurrent.videos_this_month / usageQuota.videos_per_month) * 100
    : 0
  const consultationUsagePercent = usageQuota && usageCurrent
    ? (usageCurrent.consultations_this_month / usageQuota.consultations_per_month) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <Scale>
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Welcome to Premium! 🎉
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your subscription is now active. Enjoy unlimited access!
              </p>
            </div>
          </div>
        </Scale>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>Your subscription status and details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isPremium ? (
                <div className="p-2 bg-scenra-amber/20 rounded-full">
                  <Crown className="h-6 w-6 text-scenra-amber" />
                </div>
              ) : (
                <div className="p-2 bg-muted rounded-full">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg">
                    {isPremium ? 'Premium' : 'Free'} Plan
                  </p>
                  {isPremium && (
                    <Badge className="bg-scenra-amber text-scenra-dark">Active</Badge>
                  )}
                </div>
                {subscription?.subscription && (
                  <p className="text-sm text-muted-foreground">
                    {subscription.subscription.cancelAtPeriodEnd ? (
                      <>
                        Cancels on{' '}
                        {format(new Date(subscription.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                      </>
                    ) : (
                      <>
                        Renews on{' '}
                        {format(new Date(subscription.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {isPremium ? (
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage Billing
                    </>
                  )}
                </Button>
              ) : (
                <Button asChild className="bg-scenra-amber text-scenra-dark hover:bg-yellow-500">
                  <Link href="/dashboard/upgrade">
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to Premium
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Usage This Month
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Videos</span>
                  <span className="text-muted-foreground">
                    {usageCurrent?.videos_this_month || 0} /{' '}
                    {usageQuota?.videos_per_month === 999999
                      ? '∞'
                      : usageQuota?.videos_per_month || 10}
                  </span>
                </div>
                <Progress
                  value={Math.min(videoUsagePercent, 100)}
                  className="h-2"
                />
                {videoUsagePercent >= 80 && videoUsagePercent < 100 && (
                  <p className="text-xs text-yellow-600">
                    Approaching limit - consider upgrading
                  </p>
                )}
                {videoUsagePercent >= 100 && (
                  <p className="text-xs text-destructive">
                    Limit reached - upgrade for more
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>AI Consultations</span>
                  <span className="text-muted-foreground">
                    {usageCurrent?.consultations_this_month || 0} /{' '}
                    {usageQuota?.consultations_per_month === 999999
                      ? '∞'
                      : usageQuota?.consultations_per_month || 10}
                  </span>
                </div>
                <Progress
                  value={Math.min(consultationUsagePercent, 100)}
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      {subscription?.recentInvoices && subscription.recentInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
            <CardDescription>Your payment history</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscription.recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {invoice.date
                        ? format(new Date(invoice.date), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      ${((invoice.amount || 0) / 100).toFixed(2)} {invoice.currency?.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                        className={invoice.status === 'paid' ? 'bg-green-500' : ''}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={invoice.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
