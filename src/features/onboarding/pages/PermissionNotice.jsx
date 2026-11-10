import { useNavigate } from "react-router-dom";
import Button from "../../../shared/components/Button";
import PermissionRow from "../components/PermissionRow";
import iconLocation from "../../../assets/icons/location.svg";
import iconNotificationClock from "../../../assets/icons/notification-clock.svg";

export default function PermissionNotice() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div className="flex flex-col gap-5 pt-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-title3 font-bold tracking-tight text-label-normal">
            아울리를 쓰려면
            <br />이 권한이 필요해요
          </h1>
          <p className="text-body2 text-label-neutral">
            모두 선택 권한이에요. 허용하지 않아도 서비스를 쓸 수 있어요.
          </p>
        </div>

        <div className="flex flex-col divide-y divide-fill-normal">
          <PermissionRow
            icon={iconLocation}
            title="위치"
            status="선택"
            description="집까지 마지막 출발 시각을 계산하고, 가장 가까운 출발 거점을 찾을 때 써요. 위치는 저장하지 않아요."
            note="허용하지 않으면 출발지를 직접 골라요."
          />
          <PermissionRow
            icon={iconNotificationClock}
            title="알림"
            status="선택"
            description="매칭 결과, 집결 10분 전, 택시 호출, 정산 결과를 알려 드려요."
            note="허용하지 않으면 앱을 열어 직접 확인해야 해요."
          />
        </div>

        <p className="text-caption1 text-label-alternative">
          권한은 휴대폰 설정에서 언제든 바꿀 수 있어요.
        </p>
      </div>

      <div className="pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <Button
          size="md"
          variant="primary"
          className="w-full"
          style={{ backgroundColor: "#3a3a3c" }}
          onClick={() => navigate("/onboarding/profile")}
        >
          확인했어요
        </Button>
      </div>
    </div>
  );
}
