// Facebook Pixel tracking utility
// Pixel IDs: 681381238344415, 1436283370782342

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

export const trackFBPixelEvent = (eventName: string, data?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      if (data) {
        window.fbq('track', eventName, data);
      } else {
        window.fbq('track', eventName);
      }
      console.log(`FB Pixel: ${eventName}`, data);
    } catch (error) {
      console.error('FB Pixel tracking error:', error);
    }
  }
};

// Key conversion events
export const FB_EVENTS = {
  INITIATE_CHECKOUT: 'InitiateCheckout',
  ADD_TO_CART: 'AddToCart',
  VIEW_CONTENT: 'ViewContent',
  PURCHASE: 'Purchase',
  LEAD: 'Lead',
} as const;
