import { AlertTriangle, Check, Info } from 'lucide-react';
import { useApp } from '../store';

const STYLE = {
  success: ['bg-ok', Check],
  error: ['bg-bad', AlertTriangle],
  info: ['bg-accent', Info],
};

export default function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="fixed bottom-24 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const [bg, Icon] = STYLE[t.type] || STYLE.info;
        return (
          <div key={t.id} className="animate-slide-in flex max-w-sm items-start gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm shadow-lg">
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white ${bg}`}><Icon size={12} /></span>
            <span>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}
