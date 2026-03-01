import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support - Reetle',
  description: 'Get help and support for Reetle, the language learning app.',
};

function QuestionIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function SupportPage() {
  return (
    <>
      {/* Support Hero */}
      <section className="py-2xl pb-lg">
        <div className="max-w-[1200px] mx-auto px-md">
          <h1 className="text-display-lg text-primary text-center mb-md">How can we help?</h1>
          <p className="text-body-lg text-primary text-center max-w-[600px] mx-auto">
            Find answers to common questions or get in touch with our support team.
          </p>
        </div>
      </section>

      {/* Support Content */}
      <section className="pt-lg pb-2xl">
        <div className="max-w-[1200px] mx-auto px-md">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-xl items-start">
            {/* FAQ */}
            <div className="card hover:transform-none hover:shadow-none" style={{ animation: 'none' }}>
              <div className="text-primary mb-md">
                <QuestionIcon />
              </div>
              <h2 className="text-title-lg text-primary mb-md">Frequently Asked Questions</h2>

              <div className="border-b border-border py-lg">
                <h3 className="text-title-md text-primary mb-sm">How do I get started with Reetle?</h3>
                <p className="text-body-md text-text-secondary">
                  Download Reetle from the App Store, create an account, and select your target language. 
                  The app will guide you through setting up your learning preferences and level.
                </p>
              </div>

              <div className="border-b border-border py-lg">
                <h3 className="text-title-md text-primary mb-sm">What languages are supported?</h3>
                <p className="text-body-md text-text-secondary">
                  Reetle currently supports learning Spanish, French, German, and Italian. 
                  We are actively working on adding more languages.
                </p>
              </div>

              <div className="border-b border-border py-lg">
                <h3 className="text-title-md text-primary mb-sm">How do translations work?</h3>
                <p className="text-body-md text-text-secondary">
                  Simply tap any word while reading to see its translation, definition, and context. 
                  The app remembers words you&apos;ve looked up and adds them to your practice queue.
                </p>
              </div>

              <div className="border-b border-border py-lg">
                <h3 className="text-title-md text-primary mb-sm">Does Reetle require an internet connection?</h3>
                <p className="text-body-md text-text-secondary">
                  Yes, Reetle requires an active internet connection for all features. 
                  This ensures you always have access to the latest content and accurate translations.
                </p>
              </div>

              <div className="py-lg pb-0">
                <h3 className="text-title-md text-primary mb-sm">How do I delete my account?</h3>
                <p className="text-body-md text-text-secondary">
                  To delete your account, please contact our support team at support@reetle.com. 
                  Account deletion is permanent and all your progress will be lost.
                </p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:order-last order-first flex flex-col gap-lg">
              <div className="card text-center hover:transform-none hover:shadow-none" style={{ animation: 'none' }}>
                <div className="text-primary mb-md flex justify-center">
                  <EmailIcon />
                </div>
                <h2 className="text-title-lg text-primary mb-sm">Contact Support</h2>
                <p className="text-body-md text-primary mb-lg">
                  Can&apos;t find what you&apos;re looking for? Our support team is here to help.
                </p>
                <Link href="mailto:support@reetle.com" className="btn-primary w-full block mb-md">
                  Email Us
                </Link>
                <p className="text-body-md text-text-secondary text-[14px]">support@reetle.com</p>
              </div>

              <div className="card text-center hover:transform-none hover:shadow-none" style={{ animation: 'none' }}>
                <div className="text-primary mb-md flex justify-center">
                  <BugIcon />
                </div>
                <h2 className="text-title-lg text-primary mb-sm">Report a Bug</h2>
                <p className="text-body-md text-primary">
                  Found something that doesn&apos;t work correctly? Let us know so we can fix it.
                </p>
                <Link href="mailto:support@reetle.com?subject=Bug%20Report" className="btn-secondary w-full block mt-md">
                  Report Bug
                </Link>
              </div>

              <div className="card text-center hover:transform-none hover:shadow-none" style={{ animation: 'none' }}>
                <div className="text-primary mb-md flex justify-center">
                  <StarIcon />
                </div>
                <h2 className="text-title-lg text-primary mb-sm">Feature Request</h2>
                <p className="text-body-md text-primary">
                  Have an idea to make Reetle better? We&apos;d love to hear from you.
                </p>
                <Link href="mailto:support@reetle.com?subject=Feature%20Request" className="btn-secondary w-full block mt-md">
                  Suggest Feature
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
