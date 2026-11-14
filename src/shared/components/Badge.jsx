import iconPositive from "../../assets/icons/badge-positive.svg";
import iconCautionary from "../../assets/icons/badge-cautionary.svg";
import iconCyan from "../../assets/icons/badge-cyan.svg";

const VARIANT_CLASSES = {
  positive: "bg-status-positive-surface text-label-normal",
  cautionary: "bg-status-cautionary-surface text-label-normal",
  accent: "bg-accent-cyan-surface text-label-normal",
  primary: "bg-primary-tint text-primary-normal",
  neutral: "bg-fill-normal text-label-neutral",
};

const VARIANT_ICON = {
  positive: iconPositive,
  cautionary: iconCautionary,
  accent: iconCyan,
};

export default function Badge({ variant = "neutral", icon, children, className = "" }) {
  const resolvedIcon = icon ?? VARIANT_ICON[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-8 px-1.5 py-1 text-caption1 font-medium tracking-wide ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {resolvedIcon && <img src={resolvedIcon} alt="" className="size-3.5" />}
      {children}
    </span>
  );
}
