import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Download, Mail } from 'lucide-react';
import { useApp } from '../store';
import { renderPdf } from '../api';
import { countPlaceholders, liveScore, slug } from '../lib/resume';
import ScoreRing from '../components/ScoreRing';
import Skeleton from '../components/Skeleton';
import AtsPanel from '../components/AtsPanel';
import ActionBar from '../components/ActionBar';

function Stat({ ok, children }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white ${ok ? 'bg-ok' : 'bg-warn'}`}>{ok ? <Check size={12} /> : <AlertTriangle size={11} />}</span>
      <span>{children}</span>
    </li>
  );
}

export default function DownloadScreen() {
  const { resume, analysis, applied, company, setScreen, recordHistory, toast } = useApp();
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let dead = false, url;
    setPdf(null); setError(null);
    renderPdf(resume)
      .then((r) => { if (!dead) { url = URL.createObjectURL(r.blob); setPdf({ ...r, url }); } })
      .catch((e) => !dead && setError(e.message));
    return () => { dead = true; if (url) URL.revokeObjectURL(url); };
  }, [resume, attempt]);

  const score = liveScore(analysis, applied);
  const left = countPlaceholders(resume);
  const count = Object.keys(applied).length;

  const download = async () => {
    const a = document.createElement('a');
    a.href = pdf.url;
    a.download = `${slug(resume.name) || 'Resume'}_Resume${company ? `_${slug(company)}` : ''}.pdf`;
    a.click();
    await recordHistory(score);
    setSaved(true);
    toast('Downloaded and saved to your history', 'success');
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card overflow-hidden p-2">
          {pdf ? (
            <iframe title="Resume preview" src={`${pdf.url}#toolbar=0&navpanes=0&view=FitH`} className="animate-fade h-[75vh] w-full rounded-xl bg-white" />
          ) : error ? (
            <div className="grid h-[60vh] place-content-center gap-3 text-center">
              <p className="max-w-sm text-sm text-ink/70">{error}</p>
              <button onClick={() => setAttempt((n) => n + 1)} className="btn-outline mx-auto">Try again</button>
            </div>
          ) : (
            <div className="space-y-3 p-8"><Skeleton className="mx-auto h-7 w-1/2" /><Skeleton className="mx-auto h-3 w-2/3" />
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-3" />)}</div>
          )}
        </section>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="card flex items-center gap-4 p-5">
            <ScoreRing value={score} size={96} />
            <div><p className="font-bold">Final match</p><p className="text-sm text-ink/55">{count} change{count === 1 ? '' : 's'} added</p></div>
          </div>
          <ul className="card space-y-3 p-5">
            {pdf && <Stat ok={pdf.pages === 1}>{pdf.pages === 1 ? 'Fits on one page' : `Runs to ${pdf.pages} pages. Remove a few bullets in the review step.`}</Stat>}
            <Stat ok={left === 0}>{left === 0 ? 'No placeholders left' : `${left} bullet${left === 1 ? '' : 's'} still contain [placeholders]`}</Stat>
            <Stat ok>Plain text layout that applicant systems can read</Stat>
          </ul>
          <AtsPanel pages={pdf ? pdf.pages : null} />
        </aside>
      </div>

      <ActionBar
        left={<button onClick={() => setScreen('edit')} className="btn-ghost"><ArrowLeft size={16} /> Back to edit</button>}
        right={<>
          <button onClick={() => setScreen('outreach')} className="btn-outline"><Mail size={16} /> Write outreach note</button>
          <button onClick={download} disabled={!pdf} className="btn-primary">
            {saved ? <Check size={16} className="animate-pop" /> : <Download size={16} />} {saved ? 'Download again' : 'Download PDF'}
          </button>
        </>} />
    </>
  );
}
