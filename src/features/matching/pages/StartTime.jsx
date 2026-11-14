import { useLocation, useNavigate } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import TimeChip from "../components/TimeChip";
import DefinitionList from "../components/DefinitionList";
import Button from "../../../shared/components/Button";
import { formatTime } from "../../home/utils/homeUtils";
import useStartTime from "../hooks/useStartTime";

//출발 시간 선택 페이지
export default function StartTime() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const timing = useStartTime(state);
  const { valid, slots, selectedSlot } = timing;
  const { pickupPoint, destination, sameGenderOnly } = state ?? {};

  if (!valid)
    return (
      <div className="flex flex-1 flex-col gap-4 pt-4">
        <p>출발 거점과 하차 지점을 먼저 선택해 주세요.</p>
        <Button onClick={() => navigate("/pickup")}>지도에서 선택하기</Button>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col">
      <div className="-mx-4">
        <TopBar
          title="출발 시간 선택"
          onLeftClick={() => {
            if (!timing.submitting) navigate("/pickup", { state });
          }}
        />
      </div>
      <div className="mt-1 flex flex-col gap-2">
        {timing.isPreview && (
          <p role="status" className="text-caption1 text-primary-normal">
            미리보기 · 예시 출발 시간
          </p>
        )}
        <p className="text-title3 text-label-normal font-bold">
          몇 시에 출발할까요?
        </p>
        <p className="font-regular text-body2 text-label-neutral">
          {pickupPoint.name} → {destination.name}
        </p>
      </div>
      {timing.loading && (
        <p role="status" className="text-label2 mt-4">
          출발 시간대를 불러오고 있어요.
        </p>
      )}
      {timing.loadError && (
        <div role="alert" className="mt-4">
          <p>{timing.loadError}</p>
          <Button variant="text" onClick={timing.retry}>
            다시 조회
          </Button>
        </div>
      )}
      {!timing.loading && !timing.loadError && slots.length === 0 && (
        <p role="status" className="text-label2 mt-4">
          안내 가능한 출발 시간대가 없어요.
        </p>
      )}
      <div className="mt-4 flex w-full gap-2 overflow-x-auto">
        {slots.map((slot) => (
          <TimeChip
            key={slot.departureAt}
            time={formatTime(slot.departureAt)}
            subLabel={
              slot.registrationAllowed !== true
                ? "신청 불가"
                : slot.waitingCount > 0
                  ? `${slot.waitingCount}명 대기`
                  : slot.waitingCount === 0
                    ? "0명"
                    : "인원 확인 불가"
            }
            disabled={slot.registrationAllowed !== true || timing.submitting}
            selected={selectedSlot?.departureAt === slot.departureAt}
            onClick={() => timing.select(slot)}
          />
        ))}
      </div>
      <p className="font-regular text-caption1 text-label-alternative mt-2">
        같은 거점 · 같은 구 · 같은 학교{sameGenderOnly ? " · 동성" : ""} 기준,
        지금 대기 인원이에요.
      </p>
      <div className="mt-4 w-full">
        <DefinitionList
          rows={[
            { term: "출발 거점", value: pickupPoint.name },
            { term: "하차 지점", value: destination.name },
            { term: "동성 매칭", value: sameGenderOnly ? "켜짐" : "꺼짐" },
          ]}
        />
      </div>
      <div className="bg-background-normal sticky bottom-0 mt-auto flex w-full shrink-0 flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {timing.error && (
          <p role="alert" className="text-label2 text-status-negative">
            {timing.error}
          </p>
        )}
        <Button
          className="w-full"
          disabled={!selectedSlot || timing.submitting}
          aria-busy={timing.submitting}
          onClick={timing.register}
        >
          {timing.submitting
            ? "동승 등록 중"
            : selectedSlot
              ? `${formatTime(selectedSlot.departureAt)}으로 등록하기`
              : "출발 시간을 선택해 주세요"}
        </Button>
      </div>
    </div>
  );
}
