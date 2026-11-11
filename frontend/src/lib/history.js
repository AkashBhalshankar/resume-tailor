const KEY = 'resume_tailor_history_v1';
export const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];

export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full or blocked */ }
  return list;
}
export const addEntry = (entry) => save([entry, ...loadHistory()]);
export const patchEntry = (id, patch) => save(loadHistory().map((e) => (e.id === id ? { ...e, ...patch } : e)));
export const removeEntry = (id) => save(loadHistory().filter((e) => e.id !== id));
