import { useLocation, useNavigate } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import DefinitionList from "../components/DefinitionList";
import Button from "../../../shared/components/Button";
import { toRegistrationView } from "../utils/registrationUtils";

//동승 등록 완료 페이지
export default function CarpoolRegistration({ data, onViewMatchingResult }) {
    const navigate = useNavigate();
    const { state } = useLocation();
    const registration = data ?? state ?? {};
    const view = toRegistrationView(
        registration.rideRequest, registration.matchingSlot,
    );
    const goHome = () => navigate("/");

    return (
        <div className="flex flex-1 flex-col">
            <div className="-mx-4">
                <TopBar title="동승 등록" leftAction="close" onLeftClick={goHome} />
            </div>
            <div className="flex flex-col gap-2 mt-1">
                <p className="font-bold text-title3 text-label-normal">{view.title}</p>
                <p className="font-regular text-body2 text-label-neutral">{view.description}</p>
            </div>
            {view.rows.length > 0 && (
                <div className="mt-5 w-full">
                    <DefinitionList
                        data={registration.rideRequest}
                        matchingSlot={registration.matchingSlot}
                    />
                </div>
            )}
            {view.resultDueLabel && (
                <p className="font-regular text-caption1 text-label-alternative mt-2">
                    {view.resultDueLabel}
                </p>
            )}
            <div className="sticky bottom-0 mt-auto flex w-full shrink-0 flex-col gap-2 bg-background-normal pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button size="md" variant="primary" className="w-full" onClick={goHome}>
                    홈으로
                </Button>
                {view.waiting && (
                    <Button size="md" variant="secondary" className="w-full" disabled title="등록 취소 기능 연결 예정">
                        등록 취소
                    </Button>
                )}
                {view.partyId && (
                    <Button size="md" variant="secondary" className="w-full"
                        onClick={() => onViewMatchingResult
                            ? onViewMatchingResult(view.partyId)
                            : navigate(`/matching-result/${view.partyId}`)}>
                        매칭 결과 보기
                    </Button>
                )}
                {view.canRetry && (
                    <Button size="md" variant="secondary" className="w-full" onClick={() => navigate("/start-time")}>
                        다른 출발 시간 보기
                    </Button>
                )}
            </div>
        </div>
    );
}
