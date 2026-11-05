const COLUMNS = ["내린 순서", "확정 금액", "받은 금액", "돌려줄 금액"];

/**
 * rows: { name, note, confirmed, received, refund }[]
 */
export default function SettleTable({ rows, className = "" }) {
  return (
    <div className={`flex w-full flex-col gap-2 rounded-16 bg-background-normal p-4 ${className}`}>
      <div className="grid grid-cols-[110px_62px_62px_74px] text-caption2 text-label-alternative">
        <span>{COLUMNS[0]}</span>
        <span className="text-right">{COLUMNS[1]}</span>
        <span className="text-right">{COLUMNS[2]}</span>
        <span className="text-right">{COLUMNS[3]}</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.name}
          className="grid grid-cols-[110px_62px_62px_74px] items-center border-t border-fill-normal pt-2"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-label1 font-semibold text-label-normal">{row.name}</span>
            <span className="text-caption1 text-label-alternative">{row.note}</span>
          </div>
          <span className="text-right text-label1 text-label-normal">{row.confirmed}</span>
          <span className="text-right text-label1 text-label-normal">{row.received}</span>
          <span className="text-right text-label1 text-label-normal">{row.refund}</span>
        </div>
      ))}
    </div>
  );
}
