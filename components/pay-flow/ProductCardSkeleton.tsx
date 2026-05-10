/**
 * 🚀 Gratog Pay Flow — Product Card Skeleton
 * Loading placeholder for better perceived performance
 */

export function ProductCardSkeleton() {
  return (
    <div className="relative bg-white rounded-2xl overflow-hidden border border-gray-100 h-full flex flex-col shadow-sm">
      {/* Image Skeleton */}
      <div className="relative aspect-[4/3] bg-gray-200 animate-pulse">
        <div className="absolute top-2 left-2 w-16 h-5 bg-gray-300 rounded-full" />
      </div>
      
      {/* Content Skeleton */}
      <div className="p-3 flex-1 flex flex-col">
        <div className="h-5 bg-gray-200 rounded animate-pulse mb-2 w-3/4" />
        <div className="h-3 bg-gray-200 rounded animate-pulse mb-4 w-1/2" />
        
        <div className="flex items-center justify-between gap-2 mt-auto">
          <div className="flex flex-col gap-1">
            <div className="h-5 bg-gray-300 rounded animate-pulse w-16" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
          </div>
          
          <div className="h-10 bg-gray-200 rounded-xl animate-pulse w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton grid for multiple products
 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 auto-rows-fr">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
