export default function PageSkeleton({
  label = "화면을 불러오고 있어요.",
  className = "",
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`flex w-full flex-1 flex-col gap-4 py-6 ${className}`}
    >
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className="flex flex-col gap-4 motion-safe:animate-pulse"
      >
        <div className="bg-fill-normal rounded-8 h-6 w-2/3" />
        {[0, 1, 2].map((id) => (
          <div
            key={id}
            className="bg-fill-alternative rounded-16 flex flex-col gap-3 p-4"
          >
            <div className="bg-fill-normal rounded-8 h-4 w-1/2" />
            <div className="bg-fill-normal rounded-8 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
