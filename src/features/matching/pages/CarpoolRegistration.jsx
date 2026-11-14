import { useLocation, useNavigate } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import DefinitionList from "../components/DefinitionList";
import Button from "../../../shared/components/Button";
import { toRegistrationView } from "../utils/registrationUtils";
import useRideRegistration from "../hooks/useRideRegistration";
import useSessionStore from "../../../shared/stores/sessionStore";

//동승 등록 완료 페이지
export default function CarpoolRegistration({ data, onViewMatchingResult }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const userId = useSessionStore((session) => session.user?.id);
  const registration = data ?? state ?? {};
  const active = useRideRegistration(registration, () =>
    navigate("/", { replace: true }),
  );
  const view = toRegistrationView(
    active.rideRequest,
    registration.matchingSlot,
  );
  const goHome = () => navigate("/");

  return (
    <div className="flex flex-1 flex-col">
      <div className="-mx-4">
        <TopBar title="동승 등록" leftAction="close" onLeftClick={goHome} />
      </div>
      <div className="mt-1 flex flex-col gap-2">
        <p className="text-title3 text-label-normal font-bold">{view.title}</p>
        <p className="font-regular text-body2 text-label-neutral">
          {view.description}
        </p>
      </div>
      {view.rows.length > 0 && (
        <div className="mt-5 w-full">
          <DefinitionList
            data={active.rideRequest}
            matchingSlot={registration.matchingSlot}
          />
        </div>
      )}
      {view.resultDueLabel && (
        <p className="font-regular text-caption1 text-label-alternative mt-2">
          {view.resultDueLabel}
        </p>
      )}
      <div className="bg-background-normal sticky bottom-0 mt-auto flex w-full shrink-0 flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {active.checking && (
          <p role="status" className="text-label2">
            신청 상태를 확인하고 있어요.
          </p>
        )}
        {active.error && (
          <p role="alert" className="text-label2 text-status-negative">
            {active.error}
          </p>
        )}
        <Button size="md" variant="primary" className="w-full" onClick={goHome}>
          홈으로
        </Button>
        {view.waiting && (
          <Button
            size="md"
            variant="secondary"
            className="w-full"
            disabled={!active.live || active.saving || active.checking}
            onClick={active.cancel}
          >
            {active.saving ? "등록 취소 중" : "등록 취소"}
          </Button>
        )}
        {view.partyId && (
          <Button
            size="md"
            variant="secondary"
            className="w-full"
            onClick={() =>
              onViewMatchingResult
                ? onViewMatchingResult(view.partyId)
                : navigate(`/matching/result/${view.partyId}`, {
                    state: { isPreview: !active.live },
                  })
            }
          >
            매칭 결과 보기
          </Button>
        )}
        {active.live && active.rideRequest?.status === "FAILED" && (
          <Button
            className="w-full"
            variant="secondary"
            onClick={() =>
              navigate(
                `/matching/failed?requestId=${encodeURIComponent(active.rideRequest.id)}`,
                { state: { userId, selection: registration } },
              )
            }
          >
            실패 결과와 귀가 방법 보기
          </Button>
        )}
        {view.canRetry && (
          <Button
            size="md"
            variant="secondary"
            className="w-full"
            onClick={() =>
              navigate("/pickup", {
                state: {
                  ...registration,
                  journeyId: active.rideRequest?.journeyId,
                },
              })
            }
          >
            다른 출발 시간 보기
          </Button>
        )}
      </div>
    </div>
  );
}
