import Button from "../../../shared/components/Button";

export default function PaymentReceiptCard({ title, description, reattachLabel = "다시 첨부", onReattach, onOpen, className = "" }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen?.(event);
      }}
      className={`flex w-full items-center gap-3 rounded-16 bg-background-normal p-3 text-left ${className}`}
    >
      <div className="flex h-16 w-12 shrink-0 flex-col gap-1 rounded-8 bg-fill-normal p-1.5">
        <span className="h-1 w-full rounded-full bg-fill-strong" />
        <span className="h-2 w-3/4 rounded-full bg-label-normal" />
        <span className="mt-auto h-1 w-full rounded-full bg-fill-strong" />
        <span className="h-1 w-full rounded-full bg-fill-strong" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-col gap-0.5">
          <p className="text-label1 font-semibold text-label-normal">{title}</p>
          <p className="text-caption1 text-label-alternative">{description}</p>
        </div>
        <Button
          variant="chip"
          size="sm"
          className="self-start text-label-normal"
          onClick={(event) => {
            event.stopPropagation();
            onReattach?.();
          }}
        >
          {reattachLabel}
        </Button>
      </div>
    </div>
  );
}
