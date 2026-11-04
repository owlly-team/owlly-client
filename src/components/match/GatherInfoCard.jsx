import iconTaxiCall from "../../assets/icons/taxi-call.svg";

export default function GatherInfoCard({ place, note, code, caller, className = "" }) {
  return (
    <div className={`flex w-full flex-col gap-2 rounded-16 bg-background-normal p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-headline2 font-semibold text-label-normal">{place}</p>
          <p className="text-label2 text-label-alternative">{note}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-caption2 text-label-alternative">확인 코드</span>
          <span className="text-title2 font-bold tracking-widest text-primary-normal">{code}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t border-fill-normal pt-2">
        <img src={iconTaxiCall} alt="" className="size-4" />
        <p className="text-label2 text-label-alternative">{caller}</p>
      </div>
    </div>
  );
}
