import { useNavigate } from "react-router-dom";
import Badge from "../../../shared/components/Badge";
import TopBar from "../../../shared/components/TopBar";
import RouteSteps from "../components/RouteSteps";
import iconStepWalk from "../../../assets/icons/step-walk.svg";
import iconStepFlag from "../../../assets/icons/step-flag.svg";
import iconStepTaxi from "../../../assets/icons/transport-taxi.svg";
import Button from "../../../shared/components/Button";
import InfoBox from "../../../shared/components/InfoBox";

const SoloTaxiData = {
    origin: "단국대 정문 근처",
    destination: "영통2동",
    timeTaken: "34",
    fare: "27,400",
    lastDeparture: {
        time: "22:58",
        place: "정문 정류장 · 도보 4분",
        note: "지금출발",
        distance: "21km",
    },
    steps: [
        {
            time: "22:31",
            type: "walk",
            icon: iconStepWalk,
            title: "단국대 정문에서 택시 타기",
            description: "출발 거점 · 택시가 서는 큰길 쪽",
        },
        {
            time: "22:31",
            type: "walk",
            icon: iconStepTaxi,
            title: "택시로 이동",
            description: "약 34분 · 21km · 심야 · 시계 외 할증 포함",
        },
        {
            time: "23:05",
            type: "home",
            icon: iconStepFlag,
            title: "영통2동 도착",
            description: "집 근처 하차 지점",
        },
    ],
}

//혼자 택시
export default function SoloTaxi(){
    const navigate = useNavigate();
    const goHome = () => navigate("/");

    return(
        <div className="flex flex-1 flex-col justify-between">
            <div className="-mx-4">
                <TopBar title="혼자 택시" onLeftClick={goHome} />
                </div>
            <div className="flex flex-col gap-2 pt-2 flex-1">
                <p className="text-caption1 text-label-alternative font-semibold">
                    {SoloTaxiData.origin} → {SoloTaxiData.destination}
                </p>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-title3 font-bold text-label-strong">
                            {SoloTaxiData.timeTaken}분
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-headline2 font-bold text-label-strong">
                            {SoloTaxiData.fare}원
                        </p>
                        <p className="text-caption2 font-medium text-label-alternative">
                            1인 · 예상 요금
                        </p>
                    </div>
                </div>
                <div className="flex flex-row gap-2">
                    <Badge variant=""  className="shrink-0">
                        {SoloTaxiData.lastDeparture.note}
                    </Badge>
                    <Badge variant="neutral" className="shrink-0">
                        {SoloTaxiData.lastDeparture.distance}
                    </Badge>
                </div>
                <div className="flex mt-4">
                    <RouteSteps steps={SoloTaxiData.steps} />
                </div>
                <div className="mt-4">
                    <InfoBox
                        variant="normal"
                        title="동승하면 약 7,900원"
                        description="23:30 출발 · 00:00 도착 · 영통구 방향 2명 대기 중이에요."
                    />
                </div>
                <p className="text-caption2 text-label-alternative font-regular mt-4">
                    예상 요금은 거리 기준이에요. 택시는 쓰시는 택시 앱으로 불러 주세요.
                </p>
            </div>
            <div className="sticky bottom-0 mt-auto flex w-full shrink-0 flex-col gap-2 bg-background-normal pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button size="md" variant="primary" className="w-full" onClick={goHome}>
                    혼자 택시로 갈게요
                </Button>
                <Button size="md" variant="secondary" className="w-full">
                    동승도 알아볼래요
                </Button>
            </div>

        </div>

    );
}
