'use client';

import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <SonnerToaster
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-ui-card group-[.toaster]:text-ui-foreground group-[.toaster]:border-ui-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-ui-muted-foreground',
          actionButton:
            'group-[.toast]:!bg-ui-primary group-[.toast]:!text-ui-primary-foreground hover:!opacity-90',
          cancelButton:
            'group-[.toast]:bg-ui-muted group-[.toast]:text-ui-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
