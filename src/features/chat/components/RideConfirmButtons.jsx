import iconCheck from "../../../assets/icons/check-circle.svg";
import Button from "../../../shared/components/Button";

export default function RideConfirmButtons({ onBoarded, onMissed, className = "" }) {
  return (
    <div className={`grid w-full grid-cols-2 gap-2 ${className}`}>
      <Button variant="primary" onClick={onBoarded} className="gap-1.5">
        <img src={iconCheck} alt="" className="size-5" />
        탔어요
      </Button>
      <Button variant="secondary" onClick={onMissed}>
        못 탔어요
      </Button>
    </div>
  );
}
