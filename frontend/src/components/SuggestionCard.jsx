import { useState } from 'react';
import { Check, Pencil, ShieldAlert, ShieldCheck, Undo2, X } from 'lucide-react';
import Placeholder from './Placeholder';
import { hasPlaceholder } from '../lib/resume';

const KIND = { add: 'New bullet', swap: 'Rewrite', skill: 'Add skills' };

export default function SuggestionCard({ s, applied, index, onAccept, onTweak, onDiscard, onUndo }) {
  const [leaving, setLeaving] = useState(false);
  const leave = (fn) => { setLeaving(true); setTimeout(fn, 280); };
  const needsInput = s.needs_metric && hasPlaceholder(s.text);

  return (
    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${leaving ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
      <div className="overflow-hidden">
        <article className={`card animate-fade-up mb-3 p-4 transition-colors ${applied ? 'border-ok/30 bg-ok/[.03]' : 'hover:border-accent/30'}`}
          style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}>
          <div className="mb-2.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-accent/10 px-2 py-1 font-semibold text-accent">{KIND[s.kind]}</span>
            {s.verified
              ? <span className="inline-flex items-center gap-1 text-ok"><ShieldCheck size={13} /> Based on your resume</span>
              : <span className="inline-flex items-center gap-1 text-warn"><ShieldAlert size={13} /> Add only if this is true</span>}
            <span className="ml-auto font-semibold tabular-nums text-ink/60">+{s.impact} pts</span>
          </div>

          {s.original && <p className="mb-1.5 text-[13px] leading-snug text-ink/40 line-through">{s.original}</p>}
          <p className="text-sm leading-relaxed"><Placeholder text={s.text} /></p>

          {s.jd_line && (
            <p className="mt-3 border-l-2 border-ink/15 pl-3 text-xs leading-relaxed text-ink/55">
              <span className="font-semibold text-ink/70">The job asks for: </span>“{s.jd_line}”
              {s.why && <span className="block pt-1">{s.why}</span>}
            </p>
          )}

          <div className="mt-3.5 flex items-center gap-2">
            {applied ? (
              <>
                <span className="animate-pop inline-flex items-center gap-1.5 text-sm font-semibold text-ok"><Check size={16} /> Added</span>
                <button onClick={onUndo} className="btn-ghost ml-auto !px-2.5 !py-1.5"><Undo2 size={14} /> Undo</button>
              </>
            ) : (
              <>
                <button onClick={() => (needsInput ? onTweak() : leave(onAccept))} className="btn-primary !px-3.5 !py-2">
                  {needsInput ? 'Fill in numbers' : 'Add'}
                </button>
                {!needsInput && <button onClick={onTweak} className="btn-outline !px-3 !py-2"><Pencil size={14} /> Edit</button>}
                <button onClick={() => leave(onDiscard)} className="btn-ghost ml-auto !px-2.5 !py-2" aria-label="Dismiss suggestion"><X size={16} /> Dismiss</button>
              </>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
