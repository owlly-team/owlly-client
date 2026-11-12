import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import TopBar from "../../../shared/components/TopBar";
import TimeChip from "../components/TimeChip";
import DefinitionList from "../components/DefinitionList";
import Button from "../../../shared/components/Button";
import { formatTime } from "../../home/utils/homeUtils";
import { isMatchingSelection, localDate } from "../utils/mapUtils";
import { createMockMatchingSlots, createMockRegistration } from "../mocks/matchingMockData";

//출발 시간 선택 페이지 
export default function StartTime() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [date] = useState(localDate);
  const [selected, setSelected] = useState(null);
  const valid = isMatchingSelection(state);
  const { pickupPoint, destination, sameGenderOnly } = state ?? {};
  const pickupPointId = pickupPoint?.id;
  const destinationDongId = destination?.id;
  const requestKey = JSON.stringify([pickupPointId, destinationDongId, sameGenderOnly, date]);
  const slots = createMockMatchingSlots(date);
  const selectedSlot = selected?.key === requestKey
    ? slots.find((slot) => slot.departureAt === selected.departureAt && slot.registrationAllowed === true) : null;

  function handleRegistration() {
    if (!selectedSlot) return;
    navigate("/carpool-registration", {
      state: createMockRegistration(selectedSlot, state),
    });
  }

  if (!valid) return <div className="flex flex-1 flex-col gap-4 pt-4">
    <p>출발 거점과 하차 지점을 먼저 선택해 주세요.</p>
    <Button onClick={() => navigate("/pickup")}>지도에서 선택하기</Button>
  </div>;

  return <div className="flex flex-1 flex-col">
    <div className="-mx-4"><TopBar title="출발 시간 선택" onLeftClick={() => navigate("/pickup", { state })} /></div>
    <div className="flex flex-col gap-2 mt-1">
      <p className="font-bold text-title3 text-label-normal">몇 시에 출발할까요?</p>
      <p className="font-regular text-body2 text-label-neutral">{pickupPoint.name} → {destination.name}</p>
    </div>
    <div className="flex mt-4 w-full gap-2 overflow-x-auto">
      {slots.map((slot) => <TimeChip key={slot.departureAt} time={formatTime(slot.departureAt)}
        subLabel={slot.registrationAllowed !== true ? "신청 불가" : slot.waitingCount > 0 ? `${slot.waitingCount}명 대기` : "0명"}
        disabled={slot.registrationAllowed !== true} selected={selectedSlot?.departureAt === slot.departureAt}
        onClick={() => setSelected({ key: requestKey, departureAt: slot.departureAt })} />)}
    </div>
    <p className="font-regular text-caption1 text-label-alternative mt-2">
      같은 거점 · 같은 구 · 같은 학교{sameGenderOnly ? " · 동성" : ""} 기준, 지금 대기 인원이에요.
    </p>
    <div className="mt-4 w-full"><DefinitionList rows={[
      { term: "출발 거점", value: pickupPoint.name },
      { term: "하차 지점", value: destination.name },
      { term: "동성 매칭", value: sameGenderOnly ? "켜짐" : "꺼짐" },
    ]} /></div>
    <div className="sticky bottom-0 mt-auto flex w-full shrink-0 bg-background-normal pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Button className="w-full" disabled={!selectedSlot} onClick={handleRegistration}>{selectedSlot ? `${formatTime(selectedSlot.departureAt)}으로 등록하기` : "출발 시간을 선택해 주세요"}</Button>
    </div>
  </div>;
}
