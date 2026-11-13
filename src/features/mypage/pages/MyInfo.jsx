import { useState } from "react";
import useBottomTabNavigation from "../../../shared/hooks/useBottomTabNavigation";
import Badge from "../../../shared/components/Badge";
import Switch from "../../../shared/components/Switch";
import BottomTabBar from "../../../shared/components/BottomTabBar";
import InfoRow from "../components/InfoRow";
import iconSchoolCheck from "../../../assets/icons/school-check.svg";
import iconLocation from "../../../assets/icons/location.svg";
import iconNotificationClock from "../../../assets/icons/notification-clock.svg";

const defaultProfile = {
  name: "한서윤",
  school: "단국대",
  gender: "여성",
  dropoff: "영통2동",
};

export default function MyInfo({ data = defaultProfile }) {
  const { activeTab, handleTabChange } = useBottomTabNavigation();
  const [sameGenderOnly, setSameGenderOnly] = useState(true);
  const [locationAllowed, setLocationAllowed] = useState(true);
  const [notificationAllowed, setNotificationAllowed] = useState(true);

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div className="flex flex-col gap-5 pt-3">
        <h1 className="text-title3 font-bold tracking-tight text-label-normal">
          내 정보
        </h1>

        <div className="flex items-center gap-3">
          <span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-fill-normal text-heading2 font-bold text-label-alternative">
            {data.name[0]}
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-headline2 font-semibold text-label-normal">
              {data.name}
            </p>
            <Badge variant="neutral" icon={iconSchoolCheck}>
              {data.school} 인증
            </Badge>
          </div>
        </div>

        <div className="flex flex-col">
          <InfoRow title="성별" value={`${data.gender} · 바꿀 수 없어요`} />
          <div className="flex items-center justify-between gap-3 border-b border-fill-alternative py-3.5">
            <div className="flex flex-col gap-0.5">
              <p className="text-body1 font-semibold text-label-normal">
                동성끼리만 매칭
              </p>
              <p className="text-caption1 text-label-alternative">
                동승 등록할 때 기본값
              </p>
            </div>
            <Switch checked={sameGenderOnly} onChange={setSameGenderOnly} />
          </div>
          <InfoRow title="집 근처 하차 지점" value={data.dropoff} chevron />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-label2 font-semibold text-label-alternative">
            앱 권한
          </p>
          <InfoRow
            icon={iconLocation}
            title="위치"
            subtitle="막차 시각 · 가까운 거점 찾기"
            value={locationAllowed ? "허용" : "허용 안 함"}
            chevron
            onClick={() => setLocationAllowed((value) => !value)}
          />
          <InfoRow
            icon={iconNotificationClock}
            title="알림"
            subtitle="매칭 결과 · 집결 10분 전 · 택시 호출 · 정산 결과"
            value={notificationAllowed ? "허용" : "허용 안 함"}
            chevron
            onClick={() => setNotificationAllowed((value) => !value)}
          />
          <p className="pt-2 text-caption1 text-label-alternative">
            누르면 휴대폰 설정으로 이동해요. 모두 선택 권한이에요.
          </p>
        </div>
      </div>

      <div className="-mx-4 pt-4">
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
}
