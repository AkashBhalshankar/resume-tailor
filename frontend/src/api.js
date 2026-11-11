const API_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, options);
  } catch {
    throw new Error('Cannot reach the server. Make sure the backend is running on port 8000.');
  }
  if (!res.ok) {
    let detail;
    try { detail = (await res.json()).detail; } catch { /* not json */ }
    if (Array.isArray(detail)) detail = 'Some input was invalid.';
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res;
}

const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export async function getCuratedJobs() {
  return (await request('/jobs/curated')).json();
}

export async function getRemovedJobs() {
  return (await request('/jobs/removed')).json();
}

export async function deleteJob(jobId) {
  return await request(`/jobs/${jobId}`, { method: 'DELETE' });
}

export async function triggerSearch() {
  return await request('/jobs/trigger-search', { method: 'POST' });
}

export async function getScoutStatus() {
  return (await request('/jobs/scout-status')).json();
}

export async function parseResume(file) {
  const form = new FormData();
  form.append('file', file);
  return (await request('/parse', { method: 'POST', body: form })).json();
}

export async function analyze(resume, jd) {
  return (await request('/analyze', json({ resume, jd }))).json();
}

export async function parseJd(jd) {
  return (await request('/parse-jd', json({ jd }))).json();
}

export async function renderPdf(resume) {
  const res = await request('/render', json({ resume }));
  return { blob: await res.blob(), pages: Number(res.headers.get('X-Pages') || 1), fontSize: Number(res.headers.get('X-Font-Size') || 10) };
}

export async function coverLetter(payload) {
  return (await request('/cover-letter', json(payload))).json();
}

export async function shorten(bullets) {
  return (await request('/shorten', json({ bullets }))).json();
}

export async function refineNote(payload) {
  return (await request('/refine-note', json(payload))).json();
}

export async function renderTextToPdf(text) {
  return await request('/render-note', json({ text }));
}
