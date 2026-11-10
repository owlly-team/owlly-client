import { formatTime } from "../../home/utils/homeUtils";
import iconTaxi from "../../../assets/icons/taxi-call.svg";

export default function MeetingInfoCard({ room, view }) {
  return <section aria-label="집결 정보" className="rounded-16 border border-line-alternative p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-headline2 font-semibold">
          {room.meetingNote} · {formatTime(room.departureAt)}
        </h1>
        <p className="mt-0.5 text-label2 text-label-neutral">
          {view.timingLabel}{view.memberCount && ` · ${view.memberCount}명`}
        </p>
      </div>
      {view.verificationCode && <div className="shrink-0 text-right">
      <div>
        <h2 className="text-caption2 text-label-alternative">확인 코드</h2>
        <p aria-label={`확인 코드 ${view.verificationCode}`} className="text-title2 font-bold text-primary-normal">
          {view.verificationCode}
        </p>
      </div>
      </div>}
    </div>
    <p className="mt-3 flex items-center gap-2 border-t border-line-alternative pt-2 text-caption1 text-label-neutral">
      <img src={iconTaxi} alt="" className="size-4 shrink-0" />
      {view.closed ? "채팅방이 닫혔어요. 메시지를 보낼 수 없어요." : `대표${view.representativeName ? ` ${view.representativeName}님이` : "가"} 택시 앱으로 불러요`}
    </p>
  </section>;
}
