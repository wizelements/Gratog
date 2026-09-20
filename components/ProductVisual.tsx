'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { resolveProductVisual, type ProductVessel } from '@/lib/product-visual';

type ProductVisualProps = {
  product: Record<string, any>;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  variant?: 'card' | 'kiosk' | 'detail';
};

function Vessel({ vessel }: { vessel: ProductVessel }) {
  if (vessel === 'jar') {
    return (
      <div className="relative h-28 w-24 rounded-[1.7rem] border border-white/35 bg-white/10 shadow-2xl backdrop-blur-sm">
        <div className="absolute -top-4 left-2 right-2 h-5 rounded-lg border border-white/35 bg-white/20" />
        <div className="absolute inset-x-3 bottom-3 top-5 rounded-[1.15rem] border border-white/15 bg-white/5" />
      </div>
    );
  }

  if (vessel === 'shot') {
    return (
      <div className="relative h-28 w-12 rounded-b-[1.15rem] rounded-t-lg border border-white/35 bg-white/10 shadow-2xl backdrop-blur-sm">
        <div className="absolute -top-3 left-1 right-1 h-4 rounded-md border border-white/35 bg-white/20" />
      </div>
    );
  }

  if (vessel === 'cup') {
    return (
      <div className="relative h-28 w-24 rounded-b-[2rem] rounded-t-xl border border-white/35 bg-white/10 shadow-2xl backdrop-blur-sm">
        <div className="absolute -top-2 left-0 right-0 h-3 rounded-full border border-white/35 bg-white/20" />
        <div className="absolute -top-8 left-1/2 h-10 w-px -translate-x-1/2 rotate-6 bg-white/60" />
      </div>
    );
  }

  if (vessel === 'bundle') {
    return (
      <div className="relative h-24 w-28">
        <div className="absolute bottom-0 left-1 h-20 w-20 rotate-[-7deg] rounded-2xl border border-white/30 bg-white/10 shadow-xl backdrop-blur-sm" />
        <div className="absolute bottom-1 right-0 h-20 w-20 rotate-[7deg] rounded-2xl border border-white/35 bg-white/15 shadow-2xl backdrop-blur-sm" />
      </div>
    );
  }

  return (
    <div className="relative h-32 w-16 rounded-b-[1.75rem] rounded-t-xl border border-white/35 bg-white/10 shadow-2xl backdrop-blur-sm">
      <div className="absolute -top-6 left-3 right-3 h-7 rounded-t-md border border-white/35 bg-white/20" />
      <div className="absolute inset-x-2 bottom-4 top-8 rounded-[1rem] border border-white/15 bg-white/5" />
    </div>
  );
}

export default function ProductVisual({
  product,
  className = '',
  imageClassName = '',
  sizes = '(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw',
  priority = false,
  variant = 'card',
}: ProductVisualProps) {
  const visual = useMemo(() => resolveProductVisual(product), [product]);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [visual.src]);

  const showFlavorArt = visual.mode !== 'photo' || photoFailed;
  const name = typeof product?.name === 'string' && product.name.trim()
    ? product.name.trim()
    : 'Taste of Gratitude';

  if (!showFlavorArt) {
    return (
      <div
        className={`relative h-full w-full overflow-hidden bg-stone-100 ${className}`}
        data-product-visual-mode="photo"
      >
        <Image
          src={visual.src}
          alt={visual.alt}
          fill
          priority={priority}
          sizes={sizes}
          className={`object-cover transition duration-500 group-hover:scale-[1.03] ${imageClassName}`}
          onError={() => setPhotoFailed(true)}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
      </div>
    );
  }

  const isLarge = variant === 'kiosk' || variant === 'detail';

  return (
    <div
      className={`relative isolate flex h-full w-full overflow-hidden ${className}`}
      style={{ background: visual.background, color: visual.foreground }}
      role="img"
      aria-label={visual.alt}
      data-product-visual-mode="flavor-art"
    >
      <div
        className="absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl"
        style={{ background: visual.glow }}
      />
      <div
        className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full blur-3xl"
        style={{ background: visual.glow }}
      />
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 select-none font-black leading-none tracking-[-0.09em] opacity-[0.10]"
        style={{ fontSize: isLarge ? '9rem' : '6rem' }}
        aria-hidden="true"
      >
        {visual.monogram}
      </div>

      <div className="relative z-10 flex h-full w-full flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            className="rounded-full border border-white/25 bg-black/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur"
            style={{ color: visual.foreground }}
          >
            Small batch
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80"
            style={{ color: visual.accent }}
          >
            Taste of Gratitude
          </span>
        </div>

        <div className="flex min-h-24 items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className={`font-semibold leading-[0.95] tracking-[-0.04em] ${isLarge ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>
              {name}
            </p>
            {visual.ingredients.length > 0 && (
              <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 opacity-85 sm:text-sm">
                {visual.ingredients.join(' • ')}
              </p>
            )}
          </div>
          <div className="shrink-0 scale-[0.78] sm:scale-90" aria-hidden="true">
            <Vessel vessel={visual.vessel} />
          </div>
        </div>
      </div>
    </div>
  );
}
