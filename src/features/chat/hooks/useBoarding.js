export default function useBoarding({ party, onRecorded, isPreview = true }) {
  const status =
    party.members?.find((member) => member.memberId === party.myMemberId)
      ?.boardingStatus ?? "UNKNOWN";
  const recorded = ["BOARDED", "MISSED"].includes(status);

  function record(nextStatus) {
    if (!isPreview || recorded || !["BOARDED", "MISSED"].includes(nextStatus))
      return;
    onRecorded({
      party: {
        ...party,
        status: nextStatus === "BOARDED" ? "RIDING" : party.status,
        members: party.members.map((member) =>
          member.memberId === party.myMemberId
            ? { ...member, boardingStatus: nextStatus }
            : member,
        ),
      },
    });
  }

  return {
    status,
    recorded,
    record,
    disabledReason: isPreview ? null : "탑승 응답은 준비 중이에요.",
  };
}
