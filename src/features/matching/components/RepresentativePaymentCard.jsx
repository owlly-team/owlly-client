import { formatWon } from "../../home/utils/homeUtils";
import { toRepresentativePayments } from "../utils/matchingResultUtils";

export default function RepresentativePaymentCard({
  party,
  settlement,
  retry,
}) {
  const { payments, totalWon } = toRepresentativePayments(party, settlement);
  return (
    <section
      aria-label="택시 부르기 전에 받을 금액"
      className="rounded-16 border-line-alternative mt-5 border p-4"
    >
      <h2 className="text-label2 text-label-neutral mb-3">
        택시 부르기 전에 받을 금액
      </h2>
      <div className="flex flex-col gap-4">
        {payments.map(({ member, item }) => (
          <div
            key={member.memberId}
            className="flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-body2 font-semibold">{member.maskedName}</p>
              {member.distanceLabel && (
                <p className="text-caption1 text-label-alternative mt-1">
                  {member.distanceLabel} 구간
                </p>
              )}
              <p className="text-caption1 text-label-alternative mt-1">
                예상 {formatWon(item?.estimatedShareWon)}의 1.2배
              </p>
            </div>
            <p className="text-body1 font-bold">
              {item ? formatWon(item.prepayDueWon) : "금액 준비 중"}
            </p>
          </div>
        ))}
      </div>
      <div className="border-line-alternative mt-3 flex items-center justify-between gap-3 border-t pt-3">
        <div>
          <p className="text-body2 font-semibold">합계</p>
          <p className="text-caption1 text-label-alternative mt-1">
            내린 뒤 차액은 정산 화면에서 확인해요
          </p>
        </div>
        <p className="text-body1 text-primary-normal font-bold">
          {totalWon == null ? "금액 준비 중" : formatWon(totalWon)}
        </p>
      </div>
      {totalWon == null && (
        <p role="status" className="text-label2 text-label-alternative mt-3">
          받을 금액을 아직 확인할 수 없어요.{" "}
          <button
            type="button"
            onClick={retry}
            className="text-primary-normal underline"
          >
            다시 확인
          </button>
        </p>
      )}
    </section>
  );
}
