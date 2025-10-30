import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from './providers/theme-provider'
import { QueryProvider } from './providers/query-provider'
import { ModalProvider } from '@/components/providers/modal-provider'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from 'sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Scenra Studio',
  description: 'AI-powered creative production platform by Scenra',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <QueryProvider>
          <ThemeProvider>
            <ModalProvider>
              {children}
              <Toaster />
              <Sonner />
            </ModalProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
