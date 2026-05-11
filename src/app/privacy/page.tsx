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
          <h1 className="text-[28px] font-semibold tracking-tight text-ui-foreground mb-1">Privacy Policy</h1>
          <p className="text-[14px] text-ui-muted-foreground mb-8">Last updated: December 2025</p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">1. Introduction</h2>
          <p className="text-body-md text-primary">
            Welcome to Reetle. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy explains how we collect, use, and safeguard your information when you use our mobile application.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">2. Information We Collect</h2>
          <p className="text-body-md text-primary mb-md">
            Reetle uses Sign in with Apple and Sign in with Google for authentication. We may collect the following types of information:
          </p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary">
              Authentication identifiers provided by Apple or Google (note: if you use Sign in with Apple&apos;s &quot;Hide My Email&quot; feature, we only receive a relay email address)
            </li>
            <li className="text-body-md text-primary">Learning progress and preferences</li>
            <li className="text-body-md text-primary">Device information and usage statistics</li>
            <li className="text-body-md text-primary">Vocabulary and reading history within the app</li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">3. How We Use Your Information</h2>
          <p className="text-body-md text-primary mb-md">We use the information we collect to:</p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary">Provide and improve our language learning services</li>
            <li className="text-body-md text-primary">Personalize your learning experience</li>
            <li className="text-body-md text-primary">Track your progress and adapt content to your level</li>
            <li className="text-body-md text-primary">Communicate with you about updates and features</li>
            <li className="text-body-md text-primary">Ensure the security of our services</li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">4. Data Storage and Security</h2>
          <p className="text-body-md text-primary">
            We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, 
            alteration, disclosure, or destruction. Your data is stored securely and we regularly review our security practices.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">5. Third-Party Services</h2>
          <p className="text-body-md text-primary">
            We may use third-party services for analytics and app functionality. These services have their own privacy policies 
            and we encourage you to review them. We do not sell your personal information to third parties.
          </p>

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
            <strong>Email:</strong> support@reetle.com
          </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
