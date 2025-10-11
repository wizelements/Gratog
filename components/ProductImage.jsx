'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, ImageOff } from 'lucide-react';

// Professional sea moss product placeholder images
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1559858874-f40995981a23?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxzZWF3ZWVkfGVufDB8fHxncmVlbnwxNzYwMTU5NjI5fDA&ixlib=rb-4.1.0&q=85',
  'https://images.unsplash.com/photo-1620912294702-8c91a94c9a89?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwyfHxzZWF3ZWVkfGVufDB8fHxncmVlbnwxNzYwMTU5NjI5fDA&ixlib=rb-4.1.0&q=85',
  'https://images.unsplash.com/photo-1647012250603-9f02b8343af9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwzfHxzZWF3ZWVkfGVufDB8fHxncmVlbnwxNzYwMTU5NjI5fDA&ixlib=rb-4.1.0&q=85',
  'https://images.unsplash.com/photo-1663681316142-11866f14b8dc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwzfHxzZWElMjBtb3NzfGVufDB8fHxncmVlbnwxNzYwMTU5NjIzfDA&ixlib=rb-4.1.0&q=85'
];

const ProductImage = ({ 
  src, 
  alt, 
  className = '', 
  width = 400, 
  height = 300,
  priority = false,
  fallbackSrc = null
}) => {
  // Use a random placeholder if no fallback specified
  const defaultFallback = fallbackSrc || PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    console.warn(`Failed to load image: ${imgSrc}`);
    setIsLoading(false);
    setHasError(true);
    
    // Try fallback image if we haven't already
    if (imgSrc !== defaultFallback && defaultFallback) {
      setImgSrc(defaultFallback);
      setIsLoading(true);
      setHasError(false);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading State */}
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse"
          style={{ width, height }}
        >
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {hasError && !isLoading && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400"
          style={{ width, height }}
        >
          <ImageOff className="h-12 w-12 mb-2" />
          <span className="text-xs text-center px-2">Image not available</span>
        </div>
      )}

      {/* Actual Image */}
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '100%'
        }}
        onLoad={handleLoad}
        onError={handleError}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        quality={85}
      />

      {/* Image Overlay for Better Text Readability (Optional) */}
      <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors duration-300" />
    </div>
  );
};

// Optimized product card image component
export const ProductCardImage = ({ product, className = '' }) => {
  return (
    <ProductImage
      src={product.image}
      alt={product.name}
      width={400}
      height={300}
      className={`rounded-t-lg ${className}`}
      priority={product.featured}
    />
  );
};

// Hero section product image component
export const ProductHeroImage = ({ product, className = '' }) => {
  return (
    <ProductImage
      src={product.image}
      alt={product.name}
      width={600}
      height={400}
      className={`rounded-lg ${className}`}
      priority={true}
    />
  );
};

// Thumbnail image component
export const ProductThumbnail = ({ product, className = '', size = 80 }) => {
  return (
    <ProductImage
      src={product.image}
      alt={product.name}
      width={size}
      height={size}
      className={`rounded-md ${className}`}
      priority={false}
    />
  );
};

export default ProductImage;