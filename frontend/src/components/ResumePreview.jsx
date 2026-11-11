import { useEffect, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import Placeholder from './Placeholder';
import { useApp } from '../store';

function Bullet({ text, hot, onSave, onRemove, showControls }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(text);
  const ref = useRef();
  useEffect(() => setV(text), [text]);
  const fit = (el) => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; };
  useEffect(() => { if (edit && ref.current) { ref.current.focus(); fit(ref.current); } }, [edit]);
  const commit = () => {
    setEdit(false);
    const t = v.trim();
    if (!t) return onRemove();
    if (t !== text) onSave(t);
  };
  return (
    <li className={`group relative rounded-md py-0.5 pl-1.5 pr-6 transition-colors duration-500 ${hot ? 'bg-accent/10 ring-1 ring-accent/20' : 'hover:bg-ink/5'}`}>
      {edit ? (
        <textarea ref={ref} value={v} rows={1} onChange={(e) => { setV(e.target.value); fit(e.target); }} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Escape') { setV(text); setEdit(false); } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } }}
          className="w-full resize-none rounded border border-accent/40 bg-white px-1.5 py-1 text-[13px] leading-snug outline-none" />
      ) : (
        <button onClick={() => setEdit(true)} className="w-full text-left" title="Click to edit"><Placeholder text={text} /></button>
      )}
      {!edit && (
        <button onClick={onRemove} aria-label="Remove bullet" className={`absolute right-1 top-1 text-ink/40 transition hover:text-bad focus-visible:opacity-100 ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <X size={14} />
        </button>
      )}
    </li>
  );
}

function AddBullet({ onAdd }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const commit = () => {
    const text = value.trim();
    if (text) onAdd(text);
    setValue('');
    setEditing(false);
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="ml-1 inline-flex items-center gap-1 rounded py-1 text-xs text-accent hover:underline">
        <Plus size={12} /> Add your own bullet
      </button>
    );
  }

  return (
    <div className="ml-1 flex gap-1 py-1">
      <input autoFocus value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setValue(''); setEditing(false); }
        }}
        placeholder="Add your experience or achievement"
        className="min-w-0 flex-1 rounded border border-accent/40 bg-white px-1.5 py-1 text-xs outline-none" />
      <button onClick={commit} aria-label="Save bullet" className="text-ok"><Check size={14} /></button>
      <button onClick={() => { setValue(''); setEditing(false); }} aria-label="Cancel" className="text-ink/40"><X size={14} /></button>
    </div>
  );
}

function Heading({ children }) {
  return <h3 className="mb-1.5 mt-4 border-b border-ink/80 pb-0.5 text-[13px] font-bold uppercase">{children}</h3>;
}

function Row({ left, right, sub, subRight }) {
  return (
    <div>
      <div className="flex justify-between gap-3"><span className="font-bold">{left}</span><span>{right}</span></div>
      {(sub || subRight) && <div className="flex justify-between gap-3 italic"><span>{sub}</span><span>{subRight}</span></div>}
    </div>
  );
}

export default function ResumePreview({ resume, hotTexts, showControls = false }) {
  const { editBullet, removeBullet, addBullet } = useApp();
  const c = resume.contact;
  const contact = [c.email, c.phone, c.location, ...c.links.map((l) => l.label || l.url)].filter(Boolean);

  const bullets = (section, i, items) => (
    <>
      <ul className="mb-0 ml-4 mt-0.5 list-disc space-y-0.5 marker:text-ink/60">
        {items.map((b, bi) => (
          <Bullet key={`${bi}-${b}`} text={b} hot={hotTexts.has(b)} onSave={(t) => editBullet(section, i, bi, t)} onRemove={() => removeBullet(section, i, bi)} showControls={showControls} />
        ))}
      </ul>
      <AddBullet onAdd={(text) => addBullet(section, i, text)} />
    </>
  );

  const summary = resume.summary || resume.profileSummary;
  const certs = resume.certifications || [];
  const leadership = resume.leadership || resume.additional || [];

  return (
    <div className="font-serif text-[13px] leading-snug">
      <h2 className="text-center text-2xl font-bold leading-tight">{resume.name}</h2>
      {resume.title && <p className="text-center">{resume.title}</p>}
      <p className="mb-0 mt-0 text-center text-xs">{contact.join('  |  ')}</p>

      {summary && <><Heading>Summary</Heading>
        <p className="mb-1 whitespace-pre-wrap leading-tight">{summary}</p></>}

      {resume.skills.length > 0 && <><Heading>Technical Skills</Heading>
        {resume.skills.map((g, i) => <p key={i} className="mb-0.5 pl-3"><b>{g.category}:</b> {g.items.join(', ')}</p>)}</>}

      {resume.experience.length > 0 && <><Heading>Experience</Heading>
        {resume.experience.map((e, i) => <div key={i} className="mb-0.5"><Row left={e.role || e.company} right={e.dates} sub={e.role ? e.company : ''} subRight={e.location} />{bullets('experience', i, e.bullets)}</div>)}</>}

      {resume.projects.length > 0 && <><Heading>Projects</Heading>
        {resume.projects.map((p, i) => (
          <div key={i} className="mb-0.5"><Row left={<>{p.name}{p.tech && <span className="font-normal italic"> | {p.tech}</span>}</>} right={p.dates} />{bullets('projects', i, p.bullets)}</div>
        ))}</>}

      {resume.education.length > 0 && <><Heading>Education</Heading>
        {resume.education.map((e, i) => <div key={i} className="mb-0.5"><Row left={e.school} right={e.location} sub={e.degree} subRight={e.dates} /></div>)}</>}

      {certs.length > 0 && <><Heading>Certifications</Heading>
        <ul className="ml-4 list-disc space-y-0">{certs.map((a, i) => <li key={i}>{a}</li>)}</ul></>}

      {leadership.length > 0 && <><Heading>Leadership</Heading>
        <ul className="ml-4 list-disc space-y-0">{leadership.map((a, i) => <li key={i}>{a}</li>)}</ul></>}
    </div>
  );
}