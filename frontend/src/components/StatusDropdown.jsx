import { STATUSES } from '../lib/history';

const TONE = {
  Applied: 'bg-accent/10 text-accent',
  Interview: 'bg-warn/10 text-warn',
  Offer: 'bg-ok/10 text-ok',
  Rejected: 'bg-ink/10 text-ink/60',
};

export default function StatusDropdown({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Application status"
      className={`cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none transition-colors ${TONE[value]}`}>
      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
