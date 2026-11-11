import { useEffect, useState } from 'react';
import { FileText, Sparkles, X } from 'lucide-react';
import { useApp } from '../store';
import { analyze, parseJd, parseResume } from '../api';
import UploadZone from '../components/UploadZone';
import LoadingOverlay from '../components/LoadingOverlay';
import ActionBar from '../components/ActionBar';

const MIN_JD = 40;

export default function UploadScreen() {
  const { file, setFile, jd, setJd, company, setCompany, role, setRole, begin, toast, profiles, profile, setProfile, deleteProfile } = useApp();
  const [phase, setPhase] = useState(-1);
  const ready = (file || profile) && jd.trim().length >= MIN_JD;

  useEffect(() => {
    if (jd.trim().length < MIN_JD || (company.trim() && role.trim())) return;

    const timer = setTimeout(async () => {
      try {
        const parsed = await parseJd(jd.trim());
        if (parsed.company && !company.trim()) setCompany(parsed.company);
        if (parsed.role && !role.trim()) setRole(parsed.role);
      } catch {
        // Ignore parse failures; the user can still fill the fields manually.
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [jd, company, role, setCompany, setRole]);

  const run = async () => {
    setPhase(profile ? 1 : 0);
    try {
      const resume = profile ? structuredClone(profile.resume) : (await parseResume(file)).resume;
      setPhase(1);
      const analysis = await analyze(resume, jd.trim());
      begin(resume, analysis);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setPhase(-1);
    }
  };

  return (
    <>
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Match your resume to the job</h1>
        <p className="mt-2 text-ink/60">Upload your resume and paste the job description. You decide which changes go in.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Your resume</h2>
          {profile ? (
            <div className="animate-pop flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/25"><FileText size={26} /></span>
              <div><p className="font-semibold">{profile.name}</p><p className="text-xs text-ink/50">Saved profile, no upload needed</p></div>
              <button onClick={() => setProfile(null)} className="btn-ghost !py-1.5"><X size={14} /> Use a PDF instead</button>
            </div>
          ) : (
            <UploadZone file={file} onFile={(f) => { setFile(f); if (f) setProfile(null); }} />
          )}
          {profiles.length > 0 && !profile && (
            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="mb-2 text-sm font-semibold">Or start from a saved profile</p>
              <div className="flex flex-wrap gap-2">
                {profiles.map((p) => (
                  <span key={p.id} className="animate-pop inline-flex items-center rounded-full border border-ink/15 bg-white text-sm transition hover:border-accent">
                    <button onClick={() => { setProfile(p); setFile(null); }} className="rounded-l-full py-1.5 pl-3.5 pr-2 font-medium hover:text-accent">{p.name}</button>
                    <button onClick={() => deleteProfile(p.id)} aria-label={`Delete ${p.name}`} className="rounded-r-full py-1.5 pl-1 pr-2.5 text-ink/40 hover:text-bad"><X size={13} /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="card flex flex-col p-5">
          <label htmlFor="jd" className="mb-3 font-semibold">Job description</label>
          <textarea id="jd" value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full job description here…"
            className="input min-h-[220px] flex-1 resize-none leading-relaxed" />
          <p className={`mt-1.5 text-xs transition-colors ${jd && jd.trim().length < MIN_JD ? 'text-warn' : 'text-ink/45'}`}>
            {jd.trim().length < MIN_JD ? `Add a little more, at least ${MIN_JD} characters.` : `${jd.trim().length.toLocaleString()} characters`}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" aria-label="Company" />
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional)" aria-label="Role" />
          </div>
        </section>
      </div>

      <ActionBar hint="Your resume text goes to your own backend and the AI providers you configured." right={
        <button onClick={run} disabled={!ready || phase >= 0} className="btn-primary"><Sparkles size={16} /> Analyze match</button>
      } />
      {phase >= 0 && <LoadingOverlay steps={profile ? ['Loading your profile', 'Matching against the job'] : ['Reading your PDF', 'Matching against the job']} current={phase} />}
    </>
  );
}
