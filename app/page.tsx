import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ScenraLogo } from '@/components/brand'
import { Sparkles, Film, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-scenra-dark relative overflow-hidden">
      {/* Ambient glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-scenra-amber/5 via-transparent to-scenra-blue/5 pointer-events-none" />

      <div className="text-center space-y-8 max-w-3xl px-6 relative z-10 scenra-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <ScenraLogo size="lg" />
        </div>

        {/* Hero text */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight scenra-heading">
            Scenra Studio
          </h1>
          <p className="text-xl md:text-2xl text-scenra-light/90 font-medium">
            AI-powered creative production platform
          </p>
          <p className="text-base md:text-lg scenra-text-muted max-w-2xl mx-auto leading-relaxed">
            Transform your video ideas into detailed, optimized prompts through AI agent collaboration.
            Organize content, track performance, and create viral-ready videos.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 pb-4">
          <div className="scenra-card p-4 space-y-2">
            <Sparkles className="h-6 w-6 text-scenra-ai mx-auto" />
            <p className="text-sm scenra-text-muted">AI Agent Collaboration</p>
          </div>
          <div className="scenra-card p-4 space-y-2">
            <Film className="h-6 w-6 text-scenra-amber mx-auto" />
            <p className="text-sm scenra-text-muted">Series & Episodes</p>
          </div>
          <div className="scenra-card p-4 space-y-2">
            <Zap className="h-6 w-6 text-scenra-blue mx-auto" />
            <p className="text-sm scenra-text-muted">Optimized Prompts</p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button asChild size="lg" className="scenra-button-primary text-base">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button asChild size="lg" className="scenra-button-secondary text-base">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
