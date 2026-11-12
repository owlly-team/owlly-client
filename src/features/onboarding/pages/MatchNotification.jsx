import PushNotificationCard from "../../notification/components/PushNotificationCard";

const defaultNotification = {
  date: "11월 6일 금요일",
  time: "22:44",
  title: "같은 학교 3명과 매칭됐어요",
  body: "23:30 단국대 정문 출발 · 예상 1인 7,900원. 22:49 전에 확정하거나 막차를 타세요.",
};

/**
 * C-04 알림 · 매칭 결과 — 실제 앱 화면이 아니라, 매칭 결과가 왔을 때
 * 잠금화면에 뜨는 푸시 알림 모습을 보여주는 참고용 목업이에요.
 */
export default function MatchNotification({ data = defaultNotification }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 pt-10">
      <p className="text-headline2 font-semibold text-label-alternative">
        {data.date}
      </p>
      <p className="text-[80px] leading-[88px] font-semibold tracking-[-2.4px] text-label-normal">
        {data.time}
      </p>
      <div className="w-full pt-9">
        <PushNotificationCard title={data.title} body={data.body} />
      </div>
    </div>
  );
}
