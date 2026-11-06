import Badge from "../../../shared/components/Badge";

//집까지 마지막 출발
export default function LastDepartureCard({
  time,
  place,
  note,
  className = "",
}) {
  return (
    <div className={`rounded-12 bg-background-normal flex w-full flex-col gap-1 ${className}`}>
      <p className="text-label1 text-label-neutral font-semibold">
        집까지 마지막 출발
      </p>
      <p className="text-display2 text-label-strong font-bold tracking-tight">
        {time}
      </p>
      <p className="text-label1 text-label-neutral">{place}</p>
      {note && (
        <Badge variant="cautionary" className="mt-1 self-start">
          {note}
        </Badge>
      )}
    </div>
  );
}
