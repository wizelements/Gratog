'use client';

import { motion } from 'framer-motion';
import { useScrollReveal } from '../hooks/useScrollReveal';
import type { ReactNode, RefObject } from 'react';

type Props = {
  id?: string;
  children: ReactNode;
  variant?: 'left' | 'right' | 'center';
};

export default function ExperienceScrollSection({ id, children, variant = 'center' }: Props) {
  const { ref, inView } = useScrollReveal();

  const offset =
    variant === 'left' ? -40 : variant === 'right' ? 40 : 0;

  return (
    <section
      id={id}
      className="py-24 md:py-32 px-4 md:px-8 lg:px-16"
    >
      <motion.div
        ref={ref as RefObject<HTMLDivElement>}
        initial={{ opacity: 0, y: 40, x: offset }}
        animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-6xl mx-auto"
      >
        {children}
      </motion.div>
    </section>
  );
}
