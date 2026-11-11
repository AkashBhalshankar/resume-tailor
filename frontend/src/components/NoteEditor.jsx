import { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import Skeleton from './Skeleton';

export default function NoteEditor({ note, setNote, busy, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const words = note.trim().split(/\s+/).filter(Boolean).length;
  const copy = async () => {
    await navigator.clipboard.writeText(note);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="card flex h-full flex-col p-5">
      {busy ? (
        <div className="flex-1 space-y-3 py-1">
          {[100, 92, 96, 40, 100, 88, 94, 60, 100, 70].map((w, i) => <Skeleton key={i} className={`h-3.5 ${w === 40 || w === 60 ? 'mt-4' : ''}`} style={{ width: `${w}%` }} />)}
        </div>
      ) : (
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Your outreach note will appear here."
          className="min-h-[300px] w-full flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none" />
      )}
      <div className="mt-3 flex items-center gap-2 border-t border-ink/10 pt-3">
        <span className="text-xs tabular-nums text-ink/50">{words} words</span>
        <button onClick={onRegenerate} disabled={busy} className="btn-ghost ml-auto !py-1.5"><RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Regenerate</button>
        <button onClick={copy} disabled={!note || busy} className="btn-outline !py-1.5">
          {copied ? <><Check size={14} className="animate-pop text-ok" /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>
    </div>
  );
}
