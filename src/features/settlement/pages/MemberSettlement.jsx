import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import Button from "../../../shared/components/Button";
import SettleTable from "../components/SettleTable";
import RefundAccountCard from "../components/RefundAccountCard";
import AdditionalPaymentCard from "../components/AdditionalPaymentCard";
import {
  resolveMemberSettlementData,
  toMemberSettlementView,
} from "../utils/memberSettlementUtils";

export default function MemberSettlement() {
  const { partyId } = useParams();
  const { state, search } = useLocation();
  const navigate = useNavigate();
  const { data, isPreview, party, representativeAccount } =
    resolveMemberSettlementData({
      partyId,
      state,
      search,
    });
  const view = toMemberSettlementView(data, partyId, {
    party,
    representativeAccount,
  });
  function goBack() {
    if (state?.returnTo)
      navigate(
        { pathname: state.returnTo.pathname, search: state.returnTo.search },
        { state: state.returnTo.state },
      );
    else navigate(`/parties/${partyId}/room?preview=member`);
  }

  if (!view)
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="-mx-4">
          <TopBar title="정산 결과" onLeftClick={() => navigate("/")} />
        </div>
        <p role="status" className="text-body2 text-label-neutral">
          정산 정보를 확인할 수 없어요. 일반 멤버의 채팅방에서 다시 열어 주세요.
        </p>
        <Button onClick={() => navigate("/")}>홈으로</Button>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col">
      <div className="-mx-4">
        <TopBar title={view.title ?? "정산 결과"} onLeftClick={goBack} />
      </div>
      <div className="flex flex-col gap-4 pt-3">
        <p className="bg-background-alternative text-caption1 text-label-alternative self-center rounded-full px-3 py-2 text-center">
          대표님이 정산을 확정했어요 · 차액을 확인해 주세요
        </p>
        {view.differenceWon > 0 ? (
          <RefundAccountCard
            key={`${partyId}:${view.myMemberId}`}
            view={view}
            isPreview={isPreview}
          />
        ) : view.differenceWon < 0 ? (
          <AdditionalPaymentCard
            key={`${partyId}:${view.myMemberId}:${view.differenceWon}`}
            view={view}
            isPreview={isPreview}
          />
        ) : (
          <section className="rounded-16 bg-primary-tint p-4">
            <h1 className="text-headline2 font-bold">
              추가로 정산할 금액이 없어요
            </h1>
            <p className="text-body2 text-label-neutral mt-2">
              보낸 금액과 확정 금액이 같아요.
            </p>
          </section>
        )}
        <section
          aria-label="정산 내역"
          className="rounded-16 border-line-alternative overflow-hidden border"
        >
          <div className="border-line-alternative flex flex-wrap items-center justify-between gap-2 border-b p-4">
            <h2 className="text-label2 text-label-neutral">
              택시 앱 결제 금액
            </h2>
            <p className="text-title3 font-bold">{view.totalFare}</p>
          </div>
          <SettleTable rows={view.rows} receivedLabel="보낸 금액" />
        </section>
        {view.differenceWon < 0 && (
          <p className="text-caption1 text-label-alternative">
            정산 내역을 확인한 뒤 쓰시는 은행 앱으로 보내고, 보냈다고 채팅방에서
            알려 주세요.
          </p>
        )}
      </div>
      <footer className="bg-background-normal sticky bottom-0 mt-auto pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => navigate("/demand-map")}
        >
          수요 지도에서 내 귀가 보기
        </Button>
      </footer>
    </div>
  );
}
