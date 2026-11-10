import Button from "../../../shared/components/Button";
import ReportTargetCard from "./ReportTargetCard";
import ReportReasonButton from "./ReportReasonButton";
import useMemberReport from "../hooks/useMemberReport";
import { REPORT_REASONS } from "../utils/reportUtils";

export default function MemberReportForm({ party, onSubmitted }) {
  const report = useMemberReport({ party, onSubmitted });
  return <form onSubmit={report.submit} className="flex flex-1 flex-col pt-5">
    <fieldset>
      <legend className="mb-2 font-semibold text-caption1 text-label-alternative">누구를 신고할까요?</legend>
      <div className="flex flex-col gap-2">
        {report.targets.map((member) => <ReportTargetCard key={member.memberId} member={member}
          selected={report.targetMemberId === member.memberId} onSelect={() => report.setTargetMemberId(member.memberId)} />)}
      </div>
      {report.targets.length === 0 && <p role="status" className="text-body2 text-label-alternative">신고할 수 있는 멤버가 없어요.</p>}
    </fieldset>
    <fieldset className="mt-4">
      <legend className="mb-2 font-semibold text-label2 text-label-alternative">어떤 일이 있었나요?</legend>
      <div className="flex flex-col gap-1">
        {REPORT_REASONS.map((reason) => <ReportReasonButton key={reason.code} value={reason.code} label={reason.label}
          selected={report.reasonCode === reason.code} onClick={() => { report.setReasonCode(reason.code); report.setDetails(""); }} className="px-1 py-3" />)}
      </div>
      {report.reasonCode === "OTHER" && <label className="mt-3 flex flex-col gap-2 text-label2 text-label-alternative">
        추가 설명 (선택)
        <textarea maxLength={1000} value={report.details} onChange={(event) => report.setDetails(event.target.value)}
          placeholder="어떤 일이 있었는지 알려 주세요." rows={3} className="w-full resize-none rounded-12 border border-line-normal p-3 text-body2 text-label-normal outline-none focus:border-primary-normal" />
      </label>}
    </fieldset>
    <div className="mt-5 flex items-start gap-2 rounded-12 bg-fill-normal p-3 text-label2 text-label-alternative">
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="mt-0.5 size-4 shrink-0">
        <path d="M10 2 16 5v5c0 3.5-2.5 6-6 8-3.5-2-6-4.5-6-8V5l6-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="m7 9.5 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p>신고한 사람과는 다시 매칭되지 않아요. 신고 기록은 정해진 보관 기간이 지나면 삭제돼요.</p>
    </div>
    <div className="sticky bottom-0 mt-auto bg-background-normal pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Button type="submit" variant="danger" className="w-full" disabled={!report.canSubmit}>
        신고하기
      </Button>
    </div>
  </form>;
}
