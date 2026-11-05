const VARIANT_CLASSES = {
  primary: "bg-primary-normal text-static-white",
  secondary: "bg-fill-normal text-label-neutral",
  danger: "bg-status-negative-surface-strong text-status-negative",
  text: "bg-transparent text-primary-normal",
  chip: "bg-background-normal shadow-[inset_0_0_0_1px_var(--color-fill-alternative)]",
};

const SIZE_CLASSES = {
  md: "h-12 px-5 rounded-14 text-body2 font-semibold",
  sm: "h-8 px-3 rounded-10 text-caption1 font-semibold",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center whitespace-nowrap transition-opacity active:opacity-70 disabled:opacity-40 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
