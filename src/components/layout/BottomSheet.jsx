export default function BottomSheet({ children, className = "" }) {
  return (
    <div
      className={`flex w-full flex-col items-center gap-3.5 rounded-t-24 bg-background-normal px-4 pt-2.5 pb-[30px] shadow-large ${className}`}
    >
      <span className="h-1 w-10 shrink-0 rounded-full bg-fill-strong" />
      {children}
    </div>
  );
}
