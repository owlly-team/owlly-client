// API 연동 전 미리보기: 구간·정산 금액은 자리에 두고 멤버만 재배정한다.
export function reorderDropoffMembers(rows, memberIds) {
  const members = new Map(rows.map((row) => [row.memberId, row]));
  if (
    memberIds.length !== rows.length ||
    members.size !== rows.length ||
    new Set(memberIds).size !== rows.length ||
    memberIds.some((memberId) => !members.has(memberId)) ||
    rows.some(
      (row, index) => row.isRepresentative && memberIds[index] !== row.memberId,
    )
  )
    return rows;

  return rows.map((row, index) => {
    const member = members.get(memberIds[index]);
    return { ...row, memberId: member.memberId, name: member.name };
  });
}
