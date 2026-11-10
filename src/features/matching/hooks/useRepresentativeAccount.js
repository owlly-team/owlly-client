import { useRef, useState } from "react";
import { normalizeAccount, upsertPrepayAccount } from "../api/roomAccountApi";

export default function useRepresentativeAccount({ roomId, csrfToken, onOpenChat, isPreview }) {
  const [input, setInput] = useState({ bankCode: "", accountNumber: "", holderName: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");
  const request = useRef(null);
  const submitting = useRef(false);
  const update = (field) => (event) => setInput((value) => ({ ...value, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    if (saved) {
      onOpenChat?.(roomId, saved);
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const account = normalizeAccount(input);
      const fingerprint = JSON.stringify(account);
      if (request.current?.fingerprint !== fingerprint) {
        request.current = { fingerprint, key: crypto.randomUUID() };
      }
      const result = isPreview ? {
        bankCode: account.bankCode,
        maskedAccountNumber: `********${account.accountNumber.slice(-4)}`,
        maskedHolderName: `${account.holderName[0]}${"*".repeat(Math.max(1, account.holderName.length - 1))}`,
      } : await upsertPrepayAccount(roomId, account, {
        baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
        csrfToken,
        idempotencyKey: request.current.key,
      });
      setSaved(result);
      setInput({ bankCode: "", accountNumber: "", holderName: "" });
      request.current = null;
      onOpenChat?.(roomId, result);
    } catch (failure) {
      setError(failure instanceof TypeError ? "연결을 확인한 뒤 다시 시도해 주세요." : failure.message);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return { input, saving, saved, error, update, submit };
}
