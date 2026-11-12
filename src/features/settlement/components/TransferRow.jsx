import Button from "../../../shared/components/Button";
import Badge from "../../../shared/components/Badge";

export default function TransferRow({
  name,
  account,
  amount,
  received = false,
  onCopy,
  copyLabel = "계좌 복사",
  className = "",
}) {
  return (
    <div
      className={`rounded-16 bg-background-normal flex w-full flex-col gap-2.5 p-4 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-body2 text-label-normal font-semibold">{name}</p>
          <p className="text-caption1 text-label-alternative">{account}</p>
        </div>
        <span className="text-headline2 text-label-normal shrink-0 font-bold">
          {amount}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <Button
          variant="chip"
          size="sm"
          onClick={onCopy}
          className="text-label-normal"
        >
          {copyLabel}
        </Button>
        {received && <Badge variant="positive">받았어요</Badge>}
      </div>
    </div>
  );
}
