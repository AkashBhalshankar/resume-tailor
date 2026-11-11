import { useMemo, useState } from 'react';
import { FilePlus2, Search } from 'lucide-react';
import { useApp } from '../store';
import { renderPdf } from '../api';
import { STATUSES } from '../lib/history';
import { slug } from '../lib/resume';
import SummaryStrip from '../components/SummaryStrip';
import HistoryTable from '../components/HistoryTable';

export default function HistoryScreen() {
  const { history, setStatus, deleteEntry, startOver, toast } = useApp();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [busyId, setBusyId] = useState(null);

  const rows = useMemo(() => history.filter((r) =>
    (filter === 'All' || r.status === filter) && `${r.company} ${r.role}`.toLowerCase().includes(q.toLowerCase())), [history, q, filter]);

  const redownload = async (r) => {
    setBusyId(r.id);
    try {
      const { blob } = await renderPdf(r.resume);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug(r.resume.name) || 'Resume'}_Resume_${slug(r.company)}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (history.length === 0) {
    return (
      <div className="card animate-fade-up mx-auto mt-10 grid max-w-md place-items-center gap-3 p-10 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent"><FilePlus2 size={26} /></span>
        <h1 className="text-xl font-bold">No applications yet</h1>
        <p className="text-sm text-ink/60">Every resume you download is saved here, so you can track status and download it again.</p>
        <button onClick={startOver} className="btn-primary mt-2">Tailor a resume</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Application history</h1>
        <button onClick={startOver} className="btn-primary"><FilePlus2 size={16} /> New application</button>
      </div>
      <SummaryStrip rows={history} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
          <input className="input !pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company or role" aria-label="Search applications" />
        </div>
        <div className="flex gap-1 rounded-xl bg-ink/5 p-1">
          {['All', ...STATUSES].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${filter === s ? 'bg-white text-accent shadow' : 'text-ink/60 hover:text-ink'}`}>{s}</button>
          ))}
        </div>
      </div>

      {rows.length ? (
        <HistoryTable rows={rows} busyId={busyId} onStatus={setStatus} onRedownload={redownload} onDelete={deleteEntry} />
      ) : (
        <p className="card p-8 text-center text-sm text-ink/55">No applications match your search.</p>
      )}
    </div>
  );
}
