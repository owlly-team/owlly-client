import Button from "../../../shared/components/Button";
import ReportTargetCard from "./ReportTargetCard";
import ReportReasonButton from "./ReportReasonButton";
import useMemberReport from "../hooks/useMemberReport";

const REPORT_REASONS = [
  { code: "ABUSIVE_LANGUAGE", label: "불쾌한 말이나 행동을 했어요" },
  { code: "PRIVACY_REQUEST", label: "연락처 · 계좌 등 개인정보를 요구했어요" },
  { code: "NO_SHOW", label: "약속 장소에 나오지 않았어요" },
  {
    code: "IDENTITY_MISMATCH",
    label: "다른 사람이 나왔어요 (확인 코드 불일치)",
  },
  { code: "OTHER", label: "기타" },
];

export default function MemberReportForm({
  party,
  room,
  onSubmitted,
  isPreview = false,
  message,
}) {
  const report = useMemberReport({
    party,
    room,
    onSubmitted,
    isPreview,
    message,
  });
  return (
    <form onSubmit={report.submit} className="flex flex-1 flex-col pt-5">
      <fieldset disabled={report.saving}>
        <legend className="text-caption1 text-label-alternative mb-2 font-semibold">
          누구를 신고할까요?
        </legend>
        <div className="flex flex-col gap-2">
          {report.targets.map((member) => (
            <ReportTargetCard
              key={member.memberId}
              member={member}
              selected={report.targetMemberId === member.memberId}
              onSelect={() => report.setTargetMemberId(member.memberId)}
            />
          ))}
        </div>
        {report.targets.length === 0 && (
          <p role="status" className="text-body2 text-label-alternative">
            신고할 수 있는 멤버가 없어요.
          </p>
        )}
      </fieldset>
      <fieldset disabled={report.saving} className="mt-4">
        <legend className="text-label2 text-label-alternative mb-2 font-semibold">
          어떤 일이 있었나요?
        </legend>
        <div className="flex flex-col gap-1">
          {REPORT_REASONS.map((reason) => (
            <ReportReasonButton
              key={reason.code}
              value={reason.code}
              label={reason.label}
              selected={report.reasonCode === reason.code}
              onClick={() => {
                report.setReasonCode(reason.code);
                report.setDetails("");
              }}
              className="px-1 py-3"
            />
          ))}
        </div>
        {report.reasonCode === "OTHER" && (
          <label className="text-label2 text-label-alternative mt-3 flex flex-col gap-2">
            추가 설명 (선택)
            <textarea
              maxLength={200}
              value={report.details}
              onChange={(event) => report.setDetails(event.target.value)}
              placeholder="어떤 일이 있었는지 알려 주세요."
              rows={3}
              className="rounded-12 border-line-normal text-body2 text-label-normal focus:border-primary-normal w-full resize-none border p-3 outline-none"
            />
          </label>
        )}
      </fieldset>
      <div className="rounded-12 bg-fill-normal text-label2 text-label-alternative mt-5 flex items-start gap-2 p-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="mt-0.5 size-4 shrink-0"
        >
          <path
            d="M10 2 16 5v5c0 3.5-2.5 6-6 8-3.5-2-6-4.5-6-8V5l6-3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="m7 9.5 2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p>
          신고한 사람과는 다시 매칭되지 않아요. 신고 시점까지의 대화와 설명은
          접수 후 7일간 별도로 보관한 뒤 삭제해요.
        </p>
      </div>
      <div className="bg-background-normal sticky bottom-0 mt-auto pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {report.error && (
          <p role="alert" className="text-label2 text-status-negative mb-2">
            {report.error}
          </p>
        )}
        <Button
          type="submit"
          variant="danger"
          className="w-full"
          disabled={!report.canSubmit}
          aria-busy={report.saving}
        >
          {report.saving ? "신고 접수 중" : "신고하기"}
        </Button>
      </div>
    </form>
  );
}
