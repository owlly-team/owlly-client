/**
 * rows: { term, value, accent? }[]
 */
export default function DefinitionList({ rows, className = "" }) {
  return (
    <dl className={`flex w-full flex-col gap-2 rounded-8 bg-background-normal border border-line-alternative p-4 ${className}`}>
      {rows.map((row) => (
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
