'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Check,
  Sparkles,
  Zap,
  Crown,
  Video,
  Users,
  Headphones,
  Loader2,
  AlertCircle,
  PartyPopper
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PRICING_TIERS } from '@/lib/stripe/config'
import { redirectToCheckout } from '@/lib/stripe/client'
import { Fade, Scale, StaggerContainer, StaggerItem } from '@/components/ui/motion'
import { useConfetti } from '@/lib/hooks/use-confetti'

export default function UpgradePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { celebrate, successBurst } = useConfetti()

  const [loading, setLoading] = useState(false)
  const [currentTier, setCurrentTier] = useState<string>('free')
  const [error, setError] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)

  // Check for checkout status in URL
  useEffect(() => {
    const checkout = searchParams.get('checkout')
    if (checkout === 'cancelled') {
      setError('Checkout was cancelled. You can try again when ready.')
    }
  }, [searchParams])

  // Load current subscription
  useEffect(() => {
    async function loadSubscription() {
      try {
        const response = await fetch('/api/stripe/subscription')
        if (response.ok) {
          const data = await response.json()
          setCurrentTier(data.tier)
        }
      } catch (err) {
        console.error('Error loading subscription:', err)
      }
    }
    loadSubscription()
  }, [])

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'premium' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create checkout session')
      }

      const { url, sessionId } = await response.json()

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      } else if (sessionId) {
        await redirectToCheckout(sessionId)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const isPremium = currentTier === 'premium'

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen">
      <Fade direction="up">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </Fade>

      <div className="max-w-5xl mx-auto">
        <Fade direction="up" delay={0.1}>
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-gradient-to-r from-scenra-amber to-yellow-500 text-scenra-dark">
              <Sparkles className="w-3 h-3 mr-1" />
              Special Launch Pricing
            </Badge>
            <h1 className="text-4xl font-bold mb-3">
              Upgrade to <span className="text-scenra-amber">Premium</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Unlock the full power of AI video creation with unlimited access to all features
            </p>
          </div>
        </Fade>

        {error && (
          <Fade direction="up">
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </Fade>
        )}

        <StaggerContainer className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Free Tier */}
          <StaggerItem>
            <Card className={`relative h-full ${currentTier === 'free' ? 'ring-2 ring-muted' : ''}`}>
              {currentTier === 'free' && (
                <Badge className="absolute -top-3 left-4 bg-muted text-muted-foreground">
                  Current Plan
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                  {PRICING_TIERS.free.name}
                </CardTitle>
                <CardDescription>{PRICING_TIERS.free.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-3">
                  {PRICING_TIERS.free.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled
                >
                  {currentTier === 'free' ? 'Current Plan' : 'Downgrade'}
                </Button>
              </CardFooter>
            </Card>
          </StaggerItem>

          {/* Premium Tier */}
          <StaggerItem>
            <Card className={`relative h-full border-2 ${isPremium ? 'border-scenra-amber ring-2 ring-scenra-amber/20' : 'border-scenra-amber'}`}>
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-scenra-amber to-yellow-500 text-scenra-dark shadow-lg">
                  <Crown className="w-3 h-3 mr-1" />
                  {isPremium ? 'Your Plan' : 'Most Popular'}
                </Badge>
              </div>
              <CardHeader className="pt-8">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-scenra-amber" />
                  {PRICING_TIERS.premium.name}
                </CardTitle>
                <CardDescription>{PRICING_TIERS.premium.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${PRICING_TIERS.premium.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-3">
                  {PRICING_TIERS.premium.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-scenra-amber flex-shrink-0" />
                      <span className="font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isPremium ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/dashboard/settings')}
                  >
                    Manage Subscription
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-gradient-to-r from-scenra-amber to-yellow-500 text-scenra-dark hover:from-yellow-500 hover:to-scenra-amber shadow-lg"
                    onClick={handleUpgrade}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Upgrade to Premium
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* Feature Comparison */}
        <Fade direction="up" delay={0.3}>
          <Card>
            <CardHeader>
              <CardTitle>Why Upgrade?</CardTitle>
              <CardDescription>
                See what you unlock with Premium
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Video className="h-8 w-8 mx-auto mb-3 text-scenra-amber" />
                  <h3 className="font-semibold mb-1">Sora Generation</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate videos directly with OpenAI's Sora
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Users className="h-8 w-8 mx-auto mb-3 text-scenra-amber" />
                  <h3 className="font-semibold mb-1">Advanced AI Crew</h3>
                  <p className="text-sm text-muted-foreground">
                    Full access to all specialized AI agents
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Headphones className="h-8 w-8 mx-auto mb-3 text-scenra-amber" />
                  <h3 className="font-semibold mb-1">Priority Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Fast responses from our support team
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Fade>

        {/* FAQ */}
        <Fade direction="up" delay={0.4}>
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Questions about pricing?{' '}
              <Link href="/dashboard/help" className="text-scenra-amber hover:underline">
                Check our FAQ
              </Link>{' '}
              or contact support.
            </p>
            <p className="text-xs text-muted-foreground">
              Cancel anytime. No commitments. Secure payment via Stripe.
            </p>
          </div>
        </Fade>
      </div>
    </div>
  )
}
