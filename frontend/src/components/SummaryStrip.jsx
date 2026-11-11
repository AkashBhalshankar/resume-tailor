import { useCountUp } from '../lib/hooks';

function Stat({ label, value, suffix = '' }) {
  const n = useCountUp(value);
  return (
    <div className="card p-4">
      <p className="text-3xl font-bold tabular-nums">{n}{suffix}</p>
      <p className="mt-0.5 text-sm text-ink/55">{label}</p>
    </div>
  );
}

export default function SummaryStrip({ rows }) {
  const interviews = rows.filter((r) => r.status === 'Interview' || r.status === 'Offer').length;
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label="Applications" value={rows.length} />
      <Stat label="Interviews or offers" value={interviews} />
      <Stat label="Average match" value={avg} suffix="%" />
    </div>
  );
}
