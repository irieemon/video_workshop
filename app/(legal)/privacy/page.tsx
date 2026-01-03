import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | Scenra',
  description: 'Privacy Policy for Scenra - How we collect, use, and protect your data',
}

export default function PrivacyPolicyPage() {
  const effectiveDate = 'January 3, 2025'
  const version = '1.0'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
          Version {version}
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">
          Effective Date: {effectiveDate}
        </p>
      </div>

      {/* Key Points Summary */}
      <Alert className="bg-amber-50 border-amber-200">
        <Shield className="h-4 w-4 text-amber-700" />
        <AlertDescription className="text-amber-900">
          <strong>Key Privacy Commitments:</strong> We do not sell your personal data. We do not use your prompts to train AI models. You can request deletion of your data at any time.
        </AlertDescription>
      </Alert>

      {/* Content */}
      <Card>
        <CardContent className="prose prose-gray dark:prose-invert max-w-none p-8">
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mt-0">1. Introduction</h2>
              <p>
                Scenra ("Company," "we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered video prompt generation platform at scenra.io (the "Service").
              </p>
              <p>
                This policy applies to users worldwide, including those in the European Union (EU), European Economic Area (EEA), United Kingdom (UK), California, and other jurisdictions with specific data protection laws.
              </p>
              <p>
                By using our Service, you consent to the collection and use of information in accordance with this policy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">2. Information We Collect</h2>

              <h3 className="text-xl font-medium">2.1 Information You Provide</h3>
              <p>We collect information you voluntarily provide, including:</p>
              <ul>
                <li><strong>Account Information:</strong> Name, email address, password (encrypted), and profile details</li>
                <li><strong>User Content:</strong> Video prompts, project titles, descriptions, and creative materials you create</li>
                <li><strong>Payment Information:</strong> Billing details processed through our payment providers (we do not store credit card numbers)</li>
                <li><strong>Communications:</strong> Messages you send us for support or feedback</li>
                <li><strong>API Keys:</strong> If you use our BYOK (Bring Your Own Key) feature, your encrypted API keys</li>
              </ul>

              <h3 className="text-xl font-medium">2.2 Information Collected Automatically</h3>
              <p>When you use our Service, we automatically collect:</p>
              <ul>
                <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
                <li><strong>Usage Data:</strong> Pages viewed, features used, time spent on the Service</li>
                <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
                <li><strong>Cookies:</strong> Session cookies and analytics cookies (see our Cookie Policy)</li>
              </ul>

              <h3 className="text-xl font-medium">2.3 Information from Third Parties</h3>
              <p>We may receive information from:</p>
              <ul>
                <li><strong>OAuth Providers:</strong> If you sign in with Google or GitHub, we receive your public profile information</li>
                <li><strong>Analytics Services:</strong> Aggregated usage statistics from our analytics providers</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul>
                <li><strong>Provide the Service:</strong> Process your prompts, generate AI content, and deliver the core functionality</li>
                <li><strong>Personalize Experience:</strong> Remember your preferences and settings</li>
                <li><strong>Improve the Service:</strong> Analyze usage patterns to enhance features and performance</li>
                <li><strong>Communicate:</strong> Send service updates, security alerts, and support messages</li>
                <li><strong>Process Payments:</strong> Handle subscription billing and invoicing</li>
                <li><strong>Ensure Security:</strong> Detect and prevent fraud, abuse, and unauthorized access</li>
                <li><strong>Comply with Law:</strong> Meet legal obligations and respond to lawful requests</li>
              </ul>

              <h3 className="text-xl font-medium">3.1 AI Processing</h3>
              <p>
                <strong>Important:</strong> When you use our AI features, your prompts are sent to third-party AI providers (such as OpenAI) for processing. These providers may retain data according to their own policies. We recommend reviewing:
              </p>
              <ul>
                <li><a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-900">OpenAI Privacy Policy</a></li>
              </ul>
              <p>
                <strong>We do not use your prompts or content to train our own AI models.</strong>
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">4. Legal Basis for Processing (GDPR)</h2>
              <p>For users in the EU/EEA/UK, we process your data under these legal bases:</p>
              <ul>
                <li><strong>Contract Performance:</strong> To provide the Service you've requested</li>
                <li><strong>Consent:</strong> Where you've given explicit consent (e.g., marketing emails)</li>
                <li><strong>Legitimate Interests:</strong> For service improvement, security, and fraud prevention</li>
                <li><strong>Legal Obligation:</strong> To comply with applicable laws</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">5. Information Sharing and Disclosure</h2>
              <p>We may share your information with:</p>

              <h3 className="text-xl font-medium">5.1 Service Providers</h3>
              <ul>
                <li><strong>OpenAI:</strong> AI content generation</li>
                <li><strong>Supabase:</strong> Authentication and database services</li>
                <li><strong>Vercel:</strong> Hosting and content delivery</li>
                <li><strong>Payment Processors:</strong> Subscription billing</li>
                <li><strong>Analytics Providers:</strong> Usage analytics</li>
              </ul>

              <h3 className="text-xl font-medium">5.2 Legal Requirements</h3>
              <p>We may disclose your information if required by law or in response to valid legal requests from public authorities.</p>

              <h3 className="text-xl font-medium">5.3 Business Transfers</h3>
              <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred. We will notify you of any such change.</p>

              <h3 className="text-xl font-medium">5.4 What We Never Do</h3>
              <p className="font-semibold text-amber-700">
                We do NOT sell your personal information to third parties. We do NOT share your data for advertising purposes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">6. Data Retention</h2>
              <p>We retain your information for as long as necessary to:</p>
              <ul>
                <li>Provide the Service to you</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce agreements</li>
              </ul>
              <p>
                When you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal purposes.
              </p>
              <p>
                AI-generated content and prompts are retained according to our data retention schedule unless you explicitly request deletion.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">7. Your Rights</h2>

              <h3 className="text-xl font-medium">7.1 Rights for All Users</h3>
              <ul>
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your data</li>
                <li><strong>Export:</strong> Receive your data in a portable format</li>
              </ul>

              <h3 className="text-xl font-medium">7.2 Additional Rights for EU/EEA/UK Users (GDPR)</h3>
              <ul>
                <li><strong>Restriction:</strong> Request restriction of processing</li>
                <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
                <li><strong>Lodge Complaint:</strong> File a complaint with your supervisory authority</li>
              </ul>

              <h3 className="text-xl font-medium">7.3 California Residents (CCPA/CPRA)</h3>
              <p>California residents have additional rights:</p>
              <ul>
                <li><strong>Right to Know:</strong> Request information about data collection practices</li>
                <li><strong>Right to Delete:</strong> Request deletion of personal information</li>
                <li><strong>Right to Opt-Out:</strong> Opt out of sale or sharing of personal information (note: we do not sell your data)</li>
                <li><strong>Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at <a href="mailto:privacy@scenra.io" className="text-amber-700 hover:text-amber-900">privacy@scenra.io</a>.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">8. Data Security</h2>
              <p>We implement appropriate technical and organizational measures to protect your data, including:</p>
              <ul>
                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                <li>Secure authentication with password hashing</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls limiting data access to authorized personnel</li>
                <li>AES-256 encryption for sensitive data like API keys</li>
              </ul>
              <p>
                While we strive to protect your data, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own, including the United States. We ensure appropriate safeguards are in place, including:
              </p>
              <ul>
                <li>Standard Contractual Clauses approved by the European Commission</li>
                <li>Data Processing Agreements with our service providers</li>
                <li>Compliance with applicable data transfer regulations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">10. Children's Privacy</h2>
              <p>
                Our Service is not intended for children under 13 years of age (or 16 in the EU). We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately at <a href="mailto:privacy@scenra.io" className="text-amber-700 hover:text-amber-900">privacy@scenra.io</a>.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">11. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to improve your experience. For detailed information about our cookie practices, please see our <a href="/cookies" className="text-amber-700 hover:text-amber-900">Cookie Policy</a>.
              </p>
              <p>You can control cookies through your browser settings. Note that disabling cookies may affect the functionality of the Service.</p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">12. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by:
              </p>
              <ul>
                <li>Posting the updated policy on our website</li>
                <li>Updating the "Effective Date" at the top</li>
                <li>Sending an email notification for significant changes</li>
              </ul>
              <p>
                We encourage you to review this policy periodically. Your continued use of the Service after changes constitutes acceptance of the updated policy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">13. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
              </p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:privacy@scenra.io" className="text-amber-700 hover:text-amber-900">privacy@scenra.io</a></li>
                <li><strong>General Inquiries:</strong> <a href="mailto:support@scenra.io" className="text-amber-700 hover:text-amber-900">support@scenra.io</a></li>
              </ul>
              <p>
                For EU/EEA users: If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.
              </p>
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
