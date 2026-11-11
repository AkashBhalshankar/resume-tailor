import { hasPlaceholder } from './resume';

// ---------- dates ----------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PRESENT = /^(present|current|currently|now|ongoing|till date|to date|today)$/i;
const fullYear = (s) => (s.length === 2 ? 2000 + Number(s) : Number(s));

function parseDate(raw) {
  const t = raw.trim().replace(/\./g, '').replace(/[’']/g, '');
  if (PRESENT.test(t)) return { present: true };
  let m = t.match(/^([A-Za-z]{3,9})\s*(\d{2}|\d{4})$/);
  if (m) {
    const mi = MON.findIndex((x) => m[1].toLowerCase().startsWith(x.toLowerCase()));
    if (mi >= 0) return { y: fullYear(m[2]), m: mi };
  }
  m = t.match(/^(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) return { y: fullYear(m[2]), m: Number(m[1]) - 1 };
  m = t.match(/^(\d{4})$/);
  if (m) return { y: Number(m[1]), m: null };
  return null;
}
const fmt = (d) => (d.present ? 'Present' : d.m == null ? String(d.y) : `${MON[d.m]} ${d.y}`);

function parseRange(str) {
  const parts = (str || '').split(/\s+to\s+|\s*[–—-]\s*/i).map((p) => p.trim()).filter(Boolean);
  if (!parts.length || parts.length > 2) return null;
  const ds = parts.map(parseDate);
  return ds.some((d) => !d) ? null : ds;
}

export function normalizeRange(str) {
  const ds = parseRange(str);
  return ds ? ds.map(fmt).join(' – ') : null;
}

function monthsIn(str) {
  const ds = parseRange(str);
  if (!ds) return 0;
  const now = new Date();
  const point = (d, isEnd) => (d.present ? now.getFullYear() * 12 + now.getMonth() : d.y * 12 + (d.m ?? (isEnd ? 11 : 0)));
  const start = point(ds[0], false);
  const end = ds[1] ? point(ds[1], true) : start;
  return Math.max(0, end - start);
}

// ---------- helpers ----------
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const countTerm = (text, term) => (text.match(new RegExp(`(?<![a-z0-9])${esc(term.toLowerCase())}(?![a-z0-9])`, 'g')) || []).length;
const WEAK = /^(responsible for|worked on|worked with|helped( with)?|assisted( with)?|involved in|duties included|tasked with|participated in)\b/i;

export function allBullets(resume) {
  return ['experience', 'projects'].flatMap((section) =>
    resume[section].flatMap((e, i) => e.bullets.map((text, bi) => ({ section, i, bi, text }))));
}
export const longBullets = (resume) => allBullets(resume).filter((b) => words(b.text) > 30);

export const FIXES = {
  dates(resume) {
    const r = structuredClone(resume);
    [...r.education, ...r.experience, ...r.projects].forEach((e) => { const n = normalizeRange(e.dates); if (n) e.dates = n; });
    return r;
  },
  bullets(resume) {
    const r = structuredClone(resume);
    [...r.experience, ...r.projects].forEach((e) => {
      const seen = new Set();
      e.bullets = e.bullets.map((b) => b.trim()).filter((b) => {
        const k = b.toLowerCase();
        if (!b || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    });
    return r;
  },
};

// ---------- the checks ----------
const FACTOR = { pass: 1, warn: 0.5, fail: 0 };

export function runAts(resume, { keywords = [], jd = '', pages = null } = {}) {
  const checks = [];
  const add = (id, label, weight, status, detail, fixes = []) => checks.push({ id, label, weight, status, detail, fixes });
  const c = resume.contact || {};
  const bullets = allBullets(resume);

  // contact
  const missing = [];
  if (!resume.name?.trim()) missing.push('your name');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email || '')) missing.push('a valid email');
  if ((c.phone || '').replace(/\D/g, '').length < 10) missing.push('a phone number');
  add('contact', 'Contact details', 10, !missing.length ? 'pass' : missing.some((m) => m !== 'a phone number') ? 'fail' : 'warn',
    missing.length ? `Missing ${missing.join(', ')}.` : 'Name, email and phone are easy to find.');

  // links
  const hasLinkedIn = (c.links || []).some((l) => /linkedin/i.test(`${l.label} ${l.url}`));
  add('links', 'LinkedIn link', 5, hasLinkedIn ? 'pass' : 'warn', hasLinkedIn ? 'LinkedIn profile is listed.' : 'Recruiters look for a LinkedIn link.');

  // sections
  const gaps = [];
  if (!resume.education.length) gaps.push('Education');
  if (!resume.experience.length && !resume.projects.length) gaps.push('Experience or Projects');
  if (!resume.skills.length) gaps.push('Skills');
  add('sections', 'Standard sections', 10, !gaps.length ? 'pass' : gaps.length === 1 ? 'warn' : 'fail',
    gaps.length ? `Missing: ${gaps.join(', ')}.` : 'Education, experience and skills use standard headings.');

  // dates
  const entries = [...resume.education, ...resume.experience, ...resume.projects];
  const fixable = [], unreadable = [], blank = resume.experience.filter((e) => !e.dates?.trim()).length;
  entries.forEach((e) => {
    if (!e.dates?.trim()) return;
    const n = normalizeRange(e.dates);
    if (n === null) unreadable.push(e.dates);
    else if (n !== e.dates) fixable.push(e.dates);
  });
  const dateIssues = fixable.length + unreadable.length + blank;
  add('dates', 'Date format', 10, dateIssues === 0 ? 'pass' : dateIssues > 3 ? 'fail' : 'warn',
    dateIssues === 0 ? 'Dates share one clear format (Mon YYYY – Mon YYYY).'
      : [fixable.length && `${fixable.length} date${fixable.length > 1 ? 's use' : ' uses'} a mixed format, like "${fixable[0]}".`,
        unreadable.length && `Could not read "${unreadable[0]}".`, blank && `${blank} job${blank > 1 ? 's have' : ' has'} no dates.`].filter(Boolean).join(' '),
    fixable.length ? ['dates'] : []);

  // bullet quality
  const long = bullets.filter((b) => words(b.text) > 30);
  const short = bullets.filter((b) => b.text.trim() && words(b.text) < 5);
  const lower = new Set(), dupes = [];
  [...resume.experience, ...resume.projects].forEach((e) => { const seen = new Set(); e.bullets.forEach((b) => { const k = b.trim().toLowerCase(); if (!k || seen.has(k)) dupes.push(b); seen.add(k); }); });
  const qIssues = long.length + short.length + dupes.length;
  add('length', 'Bullet length and clutter', 10, qIssues === 0 ? 'pass' : qIssues <= 2 ? 'warn' : 'fail',
    qIssues === 0 ? 'Bullets are concise and unique.'
      : [long.length && `${long.length} bullet${long.length > 1 ? 's are' : ' is'} over 30 words.`, short.length && `${short.length} very short.`, dupes.length && `${dupes.length} empty or repeated.`].filter(Boolean).join(' '),
    [long.length && 'shorten', dupes.length && 'bullets'].filter(Boolean));

  // verbs
  const weak = bullets.filter((b) => WEAK.test(b.text.trim()));
  const starts = {};
  bullets.forEach((b) => { const w = b.text.trim().split(/\s+/)[0]?.toLowerCase(); if (w && !WEAK.test(b.text)) starts[w] = (starts[w] || 0) + 1; });
  const repeated = Object.entries(starts).filter(([, n]) => n >= 3).map(([w]) => w);
  add('verbs', 'Strong, varied action verbs', 10, !weak.length && !repeated.length ? 'pass' : weak.length >= 3 ? 'fail' : 'warn',
    !weak.length && !repeated.length ? 'Bullets open with varied action verbs.'
      : [weak.length && `${weak.length} bullet${weak.length > 1 ? 's start' : ' starts'} with a weak phrase like "${weak[0].text.split(' ').slice(0, 2).join(' ')}".`,
        repeated.length && `"${repeated[0]}" opens 3 or more bullets.`].filter(Boolean).join(' '));

  // metrics
  if (bullets.length) {
    const withNum = bullets.filter((b) => /\d/.test(b.text)).length, ratio = withNum / bullets.length;
    add('metrics', 'Measurable results', 10, ratio >= 0.3 ? 'pass' : ratio >= 0.15 ? 'warn' : 'fail', `${withNum} of ${bullets.length} bullets include a number.`);
  }

  // placeholders
  const holes = bullets.filter((b) => hasPlaceholder(b.text)).length;
  add('placeholders', 'No placeholders left', 10, holes ? 'fail' : 'pass', holes ? `${holes} bullet${holes > 1 ? 's still contain' : ' still contains'} a [placeholder].` : 'No [X] placeholders remain.');

  // keywords
  const text = [resume.name, ...resume.experience.flatMap((e) => [e.role, ...e.bullets]), ...resume.projects.flatMap((p) => [p.tech, ...p.bullets]),
    ...resume.skills.flatMap((g) => g.items), ...(resume.leadership || resume.additional || [])].join(' \n ').toLowerCase();
  const bulletText = bullets.map((b) => b.text).join(' \n ').toLowerCase();
  const must = keywords.filter((k) => k.tier === 'must' && countTerm(text, k.term) > 0);
  if (must.length) {
    const inBullets = must.filter((k) => countTerm(bulletText, k.term) > 0).length, ratio = inBullets / must.length;
    add('placement', 'Keywords used in context', 15, ratio >= 0.6 ? 'pass' : ratio >= 0.3 ? 'warn' : 'fail',
      `${inBullets} of ${must.length} must-have keywords appear in your bullets, not just the skills list.`);
  }
  if (keywords.length) {
    const stuffed = keywords.filter((k) => countTerm(text, k.term) > 6).map((k) => k.term);
    add('stuffing', 'No keyword stuffing', 5, stuffed.length ? 'warn' : 'pass', stuffed.length ? `"${stuffed[0]}" appears more than 6 times.` : 'Keywords are used naturally.');
  }

  // info rows (not scored)
  if (pages != null) add('pages', 'Fits one page', 0, pages === 1 ? 'pass' : 'warn', pages === 1 ? 'Everything fits on one page.' : `Runs to ${pages} pages. Remove a few bullets.`);
  const need = jd.match(/(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:relevant\s+|professional\s+|hands-on\s+)?experience/i);
  if (need) {
    const have = resume.experience.reduce((m, e) => m + monthsIn(e.dates), 0) / 12, want = Number(need[1]);
    add('years', 'Experience vs the job', 0, have + 0.5 >= want ? 'pass' : 'warn', `The job asks for ${want}+ years; your resume shows about ${have.toFixed(1)}.`);
  }

  const scored = checks.filter((k) => k.weight > 0);
  const avail = scored.reduce((s, k) => s + k.weight, 0);
  const earned = scored.reduce((s, k) => s + k.weight * FACTOR[k.status], 0);
  return { score: avail ? Math.round((earned / avail) * 100) : 0, checks };
}
