export default function ProgressBar({ percent = 0 }) {
  const color = percent === 100 ? 'bg-emerald-600' : percent >= 50 ? 'bg-stamp-500' : 'bg-ink-400';
  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-ink-600 mt-1 block">{percent}%</span>
    </div>
  );
}
