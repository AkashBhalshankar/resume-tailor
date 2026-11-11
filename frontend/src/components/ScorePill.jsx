export default function ScorePill({ score }) {
  const tone = score >= 75 ? 'bg-ok/10 text-ok' : score >= 50 ? 'bg-warn/10 text-warn' : 'bg-bad/10 text-bad';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${tone}`}>{score}%</span>;
}
