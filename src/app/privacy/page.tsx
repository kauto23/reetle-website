import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Privacy Policy - Reetle',
  description: 'Privacy Policy for Reetle, the language learning app.',
};

export default function PrivacyPage() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[1200px] mx-auto px-4">
        <Card className="max-w-[800px] mx-auto">
          <CardContent className="p-6 sm:p-8 prose-content">
          <h1 className="text-display-md tracking-tight text-ui-foreground mb-1">Privacy Policy</h1>
          <p className="text-body-md text-ui-muted-foreground mb-8">Last updated: October 2026</p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">1. Introduction</h2>
          <p className="text-body-md text-primary">
            Welcome to Reetle. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy explains how we collect, use, and safeguard your information when you use our mobile app and
            the reetle.co website. Reetle is run by Acumen Analytics Limited.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">2. Information We Collect</h2>
          <p className="text-body-md text-primary mb-md">
            Reetle uses Sign in with Apple and Sign in with Google for authentication. We may collect the following types of information:
          </p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary">
              Authentication identifiers provided by Apple or Google (note: if you use Sign in with Apple&apos;s &quot;Hide My Email&quot; feature, we only receive a relay email address)
            </li>
            <li className="text-body-md text-primary">Your name and email address, as shared by Apple or Google when you sign in</li>
            <li className="text-body-md text-primary">Learning progress and preferences, such as your language and level</li>
            <li className="text-body-md text-primary">
              What you do in Reetle: articles you read and listen to, quizzes and practice questions you answer, and words or
              phrases you ask us to translate
            </li>
            <li className="text-body-md text-primary">
              How the app is working for you: when it is opened, notifications you tap, how long screens and audio take to
              load, and when you see or start a purchase
            </li>
            <li className="text-body-md text-primary">
              Device information: the device type and app version, a notification token so we can send you notifications, and
              your device&apos;s time zone so the daily brief arrives in your morning
            </li>
            <li className="text-body-md text-primary">
              Subscription and purchase details from Apple, Google Play or Stripe, such as your plan, price and renewal date. We
              never see your card details.
            </li>
            <li className="text-body-md text-primary">
              How you found Reetle: which advert or link led you to install the app or visit the website. On iPhone, the
              device&apos;s advertising identifier is only collected if you allow tracking when the app asks.
            </li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">3. How We Use Your Information</h2>
          <p className="text-body-md text-primary mb-md">We use the information we collect to:</p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary">Provide and improve our language learning services</li>
            <li className="text-body-md text-primary">Personalize your learning experience</li>
            <li className="text-body-md text-primary">Track your progress and adapt content to your level</li>
            <li className="text-body-md text-primary">
              Send you emails about your account and subscription, such as a reminder before a free trial ends
            </li>
            <li className="text-body-md text-primary">Send you notifications you have allowed, such as the day&apos;s top story</li>
            <li className="text-body-md text-primary">
              Measure which adverts bring people to Reetle, so we spend less on advertising (on iPhone, only if you allow
              tracking)
            </li>
            <li className="text-body-md text-primary">Ensure the security of our services</li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">4. Data Storage and Security</h2>
          <p className="text-body-md text-primary">
            We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, 
            alteration, disclosure, or destruction. Your data is stored securely and we regularly review our security practices.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">5. Third-Party Services</h2>
          <p className="text-body-md text-primary mb-md">
            We use these companies to run Reetle. They only process your information for us, under their own privacy
            policies, and some are based outside the UK. We do not sell your personal information.
          </p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary"><strong>Apple and Google:</strong> sign-in, and payments through the App Store and Google Play</li>
            <li className="text-body-md text-primary"><strong>Stripe:</strong> payments on reetle.co</li>
            <li className="text-body-md text-primary"><strong>Google Cloud and Firebase:</strong> hosting, our database and push notifications</li>
            <li className="text-body-md text-primary">
              <strong>Google (Gemini) and OpenAI:</strong> writing articles at your level and translating the words and phrases
              you ask about
            </li>
            <li className="text-body-md text-primary"><strong>ElevenLabs:</strong> turning articles into audio (no personal information is sent)</li>
            <li className="text-body-md text-primary"><strong>AppsFlyer:</strong> measuring which adverts lead to app installs and subscriptions</li>
            <li className="text-body-md text-primary">
              <strong>Meta:</strong> measuring which adverts lead to visits, sign-ups and purchases on reetle.co, and, through
              AppsFlyer, in the app if you allow tracking
            </li>
            <li className="text-body-md text-primary"><strong>Resend:</strong> sending emails about your account and subscription</li>
            <li className="text-body-md text-primary"><strong>Slack:</strong> internal notices to our team, such as a new subscription</li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">6. Your Rights</h2>
          <p className="text-body-md text-primary mb-md">You have the right to:</p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary">Access your personal data</li>
            <li className="text-body-md text-primary">Request correction of inaccurate data</li>
            <li className="text-body-md text-primary">Request deletion of your data</li>
            <li className="text-body-md text-primary">Withdraw consent at any time</li>
            <li className="text-body-md text-primary">Export your data in a portable format</li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">7. Children&apos;s Privacy</h2>
          <p className="text-body-md text-primary">
            Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13. 
            If you believe we have collected such information, please contact us immediately.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">8. Changes to This Policy</h2>
          <p className="text-body-md text-primary">
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on 
            this page and updating the &quot;Last updated&quot; date.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">9. Contact Us</h2>
          <p className="text-body-md text-primary">
            If you have any questions about this privacy policy or our data practices, please contact us at:
          </p>
          <p className="text-body-md text-primary mt-sm">
            <strong>Email:</strong> support@reetle.co
          </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
