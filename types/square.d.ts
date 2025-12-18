/**
 * Square Web Payments SDK Type Declarations
 * Shared types for Square payment integration
 */

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<any>;
    };
  }
}

export {};
