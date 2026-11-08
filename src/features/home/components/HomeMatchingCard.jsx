import Badge from "../../../shared/components/Badge";
import iconChevronRight from "../../../assets/icons/chevron-right-sm.svg";
import { formatWon } from "../homeUtils";

// 백엔드 상태와 분리된 홈 UI 분기. 동승 진행 화면은 추후 구현.
export default function HomeMatchingCard({ uiState, display, onViewRegistration, onViewMatchingResult }) {
  switch (uiState) {
    //매칭 대기
    case "MATCHING_WAITING":
      return (
        <section
          aria-labelledby="matching-waiting-title"
          className="rounded-16 border-line-normal bg-background-normal mt-5 border p-4"
        >
          <Badge variant="neutral">매칭 대기 중</Badge>
          <h2
            id="matching-waiting-title"
            className="text-heading2 text-label-strong mt-2 font-bold"
          >
            {display?.departureTime} {display?.pickupPointName} 출발
          </h2>
          <p className="text-label2 text-label-neutral mt-1">
            {display?.directionLabel && `${display.directionLabel} 방향 · `}
            {display?.waitingCount != null && `지금 ${display.waitingCount}명 대기 · `}
            결과는 막차 전에 알려 드려요
          </p>
          <div className="border-line-alternative mt-3 border-t pt-2">
            <button
              type="button"
              onClick={onViewRegistration}
              className="font-semibold text-label1 text-label-neutral focus-visible:outline-primary-normal ml-auto flex min-h-7 items-center gap-1 rounded-8 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              등록 내용 보기
              <img src={iconChevronRight} alt="" className="size-4" />
            </button>
          </div>
        </section>
      );
    //매칭 성공
    case "MATCHING_RESULT":
      return (
        <section
          aria-labelledby="matching-result-title"
          className="rounded-16 bg-primary-normal text-static-white mt-5 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption1 rounded-8 bg-white/20 px-2 py-1 font-semibold">
              매칭됐어요
            </span>
            {display?.remainingTimeLabel && (
              <span className="text-caption1 bg-static-white text-primary-normal rounded-full px-2 py-1 font-semibold">
                {display.remainingTimeLabel}
              </span>
            )}
          </div>
          <h2 id="matching-result-title" className="text-heading2 mt-2 font-bold">
            {display?.matchedCompanionCount != null
              ? `같은 학교 ${display.matchedCompanionCount}명과 매칭됐어요`
              : "같은 학교 동승자와 매칭됐어요"}
          </h2>
          <p className="text-label2 mt-1">
            {display?.departureTime} {display?.pickupPointName} 출발 · 예상 1인{" "}
            {formatWon(display?.estimatedShareWon)}
          </p>
          <div className="mt-3 border-t border-white/20 pt-2">
            <button
              type="button"
              onClick={onViewMatchingResult}
              disabled={!onViewMatchingResult}
              title={!onViewMatchingResult ? "팟 확정 화면 연결 예정" : undefined}
              className="text-label1 ml-auto flex min-h-7 items-center gap-1 rounded-8 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed"
            >
              {display?.confirmationTimeLabel
                ? `${display.confirmationTimeLabel}까지 확정해 주세요`
                : "매칭 결과 확인하기"}
              <img src={iconChevronRight} alt="" className="size-4 brightness-0 invert" />
            </button>
          </div>
        </section>
      );
    case "RIDE_IN_PROGRESS":
      return null;
    default:
      return null;
  }
}

