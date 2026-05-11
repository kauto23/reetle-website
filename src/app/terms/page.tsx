import type { Metadata } from 'next';
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
          <h1 className="text-[28px] font-semibold tracking-tight text-ui-foreground mb-1">Terms of Service</h1>
          <p className="text-[14px] text-ui-muted-foreground mb-8">Last updated: December 2025</p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">1. Acceptance of Terms</h2>
          <p className="text-body-md text-primary">
            By downloading, installing, or using Reetle, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our application.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">2. Description of Service</h2>
          <p className="text-body-md text-primary">
            Reetle is a language learning application that helps users improve their language skills through reading. 
            The app provides personalized content, instant translations, vocabulary tracking, and practice exercises.
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

          <h2 className="text-title-lg text-primary mt-xl mb-md">4. Acceptable Use</h2>
          <p className="text-body-md text-primary mb-md">You agree not to:</p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary">Use the service for any unlawful purpose</li>
            <li className="text-body-md text-primary">Attempt to gain unauthorized access to our systems</li>
            <li className="text-body-md text-primary">Interfere with or disrupt the service</li>
            <li className="text-body-md text-primary">Reverse engineer or decompile the application</li>
            <li className="text-body-md text-primary">Share your account with others or create multiple accounts</li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">5. Intellectual Property</h2>
          <p className="text-body-md text-primary">
            All content, features, and functionality of Reetle, including but not limited to text, graphics, logos, and software, 
            are owned by Reetle and are protected by intellectual property laws. You may not copy, modify, or distribute any part 
            of our service without permission.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">6. Limitation of Liability</h2>
          <p className="text-body-md text-primary">
            Reetle is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, 
            special, or consequential damages arising from your use of the service.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">7. Termination</h2>
          <p className="text-body-md text-primary">
            We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other 
            reason at our discretion. To delete your account, please contact our support team.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">8. Changes to Terms</h2>
          <p className="text-body-md text-primary">
            We may modify these terms at any time. Continued use of Reetle after changes constitutes acceptance of the new terms. 
            We will notify users of significant changes through the app or via email.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">9. Governing Law</h2>
          <p className="text-body-md text-primary">
            These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">10. Contact Us</h2>
          <p className="text-body-md text-primary">
            If you have any questions about these Terms of Service, please contact us at:
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
