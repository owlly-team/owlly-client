import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../../shared/components/Button";
import InfoBox from "../../../shared/components/InfoBox";
import TopBar from "../../../shared/components/TopBar";
import CarpoolIcon from "../../../assets/icons/transport-carpool.svg?react";
import iconTaxi from "../../../assets/icons/transport-taxi.svg";
import StatBars from "../../../assets/icons/stat-bars.svg?react";
import LastDepartureCard from "../components/LastDepartureCard";
import TransportOptionCard from "../components/TransportOptionCard";
import { matchingFailureMock } from "../mocks/matchingFailureMock";
import { formatTime, formatWon, toHomeViewData } from "../utils/homeUtils";
import useFailureRoute from "../hooks/useFailureRoute";
import FailureStatus from "../components/FailureStatus";
import { applySlotDeadlines } from "../../../shared/utils/time";

export default function MatchingFailure({ data }) {
  const { search } = useLocation();
  const preview =
    import.meta.env.DEV &&
    (data?.isPreview === true ||
      new URLSearchParams(search).get("preview") === "failed");
  return preview ? (
    <PreviewMatchingFailure data={data ?? matchingFailureMock} />
  ) : (
    <LiveMatchingFailure />
  );
}

function LiveMatchingFailure() {
  const failure = useFailureRoute();
  if (failure.loading || failure.error || !failure.canChoose)
    return <FailureStatus failure={failure} />;
  const { data } = failure;
  const { rideRequest, pickupPoint, travelOptions } = data;
  const lastTransit = toHomeViewData(data).lastTransit;
  const transitAvailable =
    travelOptions?.transit?.available === true &&
    (!travelOptions.transit.lastLeaveAt ||
      Date.parse(travelOptions.transit.lastLeaveAt) >= failure.now);
  const nextSlot = applySlotDeadlines(
    data.nextSlot ? [data.nextSlot] : [],
    failure.now,
  ).find((slot) => slot.registrationAllowed);
  return (
    <div className="flex flex-1 flex-col">
      <div className="-mx-4">
        <TopBar
          title="매칭 결과"
          leftAction="close"
          onLeftClick={failure.goHome}
        />
      </div>
      <div className="flex flex-col gap-4 pt-1">
        <InfoBox
          variant="negative"
          title="이번엔 매칭되지 않았어요"
          description={`${formatTime(rideRequest.departureAt)} ${pickupPoint.name} → ${rideRequest.destinationDongName ?? "선택한 하차 지점"} 동승이 매칭되지 않았어요.`}
        />
        {transitAvailable ? (
          <>
            <LastDepartureCard
              title="막차는 아직 탈 수 있어요"
              {...lastTransit}
              available
            />
            <Button variant="text" onClick={() => failure.openTransport("BUS")}>
              막차 경로 보기
            </Button>
          </>
        ) : (
          <p className="text-body2 text-label-neutral">
            {data.needsDestinationSelection
              ? "하차 핀을 다시 선택하면 이 위치의 막차와 택시 요금을 확인할 수 있어요."
              : (travelOptions?.transit?.sourceLabel ??
                "현재 막차 정보를 확인할 수 없어요.")}
          </p>
        )}
        {data.warnings?.map((warning) => (
          <p
            key={warning}
            role="status"
            className="text-label2 text-label-neutral"
          >
            {warning}
          </p>
        ))}
      {data.usingDefaultDropoff && <p className="text-caption1 text-label-alternative">교통 정보는 기본 하차 위치 기준 추정값이에요.</p>}
        {travelOptions?.warnings?.map((warning) => (
          <p key={warning} className="text-caption1 text-label-alternative">
            {warning}
          </p>
        ))}
        <TransportOptionCard
          icon={<CarpoolIcon aria-hidden="true" className="size-5" />}
          iconTone="neutral"
          title={
            data.needsDestinationSelection
              ? "하차 위치 다시 선택하기"
              : "다음 시간대로 다시 등록"
          }
          description={
            nextSlot
              ? `${formatTime(nextSlot.departureAt)} 출발 · ${Number.isInteger(nextSlot.waitingCount) ? `${nextSlot.waitingCount}명 대기` : "대기 인원 확인 중"}`
              : "등록 가능한 출발 시간을 다시 확인해 주세요."
          }
          onClick={failure.saving ? undefined : failure.retryRegistration}
        />
        <TransportOptionCard
          icon={iconTaxi}
          iconTone="neutral"
          title="혼자 택시"
          description="택시는 이용하시는 택시 앱에서 호출해 주세요."
          price={formatWon(travelOptions?.soloTaxiEstimatedWon)}
          priceLabel="1인 · 추정"
          onClick={
            failure.saving ? undefined : () => failure.openTransport("SOLO")
          }
        />
        {(data.warnings?.length > 0 || !travelOptions) && (
          <Button variant="text" onClick={failure.retry}>
            교통 정보 다시 확인
          </Button>
        )}
      </div>
      <div className="bg-background-normal sticky bottom-0 mt-auto flex flex-col gap-2 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {failure.actionError && (
          <p role="alert" className="text-label2 text-status-negative">
            {failure.actionError}
          </p>
        )}
        {transitAvailable && (
          <Button
            className="w-full"
            disabled={failure.saving}
            onClick={() => failure.chooseAndClose("BUS")}
          >
            {failure.saving ? "선택 기록 중" : "막차로 갈게요"}
          </Button>
        )}
        <Button
          variant="secondary"
          className="w-full"
          disabled={failure.saving}
          onClick={failure.goHome}
        >
          홈으로
        </Button>
      </div>
    </div>
  );
}

function PreviewMatchingFailure({ data }) {
  const isPreview = data === matchingFailureMock || data.isPreview === true;
  const navigate = useNavigate();
  const { lastTransit, transportDisplay } = toHomeViewData(data);
  const { travelOptions, rideRequest, nextSlot, demand, selection } = data;
  const transitAvailable = travelOptions?.transit?.available === true;
  const taxiAvailable = Number.isFinite(travelOptions?.soloTaxiEstimatedWon);
  const goHome = () => navigate("/");

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="-mx-4">
        <TopBar title="매칭 결과" leftAction="close" onLeftClick={goHome} />
      </div>
      <div className="flex flex-col gap-4 pt-1">
        {isPreview && (
          <p role="status" className="text-caption1 text-primary-normal">
            미리보기 · 예시 매칭 결과
          </p>
        )}
        <InfoBox
          variant="negative"
          title="이번엔 매칭되지 않았어요"
          description={`${formatTime(rideRequest?.departureAt)} ${data.pickupPoint.name} → ${data.presentation.directionLabel}에 같은 조건의 사람이 없었어요.`}
        />

        {transitAvailable ? (
          <LastDepartureCard
            title="막차는 아직 탈 수 있어요"
            {...lastTransit}
          />
        ) : (
          <LastDepartureCard available={false} />
        )}

        <div className="flex flex-col gap-2">
          {nextSlot && (
            <TransportOptionCard
              icon={
                <CarpoolIcon
                  aria-hidden="true"
                  className="text-label-neutral size-5 [&_path]:stroke-current"
                />
              }
              iconTone="neutral"
              title="다음 시간대로 다시 등록"
              description={`${formatTime(nextSlot.departureAt)} 출발 · 지금 ${nextSlot.waitingCount}명 대기`}
              onClick={() =>
                navigate("/start-time", { state: { ...selection, isPreview } })
              }
            />
          )}
          {taxiAvailable && (
            <TransportOptionCard
              icon={iconTaxi}
              iconTone="neutral"
              title="혼자 택시"
              description={transportDisplay.taxi.description}
              price={formatWon(travelOptions.soloTaxiEstimatedWon)}
              priceLabel="1인"
              onClick={() => navigate("/solo-taxi?preview=taxi")}
            />
          )}
        </div>

        {demand && (
          <div className="bg-accent-cyan-surface rounded-12 flex items-start gap-2 p-3">
            <StatBars
              aria-hidden="true"
              className="text-accent-cyan mt-px size-5 shrink-0 [&_path]:stroke-current"
            />
            <div className="min-w-0">
              <p className="text-body2 text-label-normal font-semibold">
                이 구간 AI 추천 심야 수요 {demand.rank}위
              </p>
              <p className="text-label1 text-label-neutral">
                {demand.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {transitAvailable && (
        <div className="bg-background-normal sticky bottom-0 mt-auto w-full pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            className="w-full"
            onClick={() =>
              navigate("/", { state: { selectedTransport: "transit" } })
            }
          >
            막차로 갈게요
          </Button>
        </div>
      )}
    </div>
  );
}
