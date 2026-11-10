// 메시지 데이터를 ChatBubble 컴포넌트가 받는 말풍선 속성으로 변환한다.
export function toChatBubble(message, context) {
  const party = context?.party;
  // 발신자의 참여 ID로 팟 멤버를 찾아 화면에 표시할 마스킹된 이름을 가져온다.
  const member = party?.members?.find((item) => item.memberId === message.senderMemberId);
  const isSystem = message.messageType === "SYSTEM";
  return {
    id: message.id,
    // 시스템 안내는 가운데, 내 메시지는 오른쪽, 다른 멤버의 메시지는 왼쪽에 표시한다.
    variant: isSystem ? "system" : party?.myMemberId && message.senderMemberId === party.myMemberId ? "outgoing" : "incoming",
    // 시스템 안내에는 이름을 붙이지 않는다. 발신자 정보가 없으면 '멤버'로 표시한다.
    sender: isSystem ? undefined : member?.maskedName ?? "멤버",
    // 본문은 그대로 전달한다. '[가려진 번호]'의 배지 스타일은 ChatBubble에서 처리한다.
    message: message.body,
  };
}
