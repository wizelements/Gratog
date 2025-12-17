
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { SquareClient, SquareEnvironment } from 'square';

/**
 * Square OAuth Callback Handler
 * Receives authorization code and exchanges it for access token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Handle authorization errors
    if (error) {
      console.error('Square OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin?oauth_error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || 'Authorization failed')}`
      );
    }
    
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin?oauth_error=missing_code&message=No authorization code received`
      );
    }
    
    logger.debug('API', 'Received authorization code:', code.substring(0, 20) + '...');
    
    // Validate state (CSRF protection)
    // In production, validate against stored state
    // For now, we'll accept any state
    
    // Determine environment based on code format or use production as default
    const isProduction = true; // Assume production for now
    
    const clientId = isProduction
      ? (process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || process.env.NEXT_PUBLIC_SQUARE_APP_ID)
      : (process.env.NEXT_PUBLIC_SQUARE_SANDBOX_APPLICATION_ID || 'sandbox-sq0idb-yygbGJe58k9ZsmpZhJ6kjA');
    
    const clientSecret = process.env.SQUARE_CLIENT_SECRET || '';
    
    if (!clientSecret || !clientId) {
      console.error('SQUARE_CLIENT_SECRET or Application ID not configured');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin?oauth_error=config&message=Square OAuth credentials not configured`
      );
    }
    
    // Exchange authorization code for access token
    const square = new SquareClient({
      environment: isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });
    
    logger.debug('API', 'Exchanging code for access token...');
    
    const response = await square.oAuth.obtainToken({
      clientId,
      clientSecret,
      code,
      grantType: 'authorization_code',
      redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/square/callback`
    });
    
    logger.debug('API', 'Token exchange response:', response);
    
    // Square returns tokens directly in response, not nested in result
    const accessToken = response.accessToken || response.result?.accessToken;
    const refreshToken = response.refreshToken || response.result?.refreshToken;
    const expiresAt = response.expiresAt || response.result?.expiresAt;
    const merchantId = response.merchantId || response.result?.merchantId;
    
    if (!accessToken) {
      console.error('No access token in response:', response);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin?oauth_error=token_exchange&message=Failed to obtain access token`
      );
    }
    
    logger.debug('API', '✅ Access token obtained successfully!');
    logger.debug('API', 'Merchant ID:', merchantId);
    logger.debug('API', 'Token expires:', expiresAt);
    
    // Display the token to the user so they can update .env
    const resultHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Square OAuth Success</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { color: #22c55e; }
    .token-box {
      background: #f9f9f9;
      border: 2px solid #22c55e;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-family: monospace;
      word-break: break-all;
    }
    .instruction {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
    }
    .copy-btn {
      background: #22c55e;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
    }
    .copy-btn:hover { background: #16a34a; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Square OAuth Authorization Successful!</h1>
    
    <p><strong>Merchant ID:</strong> ${merchantId}</p>
    <p><strong>Environment:</strong> ${isProduction ? 'Production' : 'Sandbox'}</p>
    <p><strong>Expires:</strong> ${expiresAt || 'Never (if long-lived)'}</p>
    
    <div class="instruction">
      <strong>⚠️ IMPORTANT: Update Your Environment Variables</strong>
      <p>Copy the tokens below and update your <code>.env</code> file:</p>
    </div>
    
    <h3>Access Token:</h3>
    <div class="token-box" id="access-token">${accessToken}</div>
    <button class="copy-btn" onclick="copyToClipboard('access-token', 'Access Token')">📋 Copy Access Token</button>
    
    ${refreshToken ? `
    <h3>Refresh Token:</h3>
    <div class="token-box" id="refresh-token">${refreshToken}</div>
    <button class="copy-btn" onclick="copyToClipboard('refresh-token', 'Refresh Token')">📋 Copy Refresh Token</button>
    ` : ''}
    
    <div class="instruction">
      <h3>📝 Next Steps:</h3>
      <ol>
        <li>Copy the Access Token above</li>
        <li>Open <code>/app/.env</code> file</li>
        <li>Update: <code>SQUARE_ACCESS_TOKEN=&lt;paste_token_here&gt;</code></li>
        <li>Set: <code>SQUARE_ENVIRONMENT=${isProduction ? 'production' : 'sandbox'}</code></li>
        <li>Set: <code>SQUARE_MOCK_MODE=false</code></li>
        <li>Restart: <code>sudo supervisorctl restart nextjs</code></li>
        <li>Test: <code>node test-square-credentials.js</code></li>
        <li>Sync catalog: <code>node scripts/syncCatalog.js</code></li>
      </ol>
    </div>
    
    <div style="margin-top: 30px; padding: 15px; background: #dbeafe; border-radius: 6px;">
      <strong>✨ What You Just Enabled:</strong>
      <ul>
        <li>✅ Read merchant profile and locations</li>
        <li>✅ Read and manage catalog items</li>
        <li>✅ Create and manage orders</li>
        <li>✅ Process payments</li>
        <li>✅ Read and manage customers</li>
        <li>✅ Track inventory</li>
      </ul>
    </div>
    
    <p style="margin-top: 20px;">
      <a href="/admin" style="color: #22c55e; text-decoration: none; font-weight: 600;">← Return to Admin Dashboard</a>
    </p>
  </div>
  
  <script>
    function copyToClipboard(elementId, name) {
      const element = document.getElementById(elementId);
      const text = element.textContent;
      navigator.clipboard.writeText(text).then(() => {
        alert(name + ' copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Please manually select and copy the token');
      });
    }
  </script>
</body>
</html>
    `;
    
    return new NextResponse(resultHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/admin?oauth_error=exception&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    );
  }
}
