import {useNavigate } from "react-router-dom";
import { useState } from "react";
import TopBar from "../../../shared/components/TopBar";
import TimeChip from "../components/TimeChip";
import DefinitionList from "../components/DefinitionList";
import Button from "../../../shared/components/Button";

const StartTimeData = {
    origin: "단국대 정문",
    destination: "영통2동",
    timeOptions: [
        { time: "23:00", subLabel: "1명 대기" },
        { time: "23:30", subLabel: "2명 대기" },
        { time: "00:00", subLabel: "0명" },
        { time: "00:30", subLabel: "0명" },
    ],
    definitionList: [
        { term: "출발 거점", value: "단국대 정문" },
        { term: "하차 지점", value: "영통2동" },
        { term: "동성 매칭", value: "켜짐" },
    ]
}

export default function StartTime() {
    const navigate = useNavigate();
    const [selectedTime, setSelectedTime] = useState(null);

    const handleRegistration = () => {
        if (!selectedTime) return;
        navigate("/carpool-registration", { state: { selectedTime } });
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
                {StartTimeData.timeOptions.map((option) => (
                    <TimeChip
                        key={option.time}
                        time={option.time}
                        subLabel={option.subLabel}
                        selected={selectedTime === option.time}
                        onClick={() => setSelectedTime(option.time)}
                    />
                ))}
            </div>
            <p className="font-regular text-caption1 text-label-alternative mt-2">
                같은 거점 · 같은 구 · 같은 학교 · 동성 기준, 지금 대기 인원이에요.
            </p>
            <div className="mt-4 w-full">
                <DefinitionList rows={StartTimeData.definitionList} />
            </div>
            <div className="sticky bottom-0 mt-auto flex w-full shrink-0 bg-background-normal pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button className="w-full" disabled={!selectedTime} onClick={handleRegistration}>
                    {selectedTime ? `${selectedTime}으로 등록하기` : "출발 시간을 선택해 주세요"}
                </Button>
            </div>
        </div>
    )
}
