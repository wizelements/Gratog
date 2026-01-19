'use client';

import { MusicProvider } from '@/contexts/MusicContext';
import { ReactNode } from 'react';

export default function MusicProviderWrapper({ children }: { children: ReactNode }) {
  return <MusicProvider>{children}</MusicProvider>;
}
