import { useState } from "react";
import { normalizeRefundAccount } from "../utils/memberSettlementUtils";

export default function useMemberSettlement({ banks, isPreview }) {
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [savedAccount, setSavedAccount] = useState(null);
  const account = normalizeRefundAccount(bankCode, accountNumber, banks);
  const saved = Boolean(
    account &&
    savedAccount?.bankCode === account.bankCode &&
    savedAccount?.accountNumber === account.accountNumber,
  );

  function submit(event) {
    event.preventDefault();
    if (!account || saved || !isPreview) return;
    setSavedAccount(account);
  }

  return {
    bankCode,
    setBankCode,
    accountNumber,
    setAccountNumber,
    saved,
    canSubmit: Boolean(account) && !saved && isPreview,
    submit,
  };
}
