import iconPerson from "../../assets/icons/info-positive.svg";
import iconPositive from "../../assets/icons/received-check.svg";
import iconCyan from "../../assets/icons/info-cyan.svg";
import iconNegative from "../../assets/icons/info-negative.svg";

const VARIANT_CLASSES = {
  normal: "bg-fill-normal",
  positive: "bg-status-positive-surface",
  accent: "bg-accent-cyan-surface",
  negative: "bg-status-negative-surface",
};

const VARIANT_ICON = {
  normal: iconPerson,
  positive: iconPositive,
  accent: iconCyan,
  negative: iconNegative,
};

export default function InfoBox({ variant = "accent", title, description, className = "" }) {
  return (
    <div
      className={`flex w-full items-start gap-2 rounded-12 p-3 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      <img src={VARIANT_ICON[variant]} alt="" className="mt-px size-5 shrink-0" />
      <div className="flex flex-col">
        <p className="text-body2 font-semibold tracking-wide text-label-normal">{title}</p>
        {description && (
          <p className="text-label1 tracking-wide text-label-neutral">{description}</p>
        )}
      </div>
    </div>
  );
}
