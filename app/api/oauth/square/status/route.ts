import { NextResponse } from 'next/server';

/**
 * Check Square OAuth Configuration Status
 * Shows what redirect URLs should be configured
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const callbackUrl = `${baseUrl}/api/oauth/square/callback`;
  
  // Production authorize URL
  const productionAuthUrl = new URL('https://connect.squareup.com/oauth2/authorize');
  productionAuthUrl.searchParams.set('client_id', 'sq0idp-V1fV-MwsU5lET4rvzHKnIw');
  productionAuthUrl.searchParams.set('scope', 'MERCHANT_PROFILE_READ ITEMS_READ ITEMS_WRITE ORDERS_READ ORDERS_WRITE PAYMENTS_READ PAYMENTS_WRITE CUSTOMERS_READ CUSTOMERS_WRITE INVENTORY_READ INVENTORY_WRITE');
  productionAuthUrl.searchParams.set('state', 'REPLACE_WITH_RANDOM_STATE');
  productionAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  
  // Sandbox authorize URL
  const sandboxAuthUrl = new URL('https://connect.squareupsandbox.com/oauth2/authorize');
  sandboxAuthUrl.searchParams.set('client_id', 'sandbox-sq0idb-yygbGJe58k9ZsmpZhJ6kjA');
  sandboxAuthUrl.searchParams.set('scope', 'MERCHANT_PROFILE_READ ITEMS_READ ITEMS_WRITE ORDERS_READ ORDERS_WRITE PAYMENTS_READ PAYMENTS_WRITE CUSTOMERS_READ CUSTOMERS_WRITE INVENTORY_READ INVENTORY_WRITE');
  sandboxAuthUrl.searchParams.set('state', 'REPLACE_WITH_RANDOM_STATE');
  sandboxAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  
  return NextResponse.json({
    status: 'ok',
    redirectUrls: {
      callback: callbackUrl,
      note: 'This URL must be configured in Square Developer Dashboard OAuth settings'
    },
    authorizationUrls: {
      production: productionAuthUrl.toString(),
      sandbox: sandboxAuthUrl.toString(),
      note: 'Visit these URLs to authorize your app and get tokens with proper scopes'
    },
    instructions: {
      step1: 'Add redirect URL in Square Dashboard',
      step2: 'Visit authorization URL (production or sandbox)',
      step3: 'Log in as account owner and accept permissions',
      step4: 'You will be redirected to callback with new tokens',
      step5: 'Copy tokens and update .env file'
    },
    dashboardUrl: 'https://developer.squareup.com/apps',
    yourAppId: {
      production: 'sq0idp-V1fV-MwsU5lET4rvzHKnIw',
      sandbox: 'sandbox-sq0idb-yygbGJe58k9ZsmpZhJ6kjA'
    }
  });
}
