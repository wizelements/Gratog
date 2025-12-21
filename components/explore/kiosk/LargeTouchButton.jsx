'use client';

import { Button } from '@/components/ui/button';

export default function LargeTouchButton({ icon, label, onClick, variant = 'default', className = '' }) {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      className={
        `min-w-[120px] min-h-[120px] p-6 flex flex-col items-center gap-3 text-lg font-bold border-4 rounded-2xl shadow-2xl hover:scale-105 transition-transform ${
          variant === 'default' 
            ? 'bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white' 
            : 'border-emerald-600/50 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-600'
        } ${className}`
      }
    >
      <div className="text-5xl">{icon}</div>
      <span className="text-white">{label}</span>
    </Button>
  );
}
