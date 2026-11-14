import { useLocation, useNavigate } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import Button from "../../../shared/components/Button";
import Badge from "../../../shared/components/Badge";
import InfoBox from "../../../shared/components/InfoBox";
import RouteSteps from "./RouteSteps";
import useTravelChoice from "../hooks/useTravelChoice";
import { toSoloTaxiView } from "../utils/soloTaxiView";
import iconWalk from "../../../assets/icons/step-walk.svg";
import iconTaxi from "../../../assets/icons/transport-taxi.svg";
import iconHome from "../../../assets/icons/nav-home.svg";

const ICONS = { pickup: iconWalk, taxi: iconTaxi, home: iconHome };

export default function SoloTaxiDetails() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const live = useTravelChoice(state, false, "SOLO");
  const data = live.data;
  const view = toSoloTaxiView(data);
  const canShow = Boolean(data) && !live.error;
  const goHome = () => navigate("/home");
  const openPickup = () =>
    navigate("/pickup", {
      state: {
        isPreview: false,
        pickupPoint: data.pickupPoint,
        universityId: data.pickupPoint.universityId,
        universityName: data.pickupPoint.universityName,
        defaultDestination: {
          id: data.travelOptions.destinationDongId,
          name: data.travelOptions.destinationDongName,
          districtId: data.travelOptions.districtId,
          districtName: data.travelOptions.districtName,
          point: data.dropoff,
        },
        sameGenderDefault: data.sameGenderDefault,
      },
    });
  return (
    <div className="flex flex-1 flex-col">
      <div className="-mx-4">
        <TopBar title="혼자 택시" onLeftClick={goHome} />
      </div>
      {live.loading && (
        <p role="status" className="py-4">
          택시 정보를 불러오고 있어요.
        </p>
      )}
      {!live.loading && !live.allowed && (
        <div className="flex flex-col gap-3 py-4">
          <p role="status">로그인한 학생 계정으로 택시 정보를 확인해 주세요.</p>
          <Button onClick={() => navigate("/onboarding")}>로그인하기</Button>
        </div>
      )}
      {live.error && (
        <div role="alert" className="flex flex-col gap-3 py-4">
          <p>{live.error.message}</p>
          <Button variant="secondary" onClick={live.retry}>
            다시 불러오기
          </Button>
        </div>
      )}
      {canShow && (
        <>
          <div className="flex flex-1 flex-col gap-2 pt-2">
            <p className="text-caption1 text-label-alternative font-semibold">
              {view.origin} → {view.destination}
            </p>
            <div className="flex items-center justify-between gap-4">
              <p className="text-title3 text-label-strong font-bold">
                {view.durationLabel}
              </p>
              <div className="shrink-0 text-right">
                <p className="text-headline2 text-label-strong font-bold">
                  {view.fareLabel}
                </p>
                <p className="text-caption2 text-label-alternative font-medium">
                  1인 · 예상 요금
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">지금 출발</Badge>
              {view.distanceLabel && (
                <Badge variant="neutral">{view.distanceLabel}</Badge>
              )}
            </div>
            <div className="mt-4">
              <RouteSteps
                steps={view.steps.map((step) => ({
                  ...step,
                  icon: ICONS[step.kind],
                  iconClassName:
                    step.kind === "home" ? "brightness-0 invert" : undefined,
                }))}
              />
            </div>
            <div className="mt-4">
              <InfoBox
                variant="normal"
                title={view.poolTitle}
                description={view.poolDescription}
              />
            </div>
            <p className="text-caption2 text-label-alternative mt-4">
              예상 요금과 도착 시각은 추정값이에요. 택시는 쓰시는 택시 앱으로
              불러 주세요.
            </p>
            {view.warnings.map((warning, index) => (
              <p
                key={`${index}-${warning}`}
                className="text-caption2 text-label-alternative"
              >
                {warning}
              </p>
            ))}
          </div>
          <div className="bg-background-normal sticky bottom-0 mt-auto flex flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {live.actionError && (
              <p role="alert" className="text-label2 text-status-negative">
                {live.actionError}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!live.canChoose}
              aria-busy={live.saving}
              onClick={live.choose}
            >
              {live.saving ? "선택 기록 중" : "혼자 택시로 갈게요"}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={live.saving}
              onClick={openPickup}
            >
              동승도 알아볼래요
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
