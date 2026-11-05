export default function FareCompare({ shareLabel, sharePrice, aloneLabel, alonePrice, className = "" }) {
  return (
    <div className={`grid w-full grid-cols-2 gap-2 ${className}`}>
      <div className="flex flex-col gap-1 rounded-12 bg-primary-tint px-4 py-3">
        <span className="text-label2 text-label-alternative">{shareLabel}</span>
        <span className="text-title3 font-bold tracking-tight text-primary-normal">{sharePrice}</span>
      </div>
      <div className="flex flex-col gap-1 rounded-12 bg-fill-normal px-4 py-3">
        <span className="text-label2 text-label-alternative">{aloneLabel}</span>
        <span className="text-title3 font-bold tracking-tight text-label-alternative">{alonePrice}</span>
      </div>
    </div>
  );
}
