import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SkeletonProductCard() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <CardContent className="p-0">
        {/* Image Skeleton */}
        <div className="relative h-64 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
               style={{
                 backgroundSize: '1000px 100%',
                 backgroundRepeat: 'no-repeat'
               }}
          />
        </div>

        <div className="p-6 space-y-4">
          {/* Category Skeleton */}
          <Skeleton className="h-4 w-24 bg-gray-200" />

          {/* Title Skeleton */}
          <Skeleton className="h-6 w-3/4 bg-gray-200" />

          {/* Description Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-gray-200" />
            <Skeleton className="h-4 w-5/6 bg-gray-200" />
          </div>

          {/* Rating Skeleton */}
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-4 rounded-full bg-gray-200" />
            ))}
          </div>

          {/* Price and Button Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-20 bg-gray-200" />
            <Skeleton className="h-10 w-32 bg-gray-200 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonProductGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[...Array(count)].map((_, i) => (
        <div 
          key={i}
          className="animate-fade-in-up"
          style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}
        >
          <SkeletonProductCard />
        </div>
      ))}
    </div>
  );
}
