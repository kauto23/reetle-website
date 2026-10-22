import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Delete your account - Reetle',
  description: 'How to delete your Reetle account and what happens to your data.',
};

// Linked from the Google Play Data safety form as the account deletion URL, so
// it must name the app, give the steps, and say what is deleted and kept.
export default function DeleteAccountPage() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[1200px] mx-auto px-4">
        <Card className="max-w-[800px] mx-auto">
          <CardContent className="p-6 sm:p-8 prose-content">
          <h1 className="text-display-md tracking-tight text-ui-foreground mb-1">Delete your Reetle account</h1>
          <p className="text-body-md text-ui-muted-foreground mb-8">Reetle, by Acumen Analytics Limited</p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">1. Cancel Reetle Premium first</h2>
          <p className="text-body-md text-primary">
            Deleting your account does not stop a subscription. If you have Reetle Premium, cancel it before you delete
            your account: on reetle.co from your Profile page, in your App Store settings on iPhone, or in the Google Play
            Store under Payments &amp; subscriptions.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">2. Delete your account</h2>
          <p className="text-body-md text-primary mb-md">Any one of these works:</p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary">In the Reetle app: Profile, then Delete account.</li>
            <li className="text-body-md text-primary">On reetle.co: sign in, open your Profile page and choose Delete account.</li>
            <li className="text-body-md text-primary">
              By email: write to support@reetle.co from the address you signed up with and ask us to delete your account.
              We do it within 30 days and confirm by email.
            </li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">3. What is deleted</h2>
          <p className="text-body-md text-primary mb-md">Straight away, we permanently remove:</p>
          <ul className="list-disc pl-xl my-md space-y-sm">
            <li className="text-body-md text-primary">Your name, email address and username</li>
            <li className="text-body-md text-primary">Your Google or Apple sign-in link, so the account can no longer be signed into</li>
            <li className="text-body-md text-primary">Your subscription records and the devices registered for notifications</li>
            <li className="text-body-md text-primary">The IP address and browser details recorded when you signed up</li>
          </ul>

          <h2 className="text-title-lg text-primary mt-xl mb-md">4. What is kept</h2>
          <p className="text-body-md text-primary">
            Your reading and practice history (articles read, words looked up, practice answers) is kept without anything
            that identifies you, so it can no longer be linked back to you. We use it only in aggregate to improve Reetle.
            Payment records held by Stripe, Apple or Google are kept by them as the law requires.
          </p>

          <h2 className="text-title-lg text-primary mt-xl mb-md">Questions</h2>
          <p className="text-body-md text-primary">
            <strong>Email:</strong> support@reetle.co
          </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
