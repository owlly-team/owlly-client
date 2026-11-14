export async function loadPrepayRecipientAccount(api, transferId) {
  if (typeof transferId !== "string" || !/^[1-9][0-9]*$/.test(transferId))
    throw new Error("본인의 선입금 이체 정보를 확인할 수 없어요.");
  const { data } = await api.recipientAccount(transferId);
  if (
    typeof data?.accountId !== "string" ||
    !/^[1-9][0-9]*$/.test(data.accountId) ||
    data.purpose !== "PREPAY_RECEIVE" ||
    typeof data.bankCode !== "string" ||
    !data.bankCode.trim() ||
    typeof data.accountNumber !== "string" ||
    !data.accountNumber.trim() ||
    typeof data.maskedHolderName !== "string" ||
    !data.maskedHolderName.trim()
  )
    throw new Error("대표의 수취 계좌 정보를 확인할 수 없어요.");
  // 화면 메모리에서만 사용하며 라우터·공통 스토어에 보관하지 않는다.
  return {
    accountId: data.accountId,
    bankCode: data.bankCode,
    accountNumber: data.accountNumber,
    maskedHolderName: data.maskedHolderName,
    purpose: data.purpose,
  };
}
export function recipientAccountErrorMessage(error) {
  if (error.code === "ACCOUNT_NOT_REGISTERED")
    return "대표가 아직 받을 계좌를 등록하지 않았어요.";
  if (error.status === 410 || error.code === "ACCOUNT_EXPIRED")
    return "계좌 조회 기간이 끝났어요. 더 이상 계좌를 확인할 수 없어요.";
  if ([401, 403, 404].includes(error.status))
    return "이 계좌를 조회할 권한이 없어요. 채팅방 접근 상태를 확인해 주세요.";
  if (error.status === 429)
    return "계좌 조회가 많아요. 잠시 후 다시 확인할게요.";
  return "대표 계좌를 불러오지 못했어요. 잠시 후 다시 확인할게요.";
}
