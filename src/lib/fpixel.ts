import { FACEBOOK_PIXEL_ID } from '@/config/environment';

export const FB_PIXEL_ID = FACEBOOK_PIXEL_ID;

export const pageview = () => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'PageView');
  }
};

export const event = (name: string, options: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', name, options);
  }
};
