import Button from "../ui/Button";
import Badge from "../ui/Badge";

export default function TransferRow({ name, account, amount, received = false, onCopy, className = "" }) {
  return (
    <div className={`flex w-full flex-col gap-2.5 rounded-16 bg-background-normal p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-body2 font-semibold text-label-normal">{name}</p>
          <p className="text-caption1 text-label-alternative">{account}</p>
        </div>
        <span className="text-headline2 font-bold text-label-normal">{amount}</span>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="chip" size="sm" onClick={onCopy} className="text-label-normal">
          계좌 복사
        </Button>
        {received && <Badge variant="positive">받았어요</Badge>}
      </div>
    </div>
  );
}
