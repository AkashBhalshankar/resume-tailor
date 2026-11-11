export default function ActionBar({ left, right, hint }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">{left}</div>
        <div className="flex items-center gap-3">
          {hint && <span className="hidden text-xs text-ink/50 md:block">{hint}</span>}
          {right}
        </div>
      </div>
    </div>
  );
}
