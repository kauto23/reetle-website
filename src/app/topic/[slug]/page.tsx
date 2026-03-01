import { CATEGORY_ORDER } from '@/config/categories';
import TopicPageClient from './TopicPageClient';

export function generateStaticParams() {
  return CATEGORY_ORDER.map(cat => ({ slug: cat.toLowerCase() }));
}

export default function TopicPage() {
  return <TopicPageClient />;
}
