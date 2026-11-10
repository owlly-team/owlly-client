export function normalizeAccount(input) {
  const account = {
    bankCode: input.bankCode.trim(),
    accountNumber: input.accountNumber.replace(/[\s-]/g, ""),
    holderName: input.holderName.trim(),
  };
  if (!account.bankCode || account.bankCode.length > 16
    || !account.accountNumber || account.accountNumber.length > 40
    || !account.holderName || account.holderName.length > 50) {
    throw new Error("은행, 계좌번호, 예금주를 확인해 주세요.");
  }
  return account;
}

export async function upsertPrepayAccount(roomId, input, {
  baseUrl = "", csrfToken, idempotencyKey, fetcher = fetch,
} = {}) {
  if (!/^[1-9][0-9]*$/.test(roomId)) throw new Error("채팅방이 아직 준비되지 않았어요.");
  if (!csrfToken) throw new Error("계좌 등록에 필요한 인증 정보를 확인할 수 없어요.");
  if (!idempotencyKey) throw new Error("계좌 등록 요청을 다시 시도해 주세요.");
  const body = normalizeAccount(input);
  const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/api/v1/rooms/${roomId}/accounts/PREPAY_RECEIVE`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const messages = {
      ACCOUNT_PURPOSE_NOT_ALLOWED: "대표만 받을 계좌를 등록할 수 있어요.",
      ACCOUNT_LOCKED: "송금이 진행된 계좌는 변경할 수 없어요.",
      ROOM_CLOSED: "종료된 채팅방에는 계좌를 등록할 수 없어요.",
    };
    const error = new Error(messages[result?.error?.code]
      ?? (response.status === 401 ? "다시 로그인한 뒤 등록해 주세요."
        : response.status === 429 ? "요청이 많아요. 잠시 후 다시 시도해 주세요."
        : "계좌를 등록하지 못했어요. 다시 시도해 주세요."));
    error.code = result?.error?.code;
    throw error;
  }
  if (!result?.data?.maskedAccountNumber || !result.data.maskedHolderName) {
    throw new Error("계좌 등록 결과를 확인하지 못했어요. 다시 시도해 주세요.");
  }
  return result.data;
}
