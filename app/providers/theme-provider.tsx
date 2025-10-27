'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark')
  const [mounted, setMounted] = useState(false)

  // Get system theme preference
  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Resolve theme to actual light/dark
  const resolveTheme = useCallback((themeValue: Theme): ResolvedTheme => {
    if (themeValue === 'system') {
      return getSystemTheme()
    }
    return themeValue
  }, [])

  // Apply theme to document
  const applyTheme = useCallback((resolved: ResolvedTheme) => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
    setResolvedTheme(resolved)
  }, [])

  // Set theme and persist
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme)
    const resolved = resolveTheme(newTheme)
    applyTheme(resolved)

    // Save to localStorage
    localStorage.setItem('theme', newTheme)

    // Sync to database (silently fail if not authenticated)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        // User not authenticated yet - skip database sync
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user.id)

      if (updateError) {
        // Silently log but don't throw - theme still works via localStorage
        console.debug('Theme preference not synced to database:', updateError.message)
      }
    } catch (error) {
      // Silently fail - theme preference will still work via localStorage
      console.debug('Failed to sync theme to database:', error)
    }
  }, [resolveTheme, applyTheme])

  // Initialize theme on mount
  useEffect(() => {
    const initTheme = async () => {
      try {
        let initialTheme: Theme = 'system'

        // Start with localStorage for instant load
        const stored = localStorage.getItem('theme') as Theme | null
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          initialTheme = stored
        }

        // Try to fetch from database, but don't block on errors
        try {
          const supabase = createClient()
          const { data: { user }, error: authError } = await supabase.auth.getUser()

          if (!authError && user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('theme_preference')
              .eq('id', user.id)
              .single()

            if (!profileError && profile?.theme_preference) {
              initialTheme = profile.theme_preference as Theme
            }
          }
        } catch (dbError) {
          // Database fetch failed - use localStorage value
          console.debug('Could not fetch theme from database, using localStorage')
        }

        setThemeState(initialTheme)
        const resolved = resolveTheme(initialTheme)
        applyTheme(resolved)
      } catch (error) {
        console.debug('Failed to initialize theme:', error)
        // Fallback to system theme
        const resolved = getSystemTheme()
        applyTheme(resolved)
      } finally {
        setMounted(true)
      }
    }

    initTheme()
  }, [resolveTheme, applyTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const resolved = getSystemTheme()
      applyTheme(resolved)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, applyTheme])

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    // During Fast Refresh in development, context may be temporarily undefined
    // Provide a fallback to prevent crashes during HMR
    if (process.env.NODE_ENV === 'development') {
      console.warn('useTheme: Context undefined during Fast Refresh, using fallback')
      return {
        theme: 'system' as Theme,
        setTheme: () => {},
        effectiveTheme: 'light' as 'light' | 'dark',
      }
    }
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
