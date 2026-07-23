'use client';

import Link from 'next/link';
import { Headphones, Play } from 'lucide-react';
import { useLoginUrl } from '@/hooks/useLoginUrl';
import { Button } from '@/components/ui/button';

const wrapperClass = 'mb-md rounded-md border border-border bg-ui-card px-[14px] py-[12px]';

/**
 * Locked audio card for guest article views. Mirrors the idle ArticleAudioPlayer
 * layout and routes to signup without calling audio APIs.
 */
export default function GuestArticleAudioPrompt() {
  const loginUrl = useLoginUrl();

  return (
    <div className={`${wrapperClass} flex items-center gap-[12px]`}>
      <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Headphones size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-body-md font-medium text-primary">Listen to this article</div>
        <div className="text-label-md text-ui-muted-foreground mt-[2px]">
          Hear articles narrated at your level while you read.
        </div>
        <div className="hidden sm:block text-label-sm text-ui-muted-foreground/80 mt-[4px]">
          Free account required. Premium unlocks unlimited audio.
        </div>
      </div>
      <Button
        asChild
        variant="default"
        size="sm"
        className="rounded-sm px-[14px] py-2 h-auto inline-flex items-center gap-[6px] shrink-0 whitespace-nowrap"
      >
        <Link href={loginUrl}>
          <Play size={14} fill="currentColor" strokeWidth={0} />
          Sign up to listen
        </Link>
      </Button>
    </div>
  );
}
