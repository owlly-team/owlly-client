import { useLocation, useNavigate } from "react-router-dom";
import Badge from "../../../shared/components/Badge";
import TopBar from "../../../shared/components/TopBar";
import RouteSteps from "../components/RouteSteps";
import iconStepWalk from "../../../assets/icons/step-walk.svg";
import iconStepBus from "../../../assets/icons/step-bus.svg";
import iconStepFlag from "../../../assets/icons/step-flag.svg";
import Button from "../../../shared/components/Button";
import useLastTrain from "../hooks/useLastTrain";
import { toLastTrainView } from "../utils/lastTrainView";
import { defaultHomeData } from "../mocks/homeMockData";

const ICONS = { walk: iconStepWalk, transit: iconStepBus, home: iconStepFlag };

export default function LastTrain() {
  const navigate = useNavigate();
  const { state, search } = useLocation();
  const isPreview =
    import.meta.env.DEV &&
    state?.isPreview !== false &&
    (state?.isPreview === true ||
      new URLSearchParams(search).get("preview") === "train");
  const live = useLastTrain(state, isPreview);
  const data = isPreview
    ? (state?.travelContext ?? defaultHomeData)
    : live.data;
  const view = toLastTrainView(data);
  const goHome = () => navigate("/");
  const canShow = Boolean(data) && !live.error;
  function openPickup() {
    navigate("/pickup", {
      state: {
        isPreview,
        pickupPoint: data?.pickupPoint,
        universityId: data?.pickupPoint?.universityId,
        universityName: data?.pickupPoint?.universityName,
        defaultDestination: data?.travelOptions?.destinationDongId
          ? {
              id: data.travelOptions.destinationDongId,
              name: data.travelOptions.destinationDongName,
              districtId: data.travelOptions.districtId,
              districtName: data.travelOptions.districtName,
              point: data.dropoff ?? data.profile?.defaultDropoff,
            }
          : null,
        sameGenderDefault:
          data?.sameGenderDefault ?? data?.profile?.sameGenderDefault,
      },
    });
  }
  return (
    <div className="flex flex-1 flex-col">
      <div className="-mx-4">
        <TopBar title="막차 경로" onLeftClick={goHome} />
      </div>
      {isPreview && (
        <p className="text-caption1 text-primary-normal">
          미리보기 · 예시 데이터
        </p>
      )}
      {live.loading && (
        <p role="status" className="py-4">
          막차 경로를 불러오고 있어요.
        </p>
      )}
      {!isPreview && !live.loading && !live.allowed && (
        <div className="flex flex-col gap-3 py-4">
          <p role="status">로그인한 학생 계정으로 막차 경로를 확인해 주세요.</p>
          <Button onClick={() => navigate("/onboarding")}>로그인하기</Button>
        </div>
      )}
      {!isPreview && live.error && (
        <div role="alert" className="flex flex-col gap-3 py-4">
          <p>{live.error.message}</p>
          <Button variant="secondary" onClick={live.retry}>
            다시 불러오기
          </Button>
        </div>
      )}
      {canShow && (
        <div className="flex flex-1 flex-col gap-2 pt-2">
          <p className="text-caption1 text-label-alternative font-semibold">
            {view.origin} → {view.destination}
          </p>
          {view.available ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="text-title3 text-label-strong font-bold">
                  {view.durationLabel}
                </p>
                <div className="shrink-0 text-right">
                  <p className="text-headline2 text-label-strong font-bold">
                    {view.fareLabel}
                  </p>
                  <p className="text-caption2 text-label-alternative font-medium">
                    1인 · 교통카드
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {view.deadlineLabel && (
                  <Badge variant="cautionary">{view.deadlineLabel}</Badge>
                )}
                {view.transferLabel && (
                  <Badge variant="neutral">{view.transferLabel}</Badge>
                )}
              </div>
              <div className="mt-4">
                <RouteSteps
                  steps={view.steps.map((step) => ({
                    ...step,
                    icon: ICONS[step.type],
                  }))}
                />
              </div>
            </>
          ) : (
            <p role="status" className="text-heading2 py-4 font-bold">
              현재 안내할 수 있는 막차 경로가 없어요.
            </p>
          )}
          {view.sourceLabel && (
            <p className="text-caption2 text-label-alternative mt-4">
              {view.sourceLabel}
            </p>
          )}
          {view.warnings.map((warning, index) => (
            <p
              key={`${index}-${warning}`}
              className="text-caption2 text-label-alternative"
            >
              {warning}
            </p>
          ))}
        </div>
      )}
      {canShow && (
        <div className="bg-background-normal sticky bottom-0 mt-auto flex w-full shrink-0 flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {live.actionError && (
            <p role="alert" className="text-label2 text-status-negative">
              {live.actionError}
            </p>
          )}
          {!isPreview && live.expired && (
            <p role="status" className="text-label2 text-label-neutral">
              막차 출발 마감 시간이 지났어요. 다른 귀가 방법을 확인해 주세요.
            </p>
          )}
          <Button
            className="w-full"
            disabled={
              isPreview ? !view.available : !live.canChoose || !view.available
            }
            aria-busy={live.saving}
            onClick={
              isPreview
                ? () =>
                    navigate("/", {
                      replace: true,
                      state: { selectedTransport: "transit", isPreview: true },
                    })
                : live.choose
            }
          >
            {live.saving ? "막차 선택 기록 중" : "막차로 갈게요"}
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
      )}
    </div>
  );
}
