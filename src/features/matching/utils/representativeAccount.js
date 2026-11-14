// API-31 성공 응답에서 화면 이동에 필요한 마스킹 정보만 보존한다.
export async function registerRepresentativeAccount(api, roomId, account, key) {
  if (!/^[1-9][0-9]*$/.test(roomId ?? ""))
    throw new Error("채팅방 정보를 확인할 수 없어요.");
  const { data } = await api.registerAccount(
    roomId,
    "PREPAY_RECEIVE",
    {
      bankCode: account.bankCode,
      accountNumber: account.accountNumber,
      holderName: account.holderName,
    },
    key,
  );
  if (
    !data?.id ||
    data.purpose !== "PREPAY_RECEIVE" ||
    data.bankCode !== account.bankCode ||
    !data.maskedAccountNumber ||
    !data.maskedHolderName
  )
    throw new Error("계좌 등록 결과를 확인할 수 없어요.");
  return {
    id: data.id,
    purpose: data.purpose,
    bankCode: data.bankCode,
    maskedAccountNumber: data.maskedAccountNumber,
    maskedHolderName: data.maskedHolderName,
    deleteAfter: data.deleteAfter ?? null,
  };
}
