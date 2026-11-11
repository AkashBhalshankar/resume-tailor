import { useState } from 'react';
import { ArrowLeft, BookmarkPlus, PartyPopper } from 'lucide-react';
import { useApp } from '../store';
import { keywordState, liveScore } from '../lib/resume';
import ScoreRing from '../components/ScoreRing';
import KeywordChips from '../components/KeywordChips';
import SuggestionCard from '../components/SuggestionCard';
import TweakModal from '../components/TweakModal';
import ResumePreview from '../components/ResumePreview';
import ActionBar from '../components/ActionBar';
import AtsPanel from '../components/AtsPanel';

export default function ReviewScreen() {
  const { resume, analysis, applied, discarded, accept, undo, discard, setScreen, saveProfile } = useApp();
  const [naming, setNaming] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [tab, setTab] = useState('todo');
  const [editing, setEditing] = useState(null);

  const score = liveScore(analysis, applied);
  const keywords = keywordState(analysis, applied);
  const todo = analysis.suggestions.filter((s) => !applied[s.id] && !discarded.includes(s.id));
  const done = analysis.suggestions.filter((s) => applied[s.id]);
  const list = tab === 'todo' ? todo : done;
  const hotTexts = new Set(Object.values(applied).map((a) => a.text));

  const tabs = [['todo', `To review (${todo.length})`], ['done', `Added (${done.length})`]];

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-11rem)] lg:self-start lg:overflow-y-auto">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-xs text-ink/50">Click any line to edit it. Highlighted lines came from your accepted suggestions.</p>
            {naming ? (
              <form className="animate-fade flex shrink-0 gap-1.5" onSubmit={(e) => { e.preventDefault(); saveProfile(profileName); setNaming(false); setProfileName(''); }}>
                <input autoFocus className="input !w-36 !py-1.5" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="e.g. AI Engineer" aria-label="Profile name" />
                <button className="btn-primary !px-3 !py-1.5">Save</button>
              </form>
            ) : (
              <button onClick={() => setNaming(true)} className="btn-ghost shrink-0 !px-2.5 !py-1.5 !text-xs"><BookmarkPlus size={14} /> Save as profile</button>
            )}
          </div>
          <ResumePreview resume={resume} hotTexts={hotTexts} />
        </section>

        <div className="space-y-5">
          <section className="card flex items-center gap-5 p-5">
            <ScoreRing value={score} />
            <div className="min-w-0">
              <h2 className="font-bold">Job match</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink/60">{analysis.summary}</p>
            </div>
          </section>

          <AtsPanel />

          <section className="card p-5">
            <h2 className="mb-3 font-bold">Keywords from the job</h2>
            <KeywordChips keywords={keywords} />
          </section>

          <section>
            <div className="mb-3 flex gap-1 rounded-xl bg-ink/5 p-1">
              {tabs.map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${tab === k ? 'bg-white text-accent shadow' : 'text-ink/60 hover:text-ink'}`}>{label}</button>
              ))}
            </div>
            {list.map((s, i) => (
              <SuggestionCard key={s.id} s={s} index={i} applied={!!applied[s.id]}
                onAccept={() => accept(s, s.text)} onTweak={() => setEditing(s)} onDiscard={() => discard(s)} onUndo={() => undo(s)} />
            ))}
            {list.length === 0 && (
              <div className="card animate-fade-up grid place-items-center gap-2 p-8 text-center">
                <PartyPopper className="text-accent" />
                <p className="font-semibold">{tab === 'todo' ? 'Nothing left to review' : 'No changes added yet'}</p>
                <p className="text-sm text-ink/55">{tab === 'todo' ? 'Head to the download step when you are happy with your resume.' : 'Add suggestions from the other tab.'}</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {editing && <TweakModal suggestion={editing} onClose={() => setEditing(null)} onConfirm={(t) => { accept(editing, t); setEditing(null); }} />}
      <ActionBar
        left={<button onClick={() => setScreen('upload')} className="btn-ghost"><ArrowLeft size={16} /> Back</button>}
        hint={`${done.length} change${done.length === 1 ? '' : 's'} added`}
        right={<button onClick={() => setScreen('edit')} className="btn-primary">Edit resume</button>} />
    </>
  );
}
