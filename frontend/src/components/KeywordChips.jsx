import { useApp } from '../store';

function Group({ title, items }) {
  if (!items.length) return null;
  const hit = items.filter((k) => k.matched).length;
  const { addKeywordToSkills, resume } = useApp();
  const has = new Set((resume?.skills || []).flatMap((g) => (g.items || []).map((i) => String(i).toLowerCase())));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-ink/55">
        <span className="font-semibold text-ink/70">{title}</span>
        <span className="tabular-nums">{hit}/{items.length} matched</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((k) => {
          const matched = k.matched || has.has(k.term.toLowerCase());
          if (matched) {
            return (
              <span key={k.term} className="animate-pop rounded-full border px-2.5 py-1 text-xs font-medium transition-colors border-ok/25 bg-ok/10 text-ok">
                {k.term}
              </span>
            );
          }
          return (
            <button
              key={k.term}
              onClick={() => addKeywordToSkills(k.term)}
              className="animate-pop rounded-full border px-2.5 py-1 text-xs font-medium transition-colors border-bad/25 bg-bad/10 text-bad hover:bg-bad/20 hover:border-bad/40 cursor-pointer"
              title="Add to resume skills"
            >
              {k.term}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function KeywordChips({ keywords }) {
  return (
    <div className="space-y-4">
      <Group title="Must-have" items={keywords.filter((k) => k.tier === 'must')} />
      <Group title="Nice-to-have" items={keywords.filter((k) => k.tier === 'nice')} />
    </div>
  );
}
