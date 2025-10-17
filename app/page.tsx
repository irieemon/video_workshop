import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Sora2 Prompt Studio
        </h1>
        <p className="text-xl text-muted-foreground">
          AI-powered creative production platform for social media creators
        </p>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Transform your video ideas into detailed, optimized Sora2 prompts through AI agent collaboration.
          Organize content, track performance, and create viral-ready videos.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button asChild size="lg" className="bg-sage-500 hover:bg-sage-700">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
