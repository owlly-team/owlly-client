import { toRegistrationView } from "../utils/registrationUtils";

/**
 * data: 신청 응답의 data 객체
 * matchingSlot: { departureAt, waitingCount }
 * rows: { term, value, accent? }[] — 직접 전달하면 우선 사용한다.
 */
export default function DefinitionList({ data, matchingSlot, rows, className = "" }) {
  const displayRows = rows ?? toRegistrationView(
    data, matchingSlot,
  ).rows;

  return (
    <dl className={`flex w-full flex-col gap-2 rounded-8 bg-background-normal border border-line-alternative p-4 ${className}`}>
      {displayRows.map((row) => (
        <div key={row.term} className="flex items-center justify-between">
          <dt className="text-label1 text-label-alternative">
            {row.term}
          </dt>
          <dd className={`text-label1 font-semibold ${row.accent ? "text-primary-normal" : "text-label-normal"}`}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  ); 
}
