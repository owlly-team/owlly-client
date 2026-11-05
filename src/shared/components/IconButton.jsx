export default function IconButton({ src, alt = "", className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-12 transition-colors active:bg-fill-normal ${className}`}
      {...props}
    >
      <img src={src} alt={alt} className="size-5" />
    </button>
  );
}
