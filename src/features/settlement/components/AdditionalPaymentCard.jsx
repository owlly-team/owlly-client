import { useEffect, useRef, useState } from "react";
import Button from "../../../shared/components/Button";
import AccountCard from "./AccountCard";

export default function AdditionalPaymentCard({ view, isPreview }) {
  const [copied, setCopied] = useState(null);
  const [notice, setNotice] = useState("");
  const [checked, setChecked] = useState(false);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );
  const account = view.representativeAccount;

  async function copy(kind) {
    const version = ++request.current;
    try {
      const value =
        kind === "amount" ? String(view.amountWon) : account?.accountNumber;
      if (!value) return;
      await navigator.clipboard.writeText(value);
      if (version !== request.current) return;
      setCopied(kind);
      setNotice(
        kind === "amount" ? "금액을 복사했어요." : "계좌번호를 복사했어요.",
      );
    } catch {
      if (version !== request.current) return;
      setCopied(null);
      setNotice(
        "복사하지 못했어요. 금액이나 계좌번호를 길게 눌러 직접 복사해 주세요.",
      );
    }
  }

  return (
    <section aria-label="추가 납부 안내">
      <AccountCard
        notice={
          view.representativeName
            ? `${view.representativeName}님(대표)에게 더 보낼 금액`
            : "대표에게 더 보낼 금액"
        }
        amount={view.amount}
        amountClassName="text-status-negative"
        amountNote={`확정 ${view.confirmed} − 보낸 ${view.paid}`}
        account={
          account
            ? `${account.bankName} ${account.accountNumber}`
            : "대표 계좌를 확인할 수 없어요"
        }
        accountNote={
          account
            ? account.maskedHolderName
              ? `예금주 ${account.maskedHolderName}`
              : "예금주 정보 없음"
            : "채팅방에서 대표에게 계좌를 확인해 주세요."
        }
        onCopyAmount={() => copy("amount")}
        onCopyAccount={() => copy("account")}
        amountCopyLabel={copied === "amount" ? "복사했어요" : "금액 복사"}
        accountCopyLabel={copied === "account" ? "복사했어요" : "계좌 복사"}
        accountCopyDisabled={!account}
        className="[&_p]:select-text"
      />
      <Button
        variant="secondary"
        className="mt-3 w-full"
        disabled={!isPreview || !account || checked}
        onClick={() => setChecked(true)}
      >
        {checked ? "보냈다고 체크했어요" : "송금했어요"}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className="text-caption1 text-label-neutral mt-2"
      >
        {checked
          ? "보냈다고 체크했어요. 실제 입금 여부는 채팅방에서 확인해 주세요."
          : notice}
      </p>
      <p className="text-caption1 text-label-alternative mt-2">
        {isPreview
          ? "송금 체크 미리보기예요. 실제 송금이나 입금 확인은 처리하지 않아요."
          : "송금 체크 기능은 준비 중이에요. 실제 송금은 은행 앱에서 진행해 주세요."}
      </p>
    </section>
  );
}
