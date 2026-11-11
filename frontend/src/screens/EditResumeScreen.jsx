import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import ActionBar from '../components/ActionBar';

function Field({ label, value, onChange, multiline = false, placeholder = '' }) {
  const classes = 'input w-full !py-2 text-sm';
  return (
    <label className="block min-w-0 text-xs font-medium text-ink/60">
      {label}
      {multiline ? (
        <textarea rows={3} className={`${classes} mt-1 resize-y`} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={`${classes} mt-1`} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Section({ title, children, onAdd, addLabel = 'Add item' }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {onAdd && <button onClick={onAdd} className="btn-outline !px-3 !py-1.5 text-xs"><Plus size={14} /> {addLabel}</button>}
      </div>
      {children}
    </section>
  );
}

function Entry({ children, onRemove }) {
  return (
    <div className="rounded-xl border border-ink/10 p-4">
      <div className="mb-3 flex justify-end">
        <button onClick={onRemove} aria-label="Remove item" className="inline-flex items-center gap-1 text-xs text-bad hover:underline"><Trash2 size={13} /> Remove</button>
      </div>
      {children}
    </div>
  );
}

function EditableList({ title, items, onChange, placeholder, addLabel }) {
  return (
    <Section title={title} onAdd={() => onChange([...items, ''])} addLabel={addLabel}>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <textarea rows={2} className="input w-full resize-y !py-2 text-sm" value={item || ''} placeholder={placeholder}
              onChange={(e) => onChange(items.map((value, i) => i === index ? e.target.value : value))} />
            <button onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={`Remove ${title} item`} className="mt-2 text-ink/40 hover:text-bad"><Trash2 size={15} /></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-ink/45">No items yet. Use “{addLabel}” to add one.</p>}
      </div>
    </Section>
  );
}

export default function EditResumeScreen() {
  const { resume, updateResume, setScreen } = useApp();
  const set = (path, value) => updateResume((copy) => {
    let target = copy;
    for (const key of path.slice(0, -1)) target = target[key];
    target[path[path.length - 1]] = value;
  });
  const add = (path, value) => updateResume((copy) => {
    const target = path.reduce((current, key) => current[key], copy);
    target.push(value);
  });
  const remove = (path, index) => updateResume((copy) => {
    const target = path.reduce((current, key) => current[key], copy);
    target.splice(index, 1);
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Edit your resume</h1>
        <p className="mt-1 text-ink/60">Edit every section, remove anything you don’t want, and add your own details. Changes are reflected in the resume you download.</p>
      </div>

      <div className="mx-auto max-w-4xl space-y-4">
        <Section title="Profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={resume.name} onChange={(v) => set(['name'], v)} />
            <Field label="Professional title" value={resume.title} onChange={(v) => set(['title'], v)} placeholder="e.g. AI Engineer" />
          </div>
          <div className="mt-4"><Field label="Profile summary" value={resume.summary || resume.profileSummary} multiline onChange={(v) => updateResume((copy) => { copy.summary = v; copy.profileSummary = v; })} /></div>
        </Section>

        <Section title="Contact details" onAdd={() => add(['contact', 'links'], { label: '', url: '' })} addLabel="Add link">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" value={resume.contact.email} onChange={(v) => set(['contact', 'email'], v)} />
            <Field label="Phone" value={resume.contact.phone} onChange={(v) => set(['contact', 'phone'], v)} />
            <Field label="Location" value={resume.contact.location} onChange={(v) => set(['contact', 'location'], v)} />
          </div>
          {resume.contact.links.map((link, index) => (
            <div key={index} className="mt-3 flex items-end gap-3">
              <Field label="Link label" value={link.label} onChange={(v) => set(['contact', 'links', index, 'label'], v)} placeholder="LinkedIn" />
              <Field label="URL" value={link.url} onChange={(v) => set(['contact', 'links', index, 'url'], v)} placeholder="https://" />
              <button onClick={() => remove(['contact', 'links'], index)} aria-label="Remove link" className="mb-2 text-ink/40 hover:text-bad"><Trash2 size={15} /></button>
            </div>
          ))}
        </Section>

        <Section title="Education" onAdd={() => add(['education'], { school: '', degree: '', location: '', dates: '' })} addLabel="Add education">
          <div className="space-y-3">{resume.education.map((item, i) => (
            <Entry key={i} onRemove={() => remove(['education'], i)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="School" value={item.school} onChange={(v) => set(['education', i, 'school'], v)} />
                <Field label="Degree" value={item.degree} onChange={(v) => set(['education', i, 'degree'], v)} />
                <Field label="Location" value={item.location} onChange={(v) => set(['education', i, 'location'], v)} />
                <Field label="Dates" value={item.dates} onChange={(v) => set(['education', i, 'dates'], v)} />
              </div>
            </Entry>
          ))}</div>
        </Section>

        {['experience', 'projects'].map((section) => (
          <Section key={section} title={section === 'experience' ? 'Experience' : 'Projects'}
            onAdd={() => add([section], section === 'experience' ? { company: '', role: '', location: '', dates: '', bullets: [] } : { name: '', tech: '', dates: '', bullets: [] })}
            addLabel={section === 'experience' ? 'Add experience' : 'Add project'}>
            <div className="space-y-3">{resume[section].map((item, i) => (
              <Entry key={i} onRemove={() => remove([section], i)}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {section === 'experience' ? <>
                    <Field label="Role" value={item.role} onChange={(v) => set([section, i, 'role'], v)} />
                    <Field label="Company" value={item.company} onChange={(v) => set([section, i, 'company'], v)} />
                    <Field label="Location" value={item.location} onChange={(v) => set([section, i, 'location'], v)} />
                    <Field label="Dates" value={item.dates} onChange={(v) => set([section, i, 'dates'], v)} />
                  </> : <>
                    <Field label="Project name" value={item.name} onChange={(v) => set([section, i, 'name'], v)} />
                    <Field label="Technologies" value={item.tech} onChange={(v) => set([section, i, 'tech'], v)} />
                    <Field label="Dates" value={item.dates} onChange={(v) => set([section, i, 'dates'], v)} />
                  </>}
                </div>
                <div className="mt-4">
                  <EditableList title="Bullets" items={item.bullets || []} onChange={(v) => set([section, i, 'bullets'], v)} placeholder="Describe an achievement or responsibility" addLabel="Add bullet" />
                </div>
              </Entry>
            ))}</div>
          </Section>
        ))}

        <Section title="Technical skills" onAdd={() => add(['skills'], { category: '', items: [] })} addLabel="Add skill group">
          <div className="space-y-3">{resume.skills.map((group, i) => (
          <Entry key={i} onRemove={() => remove(['skills'], i)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Category" value={group.category} onChange={(v) => set(['skills', i, 'category'], v)} placeholder="Programming languages" />
                <Field label="Skills (comma-separated)" value={(group.items || []).join(', ')} onChange={(v) => set(['skills', i, 'items'], v.split(',').map((item) => item.trim()).filter(Boolean))} />
              </div>
            </Entry>
          ))}</div>
        </Section>

        <EditableList title="Certifications" items={resume.certifications || []} onChange={(v) => set(['certifications'], v)} placeholder="Certification name" addLabel="Add certification" />
        <EditableList title="Leadership and additional achievements" items={resume.leadership || resume.additional || []} onChange={(v) => updateResume((copy) => { copy.leadership = v; })} placeholder="Leadership role or achievement" addLabel="Add item" />
      </div>

      <ActionBar
        left={<button onClick={() => setScreen('review')} className="btn-ghost"><ArrowLeft size={16} /> Back to review</button>}
        right={<button onClick={() => setScreen('download')} className="btn-primary">Continue to download <ArrowRight size={16} /></button>} />
    </>
  );
}
