export const hasPlaceholder = (t) => /\[[^\]]+\]/.test(t || '');
export const slug = (s) => (s || '').trim().replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');

// Applies a suggestion to a copy of the resume. Returns { resume, prev } or null.
export function applySuggestion(resume, s, text) {
  const r = structuredClone(resume);
  const { section, index } = s.target;
  if (section === 'skills') {
    const group = r.skills[index];
    if (!group) return null;
    const have = new Set(group.items.map((i) => i.toLowerCase()));
    const added = text.split(',').map((x) => x.trim()).filter((x) => x && !have.has(x.toLowerCase()));
    group.items.push(...added);
    return { resume: r, prev: added };
  }
  const entry = r[section]?.[index];
  if (!entry) return null;
  if (s.kind === 'swap') {
    let at = entry.bullets.indexOf(s.original);
    if (at === -1 && s.target.bullet_index != null && entry.bullets[s.target.bullet_index] != null) at = s.target.bullet_index;
    if (at !== -1) {
      const prev = entry.bullets[at];
      entry.bullets[at] = text;
      return { resume: r, prev };
    }
  }
  entry.bullets.push(text);
  return { resume: r, prev: null };
}

export function revertSuggestion(resume, s, rec) {
  const r = structuredClone(resume);
  const { section, index } = s.target;
  if (section === 'skills') {
    const group = r.skills[index];
    if (group) group.items = group.items.filter((i) => !rec.prev.includes(i));
    return r;
  }
  const entry = r[section]?.[index];
  const at = entry ? entry.bullets.indexOf(rec.text) : -1;
  if (at === -1) return r;
  if (rec.prev === null) entry.bullets.splice(at, 1);
  else entry.bullets[at] = rec.prev;
  return r;
}

export function liveScore(analysis, applied) {
  const gain = Object.values(applied).reduce((sum, a) => sum + (a.suggestion.impact || 0), 0);
  return Math.min(100, analysis.match_score + gain);
}

export function keywordState(analysis, applied) {
  const covered = new Set(Object.values(applied).flatMap((a) => a.suggestion.keywords.map((k) => k.toLowerCase())));
  return analysis.keywords.map((k) => ({ ...k, matched: k.matched || covered.has(k.term.toLowerCase()) }));
}

export function countPlaceholders(resume) {
  const all = [...resume.experience, ...resume.projects].flatMap((e) => e.bullets);
  return all.filter(hasPlaceholder).length;
}
