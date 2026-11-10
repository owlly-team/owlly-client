import PickupMap from "../components/PickupMap";
import LocationSheet from "../components/LocationSheet";
import PickupSheetContent from "../components/PickupSheetContent";
import usePickupLocation from "../hooks/usePickupLocation";
import IconButton from "../../../shared/components/IconButton";
import locationIcon from "../../../assets/icons/location-pin.svg"
import leftIcon from "../../../assets/icons/chevron-left.svg"

//출발 거점, 하차 지점 설정 지도 페이지
export default function PickupLocation() {
  const {
    mapProps,
    sheetProps,
    destinationMode,
    sheetOpen,
    isPreview,
    statusMessage,
    canRetry,
    back,
    locate,
    retry,
    openSheet,
    closeSheet,
  } = usePickupLocation();

  return (
    <div className="bg-map-ground relative -mx-4 h-dvh overflow-hidden">
      <PickupMap {...mapProps} />
      <header className="absolute inset-x-3 top-3 z-20 flex items-start gap-2">
        <IconButton 
          src={leftIcon} onClick={back} className="shadow-medium size-11 shrink-0 rounded-full bg-white text-xl">
        </IconButton>  
        <div className="rounded-16 shadow-medium flex-1 bg-white px-4 py-3">
          <h1 className="text-body1 font-bold">
            {destinationMode ? "오늘 어디서 내릴까요?" : "어디서 출발할까요?"}
          </h1>
          {isPreview && (
            <span className="text-caption2 text-primary-normal">미리보기 · 임시 거점</span>
          )}
          <p className="text-caption1 text-label-alternative mt-1">
            {destinationMode
              ? "지도를 움직여 택시가 설 수 있는 큰길에 핀을 맞춰 주세요"
              : "택시가 설 수 있는 지정 거점만 고를 수 있어요"}
          </p>
        </div>
      </header>
      {!sheetOpen && statusMessage && (
        <div
          className="rounded-12 text-label2 shadow-medium absolute inset-x-4 top-28 z-20 bg-white p-3"
          role="status"
        >
          {statusMessage}
          {canRetry && (
            <button type="button" className="text-primary-normal ml-2" onClick={retry}>
              다시 조회
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        aria-label="하단 바 닫기"
        tabIndex={sheetOpen ? 0 : -1}
        onClick={closeSheet}
        className={`bg-material-dimmer absolute inset-0 z-30 transition-opacity duration-250 motion-reduce:transition-none ${sheetOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40">
        <div className={`mb-3 justify-end px-4 ${sheetOpen ? "hidden" : "flex"}`}>
          {!sheetOpen && destinationMode && (
            <button
              type="button"
              className="text-label2 shadow-medium pointer-events-auto mr-2 rounded-full bg-white px-4"
              onClick={openSheet}
            >
              하차 위치 확인
            </button>
          )}
          <IconButton src={locationIcon} onClick={locate} className="shadow-medium size-11 shrink-0 rounded-full bg-white text-xl"/>
        </div>
        <LocationSheet
          open={sheetOpen}
          onClose={closeSheet}
          label={destinationMode ? "하차 위치 선택" : "출발 거점 선택"}
        >
          <PickupSheetContent {...sheetProps} />
        </LocationSheet>
      </div>
    </div>
  );
}
