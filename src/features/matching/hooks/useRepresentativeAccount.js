import { useEffect, useRef, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../api/matchingApi";

export default function useRepresentativeAccount({
  roomId,
  onOpenChat,
  isPreview,
  banks,
}) {
  const [input, setInput] = useState({
    bankCode: "",
    accountNumber: "",
    holderName: "",
  });
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { csrfToken } = useSessionStore();
  const command = useRef(null);
  const operation = useRef(null);
  useEffect(() => () => operation.current?.abort(), [roomId]);
  const update = (field) => (event) => {
    const nextValue =
      field === "accountNumber"
        ? event.target.value.replace(/\D/g, "")
        : event.target.value;
    setInput((value) => ({ ...value, [field]: nextValue }));
  };

  async function submit(event, onlyOpen = false) {
    event.preventDefault();
    if (operation.current) return;
    setError("");
    const account = {
      bankCode: input.bankCode.trim(),
      accountNumber: input.accountNumber.replace(/[\s-]/g, ""),
      holderName: input.holderName.trim(),
    };
    if (
      !saved &&
      !onlyOpen &&
      (!account.bankCode ||
        account.bankCode.length > 16 ||
        !/^\d{1,40}$/.test(account.accountNumber) ||
        (!isPreview &&
          !banks?.some((bank) => bank.code === account.bankCode)) ||
        !account.holderName ||
        account.holderName.length > 50)
    ) {
      setError("은행, 계좌번호, 예금주를 확인해 주세요.");
      return;
    }
    const previewResult = {
      bankCode: account.bankCode,
      accountNumber: account.accountNumber,
      maskedAccountNumber: `********${account.accountNumber.slice(-4)}`,
      maskedHolderName: `${account.holderName[0]}${"*".repeat(Math.max(1, account.holderName.length - 1))}`,
    };
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    try {
      let result = saved;
      if (!result && !onlyOpen) {
        if (isPreview) result = previewResult;
        else {
          const fingerprint = JSON.stringify([roomId, account]);
          if (command.current?.fingerprint !== fingerprint)
            command.current = { fingerprint, key: crypto.randomUUID() };
          result = (
            await createMatchingApi(
              csrfToken,
              controller.signal,
            ).registerAccount(
              roomId,
              "PREPAY_RECEIVE",
              account,
              command.current.key,
            )
          ).data;
          if (
            !result?.id ||
            result.purpose !== "PREPAY_RECEIVE" ||
            result.bankCode !== account.bankCode ||
            !result.maskedAccountNumber ||
            !result.maskedHolderName
          )
            throw new Error("계좌 등록 결과를 확인할 수 없어요.");
          result = {
            id: result.id,
            purpose: result.purpose,
            bankCode: result.bankCode,
            maskedAccountNumber: result.maskedAccountNumber,
            maskedHolderName: result.maskedHolderName,
            deleteAfter: result.deleteAfter ?? null,
          };
        }
        if (controller.signal.aborted) return;
        // 실제 계좌 원문은 라우터 state나 성공 상태에 보관하지 않는다.
        setSaved(result);
        setInput({ bankCode: "", accountNumber: "", holderName: "" });
        command.current = null;
      }
      await onOpenChat?.(roomId, result);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure.code === "ACCOUNT_LOCKED"
            ? "이미 송금이 진행된 계좌라 변경할 수 없어요."
            : failure.code === "ROOM_CLOSED"
              ? "종료된 채팅방에는 계좌를 등록할 수 없어요."
              : failure.message,
        );
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  return { input, saved, error, update, submit, saving };
}
