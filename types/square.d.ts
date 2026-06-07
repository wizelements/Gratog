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
  attach: (selector: string, options?: { buttonColor?: 'default' | 'black' | 'white'; buttonType?: 'short' | 'long' | 'plain' | 'buy' }) => Promise<void>;
  tokenize: () => Promise<SquareTokenResult>;
  destroy: () => Promise<void>;
}

export interface SquareCashAppPay {
  attach: (selector: string) => Promise<void>;
  destroy: () => Promise<boolean>;
  detach?: () => Promise<boolean>;
  addEventListener: (
    event: 'ontokenization',
    callback: (event: { detail?: { tokenResult?: SquareTokenResult; error?: { message?: string } } }) => void
  ) => void;
}

export interface SquarePaymentRequestOptions {
  countryCode: string;
  currencyCode: string;
  total: { amount: string; label: string };
}

export interface SquarePaymentRequest {
  // PaymentRequest is owned by the Square Web Payments SDK.
}

export type SquareApplePayRequest = SquarePaymentRequest;
export type SquareGooglePayRequest = SquarePaymentRequest;

export interface SquareTokenResult {
  status: 'OK' | 'ERROR' | 'Error' | 'Cancel';
  token?: string;
  errors?: Array<{ type: string; message: string; field?: string }>;
}

export interface SquarePayments {
  card: (options?: SquareCardOptions) => Promise<SquareCard>;
  paymentRequest: (options: SquarePaymentRequestOptions) => SquarePaymentRequest;
  applePay?: (request: SquarePaymentRequest) => Promise<SquareApplePay | null>;
  googlePay?: (request: SquarePaymentRequest) => Promise<SquareGooglePay | null>;
  cashAppPay?: (request: SquarePaymentRequest, options: { redirectURL: string; referenceId: string }) => Promise<SquareCashAppPay | null>;
}

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePayments>;
    };
  }
}

export {};
