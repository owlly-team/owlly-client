import Button from "../../../shared/components/Button";

function AmountRow({ title, subtitle, copyLabel, onCopy, accentCopy = false }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <p className="text-body1 font-bold text-label-normal">{title}</p>
        <p className="text-caption1 text-label-alternative">{subtitle}</p>
      </div>
      <Button
        variant="chip"
        size="sm"
        onClick={onCopy}
        className={accentCopy ? "text-primary-normal" : "text-label-normal"}
      >
        {copyLabel}
      </Button>
    </div>
  );
}

export default function AccountCard({ notice, amount, amountNote, account, accountNote, onCopyAmount, onCopyAccount, className = "" }) {
  return (
    <div className={`flex w-full flex-col gap-2.5 rounded-16 bg-primary-tint p-4 ${className}`}>
      <p className="text-label2 font-semibold text-label-alternative">{notice}</p>
      <AmountRow title={amount} subtitle={amountNote} copyLabel="금액 복사" onCopy={onCopyAmount} />
      <AmountRow title={account} subtitle={accountNote} copyLabel="계좌 복사" onCopy={onCopyAccount} accentCopy />
    </div>
  );
}
