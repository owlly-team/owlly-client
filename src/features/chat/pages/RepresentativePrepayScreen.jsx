import { formatWon } from "../../home/utils/homeUtils";
import { toMatchingResultView } from "../../matching/utils/matchingResultUtils";
import { getPrepayAmount } from "../utils/prepayUtils";
import PrepayLayout from "../components/PrepayLayout";

export default function RepresentativePrepayScreen({ party, settlement, account, onTaxiCalled }) {
  const { members } = toMatchingResultView(party, settlement);
  const items = settlement?.partyId === party.id ? settlement.items : [];
  const payments = members.filter((member) => member.memberId !== party.representativeMemberId)
    .map((member) => ({ member, amount: getPrepayAmount(items.find((item) => item.memberId === member.memberId)) }));
  const total = payments.length && payments.every(({ amount }) => amount !== null)
    ? payments.reduce((sum, { amount }) => sum + amount, 0) : null;
  const accountLabel = [account?.bankName ?? account?.bankCode, account?.accountNumber ?? account?.maskedAccountNumber]
    .filter(Boolean).join(" ");

  return <PrepayLayout notice="집결 시각이에요 · 확인 코드를 맞추면 멤버들이 먼저 보내요"
    actionLabel="택시를 불렀어요" onNext={onTaxiCalled}>
    <h1 className="mt-5 text-title3 font-bold">
      들어온 돈을 확인하고<br />택시를 불러 주세요
    </h1>
    <p className="mt-2 text-body2 text-label-neutral">
      은행 앱에서 입금을 확인해 주세요. 확인이 필요하면 채팅방에서 멤버와 직접 이야기해요.
    </p>
    <section aria-label="멤버별 받을 금액" className="mt-4 rounded-16 border border-line-alternative p-4">
      <p className="text-label2 text-label-alternative">받을 금액 {formatWon(total)}{accountLabel && ` · ${accountLabel}`}</p>
      <ul className="mt-1">
        {payments.map(({ member, amount }) => <li key={member.memberId} className="flex items-center justify-between gap-3 py-2">
          <div>
            <p className="text-body2 font-semibold">{member.maskedName}</p>
            <p className="mt-0.5 text-caption1 text-label-alternative">{member.destinationDongName}</p>
          </div>
          <p className="text-headline2 font-bold">{formatWon(amount)}</p>
        </li>)}
      </ul>
    </section>
  </PrepayLayout>;
}
