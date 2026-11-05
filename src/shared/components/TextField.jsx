export default function TextField({
  label,
  helperText,
  trailing,
  align = "left",
  inputClassName = "",
  className = "",
  ...props
}) {
  return (
    <label className={`flex w-full flex-col gap-2 ${className}`}>
      {label && (
        <span className="text-label2 font-semibold text-label-neutral">{label}</span>
      )}
      <div className="flex items-center gap-2">
        <input
          className={`h-12 flex-1 rounded-12 px-3 text-body1 text-label-normal shadow-[inset_0_0_0_1px_var(--color-line-normal)] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-primary-normal)] ${align === "right" ? "text-right" : ""} ${inputClassName}`}
          {...props}
        />
        {trailing}
      </div>
      {helperText && (
        <span className="text-caption1 text-label-alternative">{helperText}</span>
      )}
    </label>
  );
}
