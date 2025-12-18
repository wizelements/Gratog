'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * OptimizedImage - A wrapper around next/image with Core Web Vitals optimizations
 * 
 * Features:
 * - Blur placeholder for reduced CLS
 * - Proper width/height to prevent layout shift
 * - Priority prop for above-fold images (LCP optimization)
 * - Lazy loading for below-fold images
 * - WebP/AVIF format support via next.config.js
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  fill = false,
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 85,
  placeholder = 'blur',
  blurDataURL,
  style,
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  ...props
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Default blur placeholder - a small, blurred emerald gradient
  const defaultBlurDataURL = 
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiMxMGI5ODEiLz48L3N2Zz4=';

  // Handle external URLs that may not support blur
  const isExternalUrl = src && typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'));
  const shouldUsePlaceholder = placeholder === 'blur' && (blurDataURL || !isExternalUrl);

  const handleLoad = (e) => {
    setIsLoading(false);
    onLoad?.(e);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Fallback for failed images
  if (hasError) {
    return (
      <div 
        className={`bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center ${className}`}
        style={{ 
          width: fill ? '100%' : width, 
          height: fill ? '100%' : height,
          ...style 
        }}
        role="img"
        aria-label={alt}
      >
        <svg 
          className="w-12 h-12 text-emerald-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    );
  }

  const imageProps = {
    src,
    alt: alt || '',
    quality,
    priority,
    onLoad: handleLoad,
    onError: handleError,
    className: `${className} ${isLoading ? 'animate-pulse' : ''} transition-opacity duration-300`,
    sizes,
    ...props,
  };

  // Add placeholder props
  if (shouldUsePlaceholder) {
    imageProps.placeholder = 'blur';
    imageProps.blurDataURL = blurDataURL || defaultBlurDataURL;
  } else if (isExternalUrl) {
    imageProps.placeholder = 'empty';
  }

  // Fill mode
  if (fill) {
    return (
      <Image
        {...imageProps}
        fill
        style={{
          objectFit,
          objectPosition,
          ...style,
        }}
      />
    );
  }

  // Fixed dimensions mode - prevents CLS
  return (
    <Image
      {...imageProps}
      width={width}
      height={height}
      style={{
        objectFit,
        objectPosition,
        ...style,
      }}
    />
  );
}

/**
 * HeroImage - Optimized image specifically for hero/above-fold sections
 * Always uses priority loading for LCP optimization
 */
export function HeroImage({
  src,
  alt,
  className = '',
  ...props
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      priority={true}
      quality={90}
      sizes="100vw"
      className={className}
      {...props}
    />
  );
}

/**
 * ProductImage - Optimized image for product cards
 * Uses eager loading for first few products, lazy for rest
 */
export function ProductImage({
  src,
  alt,
  priority = false,
  width = 400,
  height = 400,
  className = '',
  ...props
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      quality={80}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className={className}
      {...props}
    />
  );
}

/**
 * ThumbnailImage - Small optimized image for thumbnails/avatars
 */
export function ThumbnailImage({
  src,
  alt,
  size = 64,
  className = '',
  ...props
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      quality={75}
      sizes={`${size}px`}
      className={`rounded-full ${className}`}
      {...props}
    />
  );
}
