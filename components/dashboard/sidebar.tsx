'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScenraLogo } from '@/components/brand'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  Home,
  FolderKanban,
  Settings,
  ListVideo,
  Shield,
} from 'lucide-react'

interface SidebarProps {
  usageQuota?: {
    projects: number
    videos_per_month: number
    consultations_per_month: number
  }
  usageCurrent?: {
    projects: number
    videos_this_month: number
    consultations_this_month: number
  }
  subscriptionTier?: string
  isAdmin?: boolean
}

export function Sidebar({ usageQuota, usageCurrent, subscriptionTier = 'free', isAdmin = false }: SidebarProps) {
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Projects', href: '/dashboard', icon: FolderKanban },
    { name: 'Series', href: '/dashboard/series', icon: ListVideo },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  const adminNavigation = isAdmin
    ? [{ name: 'Admin Panel', href: '/admin', icon: Shield }]
    : []

  const consultationsRemaining = usageQuota && usageCurrent
    ? usageQuota.consultations_per_month - usageCurrent.consultations_this_month
    : 10

  return (
    <div className="hidden md:flex h-full w-64 flex-col bg-white dark:bg-scenra-dark border-r border-gray-200 dark:border-scenra-border-subtle">
      {/* Logo and Theme Toggle */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-scenra-border-subtle px-6">
        <Link href="/dashboard">
          <ScenraLogo size="md" />
        </Link>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'scenra-sidebar-active text-scenra-amber'
                  : 'text-gray-600 dark:text-scenra-gray hover:bg-scenra-amber/10 dark:hover:bg-scenra-amber/5 hover:text-scenra-amber'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}

        {/* Admin Navigation */}
        {adminNavigation.length > 0 && (
          <>
            <Separator className="my-2" />
            {adminNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 dark:text-scenra-gray hover:bg-primary/5 hover:text-primary'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Usage Quota */}
      <div className="border-t border-gray-200 dark:border-scenra-border-subtle p-4 space-y-3">
        {subscriptionTier === 'free' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-900 dark:text-scenra-light">AI Consultations</span>
                <span className="text-xs text-gray-600 dark:text-scenra-gray">
                  {consultationsRemaining} left
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-scenra-dark-panel rounded-full overflow-hidden border border-gray-200 dark:border-scenra-border-subtle">
                <div
                  className={cn(
                    'h-full transition-all',
                    consultationsRemaining > 5
                      ? 'bg-scenra-amber shadow-amber-glow'
                      : consultationsRemaining > 2
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  )}
                  style={{
                    width: `${(consultationsRemaining / (usageQuota?.consultations_per_month || 10)) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="scenra-divider border-gray-200 dark:border-scenra-border-subtle" />
            <Button asChild className="w-full scenra-button-primary" size="sm">
              <Link href="/dashboard/upgrade">
                Upgrade to Premium
              </Link>
            </Button>
          </>
        )}
        {subscriptionTier === 'premium' && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-scenra-amber text-scenra-dark font-medium">
              Premium
            </Badge>
            <span className="text-xs text-gray-600 dark:text-scenra-gray">Unlimited access</span>
          </div>
        )}
      </div>
    </div>
  )
}
