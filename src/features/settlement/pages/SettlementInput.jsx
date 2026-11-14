import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import Button from "../../../shared/components/Button";
import SettlementAmountField from "../components/SettlementAmountField";
import SettleTable from "../components/SettleTable";
import DropoffOrderSheet from "../components/DropoffOrderSheet";
import { resolveRepresentativeSettlement } from "../utils/representativeSettlementUtils";
import {
  isFinalSettlement,
  isWon,
  toSettlementRows,
} from "../utils/settlementUtils";
import { toFareRows } from "../utils/fareFlow";
import useSettlementData from "../hooks/useSettlementData";
import useFareSettlement from "../hooks/useFareSettlement";
import useSettlementRoute from "../hooks/useSettlementRoute";

export default function SettlementInput(props) {
  const navigate = useNavigate();
  const { partyId } = useParams();
  const { state } = useLocation();
  const previewRequested = import.meta.env.DEV && state?.isPreview === true;
  const live = useSettlementData(partyId, !previewRequested);
  const {
    data: settlement,
    party,
    isPreview,
  } = resolveRepresentativeSettlement({
    partyId,
    state: previewRequested
      ? state
      : {
          isPreview: false,
          matchingResult: live.data,
        },
    allowPreview: import.meta.env.DEV,
  });
  const context = useMemo(
    () => ({
      party,
      settlement,
      settlementEtag: live.data?.settlementEtag,
    }),
    [party, settlement, live.data?.settlementEtag],
  );
  useEffect(() => {
    if (!previewRequested && isFinalSettlement(settlement, partyId)) {
      navigate(`/parties/${partyId}/settlement/refund`, {
        replace: true,
        state: {
          ...state,
          isPreview: false,
          settlement,
          matchingResult: context,
        },
      });
    }
  }, [previewRequested, settlement, partyId, context, navigate, state]);

  if (!settlement)
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="-mx-4">
          <TopBar title="정산" onLeftClick={() => navigate("/")} />
        </div>
        <p role="status" className="text-body2 text-label-neutral">
          {live.loading
            ? "정산 정보를 불러오고 있어요."
            : "정산 입력 정보를 확인할 수 없어요. 대표 계정의 채팅방에서 다시 열어 주세요."}
        </p>
        {!live.loading && <Button onClick={() => navigate("/")}>홈으로</Button>}
      </div>
    );

  return (
    <SettlementForm
      key={`${partyId}:${party?.myMemberId}:${isPreview}`}
      {...props}
      partyId={partyId}
      state={state}
      context={context}
      isPreview={isPreview}
      refresh={live.refresh}
      onRouteUpdated={live.applyRoute}
    />
  );
}

function SettlementForm({
  partyId,
  state,
  context,
  isPreview,
  refresh,
  onRouteUpdated,
  onAmountChange,
  onOrderChange,
  onConfirm,
  isSubmitting = false,
}) {
  const navigate = useNavigate();
  const { party, settlement } = context;
  const validDraft = isPreview || state?.matchingResult?.party?.id === partyId;
  const initialAmount =
    settlement?.actualTotalWon ?? settlement?.estimatedTotalWon;
  const [amount, setAmount] = useState(
    (validDraft ? state?.settlementDraft?.amount : undefined) ??
      (isPreview && isWon(initialAmount) ? String(initialAmount) : ""),
  );
  // UI 목업: 순서 변경 시 자리별 구간·금액은 유지하고 멤버 ID·이름만 변경
  const [rows, setRows] = useState(
    (isPreview ? state?.settlementDraft?.rows : undefined) ??
      toSettlementRows(settlement, { partyId, party, receivedOnly: true }).sort(
        (a, b) => Number(a.isRepresentative) - Number(b.isRepresentative),
      ),
  );
  const [editingOrder, setEditingOrder] = useState(false);
  const [notice, setNotice] = useState("");
  const route = useSettlementRoute({
    context,
    enabled: !isPreview,
    onUpdated: onRouteUpdated,
    refresh,
  });
  const fare = useFareSettlement({
    context,
    amount,
    enabled: !isPreview,
    refresh,
    onConfirmed: ({ data, etag }) =>
      navigate(`/parties/${partyId}/settlement/refund`, {
        replace: true,
        state: {
          ...state,
          isPreview: false,
          settlement: data,
          matchingResult: {
            ...context,
            settlement: data,
            settlementEtag: etag,
          },
        },
      }),
  });
  const submitting = isSubmitting || fare.saving || route.saving;
  const finalized = !isPreview && settlement.finalizedAt != null;
  const tableRows = isPreview
    ? rows
    : finalized
      ? toSettlementRows(settlement, {
          partyId,
          party,
          final: true,
          receivedOnly: true,
        })
      : toFareRows(context, fare.preview);
  const message =
    notice ||
    fare.notice ||
    (finalized
      ? "이미 확정된 정산이에요."
      : fare.calculating
        ? "멤버별 정산 금액을 계산하고 있어요."
        : "");

  function goBack() {
    const draft = { amount, rows };
    const returnTo = state?.returnTo;
    navigate(
      returnTo
        ? { pathname: returnTo.pathname, search: returnTo.search }
        : `/parties/${partyId}/room`,
      {
        replace: true,
        state: { ...(returnTo?.state ?? state), settlementDraft: draft },
      },
    );
  }

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
          disabled={submitting || finalized}
          onChange={(next) => {
            setAmount(next);
            setNotice("");
            if (isPreview)
              onAmountChange?.(
                next,
                rows.map((row) => row.memberId),
              );
          }}
        />
      </div>
      <section aria-label="멤버별 정산 금액" className="mt-4">
        <SettleTable
          rows={tableRows}
          confirmedLabel="확정 금액"
          className="border-line-alternative border"
        />
        <p className="text-caption1 text-label-alternative mt-3">
          확정 금액은 구간별 거리와 함께 탄 인원에 따라 나눠요.
          <br />
          차액이 +면 돌려줄 금액, −면 더 받을 금액이에요.
        </p>
        <Button
          variant="text"
          className="text-label2 mt-2 px-0!"
          disabled={submitting || finalized}
          aria-haspopup="dialog"
          onClick={() => setEditingOrder(true)}
        >
          내린 순서가 바뀌었나요? 순서 고치기
        </Button>
      </section>
      <footer className="bg-background-normal sticky bottom-0 mt-auto pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
        {message && (
          <p
            role="status"
            className="text-label2 text-label-alternative mb-3 text-center"
          >
            {message}
          </p>
        )}
        <Button
          className="w-full"
          disabled={
            isPreview
              ? amount === "" || Number(amount) <= 0 || submitting
              : !fare.canConfirm || submitting || editingOrder
          }
          aria-busy={submitting}
          onClick={() => {
            if (!isPreview) {
              fare.confirm();
              return;
            }
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
                  settlement,
                  isPreview,
                },
              });
          }}
        >
          {submitting ? "정산 확정 중" : "정산 확정하기"}
        </Button>
      </footer>
      {editingOrder && (
        <DropoffOrderSheet
          key={isPreview ? "preview" : settlement.routeVersion}
          rows={isPreview ? rows : tableRows}
          preserveMemberData={!isPreview}
          saving={route.saving}
          disabled={!isPreview && route.disabled}
          notice={isPreview ? "" : route.error}
          onClose={() => {
            if (!route.saving) setEditingOrder(false);
          }}
          onApply={async (next) => {
            if (!isPreview) {
              if (await route.update(next.map((row) => row.memberId)))
                setEditingOrder(false);
              return;
            }
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
