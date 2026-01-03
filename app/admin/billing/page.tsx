'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Crown,
  CreditCard,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface BillingStats {
  subscriptions: {
    free: number
    premium: number
    trial: number
    cancelled: number
    total: number
  }
  revenue: {
    mrr: number
    revenueThisMonth: number
    revenueLastMonth: number
    growth: number
  }
  stripe: {
    availableBalance: number
    pendingBalance: number
    chargesThisMonth: number
  } | null
  recentPayments: Array<{
    id: string
    amount: number
    currency: string
    status: string
    description: string
    date: string
  }>
  conversion: {
    freeToTrialRate: number
    trialToPaidRate: number
    churnRate: number
  }
}

export default function AdminBillingPage() {
  const [stats, setStats] = useState<BillingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBillingStats()
  }, [])

  const fetchBillingStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/billing')

      if (!response.ok) {
        throw new Error('Failed to fetch billing stats')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing stats')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number, currency = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Billing & Revenue</h1>
            <p className="text-muted-foreground">Financial metrics and subscription analytics</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-4 w-full bg-muted animate-pulse rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing & Revenue</h1>
          <p className="text-muted-foreground">Financial metrics and subscription analytics</p>
        </div>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-destructive font-medium">{error || 'Failed to load billing stats'}</p>
              <p className="text-sm text-muted-foreground">Please check your Stripe configuration.</p>
            </div>
            <Button onClick={fetchBillingStats} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const revenueGrowthPositive = stats.revenue.growth >= 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Revenue</h1>
          <p className="text-muted-foreground">Financial metrics and subscription analytics</p>
        </div>
        <Button onClick={fetchBillingStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenue.mrr)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {stats.subscriptions.premium} active subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenue.revenueThisMonth)}</div>
            <div className="flex items-center mt-1">
              {revenueGrowthPositive ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span
                className={cn(
                  'text-xs',
                  revenueGrowthPositive ? 'text-green-500' : 'text-red-500'
                )}
              >
                {revenueGrowthPositive ? '+' : ''}{stats.revenue.growth.toFixed(1)}% from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Subscribers</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.subscriptions.premium}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.subscriptions.trial} in trial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversion.churnRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.subscriptions.cancelled} cancelled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown & Stripe Balance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Subscription Breakdown
            </CardTitle>
            <CardDescription>
              Total users: {stats.subscriptions.total.toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm">Free Tier</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.subscriptions.free}</span>
                  <span className="text-sm text-muted-foreground">
                    ({((stats.subscriptions.free / stats.subscriptions.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-scenra-amber" />
                  <span className="text-sm">Premium</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.subscriptions.premium}</span>
                  <span className="text-sm text-muted-foreground">
                    ({((stats.subscriptions.premium / stats.subscriptions.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                  <span className="text-sm">Trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.subscriptions.trial}</span>
                  <span className="text-sm text-muted-foreground">
                    ({((stats.subscriptions.trial / stats.subscriptions.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="text-sm">Cancelled</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.subscriptions.cancelled}</span>
                  <span className="text-sm text-muted-foreground">
                    ({((stats.subscriptions.cancelled / stats.subscriptions.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Visual bar chart */}
            <div className="mt-6">
              <div className="h-4 rounded-full overflow-hidden flex bg-muted">
                <div
                  className="bg-gray-400"
                  style={{ width: `${(stats.subscriptions.free / stats.subscriptions.total) * 100}%` }}
                />
                <div
                  className="bg-scenra-amber"
                  style={{ width: `${(stats.subscriptions.premium / stats.subscriptions.total) * 100}%` }}
                />
                <div
                  className="bg-blue-400"
                  style={{ width: `${(stats.subscriptions.trial / stats.subscriptions.total) * 100}%` }}
                />
                <div
                  className="bg-red-400"
                  style={{ width: `${(stats.subscriptions.cancelled / stats.subscriptions.total) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Stripe Balance
            </CardTitle>
            <CardDescription>
              Current account balance and pending payouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.stripe ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(stats.stripe.availableBalance)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-6 w-6 text-green-500" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Balance</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {formatCurrency(stats.stripe.pendingBalance)}
                    </p>
                  </div>
                  <RefreshCw className="h-6 w-6 text-yellow-500" />
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Charges this month</span>
                    <span className="font-medium">{stats.stripe.chargesThisMonth}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Stripe balance unavailable
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check your Stripe API configuration
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Recent Payments
          </CardTitle>
          <CardDescription>
            Latest subscription payments and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {formatDate(payment.date)}
                    </TableCell>
                    <TableCell>
                      {payment.description || 'Subscription payment'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={payment.status === 'paid' ? 'default' : 'secondary'}
                        className={cn(
                          payment.status === 'paid' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                          payment.status === 'pending' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                          payment.status === 'failed' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        )}
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount, payment.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No payments recorded yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
