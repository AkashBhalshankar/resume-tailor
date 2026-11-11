import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Loader2, Wand2, X } from 'lucide-react';
import { useApp } from '../store';
import { longBullets, runAts } from '../lib/ats';
import { shorten } from '../api';
import ScoreRing from './ScoreRing';

const ICON = { pass: [Check, 'bg-ok'], warn: [AlertTriangle, 'bg-warn'], fail: [X, 'bg-bad'] };
const FIX_LABEL = { dates: 'Unify dates', bullets: 'Remove empty or repeated bullets', shorten: 'Shorten with AI' };
const ORDER = { fail: 0, warn: 1, pass: 2 };

export default function AtsPanel({ pages = null }) {
  const { resume, analysis, jd, atsBefore, applyFix, patchBullets, toast } = useApp();
  const [showPassed, setShowPassed] = useState(false);
  const [busy, setBusy] = useState(false);

  const { score, checks } = runAts(resume, { keywords: analysis.keywords, jd, pages });
  const open = checks.filter((c) => c.status !== 'pass').sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const passed = checks.filter((c) => c.status === 'pass');
  const delta = score - atsBefore;

  const fix = async (name) => {
    if (name !== 'shorten') return applyFix(name);
    const items = longBullets(resume).slice(0, 12);
    setBusy(true);
    try {
      const { bullets } = await shorten(items.map((b) => b.text));
      patchBullets(items.map((b, k) => ({ section: b.section, i: b.i, bi: b.bi, text: bullets[k] })));
      toast(`Shortened ${items.length} bullet${items.length > 1 ? 's' : ''}`, 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const row = (c) => {
    const [Icon, bg] = ICON[c.status];
    return (
      <li key={c.id} className="animate-fade-up flex gap-3">
        <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white ${bg}`}><Icon size={12} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{c.label}</p>
          <p className="text-xs leading-relaxed text-ink/60">{c.detail}</p>
          {c.fixes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {c.fixes.map((f) => (
                <button key={f} onClick={() => fix(f)} disabled={busy} className="btn-outline !px-3 !py-1.5 !text-xs">
                  {busy && f === 'shorten' ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} {FIX_LABEL[f]}
                </button>
              ))}
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <section className="card p-5">
      <div className="flex items-center gap-4">
        <ScoreRing value={score} size={84} label="ATS" />
        <div>
          <h2 className="font-bold">ATS check</h2>
          <p className="text-sm text-ink/60">How easily applicant systems can read and rank this resume.</p>
          {delta !== 0 && (
            <span key={delta} className={`animate-pop mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${delta > 0 ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>
              {delta > 0 ? '+' : ''}{delta} since upload
            </span>
          )}
        </div>
      </div>

      {open.length > 0 && <ul className="mt-5 space-y-4">{open.map(row)}</ul>}
      {open.length === 0 && <p className="mt-4 text-sm font-medium text-ok">Everything looks ATS-friendly.</p>}

      {passed.length > 0 && (
        <>
          <button onClick={() => setShowPassed((v) => !v)} className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-ink/60 hover:text-ink">
            <ChevronDown size={14} className={`transition-transform ${showPassed ? 'rotate-180' : ''}`} /> {passed.length} check{passed.length > 1 ? 's' : ''} passed
          </button>
          {showPassed && <ul className="mt-3 space-y-4">{passed.map(row)}</ul>}
        </>
      )}
    </section>
  );
}
