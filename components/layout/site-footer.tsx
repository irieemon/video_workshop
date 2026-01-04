'use client'

import Link from 'next/link'

interface SiteFooterProps {
  variant?: 'minimal' | 'full'
}

export function SiteFooter({ variant = 'minimal' }: SiteFooterProps) {
  const currentYear = new Date().getFullYear()

  if (variant === 'full') {
    return <FullFooter currentYear={currentYear} />
  }

  return <MinimalFooter currentYear={currentYear} />
}

function MinimalFooter({ currentYear }: { currentYear: number }) {
  return (
    <footer className="w-full py-8 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Subtle divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent mb-8" />

        {/* Footer content */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-sm">
          {/* Copyright */}
          <p className="text-gray-500 dark:text-gray-400">
            © {currentYear} Scenra
          </p>

          {/* Links */}
          <nav className="flex items-center gap-8">
            <Link
              href="/terms"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/cookies"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cookies
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

function FullFooter({ currentYear }: { currentYear: number }) {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span className="font-semibold">Scenra</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered creative production platform for video prompt generation.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Product</h4>
            <nav className="flex flex-col space-y-3 text-sm">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/videos" className="text-muted-foreground hover:text-foreground transition-colors">
                Videos
              </Link>
              <Link href="/dashboard/series" className="text-muted-foreground hover:text-foreground transition-colors">
                Series
              </Link>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Support</h4>
            <nav className="flex flex-col space-y-3 text-sm">
              <Link href="mailto:support@scenra.io" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact Us
              </Link>
              <Link href="mailto:feedback@scenra.io" className="text-muted-foreground hover:text-foreground transition-colors">
                Feedback
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Legal</h4>
            <nav className="flex flex-col space-y-3 text-sm">
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/cookies" className="text-muted-foreground hover:text-foreground transition-colors">
                Cookie Policy
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground text-center">
            © {currentYear} Scenra. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
