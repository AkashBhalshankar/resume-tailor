const KEY = 'resume_tailor_profiles_v1';

export function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage blocked */ }
  return list;
}
export const addProfile = (p) => save([p, ...loadProfiles()]);
export const removeProfile = (id) => save(loadProfiles().filter((p) => p.id !== id));
