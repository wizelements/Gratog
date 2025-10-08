export default function LoadingSpinner({ size = 'md', text }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin`}
        />
        <div
          className={`absolute inset-0 ${sizeClasses[size]} border-4 border-transparent border-t-[#8B7355]/50 rounded-full animate-spin`}
          style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
        />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
}
