import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { hasPlaceholder } from '../lib/resume';

export default function TweakModal({ suggestion, onClose, onConfirm }) {
  const [text, setText] = useState(suggestion.text);
  const ref = useRef();
  const isSkill = suggestion.kind === 'skill';
  const blocked = !text.trim() || hasPlaceholder(text);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => !blocked && onConfirm(text.trim());

  return (
    <div className="animate-fade fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="card animate-pop w-full max-w-lg p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{isSkill ? 'Edit skills to add' : 'Edit before adding'}</h2>
          <button onClick={onClose} aria-label="Close" className="btn-ghost !p-1.5"><X size={18} /></button>
        </div>
        <textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)} rows={isSkill ? 2 : 4} className="input resize-none leading-relaxed"
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && submit()} />
        <p className={`mt-2 min-h-5 text-xs transition-colors ${hasPlaceholder(text) ? 'text-warn' : 'text-ink/45'}`}>
          {hasPlaceholder(text) ? 'Replace the [bracketed] placeholders with your real numbers before adding.'
            : isSkill ? 'Separate skills with commas.' : 'Only keep claims that are true for you.'}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} disabled={blocked} className="btn-primary">Add to resume</button>
        </div>
      </div>
    </div>
  );
}
