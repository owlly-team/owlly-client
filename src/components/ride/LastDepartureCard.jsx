import Badge from "../ui/Badge";

export default function LastDepartureCard({ time, place, note, className = "" }) {
  return (
    <div className={`flex w-full flex-col gap-1 rounded-12 bg-background-normal px-4 py-3 ${className}`}>
      <p className="text-label1 font-semibold text-label-alternative">집까지 마지막 출발</p>
      <p className="text-display2 font-bold tracking-tight text-label-strong">{time}</p>
      <p className="text-label1 text-label-alternative">{place}</p>
      {note && (
        <Badge variant="cautionary" className="mt-1 self-start">
          {note}
        </Badge>
      )}
    </div>
  );
}
