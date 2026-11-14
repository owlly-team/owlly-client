/**
 * Variant colors are resolved via inline style, not utility classes.
 * Two classes that set the same CSS property (e.g. a variant's bg-primary-normal
 * vs. a caller's bg-[#3a3a3c] override) race on Tailwind's generated stylesheet
 * order, not on source/JSX order — so className overrides can silently lose.
 * Inline style has no such ambiguity: a caller's `style` prop always wins.
 */
const VARIANT_STYLE = {
  primary: {
    backgroundColor: "var(--color-primary-normal)",
    color: "var(--color-static-white)",
  },
  secondary: {
    backgroundColor: "var(--color-fill-normal)",
    color: "var(--color-label-neutral)",
  },
  danger: {
    backgroundColor: "var(--color-status-negative-surface-strong)",
    color: "var(--color-status-negative)",
  },
  text: {
    backgroundColor: "transparent",
    color: "var(--color-primary-normal)",
  },
  chip: {
    backgroundColor: "var(--color-background-normal)",
  },
};

const VARIANT_CLASSES = {
  chip: "shadow-[inset_0_0_0_1px_var(--color-fill-alternative)]",
};

const SIZE_CLASSES = {
  md: "h-12 px-5 rounded-14 text-body2 font-semibold",
  sm: "h-8 px-3 rounded-10 text-caption1 font-semibold",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  style,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center whitespace-nowrap transition-opacity active:opacity-70 disabled:opacity-40 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant] ?? ""} ${className}`}
      style={{ ...VARIANT_STYLE[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
