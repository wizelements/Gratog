'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics & Reports</h1>
        <p className="text-muted-foreground mt-1">
          Track your store's performance
        </p>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Analytics dashboard coming soon!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Track sales trends, customer behavior, and product performance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
