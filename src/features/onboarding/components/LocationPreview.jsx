import iconLocationPin from "../../../assets/icons/location-pin.svg";

/**
 * Simplified stand-in for the Figma map illustration — swap for a real
 * map SDK preview (e.g. Kakao/Google Maps) when that's wired up.
 */
export default function LocationPreview({ label, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-32 w-full items-center justify-center overflow-hidden rounded-12 bg-map-ground ${className}`}
    >
      <img src={iconLocationPin} alt="" className="size-8" />
      <span className="absolute bottom-3 left-3 rounded-8 bg-background-normal px-2 py-1 text-caption1 font-semibold text-label-normal shadow-xsmall">
        {label}
      </span>
    </button>
  );
}
