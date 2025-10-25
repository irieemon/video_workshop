'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Home,
  FolderKanban,
  Settings,
  Sparkles,
  Menu,
  ListVideo,
} from 'lucide-react'

interface MobileNavProps {
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

export function MobileNav({ usageQuota, usageCurrent, subscriptionTier = 'free' }: MobileNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2"
              onClick={() => setOpen(false)}
            >
              <Sparkles className="h-6 w-6 text-scenra-amber" />
              <span className="font-bold text-lg">Scenra Studio</span>
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
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sage-100 text-sage-900'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Usage Quota */}
          <div className="border-t p-4 space-y-3">
            {subscriptionTier === 'free' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">AI Consultations</span>
                    <span className="text-xs text-muted-foreground">
                      {consultationsRemaining} left
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all',
                        consultationsRemaining > 5
                          ? 'bg-scenra-amber'
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
                <Separator />
                <Button
                  asChild
                  className="w-full"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/dashboard/upgrade">
                    Upgrade to Premium
                  </Link>
                </Button>
              </>
            )}
            {subscriptionTier === 'premium' && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-scenra-amber text-white">
                  Premium
                </Badge>
                <span className="text-xs text-muted-foreground">Unlimited access</span>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
