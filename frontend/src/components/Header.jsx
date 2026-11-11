import { Fragment } from 'react';
import { Check, FileText, History } from 'lucide-react';
import { useApp } from '../store';

const STEPS = [['upload', 'Upload'], ['review', 'Review'], ['edit', 'Edit'], ['download', 'Download'], ['outreach', 'Outreach']];

export default function Header() {
  const { screen, setScreen, history, resume } = useApp();
  const idx = STEPS.findIndex(([k]) => k === screen);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <button onClick={() => setScreen('upload')} className="group flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-white shadow-lg shadow-accent/25 transition-transform duration-300 group-hover:rotate-6">
            <FileText size={18} />
          </span>
          <span className="font-bold tracking-tight">Resume Tailor</span>
        </button>

        <ol className="hidden items-center gap-2 md:flex">
          {STEPS.map(([key, label], i) => {
            const done = idx > i, cur = idx === i, can = i === 0 || !!resume;
            return (
              <Fragment key={key}>
                <li>
                  <button disabled={!can} onClick={() => setScreen(key)} className="flex items-center gap-2 disabled:cursor-default">
                    <span className={`grid size-7 place-items-center rounded-full text-xs font-bold transition-all duration-300 ${
                      cur ? 'scale-110 bg-accent text-white shadow-md shadow-accent/30' : done ? 'bg-accent/15 text-accent' : 'bg-ink/10 text-ink/45'}`}>
                      {done ? <Check size={14} /> : i + 1}
                    </span>
                    <span className={`text-sm font-medium transition-colors ${cur ? 'text-ink' : 'text-ink/50'}`}>{label}</span>
                  </button>
                </li>
                {i < STEPS.length - 1 && (
                  <li aria-hidden className="h-0.5 w-10 overflow-hidden rounded bg-ink/10">
                    <div className="h-full bg-accent transition-all duration-500" style={{ width: done ? '100%' : '0%' }} />
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>
        {idx >= 0 && <span className="text-sm font-medium text-ink/60 md:hidden">Step {idx + 1} of 5</span>}

        <button onClick={() => setScreen('history')} className={`btn-ghost relative ${screen === 'history' ? 'bg-accent/10 !text-accent' : ''}`}>
          <History size={16} /> History
          {history.length > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] text-white">{history.length}</span>}
        </button>
      </div>
    </header>
  );
}
