export function toChatBubble(message, context) {
  const party = context?.party;
  const member = party?.members?.find(
    (item) => item.memberId === message.senderMemberId,
  );
  const isSystem = message.messageType === "SYSTEM";
  return {
    id: message.id,
    variant: isSystem
      ? "system"
      : party?.myMemberId && message.senderMemberId === party.myMemberId
        ? "outgoing"
        : "incoming",
    sender: isSystem ? undefined : (member?.maskedName ?? "멤버"),
    message: message.body,
  };
}
