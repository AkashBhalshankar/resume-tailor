import { Check, Loader2 } from 'lucide-react';

export default function LoadingOverlay({ steps, current }) {
  return (
    <div className="animate-fade fixed inset-0 z-50 grid place-items-center bg-paper/80 backdrop-blur-sm">
      <div className="card animate-pop w-full max-w-xs p-6">
        <ul className="space-y-3.5">
          {steps.map((label, i) => (
            <li key={label} className={`flex items-center gap-3 text-sm transition-opacity ${i > current ? 'opacity-35' : ''}`}>
              <span className={`grid size-6 place-items-center rounded-full ${i < current ? 'bg-ok text-white' : 'bg-accent/10 text-accent'}`}>
                {i < current ? <Check size={13} /> : i === current ? <Loader2 size={14} className="animate-spin" /> : null}
              </span>
              <span className={i === current ? 'font-semibold' : ''}>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
