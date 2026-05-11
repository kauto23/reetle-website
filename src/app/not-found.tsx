import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-[72px] font-bold text-ui-primary mb-2">404</h1>
      <p className="text-[24px] font-semibold text-ui-foreground mb-3">Page not found</p>
      <p className="text-[15px] text-ui-muted-foreground mb-8 max-w-[400px]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild size="lg">
        <Link href="/">Go home</Link>
      </Button>
    </section>
  );
}
