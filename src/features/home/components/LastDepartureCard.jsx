import Badge from "../../../shared/components/Badge";

//집까지 마지막 출발
export default function LastDepartureCard({
  status = "available",
  time,
  place,
  note,
  className = "",
}) {
  return (
    <div
      className={`rounded-12 bg-background-normal flex w-full flex-col gap-1 ${className}`}
    >
      <p className="text-label1 text-label-neutral font-semibold">
        집까지 마지막 출발
      </p>
      {status === "ended" ? (
        <>
          <p className="text-heading2 text-label-strong font-bold">
            오늘 막차가 끊겼어요
          </p>
          <p className="text-label1 text-label-neutral">
            동승이나 혼자 택시로 갈 수 있어요
          </p>
        </>
      ) : status === "available" ? (
        <>
          <p className="text-display2 text-label-strong font-bold tracking-tight">
            {time}
          </p>
          <p className="text-label1 text-label-neutral">{place}</p>
          {note && (
            <Badge variant="cautionary" className="mt-1 self-start">
              {note}
            </Badge>
          )}
        </>
      ) : null}
    </div>
  );
}
