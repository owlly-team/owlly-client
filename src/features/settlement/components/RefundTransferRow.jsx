import { useEffect, useRef, useState } from "react";
import TransferRow from "./TransferRow";
import useRefundRecipientAccount from "../hooks/useRefundRecipientAccount";
import { BANK_OPTIONS } from "../../../shared/constants/banks";

export default function RefundTransferRow({
  member,
  partyId,
  representativeMemberId,
  isPreview,
}) {
  const recipient = useRefundRecipientAccount({
    partyId,
    memberId: member.memberId,
    representativeMemberId,
    transferId: member.transferId,
    isPreview,
  });
  const [copiedAccountId, setCopiedAccountId] = useState(null);
  const [copyError, setCopyError] = useState("");
  const request = useRef(0);
  const account = recipient.account;
  const accountNumber = isPreview
    ? member.accountNumber
    : account?.accountNumber;
  const accountKey = isPreview ? "preview" : account?.accountId;
  const bankName =
    BANK_OPTIONS.find((bank) => bank.code === account?.bankCode)?.name ??
    account?.bankCode;
  const label = isPreview
    ? member.account
    : account
      ? `${bankName} ${account.accountNumber}`
      : null;
  useEffect(
    () => () => {
      request.current += 1;
    },
    [accountKey, member.transferId],
  );
  async function copy() {
    if (!accountNumber) return;
    const version = ++request.current;
    try {
      await navigator.clipboard.writeText(accountNumber);
      if (version !== request.current) return;
      setCopiedAccountId(accountKey);
      setCopyError("");
    } catch {
      if (version === request.current)
        setCopyError(
          "복사하지 못했어요. 계좌번호를 길게 눌러 직접 복사해 주세요.",
        );
    }
  }
  return (
    <div>
      <TransferRow
        {...member}
        account={label}
        accountNote={
          recipient.loading
            ? "계좌를 확인하고 있어요."
            : (recipient.notice ??
              (!isPreview && !member.transferId
                ? "환급 이체 정보를 확인할 수 없어요."
                : undefined))
        }
        className="rounded-none px-0 py-3 [&_p]:break-all [&_p]:select-text"
        onCopy={accountNumber ? copy : undefined}
        copyLabel={
          accountKey && copiedAccountId === accountKey
            ? "복사했어요"
            : "계좌 복사"
        }
      />
      {copyError && (
        <p role="status" className="text-caption1 text-label-alternative pb-2">
          {copyError}
        </p>
      )}
    </div>
  );
}
