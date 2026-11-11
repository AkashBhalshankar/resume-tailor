import { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList, Copy, Download, Wand2 } from 'lucide-react';
import { useApp } from '../store';
import { coverLetter, renderTextToPdf, refineNote, parseJd } from '../api';
import OutreachForm from '../components/OutreachForm';
import NoteEditor from '../components/NoteEditor';
import ActionBar from '../components/ActionBar';

export default function OutreachScreen() {
  const { resume, jd, setJd, applied, company, setCompany, role, setRole, note, setNote, setScreen, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [refining, setRefining] = useState(false);
  const [instructions, setInstructions] = useState('');
  
  useEffect(() => {
    if (jd && (!company || !role)) autoFillFromJd();
  }, [jd]);

  useEffect(() => {
    if (note === '') generate();
  }, [note]);

  const [links] = useState({
    linkedin: 'https://www.linkedin.com/in/akash-bhalshanakar',
    github: 'https://github.com/AkashBhalshankar/AkashBhalshankar',
    chikki: 'https://akashbhalshankar.com',
    portfolio: 'https://portfolio.akashbhalshankar.com'
  });
  
  const autoFillFromJd = async () => {
    if (!jd) return toast('No JD available', 'error');
    setBusy(true);
    try {
        const res = await parseJd(jd);
        if (res.company) setCompany(res.company);
        if (res.role) setRole(res.role);
        if (res.company || res.role) {
            toast('Auto-filled using AI', 'success');
        } else {
            toast('Could not auto-fill Company/Role. Please enter manually.', 'error');
        }
    } catch (e) {
        console.error("Auto-fill error:", e);
        toast(e.message || 'Auto-fill failed', 'error');
    } finally {
        setBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    try {
      const highlights = Object.values(applied).filter((a) => a.suggestion.kind !== 'skill').map((a) => a.text);
      const template = `Dear Hiring Team,

I am applying for the ${role} role at ${company}. With 2 years of experience in AI engineering—including my time as a Trainee AI Engineer at UBS and QA Intern at MassMutual—I have developed a strong foundation in building enterprise-grade AI applications.

During my tenure at UBS, I architected multiple AI applications using LangGraph and LangChain, integrated Microsoft Teams bots for human-in-the-loop approvals, and implemented secure authentication with Microsoft Entra ID. My work at MassMutual focused on test automation and ETL validation, which honed my commitment to data reliability. I am proficient in Python, SQL, LangGraph, RAG, and Azure OpenAI Service, and I am eager to apply this technical toolkit to support the goals of ${company}.

I would welcome the chance to discuss how my background in building and scaling AI-driven products can contribute to your team. Thank you for your time and consideration.

Sincerely,
Akash Bhalshankar
+91 9014160774 | akashbhalshankar07@gmail.com`;

      const res = await coverLetter({ resume, jd, company, role, tone: 'formal', highlights, format_type: 'Cover Letter', template });
      setNote(res.note);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRefine = async () => {
    setRefining(true);
    try {
      const res = await refineNote({ note, instructions, tone: 'formal' });
      setNote(res.note);
      setInstructions('');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setRefining(false);
    }
  };

  const copyLink = (label, url) => {
    if (!url) return toast(`No ${label} link found`, 'error');
    navigator.clipboard.writeText(url);
    toast(`Copied ${label} link`, 'success');
  };

  const downloadPDF = async () => {
    const res = await renderTextToPdf(note);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${company || 'note'}_${role || 'note'}.pdf`;
    a.click();
  };

  useEffect(() => { 
    if (!note && resume && jd) generate(); 
  }, [resume, jd]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Outreach note</h1>
        <p className="mt-1 text-ink/60">A short message for the recruiter or hiring manager.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <OutreachForm onGenerate={generate} busy={busy}>
          <div className="mt-4 space-y-3">
            <label className="block font-bold">Quick Links</label>
            {Object.entries(links).map(([label, url]) => (
              <div key={label} className="flex items-center gap-2">
                <input readOnly className="input w-full" value={url} placeholder={`Your ${label} URL`} />
                <button onClick={() => copyLink(label, url)} className="btn-outline !p-2"><Copy size={16} /></button>
              </div>
            ))}
          </div>
        </OutreachForm>
        
        <div className="flex flex-col gap-6">
          <NoteEditor note={note} setNote={setNote} busy={busy} onRegenerate={generate} />
          <section className="card p-5">
            <label className="mb-2 block font-bold">Customize with AI</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="input w-full resize-none" rows={3} placeholder="e.g. Make it more energetic, emphasize my project X." />
            <button onClick={handleRefine} disabled={refining || !instructions.trim()} className="btn-secondary mt-3 w-full"><Wand2 size={16} /> {refining ? 'Refining…' : 'Refine note'}</button>
          </section>
        </div>
      </div>
      <ActionBar
        left={<button onClick={() => setScreen('download')} className="btn-ghost"><ArrowLeft size={16} /> Back</button>}
        right={
          <div className="flex gap-2">
            <button onClick={downloadPDF} className="btn-outline"><Download size={16} /> Download PDF</button>
          </div>
        } />
    </>
  );
}