// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Key, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  RefreshCw,
  Shield,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function SquareOAuthPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/oauth/square/status');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch config:', error);
      toast.error('Failed to load OAuth configuration');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard!`);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const startOAuth = (env: 'production' | 'sandbox') => {
    // Redirect to authorize endpoint which will redirect to Square
    window.location.href = `/api/oauth/square/authorize?env=${env}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Square OAuth Setup</h1>
          <p className="text-gray-600">Configure Square API access with proper permissions</p>
        </div>

        {/* Current Issue Alert */}
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Current Issue:</strong> Access tokens return 401 UNAUTHORIZED because OAuth scopes are not granted.
            Follow the steps below to authorize your application and get tokens with proper permissions.
          </AlertDescription>
        </Alert>

        {/* Step 1: Configure Redirect URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">1</span>
              Configure Redirect URL in Square Dashboard
            </CardTitle>
            <CardDescription>
              Add this callback URL to your Square application settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Redirect URL (Callback URL)
              </label>
              <div className="flex gap-2">
                <code className="flex-1 bg-gray-100 px-4 py-3 rounded border border-gray-300 text-sm">
                  {config?.redirectUrls?.callback}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(config?.redirectUrls?.callback, 'Redirect URL')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">How to Add Redirect URL:</h4>
              <ol className="text-sm text-yellow-800 space-y-1 ml-4 list-decimal">
                <li>Go to <a href={config?.dashboardUrl} target="_blank" className="underline">Square Developer Console</a></li>
                <li>Click on your application</li>
                <li>Navigate to <strong>OAuth</strong> tab</li>
                <li>Under <strong>Redirect URLs</strong>, click <strong>Add URL</strong></li>
                <li>Paste the callback URL above</li>
                <li>Click <strong>Save</strong></li>
              </ol>
            </div>

            <div>
              <strong className="text-sm">Your Application IDs:</strong>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>Production</Badge>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {config?.yourAppId?.production}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Sandbox</Badge>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {config?.yourAppId?.sandbox}
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Authorize Application */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold">2</span>
              Authorize Your Application
            </CardTitle>
            <CardDescription>
              Visit Square's authorization page to grant permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>What happens:</strong> You'll be redirected to Square's secure login page. 
                Log in as the account owner, review the requested permissions, and click "Allow".
                You'll then be redirected back here with valid access tokens.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Permissions Being Requested:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'MERCHANT_PROFILE_READ',
                    'ITEMS_READ',
                    'ITEMS_WRITE',
                    'ORDERS_READ',
                    'ORDERS_WRITE',
                    'PAYMENTS_READ',
                    'PAYMENTS_WRITE',
                    'CUSTOMERS_READ',
                    'CUSTOMERS_WRITE',
                    'INVENTORY_READ',
                    'INVENTORY_WRITE'
                  ].map(scope => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold">Start Authorization Flow:</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Production Authorization */}
                <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-green-600">Recommended</Badge>
                    <span className="font-semibold">Production</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">
                    Use for live payments and real customer data
                  </p>
                  <Button
                    onClick={() => startOAuth('production')}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Authorize Production
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                {/* Sandbox Authorization */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">Testing</Badge>
                    <span className="font-semibold">Sandbox</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">
                    Use for testing with fake test cards
                  </p>
                  <Button
                    onClick={() => startOAuth('sandbox')}
                    variant="outline"
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-100"
                  >
                    Authorize Sandbox
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: After Authorization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold">3</span>
              Update Configuration
            </CardTitle>
            <CardDescription>
              After authorization, update your environment variables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">You'll receive:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <strong>Access Token</strong> - Use this in your .env file
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <strong>Refresh Token</strong> - For renewing expired tokens
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <strong>Merchant ID</strong> - Your Square merchant identifier
                </li>
              </ul>
              
              <Separator className="my-4" />
              
              <div className="bg-white border border-gray-300 rounded p-3 font-mono text-xs">
                <div className="text-gray-500 mb-2"># Update in /app/.env</div>
                <div>SQUARE_ACCESS_TOKEN=&lt;paste_your_new_token&gt;</div>
                <div>SQUARE_ENVIRONMENT=production</div>
                <div>SQUARE_MOCK_MODE=false</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <strong className="text-sm">Square Developer Console:</strong>
              <a 
                href="https://developer.squareup.com/apps" 
                target="_blank"
                className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Open Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            
            <div>
              <strong className="text-sm">Documentation:</strong>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• <code>/app/SQUARE_PERMISSIONS_GUIDE.md</code></li>
                <li>• <code>/app/WEBHOOK_CONFIGURATION_GUIDE.md</code></li>
                <li>• <code>/app/README_SETUP.md</code></li>
              </ul>
            </div>
            
            <div>
              <strong className="text-sm">Test Your Credentials:</strong>
              <code className="block mt-2 bg-gray-100 px-3 py-2 rounded text-xs">
                node test-square-credentials.js
              </code>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
