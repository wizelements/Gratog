'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, Clock, Globe, Monitor } from 'lucide-react';

export default function ErrorsPage() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      // Get admin token from localStorage
      const token = localStorage.getItem('admin_token') || 'admin123';
      
      const response = await fetch('/api/error-report', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setErrors(data.errors || []);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchErrors, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case 'GlobalError':
        return <Badge variant="destructive">Global Error</Badge>;
      case 'ErrorBoundary':
        return <Badge variant="secondary">Error Boundary</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Client Error Reports</h1>
          <p className="text-gray-600 mt-1">
            Real-time errors from user browsers
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Last updated: {formatTime(lastRefresh)}
            </span>
          )}
          <Button onClick={fetchErrors} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {errors.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No Errors Reported</h3>
            <p className="text-gray-500 mt-2">
              Client-side errors will appear here when they occur
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {errors.map((error) => (
          <Card key={error.id} className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-lg">{error.name}</CardTitle>
                  {getSourceBadge(error.source)}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTime(error.receivedAt)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-red-700">{error.message}</p>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {error.url && (
                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      <span className="truncate max-w-md">{error.url}</span>
                    </div>
                  )}
                  {error.userAgent && (
                    <div className="flex items-center gap-1">
                      <Monitor className="h-4 w-4" />
                      <span className="truncate max-w-md text-xs">{error.userAgent}</span>
                    </div>
                  )}
                </div>

                {error.digest && (
                  <div className="text-sm">
                    <span className="font-medium">Digest:</span>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded">{error.digest}</code>
                  </div>
                )}

                {error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                      View Stack Trace
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-50 border rounded text-xs overflow-auto max-h-48">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
