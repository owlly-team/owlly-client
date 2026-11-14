import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "../../../shared/components/Button";
import TopBar from "../../../shared/components/TopBar";
import IconButton from "../../../shared/components/IconButton";
import iconKebab from "../../../assets/icons/kebab.svg";
import TransferRow from "../components/TransferRow";
import useSettlementData from "../hooks/useSettlementData";
import {
  resolveRepresentativeSettlement,
  toRepresentativeRefundView,
} from "../utils/representativeSettlementUtils";

export default function SettlementRefund() {
  const navigate = useNavigate();
  const { partyId } = useParams();
  const { state } = useLocation();
  const [copiedMemberId, setCopiedMemberId] = useState(null);
  const [notice, setNotice] = useState("");
  const isPreview = import.meta.env.DEV && state?.isPreview === true;
  const live = useSettlementData(partyId, !isPreview);
  const { data, party } = resolveRepresentativeSettlement({
    partyId,
    state: isPreview
      ? state
      : {
          isPreview: false,
          matchingResult: {
            party: live.data?.party,
            settlement: live.data?.settlement,
          },
        },
  });
  const view = toRepresentativeRefundView(data, partyId, {
    party,
    refundAccounts: state?.refundAccounts,
  });

  function goBack() {
    navigate(`/parties/${partyId}/settlement`, { replace: true, state });
  }

  async function copyAccount(member) {
    if (!member.account) return;
    try {
      await navigator.clipboard.writeText(member.account);
      setCopiedMemberId(member.memberId);
      setNotice("");
    } catch {
      setNotice("복사하지 못했어요. 계좌를 길게 눌러 직접 복사해 주세요.");
    }
  }

  if (!view) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="-mx-4">
          <TopBar title="정산" onLeftClick={() => navigate("/")} />
        </div>
        <p role="status" className="text-body2 text-label-neutral">
          정산 정보를 확인할 수 없어요. 대표 계정의 채팅방에서 다시 열어 주세요.
        </p>
        <Button onClick={() => navigate("/")}>홈으로</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="-mx-4">
        <TopBar
          title="정산 반환 안내"
          onLeftClick={goBack}
          rightSlot={
            <IconButton
              src={iconKebab}
              alt="더보기"
              onClick={() => setNotice("더보기 기능은 준비 중이에요.")}
            />
          }
        />
      </div>
      <div className="pt-4">
        <h1 className="text-title3 text-label-normal font-bold">
          {view.totalWon > 0 ? (
            <>
              차액 {view.totalWon.toLocaleString("ko-KR")}원을
              <br />
              돌려주세요
            </>
          ) : (
            "돌려줄 금액이 없어요"
          )}
        </h1>
        <p className="text-body2 text-label-alternative mt-2">
          멤버가 입력한 계좌로 보내 주세요. 보냈는지는 채팅방에서 직접 확인해요.
        </p>
      </div>
      <section
        aria-label="멤버별 돌려줄 금액과 계좌"
        className="divide-line-alternative rounded-16 border-line-alternative mt-4 divide-y border px-4"
      >
        {view.refunds.map((member) => (
          <TransferRow
            key={member.memberId}
            {...member}
            className="rounded-none px-0 py-3 [&_p]:break-all [&_p]:select-text"
            onCopy={() => copyAccount(member)}
            copyLabel={
              copiedMemberId === member.memberId ? "복사했어요" : "계좌 복사"
            }
          />
        ))}
      </section>
      <p
        role="status"
        aria-live="polite"
        className="text-label2 text-label-alternative mt-3"
      >
        {notice || (copiedMemberId ? "계좌를 복사했어요." : "")}
      </p>
      <footer className="bg-background-normal sticky bottom-0 mt-auto pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button variant="secondary" className="w-full" disabled>
          한*윤 화면 보기
        </Button>
      </footer>
    </div>
  );
}
