/**
 * Square Web Payments SDK Type Declarations
 * Shared types for Square payment integration
 */

export interface SquareCardOptions {
  style?: Record<string, Record<string, string>>;
}

export interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<SquareTokenResult>;
  destroy: () => Promise<void>;
  addEventListener: (event: string, callback: (e: any) => void) => void;
}

export interface SquareApplePay {
  tokenize: () => Promise<SquareTokenResult>;
  destroy: () => Promise<void>;
}

export interface SquareGooglePay {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<SquareTokenResult>;
  destroy: () => Promise<void>;
}

export interface SquareApplePayRequest {
  countryCode: string;
  currencyCode: string;
  total: { amount: string; label: string };
}

export interface SquareGooglePayRequest {
  countryCode: string;
  currencyCode: string;
  total?: { amount: string };
}

export interface SquareTokenResult {
  status: 'OK' | 'ERROR';
  token?: string;
  errors?: Array<{ type: string; message: string; field?: string }>;
}

export interface SquarePayments {
  card: (options?: SquareCardOptions) => Promise<SquareCard>;
  applePay?: (request: SquareApplePayRequest) => Promise<SquareApplePay | null>;
  googlePay?: (request: SquareGooglePayRequest) => Promise<SquareGooglePay | null>;
}

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePayments>;
    };
  }
}

export {};
