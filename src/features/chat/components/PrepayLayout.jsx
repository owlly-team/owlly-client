import Button from "../../../shared/components/Button";

export default function PrepayLayout({ notice, actionLabel, onNext, children }) {
  return <div className="flex flex-1 flex-col">
    <div className="mt-2 flex justify-center">
      <p className="rounded-full bg-fill-alternative px-3 py-1.5 text-center text-caption1 text-label-alternative">
        {notice}
      </p>
    </div>
    {children}
    <div className="sticky bottom-0 mt-auto bg-background-normal pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Button className="w-full" onClick={onNext}>{actionLabel}</Button>
    </div>
  </div>;
}
