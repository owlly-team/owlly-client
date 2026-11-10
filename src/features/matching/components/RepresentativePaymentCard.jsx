import { formatWon } from "../../home/utils/homeUtils";
import { toRepresentativePayments } from "../utils/matchingResultUtils";

export default function RepresentativePaymentCard({ party, settlement, retry }) {
  const { payments, totalWon } = toRepresentativePayments(party, settlement);
  return <section aria-label="택시 부르기 전에 받을 금액" className="mt-5 rounded-16 border border-line-alternative p-4">
      <h2 className="mb-3 text-label2 text-label-neutral">
        택시 부르기 전에 받을 금액
      </h2>
      <div className="flex flex-col gap-4">
        {payments.map(({ member, item }) => <div key={member.memberId} className="flex items-center justify-between gap-3">
          <div>
            <p className="text-body2 font-semibold">{member.maskedName}</p>
            <p className="mt-1 text-caption1 text-label-alternative">예상 {formatWon(item?.estimatedShareWon)}원의 1.2배</p>
          </div>
          <p className="text-body1 font-bold">{item ? formatWon(item.prepayDueWon) : "금액 준비 중"}</p>
        </div>)}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line-alternative pt-3">
        <div>
          <p className="text-body2 font-semibold">합계</p>
          <p className="mt-1 text-caption1 text-label-alternative">
            내린 뒤 차액은 정산 화면에서 확인해요
          </p></div>
        <p className="text-body1 font-bold text-primary-normal">
          {totalWon == null ? "금액 준비 중" : formatWon(totalWon)}
        </p>
      </div>
      {totalWon == null && <p role="status" className="mt-3 text-label2 text-label-alternative">
        받을 금액을 아직 확인할 수 없어요. <button type="button" onClick={retry} className="text-primary-normal underline">다시 확인</button>
      </p>}
    </section>;
}
