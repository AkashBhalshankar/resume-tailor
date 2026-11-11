import { useCountUp } from '../lib/hooks';

export const scoreColor = (n) => (n >= 75 ? '#16A34A' : n >= 50 ? '#D97706' : '#DC2626');

export default function ScoreRing({ value, size = 132, label = 'match' }) {
  const shown = useCountUp(value);
  const r = size / 2 - 10, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1F293714" strokeWidth="9" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(value)} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.2,.7,.2,1), stroke .4s' }} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="font-bold leading-none tabular-nums" style={{ fontSize: size * 0.28 }}>{shown}<span className="text-ink/40" style={{ fontSize: size * 0.14 }}>%</span></span>
        <span className="mt-1 text-xs text-ink/50">{label}</span>
      </div>
    </div>
  );
}
