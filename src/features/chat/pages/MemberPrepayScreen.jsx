import { useState } from "react";
import Button from "../../../shared/components/Button";
import { formatWon } from "../../home/utils/homeUtils";
import { toMatchingResultView } from "../../matching/utils/matchingResultUtils";
import { getPrepayAmount } from "../utils/prepayUtils";
import PrepayLayout from "../components/PrepayLayout";

function CopyButton({ value, children, onError, textColor = "text-primary-normal" }) {
  const [copiedValue, setCopiedValue] = useState(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      onError("");
    } catch {
      onError("복사하지 못했어요. 내용을 길게 눌러 직접 복사해 주세요.");
    }
  }
  return <Button variant="chip" size="sm" disabled={!value} onClick={copy}
    className={`shrink-0 border border-line-alternative ${textColor}`} aria-live="polite">
    {copiedValue === value && value ? "복사했어요" : children}
  </Button>;
}

export default function MemberPrepayScreen({ party, settlement, previewAccount: account, onNext }) {
  const { members, mySettlementItem } = toMatchingResultView(party, settlement);
  const representative = members.find((member) => member.memberId === party.representativeMemberId);
  const amount = getPrepayAmount(mySettlementItem);
  const bankName = account?.bankName ?? account?.bankCode;
  const accountNumber = account?.accountNumber ?? account?.maskedAccountNumber;
  const accountLabel = [bankName, accountNumber].filter(Boolean).join(" ");
  const [copyError, setCopyError] = useState("");

  return <PrepayLayout notice="집결 시각이에요 · 확인 코드를 맞춘 뒤 대표에게 보내 주세요"
    actionLabel="다음: 탑승 확인" onNext={onNext}>
    <section aria-label="대표에게 보낼 금액과 계좌" className="mt-4 rounded-16 bg-primary-tint p-4">
      <h1 className="text-label2 font-semibold text-label-alternative">
        택시 부르기 전에 {representative?.maskedName ?? "대표"}님(대표)에게 보내 주세요
      </h1>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-headline2 font-bold">
            {formatWon(amount)}
          </p>
          <p className="text-caption1 text-label-neutral">
            내 예상 분담액 {formatWon(mySettlementItem?.estimatedShareWon)}의 1.2배
          </p>
        </div>
        <CopyButton value={amount === null ? null : String(amount)} onError={setCopyError} textColor="text-label-normal">
          금액 복사
        </CopyButton>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0 select-text">
          <p className="break-all text-body1 font-bold">
            {accountLabel || "대표 계좌 확인 필요"}
          </p>
          <p className="text-caption1 text-label-neutral">
            예금주 {account?.maskedHolderName ?? "확인 중"}
          </p></div>
        <CopyButton value={bankName && account?.accountNumber ? `${bankName} ${account.accountNumber}` : null} onError={setCopyError}>계좌 복사</CopyButton>
      </div>
    </section>
    <p className="mt-4 text-caption1 text-label-alternative">
      쓰시는 은행 앱으로 보내 주세요. 보냈는지는 채팅방에서 대표와 직접 확인해요.
    </p>
    {copyError && <p role="alert" className="mt-2 text-caption1 text-status-negative">{copyError}</p>}
  </PrepayLayout>;
}
