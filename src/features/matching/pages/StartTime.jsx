import {useNavigate } from "react-router-dom";
import { useState } from "react";
import TopBar from "../../../shared/components/TopBar";
import TimeChip from "../components/TimeChip";
import DefinitionList from "../components/DefinitionList";
import Button from "../../../shared/components/Button";
import { formatTime } from "../../home/homeUtils";
import { createMockRegistration } from "../registrationMockData";

// API-18 응답의 data: MatchingSlot[] 형식. 현재는 시안용 목업이다.
// 자정 이후 슬롯은 다음 날짜의 조회 결과에 해당한다.
const mockMatchingSlots = [
    { departureAt: "2026-11-09T23:00:00+09:00", waitingCount: 1, registrationAllowed: true, reason: null },
    { departureAt: "2026-11-09T23:30:00+09:00", waitingCount: 2, registrationAllowed: true, reason: null },
    { departureAt: "2026-11-10T00:00:00+09:00", waitingCount: 0, registrationAllowed: true, reason: null },
    { departureAt: "2026-11-10T00:30:00+09:00", waitingCount: 0, registrationAllowed: true, reason: null },
];

const StartTimeData = {
    origin: "단국대 정문",
    destination: "영통2동",
    definitionList: [
        { term: "출발 거점", value: "단국대 정문" },
        { term: "하차 지점", value: "영통2동" },
        { term: "동성 매칭", value: "켜짐" },
    ]
}

export default function StartTime({ matchingSlots = mockMatchingSlots }) {
    const navigate = useNavigate();
    const [selectedDepartureAt, setSelectedDepartureAt] = useState(null);
    const selectedSlot = matchingSlots.find((slot) =>
        slot.departureAt === selectedDepartureAt && slot.registrationAllowed === true
    );

    const handleRegistration = () => {
        if (!selectedSlot) return;
        // 화면 이동만 수행한다. 실제 신청 생성은 API-19 연동이 필요하다.
        navigate("/carpool-registration", {
            state: createMockRegistration(selectedSlot),
        });
    };

    return(
        <div className="flex flex-1 flex-col">
            <div className="-mx-4">
                <TopBar title="출발 시간 선택" />
            </div>
            <div className="flex flex-col gap-2 mt-1">
                <p className="font-bold text-title3 text-label-normal">
                    몇 시에 출발할까요?
                </p>
                <p className="font-regular text-body2 text-label-neutral">
                    {StartTimeData.origin} → {StartTimeData.destination}
                </p>
            </div>
            <div className="flex mt-4 w-full min-w-89.5 gap-2">
                {matchingSlots.map((option) => (
                    <TimeChip
                        key={option.departureAt}
                        time={formatTime(option.departureAt)}
                        subLabel={!option.registrationAllowed ? "신청 불가" : option.waitingCount > 0 ? `${option.waitingCount}명 대기` : "0명"}
                        disabled={option.registrationAllowed !== true}
                        selected={selectedSlot?.departureAt === option.departureAt}
                        onClick={() => setSelectedDepartureAt(option.departureAt)}
                    />
                ))}
            </div>
            {matchingSlots.length === 0 && (
                <p className="text-label1 text-label-alternative mt-2">조회된 출발 시간이 없어요.</p>
            )}
            <p className="font-regular text-caption1 text-label-alternative mt-2">
                같은 거점 · 같은 구 · 같은 학교 · 동성 기준, 지금 대기 인원이에요.
            </p>
            <div className="mt-4 w-full">
                <DefinitionList rows={StartTimeData.definitionList} />
            </div>
            <div className="sticky bottom-0 mt-auto flex w-full shrink-0 bg-background-normal pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button className="w-full" disabled={!selectedSlot} onClick={handleRegistration}>
                    {selectedSlot ? `${formatTime(selectedSlot.departureAt)}으로 등록하기` : "출발 시간을 선택해 주세요"}
                </Button>
            </div>
        </div>
    )
}
