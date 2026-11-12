import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import Button from "../../../shared/components/Button";
import SettlementAmountField from "../components/SettlementAmountField";
import SettleTable from "../components/SettleTable";
import DropoffOrderSheet from "../components/DropoffOrderSheet";

export default function SettlementInput({
  onAmountChange,
  onOrderChange,
  onConfirm,
  isSubmitting = false,
}) {
  const navigate = useNavigate();
  const { partyId } = useParams();
  const { state } = useLocation();
  const party = state?.matchingResult?.party;
  const validContext = party
    ? party.id === partyId &&
      Boolean(party.myMemberId) &&
      party.myMemberId === party.representativeMemberId
    : partyId === "401";
  const [amount, setAmount] = useState(
    state?.settlementDraft?.amount ?? "30000",
  );
  // 정산 입력 UI에 표시할 값. 분담금은 계산하지 않고 추후 API 응답으로 교체한다.
  const [rows, setRows] = useState(
    state?.settlementDraft?.rows ?? [
      {
        memberId: "501",
        name: "김*연",
        note: "영통1동 · 8km",
        confirmed: "5,000원",
        received: "5,400원",
        refund: "+400원",
      },
      {
        memberId: "507",
        name: "김*연",
        note: "영통1동 · 8km",
        confirmed: "5,000원",
        received: "5,400원",
        refund: "+400원",
      },
      {
        memberId: "502",
        name: "박*연",
        note: "영통2동 · 12km",
        confirmed: "8,750원",
        received: "9,500원",
        refund: "+750원",
      },
      {
        memberId: "503",
        name: "나 · 대표",
        note: "매탄동 · 16km",
        confirmed: "16,250원",
        received: "-",
        refund: "-",
        isRepresentative: true,
      },
    ],
  );
  const [editingOrder, setEditingOrder] = useState(false);
  const [notice, setNotice] = useState("");

  function goBack() {
    const draft = { amount, rows };
    const returnTo = state?.returnTo;
    navigate(
      returnTo
        ? { pathname: returnTo.pathname, search: returnTo.search }
        : "/rooms/601",
      {
        replace: true,
        state: { ...(returnTo?.state ?? state), settlementDraft: draft },
      },
    );
  }

  if (!validContext)
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="-mx-4">
          <TopBar title="정산" onLeftClick={() => navigate("/")} />
        </div>
        <p role="status" className="text-body2 text-label-neutral">
          정산 입력 정보를 확인할 수 없어요. 대표 계정의 채팅방에서 다시 열어
          주세요.
        </p>
        <Button onClick={() => navigate("/")}>홈으로</Button>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col">
      <div className="-mx-4">
        <TopBar title="정산" onLeftClick={goBack} />
      </div>
      <div className="pt-4">
        <h1 className="text-title3 text-label-normal font-bold">
          결제 금액을 입력해 주세요
        </h1>
        <p className="text-body2 text-label-alternative mt-1">
          모두 내렸어요. 결제 금액을 넣으면 멤버별 차액을 계산해요.
        </p>
      </div>
      <div className="mt-5">
        <SettlementAmountField
          value={amount}
          disabled={isSubmitting}
          onChange={(next) => {
            setAmount(next);
            setNotice("");
            onAmountChange?.(
              next,
              rows.map((row) => row.memberId),
            );
          }}
        />
      </div>
      <section aria-label="멤버별 정산 금액" className="mt-4">
        <SettleTable rows={rows} className="border-line-alternative border" />
        <p className="text-caption1 text-label-alternative mt-3">
          확정 금액은 구간별 거리와 함께 탄 인원에 따라 나눠요.
          <br />
          차액이 +면 돌려줄 금액, −면 더 받을 금액이에요.
        </p>
        <Button
          variant="text"
          className="text-label2 mt-2 px-0!"
          disabled={isSubmitting}
          aria-haspopup="dialog"
          onClick={() => setEditingOrder(true)}
        >
          내린 순서가 바뀌었나요? 순서 고치기
        </Button>
      </section>
      <footer className="bg-background-normal sticky bottom-0 mt-auto pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
        {notice && (
          <p
            role="status"
            className="text-label2 text-label-alternative mb-3 text-center"
          >
            {notice}
          </p>
        )}
        <Button
          className="w-full"
          disabled={amount === "" || Number(amount) <= 0 || isSubmitting}
          aria-busy={isSubmitting}
          onClick={() => {
            if (onConfirm)
              onConfirm({
                amountWon: Number(amount),
                memberIds: rows.map((row) => row.memberId),
              });
            else
              navigate(`/parties/${partyId}/settlement/refund`, {
                state: {
                  ...state,
                  settlementDraft: { amount, rows },
                  isPreview: true,
                },
              });
          }}
        >
          {isSubmitting ? "정산 확정 중" : "정산 확정하기"}
        </Button>
      </footer>
      {editingOrder && (
        <DropoffOrderSheet
          rows={rows}
          onClose={() => setEditingOrder(false)}
          onApply={(next) => {
            setRows(next);
            setEditingOrder(false);
            setNotice("");
            onOrderChange?.(
              next.map((row) => row.memberId),
              amount,
            );
          }}
        />
      )}
    </div>
  );
}
