'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScenraLogo } from '@/components/brand'
import {
  Home,
  FolderKanban,
  Settings,
  ListVideo,
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
}

export function Sidebar({ usageQuota, usageCurrent, subscriptionTier = 'free' }: SidebarProps) {
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Projects', href: '/dashboard', icon: FolderKanban },
    { name: 'Series', href: '/dashboard/series', icon: ListVideo },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  const consultationsRemaining = usageQuota && usageCurrent
    ? usageQuota.consultations_per_month - usageCurrent.consultations_this_month
    : 10

  return (
    <div className="hidden md:flex h-full w-64 flex-col bg-scenra-dark border-r border-scenra-border-subtle">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-scenra-border-subtle px-6">
        <Link href="/dashboard">
          <ScenraLogo size="md" />
        </Link>
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
                  : 'text-scenra-gray hover:bg-scenra-amber/5 hover:text-scenra-amber'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Usage Quota */}
      <div className="border-t border-scenra-border-subtle p-4 space-y-3">
        {subscriptionTier === 'free' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-scenra-light">AI Consultations</span>
                <span className="text-xs text-scenra-gray">
                  {consultationsRemaining} left
                </span>
              </div>
              <div className="h-1.5 bg-scenra-dark-panel rounded-full overflow-hidden border border-scenra-border-subtle">
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
            <div className="scenra-divider" />
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
            <span className="text-xs text-scenra-gray">Unlimited access</span>
          </div>
        )}
      </div>
    </div>
  )
}
