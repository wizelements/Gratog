'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<Payments>;
    };
  }
}

interface Payments {
  card: () => Promise<Card>;
  applePay: (request: ApplePayRequest) => Promise<ApplePay | null>;
  googlePay: (request: GooglePayRequest) => Promise<GooglePay | null>;
}

interface Card {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<TokenResult>;
  destroy: () => Promise<void>;
}

interface ApplePay {
  tokenize: () => Promise<TokenResult>;
  destroy: () => Promise<void>;
}

interface GooglePay {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<TokenResult>;
  destroy: () => Promise<void>;
}

interface ApplePayRequest {
  countryCode: string;
  currencyCode: string;
  total: { amount: string; label: string };
}

interface GooglePayRequest {
  countryCode: string;
  currencyCode: string;
  total?: { amount: string };
}

export interface TokenResult {
  status: 'OK' | 'ERROR';
  token?: string;
  errors?: Array<{
    type: string;
    message: string;
    field?: string;
  }>;
}

interface SquarePaymentsConfig {
  applicationId: string;
  locationId: string;
  environment: 'sandbox' | 'production';
}

export interface UseSquarePaymentsReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  cardElement: Card | null;
  applePay: ApplePay | null;
  googlePay: GooglePay | null;
  tokenizeCard: () => Promise<TokenResult>;
  tokenizeApplePay: () => Promise<TokenResult>;
  tokenizeGooglePay: () => Promise<TokenResult>;
  destroy: () => Promise<void>;
}

const SANDBOX_SDK_URL = 'https://sandbox.web.squarecdn.com/v1/square.js';
const PRODUCTION_SDK_URL = 'https://web.squarecdn.com/v1/square.js';

export function useSquarePayments(config: SquarePaymentsConfig | null): UseSquarePaymentsReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardElement, setCardElement] = useState<Card | null>(null);
  const [applePay, setApplePay] = useState<ApplePay | null>(null);
  const [googlePay, setGooglePay] = useState<GooglePay | null>(null);
  const paymentsRef = useRef<Payments | null>(null);
  const initializingRef = useRef(false);

  useEffect(() => {
    if (!config) {
      setIsLoading(false);
      return;
    }

    const sdkUrl = config.environment === 'production' ? PRODUCTION_SDK_URL : SANDBOX_SDK_URL;

    const loadScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.Square) {
          resolve();
          return;
        }

        const existingScript = document.querySelector(`script[src="${sdkUrl}"]`);
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Square SDK')));
          return;
        }

        const script = document.createElement('script');
        script.src = sdkUrl;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Square SDK'));
        document.head.appendChild(script);
      });
    };

    const initializePayments = async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;

      try {
        setIsLoading(true);
        setError(null);

        await loadScript();

        if (!window.Square) {
          throw new Error('Square SDK not available');
        }

        const payments = await window.Square.payments(config.applicationId, config.locationId);
        paymentsRef.current = payments;

        setIsReady(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Square payments initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize payments');
        setIsLoading(false);
      } finally {
        initializingRef.current = false;
      }
    };

    initializePayments();

    return () => {
      cardElement?.destroy().catch(console.error);
      applePay?.destroy?.().catch(console.error);
      googlePay?.destroy().catch(console.error);
    };
  }, [config?.applicationId, config?.locationId, config?.environment]);

  const attachCard = useCallback(async (selector: string): Promise<Card | null> => {
    if (!paymentsRef.current) {
      setError('Payments not initialized');
      return null;
    }

    try {
      const card = await paymentsRef.current.card();
      await card.attach(selector);
      setCardElement(card);
      return card;
    } catch (err) {
      console.error('Failed to attach card element:', err);
      setError(err instanceof Error ? err.message : 'Failed to attach card element');
      return null;
    }
  }, []);

  const initializeApplePay = useCallback(async (request: ApplePayRequest): Promise<ApplePay | null> => {
    if (!paymentsRef.current) return null;

    try {
      const ap = await paymentsRef.current.applePay(request);
      if (ap) {
        setApplePay(ap);
      }
      return ap;
    } catch (err) {
      console.error('Apple Pay not available:', err);
      return null;
    }
  }, []);

  const initializeGooglePay = useCallback(async (selector: string, request: GooglePayRequest): Promise<GooglePay | null> => {
    if (!paymentsRef.current) return null;

    try {
      const gp = await paymentsRef.current.googlePay(request);
      if (gp) {
        await gp.attach(selector);
        setGooglePay(gp);
      }
      return gp;
    } catch (err) {
      console.error('Google Pay not available:', err);
      return null;
    }
  }, []);

  const tokenizeCard = useCallback(async (): Promise<TokenResult> => {
    if (!cardElement) {
      return { status: 'ERROR', errors: [{ type: 'INVALID_STATE', message: 'Card element not attached' }] };
    }

    try {
      return await cardElement.tokenize();
    } catch (err) {
      return {
        status: 'ERROR',
        errors: [{ type: 'TOKENIZE_ERROR', message: err instanceof Error ? err.message : 'Tokenization failed' }]
      };
    }
  }, [cardElement]);

  const tokenizeApplePay = useCallback(async (): Promise<TokenResult> => {
    if (!applePay) {
      return { status: 'ERROR', errors: [{ type: 'INVALID_STATE', message: 'Apple Pay not available' }] };
    }

    try {
      return await applePay.tokenize();
    } catch (err) {
      return {
        status: 'ERROR',
        errors: [{ type: 'TOKENIZE_ERROR', message: err instanceof Error ? err.message : 'Apple Pay tokenization failed' }]
      };
    }
  }, [applePay]);

  const tokenizeGooglePay = useCallback(async (): Promise<TokenResult> => {
    if (!googlePay) {
      return { status: 'ERROR', errors: [{ type: 'INVALID_STATE', message: 'Google Pay not available' }] };
    }

    try {
      return await googlePay.tokenize();
    } catch (err) {
      return {
        status: 'ERROR',
        errors: [{ type: 'TOKENIZE_ERROR', message: err instanceof Error ? err.message : 'Google Pay tokenization failed' }]
      };
    }
  }, [googlePay]);

  const destroy = useCallback(async () => {
    await cardElement?.destroy().catch(console.error);
    await applePay?.destroy?.().catch(console.error);
    await googlePay?.destroy().catch(console.error);
    setCardElement(null);
    setApplePay(null);
    setGooglePay(null);
    setIsReady(false);
  }, [cardElement, applePay, googlePay]);

  return {
    isLoading,
    isReady,
    error,
    cardElement,
    applePay,
    googlePay,
    tokenizeCard,
    tokenizeApplePay,
    tokenizeGooglePay,
    destroy,
    // Expose attach methods
    ...({ attachCard, initializeApplePay, initializeGooglePay } as any)
  };
}
