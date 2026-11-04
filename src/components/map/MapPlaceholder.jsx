/**
 * Simplified stand-in for the custom map/demand illustrations in Figma —
 * swap `children` for a real map SDK (e.g. Kakao/Google Maps) or chart lib.
 */
export default function MapPlaceholder({ title, legend, height = 220, children, className = "" }) {
  return (
    <div className={`flex w-full flex-col gap-2 rounded-16 bg-background-normal p-3 ${className}`}>
      {title && <p className="px-1 text-label2 font-semibold text-label-alternative">{title}</p>}
      <div
        className="flex items-center justify-center overflow-hidden rounded-12 bg-map-ground text-caption1 text-label-alternative"
        style={{ height }}
      >
        {children ?? "지도 영역"}
      </div>
      {legend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
          {legend.map((item) => (
            <span key={item} className="flex items-center gap-1 text-caption1 text-label-alternative">
              <span className="h-1 w-4 rounded-full bg-accent-cyan" />
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
