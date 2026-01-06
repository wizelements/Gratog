'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Copy } from 'lucide-react';

export default function DiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState({
    loading: true,
    config: null,
    configError: null,
    checks: []
  });
  const [testingPayments, setTestingPayments] = useState(false);
  const [paymentsTestResult, setPaymentsTestResult] = useState(null);

  // Fetch config from API (like the real payment form does)
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/square/config');
      const data = await res.json();
      
      if (!res.ok) {
        return { error: data.error || 'Config fetch failed', status: res.status };
      }
      return { data };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  // Test Square.payments() initialization (async, like real payment form)
  const testPaymentsInit = useCallback(async (config) => {
    setTestingPayments(true);
    setPaymentsTestResult(null);
    
    const result = {
      sdkLoaded: false,
      sdkLoadError: null,
      paymentsInitialized: false,
      paymentsError: null,
      paymentsErrorRaw: null,
      cardCreated: false,
      cardError: null
    };

    try {
      // Step 1: Check if SDK is loaded
      if (!window.Square) {
        // Try to load it
        const sdkUrl = config.sdkUrl || 'https://web.squarecdn.com/v1/square.js';
        await new Promise((resolve, reject) => {
          const existing = document.querySelector(`script[src="${sdkUrl}"]`);
          if (existing) {
            // Wait for it
            const check = setInterval(() => {
              if (window.Square) {
                clearInterval(check);
                resolve();
              }
            }, 100);
            setTimeout(() => {
              clearInterval(check);
              reject(new Error('SDK load timeout'));
            }, 10000);
            return;
          }
          
          const script = document.createElement('script');
          script.src = sdkUrl;
          script.async = true;
          script.onload = () => {
            setTimeout(() => {
              if (window.Square) resolve();
              else reject(new Error('SDK loaded but Square object not available'));
            }, 200);
          };
          script.onerror = () => reject(new Error('Failed to load SDK script'));
          document.head.appendChild(script);
        });
      }
      
      result.sdkLoaded = true;
    } catch (err) {
      result.sdkLoadError = err.message;
      setPaymentsTestResult(result);
      setTestingPayments(false);
      return;
    }

    // Step 2: Initialize payments (this is where it usually fails)
    try {
      console.log('[Diagnostic] Calling Square.payments() with:', {
        appId: config.applicationId?.slice(0, 15) + '...',
        locationId: config.locationId,
        environment: config.environment
      });
      
      const payments = await window.Square.payments(config.applicationId, config.locationId);
      
      if (!payments) {
        throw new Error('Square.payments() returned null/undefined');
      }
      
      result.paymentsInitialized = true;
      console.log('[Diagnostic] Square.payments() succeeded:', payments);
      
      // Step 3: Try to create a card (optional, to verify full flow)
      try {
        const card = await payments.card();
        result.cardCreated = true;
        await card.destroy();
      } catch (cardErr) {
        result.cardError = cardErr.message || cardErr.toString();
      }
      
    } catch (err) {
      console.error('[Diagnostic] Square.payments() failed:', err);
      result.paymentsError = err.message || err.toString();
      result.paymentsErrorRaw = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
    }

    setPaymentsTestResult(result);
    setTestingPayments(false);
  }, []);

  useEffect(() => {
    const runDiagnostics = async () => {
      const checks = [];
      
      // Check 1: Fetch config from API
      const configResult = await fetchConfig();
      
      if (configResult.error) {
        checks.push({
          name: 'API Config (/api/square/config)',
          status: 'fail',
          value: `Error: ${configResult.error}`,
          message: 'Cannot fetch Square config from API'
        });
        setDiagnostics({ loading: false, config: null, configError: configResult.error, checks });
        return;
      }
      
      const config = configResult.data;
      
      checks.push({
        name: 'API Config (/api/square/config)',
        status: 'pass',
        value: 'OK',
        message: 'Config endpoint working'
      });
      
      // Check 2: Application ID
      checks.push({
        name: 'Application ID',
        status: config.applicationId ? 'pass' : 'fail',
        value: config.applicationId ? `${config.applicationId.slice(0, 15)}...` : 'NOT SET',
        message: config.applicationId 
          ? (config.applicationId.startsWith('sandbox-') ? 'Sandbox App ID' : 'Production App ID (sq0idp-)')
          : 'Missing NEXT_PUBLIC_SQUARE_APPLICATION_ID'
      });
      
      // Check 3: Location ID  
      checks.push({
        name: 'Location ID',
        status: config.locationId ? 'pass' : 'fail',
        value: config.locationId || 'NOT SET',
        message: config.locationId 
          ? 'Location ID configured'
          : 'Missing SQUARE_LOCATION_ID'
      });
      
      // Check 4: Environment consistency
      const appIdIsProduction = config.applicationId?.startsWith('sq0idp-');
      const envIsProduction = config.environment === 'production';
      const sdkIsProduction = config.sdkUrl?.includes('web.squarecdn.com') && !config.sdkUrl?.includes('sandbox');
      
      const envConsistent = appIdIsProduction === envIsProduction && envIsProduction === sdkIsProduction;
      checks.push({
        name: 'Environment Consistency',
        status: envConsistent ? 'pass' : 'warn',
        value: `AppID: ${appIdIsProduction ? 'prod' : 'sandbox'}, Env: ${config.environment}, SDK: ${sdkIsProduction ? 'prod' : 'sandbox'}`,
        message: envConsistent 
          ? 'All credentials match environment' 
          : 'MISMATCH! Check that all credentials are for the same environment'
      });
      
      // Check 5: SDK URL
      checks.push({
        name: 'SDK URL',
        status: config.sdkUrl ? 'pass' : 'fail',
        value: config.sdkUrl || 'NOT SET',
        message: 'Square Web Payments SDK URL'
      });
      
      // Check 6: Current domain
      checks.push({
        name: 'Current Domain',
        status: 'info',
        value: window.location.origin,
        message: 'Domain where payments will be processed'
      });
      
      // Check 7: HTTPS
      const isHttps = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      checks.push({
        name: 'Secure Context',
        status: (isHttps || isLocalhost) ? 'pass' : 'fail',
        value: isHttps ? 'HTTPS' : (isLocalhost ? 'Localhost (OK)' : 'HTTP'),
        message: (isHttps || isLocalhost) 
          ? 'Running in secure context' 
          : 'Square requires HTTPS (except localhost)'
      });
      
      setDiagnostics({ loading: false, config, configError: null, checks });
      
      // Auto-run payments test
      if (config.applicationId && config.locationId) {
        await testPaymentsInit(config);
      }
    };

    runDiagnostics();
  }, [fetchConfig, testPaymentsInit]);

  const copyDebugInfo = () => {
    const info = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      config: diagnostics.config,
      checks: diagnostics.checks,
      paymentsTest: paymentsTestResult
    };
    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    alert('Debug info copied to clipboard');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warn': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default: return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pass: 'bg-green-100 text-green-800',
      fail: 'bg-red-100 text-red-800',
      warn: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800'
    };
    return <Badge className={variants[status] || variants.info}>{status.toUpperCase()}</Badge>;
  };

  if (diagnostics.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Running diagnostics...</p>
        </div>
      </div>
    );
  }

  const criticalFailures = diagnostics.checks.filter(c => c.status === 'fail').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment System Diagnostics</h1>
            <p className="text-gray-600">Deep dive into Square Web Payments SDK initialization</p>
          </div>
          <Button variant="outline" onClick={copyDebugInfo} className="flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Copy Debug Info
          </Button>
        </div>

        {/* Overall Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Status</span>
              {paymentsTestResult?.paymentsInitialized ? (
                <Badge className="bg-green-100 text-green-800 text-lg">✓ Payments Ready</Badge>
              ) : criticalFailures === 0 ? (
                <Badge className="bg-yellow-100 text-yellow-800 text-lg">⚠ Config OK, Testing...</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 text-lg">✗ {criticalFailures} Critical Issue{criticalFailures > 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Config Checks */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuration Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diagnostics.checks.map((check, index) => (
              <div key={index} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="mt-0.5">{getStatusIcon(check.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <h3 className="font-semibold text-gray-900">{check.name}</h3>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{check.message}</p>
                  <code className="text-xs bg-white px-2 py-1 rounded border block overflow-x-auto">{check.value}</code>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Payments Init Test */}
        <Card className={paymentsTestResult?.paymentsError ? 'border-red-300' : paymentsTestResult?.paymentsInitialized ? 'border-green-300' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Square.payments() Test</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => diagnostics.config && testPaymentsInit(diagnostics.config)}
                disabled={testingPayments || !diagnostics.config}
              >
                {testingPayments ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Re-test'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testingPayments ? (
              <div className="flex items-center gap-2 text-gray-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Testing Square.payments() initialization...
              </div>
            ) : paymentsTestResult ? (
              <div className="space-y-4">
                {/* SDK Load */}
                <div className="flex items-center gap-2">
                  {paymentsTestResult.sdkLoaded ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span>SDK Loaded: {paymentsTestResult.sdkLoaded ? 'Yes' : 'No'}</span>
                  {paymentsTestResult.sdkLoadError && (
                    <span className="text-red-600 text-sm">({paymentsTestResult.sdkLoadError})</span>
                  )}
                </div>
                
                {/* Payments Init */}
                <div className="flex items-center gap-2">
                  {paymentsTestResult.paymentsInitialized ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span>Payments Initialized: {paymentsTestResult.paymentsInitialized ? 'Yes' : 'No'}</span>
                </div>
                
                {/* Error Details */}
                {paymentsTestResult.paymentsError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-2">❌ Square.payments() Error:</h4>
                    <code className="text-sm text-red-700 block whitespace-pre-wrap break-all">
                      {paymentsTestResult.paymentsError}
                    </code>
                    {paymentsTestResult.paymentsErrorRaw && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-red-600 text-sm">Raw error object</summary>
                        <pre className="text-xs mt-2 overflow-auto max-h-40 bg-red-100 p-2 rounded">
                          {paymentsTestResult.paymentsErrorRaw}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
                
                {/* Card Creation */}
                {paymentsTestResult.paymentsInitialized && (
                  <div className="flex items-center gap-2">
                    {paymentsTestResult.cardCreated ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span>Card Element: {paymentsTestResult.cardCreated ? 'Created OK' : 'Failed'}</span>
                    {paymentsTestResult.cardError && (
                      <span className="text-red-600 text-sm">({paymentsTestResult.cardError})</span>
                    )}
                  </div>
                )}
                
                {/* Success */}
                {paymentsTestResult.paymentsInitialized && paymentsTestResult.cardCreated && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800">✅ Payment System Ready</h4>
                    <p className="text-green-700 text-sm mt-1">
                      Square Web Payments SDK initialized successfully. The checkout should work.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No test results yet</p>
            )}
          </CardContent>
        </Card>

        {/* Common Issues */}
        {paymentsTestResult?.paymentsError && (
          <Card className="mt-6 border-yellow-300 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-900">Common Causes & Fixes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-yellow-800">
              <div>
                <h4 className="font-semibold mb-2">1. Invalid Location ID</h4>
                <p>The location ID must exist in your Square account. Go to Square Dashboard → Locations to verify.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. Credential Mismatch</h4>
                <p>All credentials must be from the same environment (all production OR all sandbox).</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. Account Not Activated</h4>
                <p>Your Square account must be activated to accept payments. Check Square Dashboard.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">4. Wrong Access Token Type</h4>
                <p>Ensure SQUARE_ACCESS_TOKEN is an Access Token (starts with EAAA or sq0atp-), NOT a Client Secret (sq0csp-).</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw Config */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Raw Config (from /api/square/config)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-60">
              {JSON.stringify(diagnostics.config, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
