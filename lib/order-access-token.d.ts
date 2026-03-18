export interface GenerateOrderAccessTokenOptions {
  orderId?: string | null;
  customerEmail?: string | null;
  ttlMs?: number;
}

export interface VerifyOrderAccessTokenOptions {
  expectedOrderId?: string | null;
  expectedEmail?: string | null;
}

export interface OrderAccessTokenClaims {
  orderId: string;
  email: string | null;
  expiresAt: number;
}

export function generateOrderAccessToken(
  options?: GenerateOrderAccessTokenOptions
): string | null;

export function verifyOrderAccessToken(
  token: string | null | undefined,
  options?: VerifyOrderAccessTokenOptions
): OrderAccessTokenClaims | null;

export function appendOrderAccessToken(
  url: string,
  token: string | null | undefined
): string;
