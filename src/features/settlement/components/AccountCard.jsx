import Button from "../../../shared/components/Button";

function AmountRow({
  title,
  subtitle,
  copyLabel,
  onCopy,
  accentCopy = false,
  titleClassName = "text-label-normal",
  copyDisabled = false,
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className={`text-body1 font-bold break-all ${titleClassName}`}>
          {title}
        </p>
        <p className="text-caption1 text-label-alternative">{subtitle}</p>
      </div>
      <Button
        variant="chip"
        size="sm"
        onClick={onCopy}
        disabled={copyDisabled}
        className={`shrink-0 ${accentCopy ? "text-primary-normal" : "text-label-normal"}`}
      >
        {copyLabel}
      </Button>
    </div>
  );
}

export default function AccountCard({
  notice,
  amount,
  amountNote,
  account,
  accountNote,
  onCopyAmount,
  onCopyAccount,
  className = "",
  amountClassName,
  amountCopyLabel = "금액 복사",
  accountCopyLabel = "계좌 복사",
  accountCopyDisabled = false,
}) {
  return (
    <div
      className={`rounded-16 bg-primary-tint flex w-full flex-col gap-2.5 p-4 ${className}`}
    >
      <p className="text-label2 text-label-alternative font-semibold">
        {notice}
      </p>
      <AmountRow
        title={amount}
        subtitle={amountNote}
        copyLabel={amountCopyLabel}
        onCopy={onCopyAmount}
        titleClassName={amountClassName}
      />
      <AmountRow
        title={account}
        subtitle={accountNote}
        copyLabel={accountCopyLabel}
        onCopy={onCopyAccount}
        copyDisabled={accountCopyDisabled}
        accentCopy
      />
    </div>
  );
}
