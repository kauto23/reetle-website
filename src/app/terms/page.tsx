import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Terms of Service - Reetle',
  description: 'Terms of Service for Reetle, the language learning app.',
};

export default function TermsPage() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[1200px] mx-auto px-4">
        <Card className="max-w-[800px] mx-auto">
          <CardContent className="p-6 sm:p-8">
          <h1 className="text-display-md tracking-tight text-ui-foreground mb-1">Terms of Service</h1>
          <p className="text-body-md text-ui-muted-foreground mb-8">Last updated: March 2026</p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">1. Acceptance of Terms</h2>
          <p className="text-body-md text-primary">
            By downloading, installing, or using Reetle (&quot;the App&quot; or &quot;the Service&quot;), you agree to be bound by these Terms of Service (also referred to as the End User License Agreement or &quot;EULA&quot;). 
            If you do not agree to these terms, please do not use our application.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">2. Description of Service</h2>
          <p className="text-body-md text-primary">
            Reetle is a language learning application that helps users improve their language skills through reading. 
            The app provides personalized content, instant translations, vocabulary tracking, audio narration, and practice exercises.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">3. User Accounts</h2>
          <p className="text-body-md text-primary mb-md">
            To use certain features of Reetle, you may need to create an account. You are responsible for:
          </p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary">Maintaining the confidentiality of your account credentials</li>
            <li className="text-body-md text-primary">All activities that occur under your account</li>
            <li className="text-body-md text-primary">Providing accurate and complete information</li>
            <li className="text-body-md text-primary">Notifying us of any unauthorized use of your account</li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">4. Subscriptions and In-App Purchases</h2>
          <p className="text-body-md text-primary mb-md">
            Reetle offers auto-renewable premium subscriptions (such as &quot;Reetle Premium Monthly&quot;) as well as optional free-tier access with daily usage limits.
          </p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary">
              <strong>Billing and Payment:</strong> Payment will be charged to your Apple ID account at confirmation of purchase for in-app subscriptions purchased on iOS devices.
            </li>
            <li className="text-body-md text-primary">
              <strong>Automatic Renewal:</strong> Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current billing period. Your account will be charged for renewal within 24 hours prior to the end of the current period at the rate of the selected plan.
            </li>
            <li className="text-body-md text-primary">
              <strong>Managing and Cancelling Subscriptions:</strong> You can manage or turn off auto-renewal in your Apple ID Account Settings at any time after purchase (go to Settings &gt; [your name] &gt; Subscriptions on your iOS device). Subscriptions cannot be cancelled for the current active billing period.
            </li>
            <li className="text-body-md text-primary">
              <strong>Free Trials:</strong> Any unused portion of a free trial period, if offered, will be forfeited when you purchase a subscription to that publication, where applicable.
            </li>
            <li className="text-body-md text-primary">
              <strong>Standard Apple EULA:</strong> For subscriptions purchased via the Apple App Store, these terms supplement the standard Apple Licensed Application End User License Agreement (&quot;Standard EULA&quot;), accessible at{' '}
              <a
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-ui-primary"
              >
                Apple&apos;s Standard EULA
              </a>.
            </li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">5. Acceptable Use</h2>
          <p className="text-body-md text-primary mb-md">You agree not to:</p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary">Use the service for any unlawful purpose</li>
            <li className="text-body-md text-primary">Attempt to gain unauthorized access to our systems</li>
            <li className="text-body-md text-primary">Interfere with or disrupt the service</li>
            <li className="text-body-md text-primary">Reverse engineer or decompile the application</li>
            <li className="text-body-md text-primary">Share your account with others or create multiple accounts</li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">6. Intellectual Property</h2>
          <p className="text-body-md text-primary">
            All content, features, and functionality of Reetle, including but not limited to text, graphics, logos, and software, 
            are owned by Reetle and are protected by intellectual property laws. You may not copy, modify, or distribute any part 
            of our service without permission.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">7. Limitation of Liability</h2>
          <p className="text-body-md text-primary">
            Reetle is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, 
            special, or consequential damages arising from your use of the service.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">8. Termination</h2>
          <p className="text-body-md text-primary">
            We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other 
            reason at our discretion. To delete your account, you may use the account deletion option in your profile settings or contact our support team.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">9. Changes to Terms</h2>
          <p className="text-body-md text-primary">
            We may modify these terms at any time. Continued use of Reetle after changes constitutes acceptance of the new terms. 
            We will notify users of significant changes through the app or via email.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">10. Governing Law</h2>
          <p className="text-body-md text-primary">
            These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">11. Privacy Policy</h2>
          <p className="text-body-md text-primary">
            Your use of Reetle is also subject to our Privacy Policy, which describes how we collect, use, and protect your personal information. You can review our Privacy Policy at{' '}
            <Link href="/privacy" className="underline hover:text-ui-primary">
              reetle.app/privacy
            </Link>.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">12. Contact Us</h2>
          <p className="text-body-md text-primary">
            If you have any questions about these Terms of Service or need assistance with your subscription, please contact us at:
          </p>
          <p className="text-body-md text-primary mt-sm">
            <strong>Email:</strong> support@reetle.com
          </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
