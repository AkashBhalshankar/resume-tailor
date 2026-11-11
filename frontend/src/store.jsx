import { createContext, useCallback, useContext, useState } from 'react';
import { parseJd } from './api';
import { applySuggestion, revertSuggestion } from './lib/resume';
import { FIXES, runAts } from './lib/ats';
import * as H from './lib/history';
import * as P from './lib/profiles';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [screen, setScreen] = useState('upload');
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [resume, setResume] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [applied, setApplied] = useState({});
  const [discarded, setDiscarded] = useState([]);
  const [note, setNote] = useState('');
  const [savedId, setSavedId] = useState(null);
  const [history, setHistory] = useState(H.loadHistory);
  const [toasts, setToasts] = useState([]);
  const [base, setBase] = useState(null);
  const [atsBefore, setAtsBefore] = useState(0);
  const [profiles, setProfiles] = useState(P.loadProfiles);
  const [profile, setProfile] = useState(null);
  const toast = useCallback((msg, type = 'info') => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const begin = (r, a) => {
    setResume(r); setBase(r); setAnalysis(a); setAtsBefore(runAts(r, { keywords: a.keywords, jd }).score); setApplied({}); setDiscarded([]); setNote(''); setSavedId(null);
    setScreen('review');
  };

  const accept = (s, text) => {
    const res = applySuggestion(resume, s, text);
    if (!res) return toast("Couldn't apply that suggestion", 'error');
    setResume(res.resume);
    setApplied((a) => ({ ...a, [s.id]: { text, prev: res.prev, suggestion: s } }));
  };
  const undo = (s) => {
    const rec = applied[s.id];
    if (!rec) return;
    setResume((r) => revertSuggestion(r, s, rec));
    setApplied(({ [s.id]: _gone, ...rest }) => rest);
  };
  const discard = (s) => setDiscarded((d) => [...d, s.id]);

  const editBullet = (section, i, bi, text) =>
    setResume((r) => { const c = structuredClone(r); c[section][i].bullets[bi] = text; return c; });
  const removeBullet = (section, i, bi) =>
    setResume((r) => { const c = structuredClone(r); c[section][i].bullets.splice(bi, 1); return c; });
  const addBullet = (section, i, text) =>
    setResume((r) => {
      if (!r?.[section]?.[i] || !text.trim()) return r;
      const c = structuredClone(r);
      c[section][i].bullets = [...(c[section][i].bullets || []), text.trim()];
      return c;
    });
  const updateResume = (updater) => {
    setResume((current) => {
      if (!current) return current;
      const updated = structuredClone(current);
      updater(updated);
      return updated;
    });
  };

  const applyFix = (name) => setResume((r) => FIXES[name](r));
  const patchBullets = (updates) =>
    setResume((r) => {
      const c = structuredClone(r);
      updates.forEach((u) => { if (u.text && c[u.section]?.[u.i]?.bullets[u.bi] != null) c[u.section][u.i].bullets[u.bi] = u.text; });
      return c;
    });
  const saveProfile = (name) => {
    setProfiles(P.addProfile({ id: crypto.randomUUID(), name: name.trim() || 'My profile', date: new Date().toISOString(), resume: base }));
    toast('Saved. You can start from it next time instead of uploading.', 'success');
  };
  const deleteProfile = (id) => setProfiles(P.removeProfile(id));
  const addKeywordToSkills = (term) => {
    setResume((r) => {
      if (!r) return r;
      const c = structuredClone(r);
      if (!Array.isArray(c.skills)) c.skills = [{ name: 'Skills', items: [] }];
      const have = new Set(c.skills.flatMap((g) => (g.items || []).map((i) => String(i).toLowerCase())));
      if (have.has(String(term).toLowerCase())) return c;
      if (c.skills[0]) c.skills[0].items = [...(c.skills[0].items || []), term];
      else c.skills.push({ name: 'Skills', items: [term] });
      return c;
    });
    toast('Added "' + term + '" to Skills', 'success');
  };

  const recordHistory = async (score) => {
    let parsed = {};
    if (jd.trim() && (!company.trim() || !role.trim())) {
      try {
        parsed = await parseJd(jd.trim());
      } catch {
        parsed = {};
      }
    }
    const finalCompany = (company.trim() || parsed.company || 'Untitled company').trim();
    const finalRole = (role.trim() || parsed.role || 'Role').trim();

    if (!company.trim() && parsed.company) setCompany(parsed.company);
    if (!role.trim() && parsed.role) setRole(parsed.role);

    if (savedId) return setHistory(H.patchEntry(savedId, { resume, score, company: finalCompany, role: finalRole }));
    const entry = {
      id: crypto.randomUUID(), company: finalCompany, role: finalRole,
      date: new Date().toISOString(), score, status: 'Applied', resume,
    };
    setHistory(H.addEntry(entry));
    setSavedId(entry.id);
  };
  const setStatus = (id, status) => setHistory(H.patchEntry(id, { status }));
  const deleteEntry = (id) => setHistory(H.removeEntry(id));

  const startOver = () => {
    setFile(null); setJd(''); setCompany(''); setRole(''); setResume(null); setAnalysis(null);
    setApplied({}); setDiscarded([]); setNote(''); setSavedId(null); setProfile(null); setBase(null); setScreen('upload');
  };

  const value = {
    screen, setScreen, file, setFile, jd, setJd, company, setCompany, role, setRole, resume, analysis, applied, discarded,
    note, setNote, history, toasts, toast, begin, accept, undo, discard, editBullet, removeBullet, recordHistory, setStatus,
    deleteEntry, startOver, base, atsBefore, applyFix, patchBullets, profiles, profile, setProfile, saveProfile, deleteProfile,
    addKeywordToSkills, addBullet, updateResume,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
