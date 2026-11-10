import PersonIcon from "../../../assets/icons/nav-profile.svg?react";

export default function ReportTargetCard({ member, selected, onSelect, disabled }) {
  const description = [member.universityName, member.destinationDongName, member.isRepresentative ? "대표" : null].filter(Boolean).join(" · ");
  return <label className={`flex cursor-pointer items-center gap-3 rounded-12 border px-4 py-2 ${selected ? "border-primary-normal bg-primary-tint" : "border-line-alternative bg-background-normal"}`}>
    <input type="radio" name="report-target" value={member.memberId} checked={selected} onChange={onSelect} disabled={disabled} className="peer sr-only" />
    <PersonIcon aria-hidden="true" className={`size-5 shrink-0 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 ${selected ? "text-primary-normal" : "text-label-neutral"}`} />
    <span className="min-w-0 flex-1">
      <span className="block text-body2 font-semibold">{member.maskedName}</span>
      {description && <span className="mt-0.5 block text-label2 text-label-neutral">{description}</span>}
    </span>
    {selected && <span aria-hidden="true" className="text-body1 text-primary-normal">✓</span>}
  </label>;
}
