import { Sparkles } from 'lucide-react';

export default function OutreachForm({ onGenerate, busy, children }) {
  return (
    <div className="card space-y-4 p-5">
      {children}
      <button onClick={onGenerate} disabled={busy} className="btn-primary w-full"><Sparkles size={16} /> {busy ? 'Writing…' : 'Write note'}</button>
    </div>
  );
}
