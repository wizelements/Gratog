'use client';

import type { ReactNode } from 'react';

export default function ExperienceLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-emerald-950/40 to-slate-900" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 blur-3xl rounded-full" />
        <div className="absolute top-1/3 right-[-10%] w-[28rem] h-[28rem] bg-teal-400/15 blur-3xl rounded-full" />
        <div className="absolute bottom-[-10%] left-1/4 w-[22rem] h-[22rem] bg-emerald-300/15 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10">{children}</div>
    </main>
  );
}
