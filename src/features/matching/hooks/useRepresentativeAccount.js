import { useState } from "react";

export default function useRepresentativeAccount({ roomId, onOpenChat }) {
  const [input, setInput] = useState({ bankCode: "", accountNumber: "", holderName: "" });
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");
  const update = (field) => (event) => setInput((value) => ({ ...value, [field]: event.target.value }));

  function submit(event) {
    event.preventDefault();
    if (saved) return onOpenChat?.(roomId, saved);
    setError("");
    const account = {
      bankCode: input.bankCode.trim(),
      accountNumber: input.accountNumber.replace(/[\s-]/g, ""),
      holderName: input.holderName.trim(),
    };
    if (!account.bankCode || account.bankCode.length > 16
      || !account.accountNumber || account.accountNumber.length > 40
      || !account.holderName || account.holderName.length > 50) {
      setError("은행, 계좌번호, 예금주를 확인해 주세요.");
      return;
    }
    const result = {
      bankCode: account.bankCode,
      accountNumber: account.accountNumber,
      maskedAccountNumber: `********${account.accountNumber.slice(-4)}`,
      maskedHolderName: `${account.holderName[0]}${"*".repeat(Math.max(1, account.holderName.length - 1))}`,
    };
    setSaved(result);
    setInput({ bankCode: "", accountNumber: "", holderName: "" });
    onOpenChat?.(roomId, result);
  }

  return { input, saved, error, update, submit };
}
