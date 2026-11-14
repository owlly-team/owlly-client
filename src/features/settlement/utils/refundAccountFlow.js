import { getSettlementIdentity, isFinalSettlement } from "./settlementUtils.js";
import { loadPartyRoom } from "../../matching/utils/partyFlow.js";

export function getRefundOwner(party, settlement) {
  const identity = getSettlementIdentity(settlement, party?.id, party);
  if (
    !identity ||
    identity.mine.isRepresentative ||
    party.myMemberId === party.representativeMemberId ||
    !isFinalSettlement(settlement, party.id) ||
    identity.mine.refundDueWon <= 0
  )
    throw new Error("본인의 환급 정산 정보를 확인할 수 없어요.");
  return identity.mine;
}

export async function loadRefundSetup(api, party, settlement) {
  getRefundOwner(party, settlement);
  const [room, profile, banks] = await Promise.all([
    loadPartyRoom(api, party, party.roomId),
    api.profile(),
    api.banks(),
  ]);
  const holderName = profile.data?.realName?.trim();
  if (!holderName || holderName.length > 50 || /[*＊]/.test(holderName))
    throw new Error(
      "본인 프로필의 실명을 확인할 수 없어 계좌를 등록할 수 없어요.",
    );
  if (
    !Array.isArray(banks.data) ||
    !banks.data.length ||
    banks.data.some(
      (bank) =>
        typeof bank?.code !== "string" ||
        !bank.code ||
        bank.code.length > 16 ||
        typeof bank.name !== "string" ||
        !bank.name,
    )
  )
    throw new Error("은행 목록을 확인할 수 없어요.");
  return { roomId: room.id, holderName, banks: banks.data };
}

export async function registerRefundAccount(api, context, setup, account, key) {
  const { party, settlement } = context;
  getRefundOwner(party, settlement);
  if (
    !/^[1-9][0-9]*$/.test(setup?.roomId ?? "") ||
    (party.roomId && party.roomId !== setup.roomId) ||
    !setup.banks?.some((bank) => bank.code === account.bankCode) ||
    !/^\d{1,40}$/.test(account.accountNumber) ||
    !setup.holderName?.trim() ||
    setup.holderName.length > 50
  )
    throw new Error("은행·계좌번호·예금주와 채팅방 정보를 확인해 주세요.");
  await loadPartyRoom(api, party, setup.roomId);
  const { data } = await api.registerAccount(
    setup.roomId,
    "REFUND_RECEIVE",
    {
      bankCode: account.bankCode,
      accountNumber: account.accountNumber,
      holderName: setup.holderName,
    },
    key,
  );
  if (
    !/^[1-9][0-9]*$/.test(data?.id ?? "") ||
    data.purpose !== "REFUND_RECEIVE" ||
    data.bankCode !== account.bankCode ||
    typeof data.maskedAccountNumber !== "string" ||
    !data.maskedAccountNumber.trim() ||
    typeof data.maskedHolderName !== "string" ||
    !data.maskedHolderName.trim()
  )
    throw new Error("환급 계좌 등록 결과를 확인할 수 없어요.");
  return {
    id: data.id,
    purpose: data.purpose,
    bankCode: data.bankCode,
    maskedAccountNumber: data.maskedAccountNumber,
    maskedHolderName: data.maskedHolderName,
    deleteAfter: data.deleteAfter ?? null,
  };
}

export function refundAccountErrorMessage(error) {
  if (error.code === "ACCOUNT_LOCKED")
    return "이미 송금이 진행된 계좌라 변경할 수 없어요.";
  if (error.code === "ACCOUNT_PURPOSE_NOT_ALLOWED")
    return "본인의 환급 계좌만 등록할 수 있어요.";
  if (
    ["ROOM_CLOSED", "ROOM_ACCESS_EXPIRED"].includes(error.code) ||
    error.status === 410
  )
    return "종료되었거나 이용 기간이 지난 방에는 계좌를 등록할 수 없어요.";
  if ([401, 403, 404].includes(error.status))
    return "로그인과 채팅방 접근 권한을 확인해 주세요.";
  if (error.status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  return error.message ?? "환급 계좌를 등록하지 못했어요.";
}
