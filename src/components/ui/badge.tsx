import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-label-sm uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ui-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-ui-primary text-white',
        secondary:
          'border-transparent bg-ui-secondary text-ui-secondary-foreground',
        destructive:
          'border-transparent bg-ui-destructive text-white',
        outline: 'border-ui-border text-ui-foreground',
        accent:
          'border-transparent bg-ui-accent text-ui-coral',
        muted:
          'border-transparent bg-ui-muted text-ui-muted-foreground',
        success:
          'border-transparent bg-correct-bg text-correct-text',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
