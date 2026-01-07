'use client';

import { useEffect, useRef, useState } from 'react';

type Options = {
  strength?: number;
  disabled?: boolean;
};

export function useMouseParallax({ strength = 40, disabled = false }: Options = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (disabled) return;
    if (typeof window === 'undefined') return;
    
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    
    const el = containerRef.current;
    if (!el) return;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      setOffset({ x, y });
    };

    const handleLeave = () => setOffset({ x: 0, y: 0 });

    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerleave', handleLeave);

    return () => {
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerleave', handleLeave);
    };
  }, [disabled]);

  const getStyle = (depth: number) => {
    const factor = strength * depth;
    return {
      transform: `translate3d(${(-offset.x * factor).toFixed(2)}px, ${(-offset.y * factor).toFixed(2)}px, 0)`,
      willChange: 'transform',
    } as const;
  };

  return { containerRef, offset, getStyle } as const;
}
