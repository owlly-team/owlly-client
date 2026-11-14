import Button from "../../../shared/components/Button";

export default function PrepayLayout({
  notice,
  actionLabel,
  onNext,
  disabled = false,
  saving = false,
  children,
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-2 flex justify-center">
        <p className="bg-fill-alternative text-caption1 text-label-alternative rounded-full px-3 py-1.5 text-center">
          {notice}
        </p>
      </div>
      {children}
      <div className="bg-background-normal sticky bottom-0 mt-auto pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Button
          className="w-full"
          disabled={!onNext || disabled || saving}
          aria-busy={saving}
          onClick={onNext}
        >
          {saving ? "처리 중" : actionLabel}
        </Button>
      </div>
    </div>
  );
}
