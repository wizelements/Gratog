'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function DiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState({
    squareJsLoaded: false,
    appId: null,
    locationId: null,
    baseUrl: null,
    environment: null,
    squareObject: false,
    checks: []
  });

  useEffect(() => {
    const runDiagnostics = () => {
      const checks = [];
      
      // Check environment variables
      const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const environment = process.env.NODE_ENV;
      
      checks.push({
        name: 'NEXT_PUBLIC_SQUARE_APPLICATION_ID',
        status: appId ? 'pass' : 'fail',
        value: appId ? `${appId.substring(0, 15)}...` : 'NOT SET',
        message: appId ? 'Application ID configured' : 'Missing! Add to Vercel env vars'
      });
      
      checks.push({
        name: 'NEXT_PUBLIC_SQUARE_LOCATION_ID',
        status: locationId ? 'pass' : 'fail',
        value: locationId || 'NOT SET',
        message: locationId ? 'Location ID configured' : 'Missing! Add to Vercel env vars'
      });
      
      checks.push({
        name: 'NEXT_PUBLIC_BASE_URL',
        status: baseUrl ? 'pass' : 'warn',
        value: baseUrl || window.location.origin,
        message: baseUrl ? 'Base URL configured' : 'Using window.location.origin as fallback'
      });
      
      checks.push({
        name: 'Environment',
        status: 'info',
        value: environment || 'unknown',
        message: `Running in ${environment} mode`
      });
      
      // Check Square.js loading
      const squareLoaded = typeof window !== 'undefined' && !!window.Square;
      checks.push({
        name: 'Square.js Script',
        status: squareLoaded ? 'pass' : 'fail',
        value: squareLoaded ? 'Loaded' : 'Not Loaded',
        message: squareLoaded 
          ? 'Square SDK loaded successfully' 
          : 'Square.js failed to load - check CSP, ad blockers, or network'
      });
      
      // Check Square.payments availability
      if (squareLoaded && appId && locationId) {
        try {
          const payments = window.Square.payments(appId, locationId);
          checks.push({
            name: 'Square Payments Init',
            status: 'pass',
            value: 'Success',
            message: 'Can initialize Square payments SDK'
          });
        } catch (error) {
          checks.push({
            name: 'Square Payments Init',
            status: 'fail',
            value: 'Error',
            message: `Failed: ${error.message}`
          });
        }
      }
      
      // Check if running on correct domain
      const currentDomain = window.location.hostname;
      checks.push({
        name: 'Current Domain',
        status: 'info',
        value: currentDomain,
        message: 'Ensure this domain is registered in Square Developer Dashboard'
      });
      
      setDiagnostics({
        squareJsLoaded: squareLoaded,
        appId,
        locationId,
        baseUrl,
        environment,
        squareObject: squareLoaded,
        checks
      });
    };
    
    // Run immediately
    runDiagnostics();
    
    // Run again after 2 seconds to catch async loaded Square.js
    setTimeout(runDiagnostics, 2000);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warn':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pass: 'bg-green-100 text-green-800',
      fail: 'bg-red-100 text-red-800',
      warn: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <Badge className={variants[status] || variants.info}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const criticalFailures = diagnostics.checks.filter(c => c.status === 'fail').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment System Diagnostics</h1>
          <p className="text-gray-600">Checking Square integration health</p>
        </div>

        {/* Overall Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Status</span>
              {criticalFailures === 0 ? (
                <Badge className="bg-green-100 text-green-800 text-lg">
                  ✓ Healthy
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 text-lg">
                  ✗ {criticalFailures} Critical Issue{criticalFailures > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criticalFailures > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold">⚠️ Payment form will not work until these issues are fixed:</p>
                <ul className="mt-2 space-y-1">
                  {diagnostics.checks
                    .filter(c => c.status === 'fail')
                    .map((check, i) => (
                      <li key={i} className="text-red-700">• {check.message}</li>
                    ))}
                </ul>
              </div>
            ) : (
              <p className="text-green-700">✓ All critical systems operational</p>
            )}
          </CardContent>
        </Card>

        {/* Detailed Checks */}
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnostics.checks.map((check, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="mt-0.5">
                  {getStatusIcon(check.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">{check.name}</h3>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{check.message}</p>
                  <code className="text-xs bg-white px-2 py-1 rounded border">
                    {check.value}
                  </code>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Fixes */}
        {criticalFailures > 0 && (
          <Card className="mt-6 border-yellow-300 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-900">Quick Fix Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {!diagnostics.appId && (
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-2">Missing Application ID:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-yellow-800">
                    <li>Go to Vercel Dashboard → Your Project → Settings → Environment Variables</li>
                    <li>Add: <code className="bg-white px-1">NEXT_PUBLIC_SQUARE_APPLICATION_ID</code></li>
                    <li>Value: Your Square Application ID (starts with sq0idp-)</li>
                    <li>Redeploy your app</li>
                  </ol>
                </div>
              )}
              
              {!diagnostics.locationId && (
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-2">Missing Location ID:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-yellow-800">
                    <li>Go to Vercel Dashboard → Your Project → Settings → Environment Variables</li>
                    <li>Add: <code className="bg-white px-1">NEXT_PUBLIC_SQUARE_LOCATION_ID</code></li>
                    <li>Value: Your Square Location ID</li>
                    <li>Redeploy your app</li>
                  </ol>
                </div>
              )}
              
              {!diagnostics.squareJsLoaded && (
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-2">Square.js Not Loading:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-yellow-800">
                    <li>Disable ad blockers (they often block Square.js)</li>
                    <li>Check browser console for CSP violations</li>
                    <li>Verify network connection</li>
                    <li>Try a different browser</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
