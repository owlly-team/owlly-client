import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import Button from "../../../shared/components/Button";
import FareCompare from "../components/FareCompare";
import MemberRow from "../components/MemberRow";
import { formatTime, formatWon } from "../../home/utils/homeUtils";
import useMatchingResult from "../hooks/useMatchingResult";
import { toMatchingResultView } from "../utils/matchingResultUtils";
import RepresentativeMatchingResult from "./RepresentativeMatchingResult";
import BottomSheet from "../../../shared/components/BottomSheet";
import useLeaveParty from "../../chat/hooks/useLeaveParty";
import { getLeavePartyState } from "../../chat/utils/leavePartyUtils";
import {
  chatRoomMockData,
  getMockChatRoom,
} from "../../chat/mocks/chatRoomMockData";
import { mockMatchingResult } from "../mocks/matchingMockData";
import { getMyDecision } from "../utils/partyFlow";
import { getDisplayNow } from "../../../shared/utils/time";
import useMatchingTravel from "../hooks/useMatchingTravel";
import { getMatchingTransitNotice } from "../utils/matchingTravel";

export default function MatchingResult({ banks, onOpenChat }) {
  const navigate = useNavigate();
  const { partyId } = useParams();
  const { state, search } = useLocation();
  const memberPreview =
    new URLSearchParams(search).get("preview") === "member"
      ? mockMatchingResult
      : undefined;
  const previewRequested =
    import.meta.env.DEV &&
    state?.isPreview !== false &&
    (state?.isPreview === true ||
      ["member", "representative"].includes(
        new URLSearchParams(search).get("preview"),
      ));
  const result = useMatchingResult(
    partyId,
    previewRequested ? (state?.matchingResult ?? memberPreview) : undefined,
    previewRequested,
  );
  const { data, loading, error, retry, isPreview, updateParty } = result;
  const comparison = useMatchingTravel(
    partyId,
    !isPreview &&
      Boolean(data?.party) &&
      !(
        data.party.myMemberId === data.party.representativeMemberId &&
        getMyDecision(data.party) === "ACCEPTED"
      ),
    state?.matchingContext,
  );
  const [actionError, setActionError] = useState("");
  const leaveDialog = useRef(null);
  const leaveTitleId = useId();
  const leaveDescriptionId = useId();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (isPreview) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isPreview]);
  const clock = getDisplayNow(
    { isPreview, previewNow: chatRoomMockData.previewNow },
    now,
  );
  const previewParty =
    data?.party && isPreview
      ? getMockChatRoom(partyId, data, clock).context.party
      : data?.party;
  const transfers =
    data?.settlement?.partyId === partyId
      ? (data.settlement.items?.flatMap((item) => item.transfers ?? []) ?? [])
      : [];
  const leaveState = getLeavePartyState(previewParty, clock, transfers);
  const leaveParty = useLeaveParty({
    party: previewParty,
    now: clock,
    transfers,
    onLeft: (party) =>
      navigate("/", { replace: true, state: { leftParty: party } }),
  });
  const goHome = () => navigate("/");
  const openChat = async (roomId, account, matchingResult = data) => {
    if (!isPreview) {
      const context = await result.openRoom(matchingResult, roomId);
      if (!context) return;
      if (onOpenChat) return onOpenChat(context.room.id, account);
      navigate(`/rooms/${context.room.id}`, {
        state: {
          isPreview: false,
          matchingResult: context,
          room: context.room,
          account: account
            ? {
                id: account.id,
                purpose: account.purpose,
                bankCode: account.bankCode,
                maskedAccountNumber: account.maskedAccountNumber,
                maskedHolderName: account.maskedHolderName,
              }
            : undefined,
        },
      });
      return;
    }
    if (onOpenChat) return onOpenChat(roomId, account);
    const roomAccount = account
      ? {
          ...account,
          bankName:
            account.bankName ??
            (banks ?? data.banks)?.find(
              (bank) => bank.code === account.bankCode,
            )?.name,
        }
      : undefined;
    navigate(`/rooms/${roomId}`, {
      state: { account: roomAccount, isPreview, matchingResult },
    });
  };

  async function confirm() {
    setActionError("");
    try {
      if (!isPreview) {
        const context = await result.confirm();
        if (!context) return;
        if (context.party.myMemberId !== context.party.representativeMemberId)
          await openChat(context.party.roomId, undefined, context);
        return;
      }
      const myMember = data.party.members.find(
        (member) => member.memberId === data.party.myMemberId,
      );
      if (
        !["PENDING", "ACCEPTED"].includes(myMember?.decision) ||
        data.party.status === "CANCELLED"
      ) {
        throw new Error("지금은 이 팟을 확정할 수 없어요.");
      }
      if (
        myMember.decision !== "ACCEPTED" &&
        data.party.confirmDeadlineAt &&
        clock >= Date.parse(data.party.confirmDeadlineAt)
      ) {
        throw new Error(
          "팟 확정 마감 시간이 지났어요. 귀가 방법을 다시 확인해 주세요.",
        );
      }
      const members = data.party.members.map((member) =>
        member.memberId === data.party.myMemberId
          ? { ...member, decision: "ACCEPTED" }
          : member,
      );
      const party = {
        ...data.party,
        members,
        status: members
          .filter((member) => ["PENDING", "ACCEPTED"].includes(member.decision))
          .every((member) => member.decision === "ACCEPTED")
          ? "PREPAYING"
          : data.party.status,
      };
      if (!party.roomId) throw new Error("채팅방 정보를 확인할 수 없어요.");
      updateParty({ party });
      if (party.myMemberId !== party.representativeMemberId)
        await openChat(party.roomId, undefined, { ...data, party });
    } catch (failure) {
      setActionError(failure.message);
    }
  }

  async function leave() {
    if (isPreview) {
      if (leaveParty.leave()) leaveDialog.current?.close();
      return;
    }
    setActionError("");
    try {
      const party = await result.leave();
      if (party) {
        leaveDialog.current?.close();
        navigate("/", { replace: true });
      }
    } catch (failure) {
      setActionError(failure.message);
    }
  }
  if (loading || error || !data?.party) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="-mx-4">
          <TopBar title="매칭 결과" leftAction="close" onLeftClick={goHome} />
        </div>
        <p role="status" className="text-heading2 font-bold">
          {loading
            ? "매칭 결과를 불러오고 있어요"
            : "매칭 결과를 확인할 수 없어요"}
        </p>
        {!loading && (
          <>
            <Button onClick={retry}>다시 불러오기</Button>
            <Button variant="secondary" onClick={goHome}>
              귀가 방법 다시 보기
            </Button>
          </>
        )}
      </div>
    );
  }

  const { party, settlement, settlementNotReady, settlementError } = data;
  const {
    members,
    companionCount,
    allSameSchool,
    estimatedShareWon,
    prepayDueWon,
    amountsReady,
    destinationLabel,
    isRepresentative,
  } = toMatchingResultView(party, settlement);
  const context = isPreview
    ? (state?.matchingContext ?? data)
    : comparison.data;
  const transitNotice = getMatchingTransitNotice(context?.travelOptions, clock);

  const decision = getMyDecision(party);
  if (isRepresentative && decision === "ACCEPTED")
    return (
      <RepresentativeMatchingResult
        key={party.id}
        party={party}
        settlement={settlement}
        settlementNotReady={settlementNotReady}
        settlementError={settlementError}
        onBack={goHome}
        retry={retry}
        banks={banks ?? data.banks}
        onOpenChat={openChat}
        isPreview={isPreview}
      />
    );

  return (
    <div className="flex flex-1 flex-col">
      {isPreview && (
        <p role="status" className="text-caption1 text-primary-normal">
          미리보기 · 예시 매칭 결과
        </p>
      )}
      <div className="-mx-4">
        <TopBar title="매칭 결과" leftAction="close" onLeftClick={goHome} />
      </div>
      <h1 className="text-title3 mt-2 font-bold">
        {allSameSchool ? "같은 학교 " : ""}
        {companionCount}명과
        <br />
        매칭됐어요
      </h1>
      <p className="text-body2 text-label-neutral mt-2">
        {formatTime(party.departureAt)} · {party.pickupPoint?.name}
        {destinationLabel && ` → ${destinationLabel}`}
      </p>
      {data.refreshError && (
        <p role="status" className="text-label2 text-label-neutral mt-2">
          {data.refreshError}
        </p>
      )}
      <FareCompare
        className="mt-4"
        shareLabel="예상 1인 부담액"
        sharePrice={formatWon(estimatedShareWon)}
        aloneLabel="혼자 택시 · 지금 출발"
        alonePrice={formatWon(context?.travelOptions?.soloTaxiEstimatedWon)}
      />
      <div className="text-label2 text-label-neutral mt-2" aria-live="polite">
        <p>
          {comparison.loading
            ? "최신 교통 정보를 확인하고 있어요."
            : transitNotice.status === "available"
              ? `막차를 이용하려면 ${formatTime(transitNotice.lastLeaveAt)}까지 거점에서 출발해야 해요.`
              : transitNotice.status === "unavailable"
                ? "현재 이용 가능한 막차 경로가 없어요."
                : "막차 이용 가능 여부를 확인할 수 없어요."}
        </p>
        {comparison.data?.usingDefaultDropoff && (
          <p>교통 비교는 같은 행정동의 프로필 기본 하차 위치 기준이에요.</p>
        )}
        {comparison.error && <p role="alert">{comparison.error}</p>}
        {!isPreview && (
          <button
            type="button"
            className="text-primary-normal mt-1 underline"
            onClick={comparison.retry}
          >
            교통 정보 다시 확인
          </button>
        )}
      </div>
      <section
        aria-label="대표에게 보낼 금액"
        className="rounded-8 border-primary-normal mt-4 border-[1.5px] p-3"
      >
        <div className="flex items-center justify-between gap-1.5">
          <div>
            <h2 className="text-body2 font-semibold">
              탈 때 대표에게 보낼 금액
            </h2>
            <p className="text-caption1 text-label-alternative mt-1">
              {isRepresentative
                ? "대표는 선입금하지 않아요"
                : "예상 분담액의 1.2배 · 최대 금액"}
            </p>
          </div>
          <p className="text-title3 text-primary-normal font-bold">
            {prepayDueWon != null ? formatWon(prepayDueWon) : "금액 준비 중"}
          </p>
        </div>
        {(settlementNotReady || settlementError || !amountsReady) && (
          <p role="status" className="text-label2 text-label-neutral mt-2">
            {settlementError
              ? "정산 정보를 불러오지 못했어요."
              : "정산 금액이 아직 준비되지 않았어요."}
            <button
              type="button"
              className="text-primary-normal ml-2 underline"
              onClick={retry}
            >
              다시 확인
            </button>
          </p>
        )}
        <p className="text-label2 text-label-neutral mt-2">
          택시를 부르기 전에 먼저 보내요. 내린 뒤 실제 금액과의 차액은
          <br /> 정산 화면에서 확인하고, 주고받기는 채팅방에서 해요.
        </p>
      </section>
      <section
        aria-labelledby="dropoff-order-title"
        className="rounded-16 border-line-alternative mt-4 border p-3"
      >
        <h2
          id="dropoff-order-title"
          className="text-label2 text-label-alternative mb-2"
        >
          내리는 순서
        </h2>
        {members.map((member) => (
          <MemberRow
            key={member.memberId}
            className="px-0 py-2"
            order={member.stopOrder ?? "-"}
            name={
              member.memberId === party.myMemberId ? "나" : member.maskedName
            }
            school={member.universityName}
            gender={member.genderLabel}
            isMe={member.memberId === party.myMemberId}
            isRepresentative={member.isRepresentative}
            note={`${member.dropoffNote}${member.distanceLabel ? ` · ${member.distanceLabel}` : ""}${member.isRepresentative ? " · 택시 호출 · 결제" : ""}`}
          />
        ))}
      </section>
      <p className="text-caption1 text-label-alternative mt-4">
        {party.confirmDeadlineAt
          ? `팟 참여 확정 마감은 ${formatTime(party.confirmDeadlineAt)}예요. `
          : "확정 마감 시간은 아직 정해지지 않았어요. "}
        확정하면 채팅방이 열려요.
      </p>
      <div className="bg-background-normal sticky bottom-0 mt-auto flex flex-col gap-2 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {actionError && (
          <p role="alert" className="text-label2 text-status-negative">
            {actionError}
          </p>
        )}
        <Button
          className="w-full"
          onClick={confirm}
          disabled={
            result.saving ||
            (decision !== "ACCEPTED" &&
              ((!isPreview && !party.allowedActions?.includes("CONFIRM")) ||
                Boolean(
                  party.confirmDeadlineAt &&
                  clock >= Date.parse(party.confirmDeadlineAt),
                )))
          }
          aria-busy={result.saving}
        >
          {result.saving
            ? "처리 중"
            : decision === "ACCEPTED"
              ? "채팅방 열기"
              : "이 팟 확정하기"}
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          disabled={result.saving || !leaveState.canLeave}
          onClick={() => leaveDialog.current.showModal()}
        >
          빠지기
        </Button>
        {!leaveState.canLeave && (
          <p className="text-label2 text-label-alternative">
            {leaveState.reason}
          </p>
        )}
      </div>
      {createPortal(
        <dialog
          ref={leaveDialog}
          aria-labelledby={leaveTitleId}
          aria-describedby={leaveDescriptionId}
          className="rounded-t-24 text-label-normal backdrop:bg-material-dimmer fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[85dvh] w-full max-w-110 overflow-y-auto border-0 bg-transparent p-0"
        >
          <BottomSheet onClose={() => leaveDialog.current.close()}>
            <h2 id={leaveTitleId} className="text-title3 mt-3 w-full font-bold">
              팟에서 나갈까요?
            </h2>
            <p
              id={leaveDescriptionId}
              className="text-body2 text-label-neutral w-full"
            >
              나가면 다시 들어올 수 없어요.
            </p>
            {!leaveState.canLeave && (
              <p
                role="status"
                className="text-label2 text-label-neutral w-full"
              >
                {leaveState.reason}
              </p>
            )}
            {leaveParty.error && (
              <p
                role="alert"
                className="text-label2 text-status-negative w-full"
              >
                {leaveParty.error}
              </p>
            )}
            {actionError && (
              <p
                role="alert"
                className="text-label2 text-status-negative w-full"
              >
                {actionError}
              </p>
            )}
            <div className="mt-2 grid w-full grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => leaveDialog.current.close()}
              >
                취소
              </Button>
              <Button
                variant="danger"
                disabled={result.saving || !leaveState.canLeave}
                onClick={leave}
              >
                {result.saving ? "처리 중" : "나가기"}
              </Button>
            </div>
          </BottomSheet>
        </dialog>,
        document.body,
      )}
    </div>
  );
}
