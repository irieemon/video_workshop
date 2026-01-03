import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata: Metadata = {
  title: 'Cookie Policy | Scenra',
  description: 'Cookie Policy for Scenra - How we use cookies and similar technologies',
}

export default function CookiePolicyPage() {
  const effectiveDate = 'January 3, 2025'
  const version = '1.0'

  const cookies = [
    {
      name: 'sb-*-auth-token',
      purpose: 'Authentication session management',
      type: 'Essential',
      duration: 'Session / 7 days',
      provider: 'Supabase',
    },
    {
      name: 'theme',
      purpose: 'Stores user theme preference (light/dark)',
      type: 'Functional',
      duration: '1 year',
      provider: 'Scenra',
    },
    {
      name: '_vercel_*',
      purpose: 'Performance and analytics for hosting',
      type: 'Analytics',
      duration: 'Session',
      provider: 'Vercel',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
          Version {version}
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">Cookie Policy</h1>
        <p className="text-muted-foreground">
          Effective Date: {effectiveDate}
        </p>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="prose prose-gray dark:prose-invert max-w-none p-8">
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mt-0">1. What Are Cookies?</h2>
              <p>
                Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They help websites remember your preferences and improve your browsing experience.
              </p>
              <p>
                We use cookies and similar technologies (such as local storage) to provide and improve our Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">2. Types of Cookies We Use</h2>

              <h3 className="text-xl font-medium">2.1 Essential Cookies</h3>
              <p>
                These cookies are necessary for the Service to function properly. They enable core functionality such as authentication, security, and session management. You cannot opt out of essential cookies.
              </p>

              <h3 className="text-xl font-medium">2.2 Functional Cookies</h3>
              <p>
                These cookies remember your preferences and settings (such as theme choice) to provide a more personalized experience. Disabling these cookies may affect some features.
              </p>

              <h3 className="text-xl font-medium">2.3 Analytics Cookies</h3>
              <p>
                These cookies help us understand how visitors interact with our Service by collecting and reporting information anonymously. This helps us improve our Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">3. Cookies We Use</h2>
              <p>Here is a list of cookies used on our Service:</p>
            </div>
          </section>
        </CardContent>
      </Card>

      {/* Cookie Table */}
      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cookie Name</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Provider</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cookies.map((cookie) => (
                <TableRow key={cookie.name}>
                  <TableCell className="font-mono text-sm">{cookie.name}</TableCell>
                  <TableCell>{cookie.purpose}</TableCell>
                  <TableCell>
                    <Badge
                      variant={cookie.type === 'Essential' ? 'default' : 'secondary'}
                      className={
                        cookie.type === 'Essential'
                          ? 'bg-amber-600'
                          : cookie.type === 'Functional'
                          ? 'bg-blue-500'
                          : 'bg-gray-500'
                      }
                    >
                      {cookie.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{cookie.duration}</TableCell>
                  <TableCell>{cookie.provider}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rest of Content */}
      <Card>
        <CardContent className="prose prose-gray dark:prose-invert max-w-none p-8">
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mt-0">4. Third-Party Cookies</h2>
              <p>
                Some cookies are placed by third-party services that appear on our pages. We do not control how third parties use their cookies. Please refer to their respective privacy policies:
              </p>
              <ul>
                <li><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-900">Supabase Privacy Policy</a></li>
                <li><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-900">Vercel Privacy Policy</a></li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">5. Managing Cookies</h2>
              <p>
                You can control and manage cookies in several ways:
              </p>

              <h3 className="text-xl font-medium">5.1 Browser Settings</h3>
              <p>
                Most browsers allow you to refuse cookies or alert you when cookies are being sent. Here's how to manage cookies in popular browsers:
              </p>
              <ul>
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-900">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-900">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-900">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-900">Microsoft Edge</a></li>
              </ul>

              <h3 className="text-xl font-medium">5.2 Impact of Disabling Cookies</h3>
              <p>
                Please note that if you disable or refuse cookies:
              </p>
              <ul>
                <li>Some features of the Service may not function properly</li>
                <li>You may not be able to stay logged in to your account</li>
                <li>Your preferences may not be saved between sessions</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">6. Do Not Track</h2>
              <p>
                Some browsers have a "Do Not Track" (DNT) feature that sends a signal to websites requesting that they not track your browsing activity. Our Service currently does not respond to DNT signals, but we respect your privacy choices through the other mechanisms described in this policy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">7. Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. The "Effective Date" at the top of this page indicates when this policy was last updated.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">8. Contact Us</h2>
              <p>
                If you have questions about our use of cookies, please contact us at:
              </p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:privacy@scenra.io" className="text-amber-700 hover:text-amber-900">privacy@scenra.io</a></li>
              </ul>
            </div>
          </section>
        </CardContent>
      </Card>

      {/* Version History */}
      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">Version History</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong>v1.0</strong> (January 3, 2025) - Initial release</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
