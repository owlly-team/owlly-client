import { useNavigate } from "react-router-dom";
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

export default function MatchingFailure({ data = matchingFailureMock }) {
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
              onClick={() => navigate("/start-time", { state: selection })}
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
              onClick={() => navigate("/solo-taxi")}
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
