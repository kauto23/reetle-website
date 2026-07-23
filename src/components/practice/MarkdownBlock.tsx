import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownBlockProps {
  content: string;
  className?: string;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  // Bold is matched lazily so its content may contain nested single-asterisk
  // italics (e.g. **bold with *italic* inside**), which we parse recursively.
  const re = /\*\*(.+?)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] != null) {
      parts.push(
        <strong key={k++}>
          <InlineMarkdown text={m[1]} />
        </strong>
      );
    } else if (m[2] != null) {
      parts.push(<em key={k++}>{m[2]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <>{parts}</>;
}

export default function MarkdownBlock({ content, className }: MarkdownBlockProps) {
  const blocks = content.split(/\n\s*\n/);

  return (
    <div className={cn('space-y-sm', className)}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lines.length) return null;

        if (lines.every((l) => /^-\s/.test(l))) {
          return (
            <ul key={bi} className="list-disc pl-md space-y-xs">
              {lines.map((l, i) => (
                <li key={i} className="text-body-sm leading-relaxed">
                  <InlineMarkdown text={l.replace(/^-\s/, '')} />
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return (
            <ol key={bi} className="list-decimal pl-md space-y-xs">
              {lines.map((l, i) => (
                <li key={i} className="text-body-sm leading-relaxed">
                  <InlineMarkdown text={l.replace(/^\d+\.\s/, '')} />
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={bi} className="text-body-sm leading-relaxed">
            <InlineMarkdown text={lines.join(' ')} />
          </p>
        );
      })}
    </div>
  );
}
