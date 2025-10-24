'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function UpgradePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Upgrade Your Plan</h1>
        <p className="text-muted-foreground mb-8">
          Choose the plan that best fits your video production needs
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Free Plan</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-3xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                <ul className="space-y-2 text-sm">
                  <li>✓ 5 projects</li>
                  <li>✓ Basic AI agents</li>
                  <li>✓ Community support</li>
                </ul>
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-sage-500">
            <CardHeader>
              <CardTitle>Pro Plan</CardTitle>
              <CardDescription>For professional creators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-3xl font-bold">$29<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                <ul className="space-y-2 text-sm">
                  <li>✓ Unlimited projects</li>
                  <li>✓ Advanced AI agents</li>
                  <li>✓ Sora video generation</li>
                  <li>✓ Priority support</li>
                  <li>✓ Series management</li>
                </ul>
                <Button className="w-full bg-sage-600 hover:bg-sage-700">
                  Upgrade to Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                This upgrade functionality is under development. Stay tuned for full pricing and features.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}
