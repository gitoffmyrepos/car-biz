'use client';

/**
 * GigWheels - Optimized Image Component
 * Weekly car rentals for gig drivers
 *
 * Wrapper around Next.js Image component with:
 * - Automatic lazy loading
 * - Blur placeholder support
 * - Error handling with fallback
 * - Responsive sizing
 */

import Image, { ImageProps } from 'next/image';
import { useState, useCallback } from 'react';

interface OptimizedImageProps extends Omit<ImageProps, 'onError'> {
  /** Fallback element or image to show on error */
  fallback?: React.ReactNode;
  /** Whether to show blur placeholder */
  showBlur?: boolean;
  /** CSS class for the container */
  containerClassName?: string;
  /** Alternative text for accessibility */
  alt: string;
}

/**
 * Simple blur data URL placeholder (light gray)
 */
const blurDataURL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIBAAAgICAgMBAAAAAAAAAAAAAQIDBAURAAYSITFR/8QAFQEBAQAAAAAAAAAAAAAAAAAABgf/xAAaEQADAAMBAAAAAAAAAAAAAAAAAQIDEQQh/9oADAMBAAIRAxEAPwCh15d4WxuWycfJa5K/G48YZQGIBBPiPX3z64xOHxGEzGUsR1q9ZrVoq0sEaKpkjIIO+9f/2Q==';

/**
 * Default fallback component for failed image loads
 */
function DefaultFallback({ className }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ${className || ''}`}
    >
      <svg
        className="w-12 h-12 text-gray-400"
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

/**
 * Optimized Image component using Next.js Image
 *
 * Features:
 * - Automatic lazy loading below the fold
 * - Blur placeholder while loading
 * - Graceful error handling with fallback
 * - Responsive image sizing
 * - WebP/AVIF format optimization (via Next.js)
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  fallback,
  showBlur = true,
  containerClassName,
  className,
  priority,
  ...props
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Show fallback on error
  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <DefaultFallback
        className={fill ? 'absolute inset-0' : `w-[${width}px] h-[${height}px]`}
      />
    );
  }

  // Container for fill mode
  if (fill) {
    return (
      <div className={`relative ${containerClassName || ''}`}>
        <Image
          src={src}
          alt={alt}
          fill
          className={`object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${className || ''}`}
          placeholder={showBlur ? 'blur' : 'empty'}
          blurDataURL={showBlur ? blurDataURL : undefined}
          onError={handleError}
          onLoad={handleLoad}
          priority={priority}
          {...props}
        />
      </div>
    );
  }

  // Standard image with dimensions
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${className || ''}`}
      placeholder={showBlur ? 'blur' : 'empty'}
      blurDataURL={showBlur ? blurDataURL : undefined}
      onError={handleError}
      onLoad={handleLoad}
      priority={priority}
      {...props}
    />
  );
}

/**
 * Vehicle image component with appropriate fallback
 */
export function VehicleImage({
  src,
  alt,
  category = 'sedan',
  ...props
}: Omit<OptimizedImageProps, 'fallback'> & { category?: string }) {
  const gradients: Record<string, string> = {
    sedan: 'from-slate-800 to-slate-600',
    suv: 'from-stone-800 to-stone-600',
    sports: 'from-red-900 to-red-700',
    compact: 'from-blue-900 to-blue-700',
    luxury: 'from-amber-900 to-amber-700',
    truck: 'from-zinc-800 to-zinc-600',
  };

  const fallback = (
    <div
      className={`w-full h-full bg-gradient-to-br ${gradients[category] || gradients.sedan} flex items-center justify-center`}
    >
      <svg className="w-16 h-16 text-white/30" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
      </svg>
    </div>
  );

  return <OptimizedImage src={src} alt={alt} fallback={fallback} {...props} />;
}

export default OptimizedImage;
