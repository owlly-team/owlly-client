import { useId, useRef, useState } from "react";
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
import { chatRoomMockData, getMockChatRoom } from "../../chat/mocks/chatRoomMockData";
import { mockMatchingResult } from "../mocks/matchingMockData";

export default function MatchingResult({ banks, onOpenChat }) {
  const navigate = useNavigate();
  const { partyId } = useParams();
  const { state, search } = useLocation();
  const memberPreview = new URLSearchParams(search).get("preview") === "member" ? mockMatchingResult : undefined;
  const { data, loading, error, retry, isPreview, updateParty } = useMatchingResult(partyId, state?.matchingResult ?? memberPreview);
  const [actionError, setActionError] = useState("");
  const leaveDialog = useRef(null);
  const leaveTitleId = useId();
  const leaveDescriptionId = useId();
  const clock = Date.parse(chatRoomMockData.previewNow);
  const previewParty = data?.party && isPreview ? getMockChatRoom(partyId, data, clock).context.party : data?.party;
  const transfers = data?.settlement?.partyId === partyId
    ? data.settlement.items?.flatMap((item) => item.transfers ?? []) ?? [] : [];
  const leaveState = getLeavePartyState(previewParty, clock, transfers);
  const leaveParty = useLeaveParty({ party: previewParty, now: clock, transfers,
    onLeft: (party) => navigate("/", { replace: true, state: { leftParty: party } }),
  });
  const goHome = () => navigate("/");
  const openChat = (roomId, account, matchingResult = data) => {
    if (onOpenChat) return onOpenChat(roomId, account);
    const roomAccount = account ? {
      ...account,
      bankName: account.bankName ?? (banks ?? data.banks)?.find((bank) => bank.code === account.bankCode)?.name,
    } : undefined;
    navigate(`/rooms/${roomId}`, { state: { account: roomAccount, isPreview, matchingResult } });
  };

  function confirm() {
    setActionError("");
    try {
      const myMember = data.party.members.find((member) => member.memberId === data.party.myMemberId);
      if (!["PENDING", "ACCEPTED"].includes(myMember?.decision) || data.party.status === "CANCELLED") {
        throw new Error("지금은 이 팟을 확정할 수 없어요.");
      }
      if (myMember.decision !== "ACCEPTED" && data.party.confirmDeadlineAt && clock >= Date.parse(data.party.confirmDeadlineAt)) {
        throw new Error("팟 확정 마감 시간이 지났어요. 귀가 방법을 다시 확인해 주세요.");
      }
      const members = data.party.members.map((member) => member.memberId === data.party.myMemberId
        ? { ...member, decision: "ACCEPTED" } : member);
      const party = { ...data.party, members,
        status: members.filter((member) => ["PENDING", "ACCEPTED"].includes(member.decision))
          .every((member) => member.decision === "ACCEPTED") ? "PREPAYING" : data.party.status,
      };
      if (!party.roomId) throw new Error("채팅방 정보를 확인할 수 없어요.");
      updateParty({ party });
      openChat(party.roomId, undefined, { ...data, party });
    } catch (failure) {
      setActionError(failure.message);
    }
  }

  function leave() {
    if (leaveParty.leave()) leaveDialog.current?.close();
  }
  if (loading || error || !data?.party) {
    return <div className="flex flex-1 flex-col gap-4">
      <div className="-mx-4"><TopBar title="매칭 결과" leftAction="close" onLeftClick={goHome} /></div>
      <p role="status" className="text-heading2 font-bold">{loading ? "매칭 결과를 불러오고 있어요" : "매칭 결과를 확인할 수 없어요"}</p>
      {!loading && <>
        <Button onClick={retry}>다시 불러오기</Button>
        <Button variant="secondary" onClick={goHome}>귀가 방법 다시 보기</Button>
      </>}
    </div>;
  }

  const { party, settlement, settlementNotReady, settlementError } = data;
  const { members, companionCount, allSameSchool, mySettlementItem, isRepresentative } = toMatchingResultView(party, settlement);
  const context = state?.matchingContext ?? data;
  const destinationLabel = party.districtName ?? context.rideRequest?.districtName ?? context.rideRequest?.destinationDongName;

  if (isRepresentative) return <RepresentativeMatchingResult
    key={party.id} party={party} settlement={settlement} onBack={goHome} retry={retry}
    banks={banks ?? data.banks}
    onOpenChat={openChat} isPreview={isPreview}
  />;

  return <div className="flex flex-1 flex-col">
    <div className="-mx-4">
      <TopBar title="매칭 결과" leftAction="close" onLeftClick={goHome} />
    </div>
    <h1 className="mt-2 text-title3 font-bold">
      {allSameSchool ? "같은 학교 " : ""}{companionCount}명과<br />매칭됐어요
    </h1>
    <p className="mt-2 text-body2 text-label-neutral">
      {formatTime(party.departureAt)} · {party.pickupPoint?.name}
      {destinationLabel && ` → ${destinationLabel}`}
    </p>
    <FareCompare className="mt-4" 
      shareLabel="예상 1인 부담액" sharePrice={formatWon(mySettlementItem?.estimatedShareWon)}
      aloneLabel="혼자 택시" alonePrice={formatWon(context.travelOptions?.soloTaxiEstimatedWon)}
    />
    <section aria-label="대표에게 보낼 금액" className="mt-4 rounded-8 border-[1.5px] border-primary-normal p-3">
      <div className="flex items-center justify-between gap-1.5">
        <div>
          <h2 className="text-body2 font-semibold">
            탈 때 대표에게 보낼 금액
          </h2>
          <p className="mt-1 text-caption1 text-label-alternative">
            {mySettlementItem?.prepayDueWon === 0 ? "대표는 선입금하지 않아요" : "예상 분담액의 1.2배 · 최대 금액"}
          </p></div>
        <p className="text-title3 font-bold text-primary-normal">
          {mySettlementItem ? formatWon(mySettlementItem.prepayDueWon) : "금액 준비 중"}</p>
      </div>
      {(settlementNotReady || settlementError || !mySettlementItem) && <p role="status" className="mt-2 text-label2 text-label-neutral">
        {settlementError ? "정산 정보를 불러오지 못했어요." : "정산 금액이 아직 준비되지 않았어요."}
        <button type="button" className="ml-2 text-primary-normal underline" onClick={retry}>다시 확인</button>
      </p>}
      <p className="mt-2 text-label2 text-label-neutral">
        택시를 부르기 전에 먼저 보내요. 내린 뒤 실제 금액과의 차액은<br/> 정산 화면에서 확인하고, 주고받기는 채팅방에서 해요.
      </p>
    </section>
    <section aria-labelledby="dropoff-order-title" className="mt-4 rounded-16 border border-line-alternative p-3">
      <h2 id="dropoff-order-title" className="mb-2 text-label2 text-label-alternative">
        내리는 순서
      </h2>
      {members.map((member) =>
      <MemberRow key={member.memberId} className="px-0 py-2"
        order={member.stopOrder ?? "-"} name={member.memberId === party.myMemberId ? "나" : member.maskedName} school={member.universityName}
        gender={member.genderLabel} isMe={member.memberId === party.myMemberId} isRepresentative={member.isRepresentative}
        note={`${member.destinationDongName}에서 내려요${member.isRepresentative ? " · 택시 호출 · 결제" : ""}`} 
      />)}
    </section>
    <p className="mt-4 text-caption1 text-label-alternative">
      {party.confirmDeadlineAt
        ? `${formatTime(party.confirmDeadlineAt)}까지 확정하지 않고 막차를 타도 돼요. `
        : "확정 마감 시간은 아직 정해지지 않았어요. "}
      확정하면 채팅방이 열려요.
    </p>
    <div className="sticky bottom-0 mt-auto flex flex-col gap-2 bg-background-normal pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {actionError && <p role="alert" className="text-label2 text-status-negative">{actionError}</p>}
      <Button className="w-full" onClick={confirm}>
        이 팟 확정하기
      </Button>
      <Button className="w-full" variant="secondary" disabled={!leaveState.canLeave} onClick={() => leaveDialog.current.showModal()}>
        빠지기
      </Button>
      {!leaveState.canLeave && <p className="text-label2 text-label-alternative">{leaveState.reason}</p>}
    </div>
    {createPortal(<dialog ref={leaveDialog} aria-labelledby={leaveTitleId} aria-describedby={leaveDescriptionId}
      className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[85dvh] w-full max-w-110 overflow-y-auto rounded-t-24 border-0 bg-transparent p-0 text-label-normal backdrop:bg-material-dimmer">
      <BottomSheet onClose={() => leaveDialog.current.close()}>
        <h2 id={leaveTitleId} className="mt-3 w-full text-title3 font-bold">팟에서 나갈까요?</h2>
        <p id={leaveDescriptionId} className="w-full text-body2 text-label-neutral">나가면 다시 들어올 수 없어요.</p>
        {!leaveState.canLeave && <p role="status" className="w-full text-label2 text-label-neutral">{leaveState.reason}</p>}
        {leaveParty.error && <p role="alert" className="w-full text-label2 text-status-negative">{leaveParty.error}</p>}
        <div className="mt-2 grid w-full grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => leaveDialog.current.close()}>취소</Button>
          <Button variant="danger" disabled={!leaveState.canLeave} onClick={leave}>
            나가기
          </Button>
        </div>
      </BottomSheet>
    </dialog>, document.body)}
  </div>;
}
