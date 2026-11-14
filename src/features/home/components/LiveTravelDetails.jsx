import TopBar from "../../../shared/components/TopBar";
import Button from "../../../shared/components/Button";
import RouteSteps from "./RouteSteps";
import FailureStatus from "./FailureStatus";
import useFailureRoute from "../hooks/useFailureRoute";
import { formatTime, formatWon } from "../utils/homeUtils";
import iconWalk from "../../../assets/icons/step-walk.svg";
import iconBus from "../../../assets/icons/step-bus.svg";
import iconSubway from "../../../assets/icons/transport-bus.svg";
import iconTaxi from "../../../assets/icons/transport-taxi.svg";
import iconFlag from "../../../assets/icons/step-flag.svg";

export default function LiveTravelDetails({ mode }) {
  const failure = useFailureRoute();
  if (failure.loading || failure.error || !failure.canChoose)
    return <FailureStatus failure={failure} />;
  const data = failure.data;
  const travel = data.travelOptions;
  const transit = travel?.transit;
  const isBus = mode === "BUS";
  const transitAvailable =
    transit?.available === true &&
    (!transit.lastLeaveAt || Date.parse(transit.lastLeaveAt) >= failure.now);
  const minutes = isBus
    ? transit?.totalDurationMin
    : travel?.soloTaxiDurationMin;
  const steps = isBus
    ? (transit?.legs ?? []).map((leg) => ({
        time: formatTime(leg.departureAt),
        type: leg.mode === "WALK" ? "walk" : "transit",
        icon:
          leg.mode === "WALK"
            ? iconWalk
            : leg.mode === "SUBWAY"
              ? iconSubway
              : iconBus,
        title: `${leg.fromName} → ${leg.toName}`,
        description: `${leg.routeName ?? (leg.mode === "WALK" ? "도보" : "대중교통")} · ${formatTime(leg.arrivalAt)} 도착`,
      }))
    : [
        {
          time: formatTime(travel?.asOf),
          type: "transit",
          icon: iconTaxi,
          title: `${data.pickupPoint.name}에서 택시 타기`,
          description: data.pickupPoint.meetingNote,
        },
        {
          time: formatTime(travel?.estimatedArrivalAt),
          type: "home",
          icon: iconFlag,
          title: `${data.rideRequest.destinationDongName ?? "선택한 하차 지점"} 도착`,
          description: Number.isFinite(travel?.soloTaxiDistanceM)
            ? `예상 거리 ${(travel.soloTaxiDistanceM / 1000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}km`
            : "집 근처 하차 지점",
        },
      ];
  return (
    <div className="flex flex-1 flex-col">
      <div className="-mx-4">
        <TopBar
          title={isBus ? "막차 경로" : "혼자 택시"}
          onLeftClick={failure.openFailure}
        />
      </div>
      <div className="flex flex-col gap-4 pt-2">
        <p className="text-label2 text-label-neutral">
          {data.pickupPoint.name} →{" "}
          {data.rideRequest.destinationDongName ?? "선택한 하차 지점"}
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-title3 font-bold">
            {Number.isFinite(minutes) ? `약 ${minutes}분` : "소요 시간 미정"}
          </p>
          <p className="text-headline2 font-bold">
            {formatWon(
              isBus ? transit?.estimatedCostWon : travel?.soloTaxiEstimatedWon,
            )}
          </p>
        </div>
        {isBus && !transitAvailable ? (
          <p role="status">
            {transit?.sourceLabel ?? "현재 막차 경로를 확인할 수 없어요."}
          </p>
        ) : (
          <RouteSteps steps={steps} />
        )}
        {isBus && transitAvailable && transit?.lastLeaveAt && (
          <p className="text-label1">
            {formatTime(transit.lastLeaveAt)}까지 출발해야 해요.
          </p>
        )}
        {data.needsDestinationSelection && (
          <p role="status">
            하차 핀을 다시 선택하면 최신 교통 정보를 확인할 수 있어요.
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
        {travel?.warnings?.map((warning) => (
          <p key={warning} className="text-caption1 text-label-alternative">
            {warning}
          </p>
        ))}
        <p className="text-caption1 text-label-alternative">
          {isBus
            ? (transit?.sourceLabel ?? "교통 정보는 추정값이에요.")
            : "택시 요금과 도착 시각은 추정값이에요. 택시는 이용하시는 택시 앱으로 불러 주세요."}
        </p>
      </div>
      <div className="bg-background-normal sticky bottom-0 mt-auto flex flex-col gap-2 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {failure.actionError && (
          <p role="alert" className="text-label2 text-status-negative">
            {failure.actionError}
          </p>
        )}
        <Button
          className="w-full"
          disabled={failure.saving || (isBus && !transitAvailable)}
          onClick={() => failure.chooseAndClose(mode)}
        >
          {failure.saving
            ? "선택 기록 중"
            : isBus
              ? "막차로 갈게요"
              : "혼자 택시로 갈게요"}
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          disabled={failure.saving}
          onClick={failure.retryRegistration}
        >
          동승도 알아볼래요
        </Button>
        {!travel && (
          <Button variant="text" onClick={failure.retry}>
            교통 정보 다시 확인
          </Button>
        )}
      </div>
    </div>
  );
}
