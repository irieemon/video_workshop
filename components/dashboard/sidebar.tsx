'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { ScenraLogo } from '@/components/brand'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useTheme } from '@/app/providers/theme-provider'
import {
  Home,
  FolderKanban,
  Settings,
  ListVideo,
  Shield,
  Video,
  Folder,
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
  const { theme } = useTheme()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Videos', href: '/dashboard/videos', icon: Video },
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
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 dark:border-scenra-border-subtle px-6">
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

      {/* Theme Toggle and Usage Quota */}
      <div className="border-t border-gray-200 dark:border-scenra-border-subtle p-4 space-y-3">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-900 dark:text-scenra-light">Theme</span>
            <span className="text-xs text-gray-600 dark:text-scenra-gray capitalize">
              {theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}
            </span>
          </div>
          <ThemeToggle />
        </div>

        <div className="scenra-divider border-gray-200 dark:border-scenra-border-subtle" />

        {subscriptionTier === 'free' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs font-medium text-gray-900 dark:text-scenra-light flex items-center gap-1 cursor-help">
                        AI Consultations
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm">
                        <strong>AI Consultations</strong> are used each time you generate video prompts with the AI Film Crew.
                        Free accounts get {usageQuota?.consultations_per_month || 10} per month.
                        Upgrade to Premium for unlimited consultations.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
