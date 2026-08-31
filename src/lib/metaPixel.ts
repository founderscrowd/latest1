declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]): void {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args);
  }
}

export function trackPageView(): void {
  fbq('track', 'PageView');
}

export function trackCompleteRegistration(): void {
  fbq('track', 'CompleteRegistration');
}

export function trackLogin(): void {
  fbq('track', 'Login');
}

export function trackInitiateCheckout(): void {
  fbq('track', 'InitiateCheckout');
}

export function trackPurchase(value: number, currency: string = 'USD'): void {
  fbq('track', 'Purchase', { value, currency });
}
