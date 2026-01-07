export default function ExperienceLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
        <p className="text-emerald-100/70 text-sm uppercase tracking-[0.2em]">
          Entering the experience...
        </p>
      </div>
    </div>
  );
}
