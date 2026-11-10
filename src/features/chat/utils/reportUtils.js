// 신고 사유의 코드와 사용자에게 보여줄 문구를 연결한다.
// 현재는 목업 화면에서 선택 목록으로 사용하며, 코드는 API 명세의 사유 구분을 따른다.
export const REPORT_REASONS = [
  { code: "ABUSIVE_LANGUAGE", label: "불쾌한 말이나 행동을 했어요" },
  { code: "PRIVACY_REQUEST", label: "연락처 · 계좌 등 개인정보를 요구했어요" },
  { code: "NO_SHOW", label: "약속 장소에 나오지 않았어요" },
  { code: "IDENTITY_MISMATCH", label: "다른 사람이 나왔어요 (확인 코드 불일치)" },
  { code: "OTHER", label: "기타" },
];

// 같은 팟의 멤버 중 본인을 제외해 신고 대상 목록을 만든다.
// 채팅방 표시 인원과 달리 탈퇴 여부로 제외하지 않아 기존 참여자도 대상으로 남는다.
export function getReportTargets(party) {
  // 본인을 구분할 수 없으면 자기 자신을 신고 대상으로 보여주지 않도록 빈 목록을 반환한다.
  if (!party?.myMemberId) return [];
  return party.members.filter((member) => member.memberId !== party.myMemberId);
}

