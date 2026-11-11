import { Download, Loader2, Trash2 } from 'lucide-react';
import ScorePill from './ScorePill';
import StatusDropdown from './StatusDropdown';

const fmt = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function HistoryTable({ rows, busyId, onStatus, onRedownload, onDelete }) {
  return (
    <div className="card divide-y divide-ink/10 overflow-hidden">
      <div className="hidden grid-cols-[1.6fr_.9fr_.7fr_1fr_auto] gap-4 px-5 py-3 text-xs font-semibold text-ink/50 md:grid">
        <span>Company and role</span><span>Date</span><span>Match</span><span>Status</span><span className="w-[84px]" />
      </div>
      {rows.map((r, i) => (
        <div key={r.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          className="animate-fade-up grid grid-cols-2 items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-accent/[.03] md:grid-cols-[1.6fr_.9fr_.7fr_1fr_auto]">
          <div className="col-span-2 min-w-0 md:col-span-1">
            <p className="truncate font-semibold">{r.company}</p>
            <p className="truncate text-sm text-ink/55">{r.role}</p>
          </div>
          <span className="text-sm text-ink/60">{fmt(r.date)}</span>
          <span><ScorePill score={r.score} /></span>
          <span><StatusDropdown value={r.status} onChange={(s) => onStatus(r.id, s)} /></span>
          <span className="flex justify-end gap-1">
            <button onClick={() => onRedownload(r)} disabled={busyId === r.id} aria-label="Download PDF again" title="Download PDF again" className="btn-ghost !p-2">
              {busyId === r.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            </button>
            <button onClick={() => onDelete(r.id)} aria-label="Delete entry" title="Delete" className="btn-ghost !p-2 hover:!text-bad"><Trash2 size={16} /></button>
          </span>
        </div>
      ))}
    </div>
  );
}
