/**
 * stats: { value, label }[]
 */
export default function StatGrid({ stats, columns = 2, className = "" }) {
  return (
    <div
      className={`grid w-full gap-2 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"} ${className}`}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-0.5 rounded-12 bg-fill-alternative p-3">
          <span className="text-heading2 font-bold text-label-normal">{stat.value}</span>
          <span className="text-caption1 text-label-neutral">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
