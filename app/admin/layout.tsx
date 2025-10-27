import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserMenu } from '@/components/dashboard/user-menu'
import { Shield, Users, BarChart3 } from 'lucide-react'

export default async function AdminLayout({
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

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, email, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/dashboard?error=unauthorized')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Admin Panel</span>
              </Link>

              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/admin"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/admin/users"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Users
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Dashboard
              </Link>
              <UserMenu
                user={{
                  email: profile.email,
                  full_name: profile.full_name,
                  avatar_url: profile.avatar_url,
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
