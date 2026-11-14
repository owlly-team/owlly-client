export function getRefundTransferId(item, representativeMemberId) {
  if (
    !item ||
    item.isRepresentative ||
    !Array.isArray(item.transfers) ||
    !Number.isSafeInteger(item.refundDueWon) ||
    item.refundDueWon <= 0
  )
    return null;
  const transfers = item.transfers.filter(
    (transfer) =>
      transfer?.kind === "REFUND" &&
      transfer.settlementItemId === item.id &&
      transfer.payerMemberId === representativeMemberId &&
      transfer.payeeMemberId === item.memberId &&
      transfer.amountWon === item.refundDueWon &&
      ["PENDING", "SENT", "RECEIVED"].includes(transfer.status) &&
      typeof transfer.id === "string" &&
      /^[1-9][0-9]*$/.test(transfer.id),
  );
  return transfers.length === 1 ? transfers[0].id : null;
}

export async function loadRefundRecipientAccount(api, transferId) {
  if (typeof transferId !== "string" || !/^[1-9][0-9]*$/.test(transferId))
    throw new Error("멤버의 환급 이체 정보를 확인할 수 없어요.");
  const { data } = await api.recipientAccount(transferId);
  if (
    typeof data?.accountId !== "string" ||
    !/^[1-9][0-9]*$/.test(data.accountId) ||
    data.purpose !== "REFUND_RECEIVE" ||
    typeof data.bankCode !== "string" ||
    !data.bankCode.trim() ||
    typeof data.accountNumber !== "string" ||
    !/^\d[\d-]*$/.test(data.accountNumber) ||
    typeof data.maskedHolderName !== "string" ||
    !data.maskedHolderName.trim()
  )
    throw new Error("멤버의 환급 계좌 정보를 확인할 수 없어요.");
  return {
    accountId: data.accountId,
    bankCode: data.bankCode,
    accountNumber: data.accountNumber,
    maskedHolderName: data.maskedHolderName,
    purpose: data.purpose,
  };
}

export function refundRecipientErrorMessage(error) {
  if (error.code === "ACCOUNT_NOT_REGISTERED") return "반환 계좌 등록 대기";
  if (error.status === 410 || error.code === "ACCOUNT_EXPIRED")
    return "계좌 조회 기간이 끝났어요.";
  if ([401, 403, 404].includes(error.status))
    return "환급 계좌를 조회할 권한이 없어요.";
  if (error.status === 429) return "잠시 후 계좌를 다시 확인할게요.";
  return "환급 계좌를 불러오지 못했어요. 다시 확인하고 있어요.";
}
