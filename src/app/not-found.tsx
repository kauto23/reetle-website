import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] px-md text-center">
      <h1 className="text-[72px] font-bold text-primary mb-sm">404</h1>
      <p className="text-display-sm text-primary mb-md">Page not found</p>
      <p className="text-body-lg text-text-secondary mb-xl max-w-[400px]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="btn-primary">
        Go Home
      </Link>
    </section>
  );
}
