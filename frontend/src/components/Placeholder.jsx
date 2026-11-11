// Renders text with [X]-style placeholders highlighted so they are hard to miss.
export default function Placeholder({ text }) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    i % 2 ? <mark key={i} className="rounded bg-warn/20 px-1 font-semibold text-warn">{part}</mark> : part,
  );
}
