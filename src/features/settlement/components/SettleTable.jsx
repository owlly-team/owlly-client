const COLUMNS = ["내린 순서", "확정 금액", "받은 금액", "차액"];

/**
 * rows: { name, note, confirmed, received, refund }[]
 */
export default function SettleTable({
  rows,
  className = "",
  receivedLabel = COLUMNS[2],
}) {
  return (
    <div
      className={`rounded-16 bg-background-normal flex w-full flex-col gap-2 p-4 ${className}`}
    >
      <div className="text-caption2 text-label-alternative grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] gap-1">
        <span>{COLUMNS[0]}</span>
        <span className="text-right">{COLUMNS[1]}</span>
        <span className="text-right">{receivedLabel}</span>
        <span className="text-right">{COLUMNS[3]}</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.memberId ?? row.name}
          className="border-fill-normal grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] items-center gap-1 border-t pt-2"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-label1 text-label-normal font-semibold">
              {row.name}
            </span>
            <span className="text-caption1 text-label-alternative">
              {row.note}
            </span>
          </div>
          <span className="text-caption1 text-label-normal text-right font-semibold">
            {row.confirmed}
          </span>
          <span className="text-caption1 text-label-alternative text-right">
            {row.received}
          </span>
          <span
            className={`text-caption1 text-right font-semibold ${row.isAdditionalPayment ? "text-status-negative" : "text-primary-normal"}`}
          >
            {row.refund}
          </span>
        </div>
      ))}
    </div>
  );
}
