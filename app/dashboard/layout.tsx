import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import { MobileNav } from '@/components/dashboard/mobile-nav'
import { UserMenu } from '@/components/dashboard/user-menu'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { ScenraLogo } from '@/components/brand'
import { TourProvider, FloatingHelpButton, WelcomeTourTrigger } from '@/components/onboarding'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile with usage data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <TourProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar
          usageQuota={profile?.usage_quota}
          usageCurrent={profile?.usage_current}
          subscriptionTier={profile?.subscription_tier}
          isAdmin={profile?.is_admin || false}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-scenra-border-subtle px-4 md:px-6 bg-white dark:bg-background">
            <div className="flex items-center gap-3">
              {/* Mobile Menu */}
              <MobileNav
                usageQuota={profile?.usage_quota}
                usageCurrent={profile?.usage_current}
                subscriptionTier={profile?.subscription_tier}
              />

              {/* Mobile Logo */}
              <Link href="/dashboard" className="flex md:hidden">
                <ScenraLogo size="sm" />
              </Link>

              {/* Desktop Title */}
              <h2 className="hidden md:block text-lg font-semibold text-gray-900 dark:text-foreground">Dashboard</h2>
            </div>

            <UserMenu
              user={{
                email: user.email || '',
                full_name: profile?.full_name,
              }}
            />
          </header>

          {/* Content Area */}
          <DashboardContent>
            {children}
          </DashboardContent>
        </div>

        {/* Onboarding Components */}
        <WelcomeTourTrigger />
        <FloatingHelpButton />
      </div>
    </TourProvider>
  )
}
