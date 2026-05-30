import { Card, CardContent } from '@/components/ui/card';
// @ts-expect-error lucide-react types issue
import { Loader2, Receipt } from 'lucide-react';

export default function OrderLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-6">
        <div className="max-w-lg mx-auto animate-pulse">
          <div className="h-4 w-24 bg-emerald-400/30 rounded mb-2"></div>
          <div className="h-8 w-40 bg-white/20 rounded"></div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Status Card Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-gray-300" />
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
            
            <div className="border-t my-4"></div>
            
            <div className="flex justify-between items-center">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        {/* Loading Indicator */}
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading order details...</span>
        </div>
      </div>
    </div>
  );
}
