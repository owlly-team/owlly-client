import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import Button from "../../../shared/components/Button";
import FareCompare from "../components/FareCompare";
import MemberRow from "../components/MemberRow";
import { formatTime, formatWon } from "../../home/homeUtils";
import useMatchingResult from "../useMatchingResult";
import { toMatchingResultView } from "../matchingResultUtils";

export default function MatchingResult() {
  const navigate = useNavigate();
  const { partyId } = useParams();
  const { state } = useLocation();
  const { data, loading, error, retry } = useMatchingResult(partyId, state?.matchingResult);
  const [confirmed, setConfirmed] = useState(false);
  const goHome = () => navigate("/");

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
  const { members, companionCount, allSameSchool, mySettlementItem } = toMatchingResultView(party, settlement);
  const context = state?.matchingContext ?? data;
  const destinationLabel = context.rideRequest?.districtName ?? context.rideRequest?.destinationDongName;

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
        gender={member.sameGenderAsMe ? "나와 같은 성별" : undefined} isMe={member.memberId === party.myMemberId} isRepresentative={member.isRepresentative}
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
      {confirmed && <p role="status" className="text-label2 text-primary-normal">
        목업에서 팟을 확정했어요. 채팅방은 아직 연결되지 않았어요.
      </p>}
      <Button className="w-full" disabled={confirmed} onClick={() => setConfirmed(true)}>
        {confirmed ? "확정했어요" : "이 팟 확정하기"}
      </Button>
      <Button className="w-full" variant="secondary" onClick={goHome}>
        빠지기
      </Button>
    </div>
  </div>;
}