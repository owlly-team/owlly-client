import { useNavigate } from "react-router-dom";
import Badge from "../../../shared/components/Badge";
import TopBar from "../../../shared/components/TopBar";
import RouteSteps from "../components/RouteSteps";
import iconStepWalk from "../../../assets/icons/step-walk.svg";
import iconStepBus from "../../../assets/icons/step-bus.svg";
import iconStepFlag from "../../../assets/icons/step-flag.svg";
import Button from "../../../shared/components/Button";

const LastTrainData = {
    origin: "단국대 정문 근처",
    destination: "영통2동",
    timeTaken: "43",
    fare: "1,550",
    lastDeparture: {
        time: "22:58",
        place: "정문 정류장 · 도보 4분",
        note: "22:49까지 출발해야 해요",
        transfer: "환승 없음",
    },
    steps: [
        {
            time: "22:49",
            type: "walk",
            icon: iconStepWalk,
            title: "정문 정류장까지 걷기",
            description: "도보 4분 · 300m · 5분 여유 두고 출발",
        },
        {
            time: "22:58",
            type: "transit",
            icon: iconStepBus,
            title: "정문 정류장에서 버스 타기",
            description: "오늘 이 방향 마지막 버스 · 14개 정류장 · 31분",
        },
        {
            time: "23:29",
            type: "transit",
            icon: iconStepBus,
            title: "영통역 정류장에서 내리기",
        },
        {
            time: "23:29",
            type: "walk",
            icon: iconStepWalk,
            title: "집 근처 하차 지점까지 걷기",
            description: "도보 12분 · 850m",
        },
        {
            time: "23:41",
            type: "home",
            icon: iconStepFlag,
            title: "영통2동 도착",
        },
    ],
}

//막차경로 
export default function LastTrain(){
    const navigate = useNavigate();
    const goHome = () => navigate("/");

    return(
        <div className="flex flex-1 flex-col justify-between">
            <div className="-mx-4">
                <TopBar title="막차 경로" onLeftClick={goHome} />
                </div>
            <div className="flex flex-col gap-2 pt-2 flex-1">
                <p className="text-caption1 text-label-alternative font-semibold">
                    {LastTrainData.origin} → {LastTrainData.destination}
                </p>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-title3 font-bold text-label-strong">
                            {LastTrainData.timeTaken}분
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-headline2 font-bold text-label-strong">
                            {LastTrainData.fare}원
                        </p>
                        <p className="text-caption2 font-medium text-label-alternative">
                            1인 · 교통카드
                        </p>
                    </div>
                </div>
                <div className="flex flex-row gap-2">
                    <Badge variant="cautionary" className="shrink-0">
                        {LastTrainData.lastDeparture.note}
                    </Badge>
                    <Badge variant="neutral" className="shrink-0">
                        {LastTrainData.lastDeparture.transfer}
                    </Badge>
                </div>
                <div className="flex mt-4">
                    <RouteSteps steps={LastTrainData.steps} />
                </div>
                <p className="text-caption2 text-label-alternative font-regular mt-4">
                    버스 시간표 기준이에요. 실시간 도착 정보는 아니에요.
                </p>
            </div>
            <div className="sticky bottom-0 mt-auto flex w-full shrink-0 flex-col gap-2 bg-background-normal pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button size="md" variant="primary" className="w-full" onClick={goHome}>
                    막차로 갈게요
                </Button>
                <Button size="md" variant="secondary" className="w-full">
                    동승도 알아볼래요
                </Button>
            </div>

        </div>

    );
}
