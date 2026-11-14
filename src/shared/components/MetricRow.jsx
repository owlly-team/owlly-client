export default function MetricRow({ title, subtitle, value, className = "" }) {
  return (
    <div className={`flex w-full items-center justify-between rounded-12 bg-background-normal px-4 py-3 ${className}`}>
      <div className="flex flex-col gap-0.5">
        <p className="text-label1 font-semibold text-label-normal">{title}</p>
        <p className="text-caption1 text-label-alternative">{subtitle}</p>
      </div>
      <span className="text-body2 font-bold text-label-normal">{value}</span>
    </div>
  );
}
