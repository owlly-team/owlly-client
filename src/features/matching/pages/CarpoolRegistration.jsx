import { useLocation, useNavigate } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import DefinitionList from "../components/DefinitionList";
import Button from "../../../shared/components/Button";

const StartTimeData = {
    origin: "단국대 정문",
    destination: "영통2동",
    definitionList: [
        { term: "출발", value: "단국대 정문 · 23:30" },
        { term: "하차 지점", value: "영통2동" },
        { term: "동성 매칭", value: "켜짐" },
        { term: "지금 대기", value: "확인 필요", accent: true },
    ]
}

export default function CarpoolRegistration() {
    const navigate = useNavigate();
    const { state } = useLocation();
    const rows = StartTimeData.definitionList.map((row) => {
        if (row.term === "출발" && state?.selectedTime) {
            return { ...row, value: `${StartTimeData.origin} · ${state.selectedTime}` };
        }
        if (row.term === "지금 대기" && Number.isInteger(state?.waitingCount) && state.waitingCount >= 0) {
            return { ...row, value: `${state.waitingCount}명` };
        }
        return row;
    });
    const goHome = () => navigate("/");

    return(
        <div className="flex flex-1 flex-col">
            <div className="-mx-4">
                <TopBar title="동승 등록" leftAction="close" onLeftClick={goHome} />
            </div>
            <div className="flex flex-col gap-2 mt-1">
                <p className="font-bold text-title3 text-label-normal">
                    동승을 등록했어요
                </p>
                <p className="font-regular text-body2 text-label-neutral">
                    같은 조건으로 등록한 사람과 매칭되면 알림으로 알려드려요.
                </p>
            </div>
            <div className="mt-5 w-full">
                <DefinitionList rows={rows} />
            </div>
            <p className="font-regular text-caption1 text-label-alternative mt-2">
                출발 15분 전까지는 언제든 취소할 수 있어요.
            </p>
            <div className="sticky bottom-0 mt-auto flex w-full shrink-0 flex-col gap-2 bg-background-normal pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button size="md" variant="primary" className="w-full" onClick={goHome}>
                    홈으로
                </Button>
                <Button size="md" variant="secondary" className="w-full" onClick={goHome}>
                    등록 취소
                </Button>
            </div>
        </div>
    )
}
