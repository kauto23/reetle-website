import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-ui-primary text-ui-primary-foreground hover:bg-primary-dark active:translate-y-0 hover:-translate-y-[1px]',
        destructive:
          'bg-ui-destructive text-ui-destructive-foreground hover:bg-ui-destructive/90',
        outline:
          'border border-ui-primary bg-transparent text-ui-primary hover:bg-ui-primary hover:text-ui-primary-foreground',
        secondary:
          'bg-ui-secondary text-ui-secondary-foreground hover:bg-ui-secondary/80',
        ghost:
          'bg-transparent text-ui-foreground hover:bg-ui-muted hover:text-ui-foreground',
        link:
          'bg-transparent text-ui-primary underline-offset-4 hover:underline p-0 h-auto',
        accent:
          'bg-accent text-white hover:bg-accent/90',
      },
      size: {
        default: 'h-11 px-6 text-[15px]',
        sm: 'h-9 px-4 text-[13px]',
        lg: 'h-12 px-7 text-[16px]',
        xl: 'h-14 px-8 text-[16px]',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
