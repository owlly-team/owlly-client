import Badge from "../ui/Badge";

export default function MemberRow({ order, name, school, gender, note, className = "" }) {
  return (
    <div className={`flex w-full items-center gap-3 rounded-16 bg-background-normal p-4 ${className}`}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill-normal text-label2 font-semibold text-label-alternative">
        {order}
      </span>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-body1 font-semibold text-label-normal">{name}</span>
          {school && <Badge variant="positive">{school}</Badge>}
          {gender && <Badge variant="neutral">{gender}</Badge>}
        </div>
        <p className="text-label2 text-label-alternative">{note}</p>
      </div>
    </div>
  );
}
