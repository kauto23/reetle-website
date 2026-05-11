import type { Metadata } from 'next';
import Link from 'next/link';
import { Bug, HelpCircle, Mail, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const metadata: Metadata = {
  title: 'Support - Reetle',
  description: 'Get help and support for Reetle, the language learning app.',
};

const FAQS = [
  {
    q: 'How do I get started with Reetle?',
    a: 'Download Reetle from the App Store, create an account, and select your target language. The app will guide you through setting up your learning preferences and level.',
  },
  {
    q: 'What languages are supported?',
    a: 'Reetle currently supports learning Spanish, French, German, and Italian. We are actively working on adding more languages.',
  },
  {
    q: 'How do translations work?',
    a: 'Simply tap any word while reading to see its translation, definition, and context. The app remembers words you’ve looked up and adds them to your practice queue.',
  },
  {
    q: 'Does Reetle require an internet connection?',
    a: 'Yes, Reetle requires an active internet connection for all features. This ensures you always have access to the latest content and accurate translations.',
  },
  {
    q: 'How do I delete my account?',
    a: 'You can delete your account from the Profile page on the website, or contact our support team at support@reetle.com. Account deletion is permanent and all progress will be lost.',
  },
];

export default function SupportPage() {
  return (
    <>
      <section className="py-12 sm:py-16 pb-6">
        <div className="max-w-[1200px] mx-auto px-4">
          <h1 className="text-[36px] sm:text-[40px] font-semibold tracking-tight text-ui-foreground text-center mb-3">
            How can we help?
          </h1>
          <p className="text-[16px] text-ui-muted-foreground text-center max-w-[600px] mx-auto">
            Find answers to common questions or get in touch with our support team.
          </p>
        </div>
      </section>

      <section className="pt-6 pb-16">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <HelpCircle className="w-7 h-7 text-ui-primary" />
                  <h2 className="text-[18px] font-semibold text-ui-foreground">Frequently asked questions</h2>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  {FAQS.map((faq, i) => (
                    <AccordionItem key={i} value={`item-${i}`}>
                      <AccordionTrigger className="text-[15px] font-medium text-ui-foreground">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-ui-muted-foreground">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            <div className="lg:order-last order-first flex flex-col gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <Mail className="w-8 h-8 text-ui-primary mx-auto mb-3" />
                  <h2 className="text-[16px] font-semibold text-ui-foreground mb-1">Contact Support</h2>
                  <p className="text-[14px] text-ui-muted-foreground mb-4">
                    Can&apos;t find what you&apos;re looking for? Our support team is here to help.
                  </p>
                  <Button asChild className="w-full mb-2">
                    <Link href="mailto:support@reetle.com">Email us</Link>
                  </Button>
                  <p className="text-[12px] text-ui-muted-foreground">support@reetle.com</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Bug className="w-8 h-8 text-ui-primary mx-auto mb-3" />
                  <h2 className="text-[16px] font-semibold text-ui-foreground mb-1">Report a Bug</h2>
                  <p className="text-[14px] text-ui-muted-foreground mb-4">
                    Found something that doesn&apos;t work correctly? Let us know so we can fix it.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="mailto:support@reetle.com?subject=Bug%20Report">Report bug</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Star className="w-8 h-8 text-ui-primary mx-auto mb-3" />
                  <h2 className="text-[16px] font-semibold text-ui-foreground mb-1">Feature Request</h2>
                  <p className="text-[14px] text-ui-muted-foreground mb-4">
                    Have an idea to make Reetle better? We&apos;d love to hear from you.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="mailto:support@reetle.com?subject=Feature%20Request">Suggest feature</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
