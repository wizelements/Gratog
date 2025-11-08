'use client';

import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading...', fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37]" />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#D4AF37]/10 via-background to-[#8B7355]/10">
        {content}
      </div>
    );
  }

  return content;
}

export function LoadingCard({ title = 'Loading', message }) {
  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-lg">
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 bg-[#D4AF37]/10 rounded-full">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {message && (
          <p className="text-sm text-muted-foreground text-center">{message}</p>
        )}
      </div>
    </div>
  );
}

export default LoadingSpinner;
