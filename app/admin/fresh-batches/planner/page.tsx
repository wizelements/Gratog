'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Construction } from 'lucide-react';

export default function BatchPlannerPage() {
  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/fresh-batches">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to requests
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Batch Planner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-stone-700">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <Construction className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Planner UI is in progress.</p>
                <p className="mt-1 text-sm">
                  The decision engine, data model, and owner-decision rules are implemented and tested.
                  The visual batch planner will let the owner group requests, set production dates,
                  choose batch type, and create reservations + Square payment links.
                </p>
              </div>
            </div>

            <p className="text-sm">
              Until the planner UI is complete, use the admin request inbox to review demand and the
              existing <Link href="/admin" className="font-medium underline">admin dashboard</Link> to
              manage products and markets.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
