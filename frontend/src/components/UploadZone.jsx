import { useRef, useState } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { useApp } from '../store';

export default function UploadZone({ file, onFile }) {
  const [drag, setDrag] = useState(false);
  const input = useRef();
  const { toast } = useApp();

  const take = (f) => {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name)) return toast('Please choose a PDF file.', 'error');
    if (f.size > 5 * 1024 * 1024) return toast('That PDF is over 5 MB.', 'error');
    onFile(f);
  };

  if (file) {
    return (
      <div className="animate-pop flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/25"><FileText size={26} /></span>
        <div>
          <p className="max-w-[260px] truncate font-semibold">{file.name}</p>
          <p className="text-xs text-ink/50">{(file.size / 1024).toFixed(0)} KB, ready to analyze</p>
        </div>
        <button onClick={() => onFile(null)} className="btn-ghost !py-1.5"><X size={14} /> Replace file</button>
      </div>
    );
  }

  return (
    <div role="button" tabIndex={0} aria-label="Upload resume PDF"
      onClick={() => input.current.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files[0]); }}
      className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
        drag ? 'scale-[1.02] border-accent bg-accent/10' : 'border-ink/20 hover:border-accent/60 hover:bg-accent/[.03]'}`}>
      <span className={`grid size-14 place-items-center rounded-2xl bg-white shadow-soft transition-transform duration-300 ${drag ? '-translate-y-1 text-accent' : 'text-ink/60'}`}>
        <UploadCloud size={26} />
      </span>
      <div>
        <p className="font-semibold">Drop your resume here</p>
        <p className="text-sm text-ink/55">or click to browse. PDF only, up to 5 MB.</p>
      </div>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { take(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}
