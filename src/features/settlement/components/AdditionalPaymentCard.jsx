import { useEffect, useRef, useState } from "react";
import AccountCard from "./AccountCard";
import useRecipientAccount from "../../chat/hooks/useRecipientAccount";
import { BANK_OPTIONS } from "../../../shared/constants/banks";

export default function AdditionalPaymentCard({
  view,
  isPreview,
  party,
  settlement,
}) {
  const [copied, setCopied] = useState(null);
  const [notice, setNotice] = useState("");
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );
  const recipient = useRecipientAccount({
    party: party ?? {},
    settlement,
    isPreview,
  });
  const account = isPreview ? view.representativeAccount : recipient.account;
  const bankName =
    account?.bankName ??
    BANK_OPTIONS.find((bank) => bank.code === account?.bankCode)?.name ??
    account?.bankCode;

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
            ? `${bankName} ${account.accountNumber}`
            : recipient.loading
              ? "대표 계좌를 확인하고 있어요"
              : "대표 계좌를 확인할 수 없어요"
        }
        accountNote={
          account
            ? account.maskedHolderName
              ? `예금주 ${account.maskedHolderName}`
              : "예금주 정보 없음"
            : (recipient.error ??
              (recipient.missingTransfer
                ? "본인의 선입금 이체 정보를 확인할 수 없어요."
                : "채팅방에서 대표에게 계좌를 확인해 주세요."))
        }
        onCopyAmount={() => copy("amount")}
        onCopyAccount={() => copy("account")}
        amountCopyLabel={copied === "amount" ? "복사했어요" : "금액 복사"}
        accountCopyLabel={copied === "account" ? "복사했어요" : "계좌 복사"}
        accountCopyDisabled={!account}
        className="[&_p]:select-text"
      />
      <p
        role="status"
        aria-live="polite"
        className="text-caption1 text-label-neutral mt-2"
      >
        {notice}
      </p>
    </section>
  );
}
