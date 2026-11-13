import Button from "../../../shared/components/Button";
import Switch from "../../../shared/components/Switch";
import PlaceRow from "../../../shared/components/PlaceRow";
import iconPickup from "../../../assets/icons/location-pin.svg";
import iconHome from "../../../assets/icons/nav-home.svg";

//출발 거점·하차 위치 선택 단계에 따라 시트 내용 표시
export default function PickupSheetContent({
  pickup,
  destination,
  sameGenderOnly,
  destinationMode,
  request,
  locationError,
  resolving,
  isNearest,
  hasPoints,
  canContinue,
  onSameGenderChange,
  onChooseDestination,
  onConfirmDestination,
  onContinue,
  onRetry,
  onRetryDestination,
}) {
  //하차 위치 조회 중에는 로딩, 실패하면 오류, 그 외에는 지도 조작 안내
  const destinationMessage = resolving
    ? "하차 지점을 확인하고 있어요…"
    : (destination?.error ?? "지도를 움직이거나 눌러 위치를 바꿀 수 있어요.");

  return (
    <>
      {locationError && (
        <p role="status" className="text-caption1 mb-2">
          {locationError}
        </p>
      )}
      {destinationMode ? (
        <>
          <h2 className="text-headline2 font-bold">
            {destination?.name ?? "지도에서 하차 위치를 선택해 주세요"}
          </h2>
          <p className="text-caption1 text-label-alternative mt-1">
            바꾼 위치는 오늘 동승에만 적용돼요.
          </p>
          <dl className="text-label2 my-4 flex justify-between">
            <dt>도착 권역</dt>
            <dd>{destination?.districtName ?? "위치를 선택해 주세요"}</dd>
          </dl>
          <div
            aria-live="polite"
            className="text-caption1 text-label-alternative mb-3"
          >
            {destinationMessage}
          </div>
          {destination?.error && onRetryDestination && (
            <Button
              variant="text"
              className="mb-2 w-full"
              disabled={resolving}
              onClick={onRetryDestination}
            >
              이 위치 다시 확인하기
            </Button>
          )}
          <Button
            className="w-full"
            disabled={
              !destination?.id ||
              !destination?.name ||
              resolving ||
              !!destination?.error
            }
            onClick={onConfirmDestination}
          >
            이 위치로 할게요
          </Button>
        </>
      ) : (
        <>
          {request.loading && <p role="status">출발 거점을 불러오고 있어요…</p>}
          {request.error && (
            <div role="alert">
              <p>{request.error}</p>
              <Button variant="text" onClick={onRetry}>
                다시 조회
              </Button>
            </div>
          )}
          {!request.loading && !request.error && !hasPoints && (
            <p>이용 가능한 출발 거점이 없어요.</p>
          )}
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-14 bg-primary-tint flex size-11 shrink-0 items-center justify-center">
              <img src={iconPickup} alt="" className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-body1 font-bold">
                {pickup?.name ?? "출발 거점을 선택해 주세요"}
              </h2>
              {pickup && (
                <p className="text-caption1 text-label-neutral mt-0.5">
                  {isNearest ? "가장 가까운 거점" : "출발 거점"}
                  {pickup.meetingNote && ` · ${pickup.meetingNote}`}
                </p>
              )}
            </div>
          </div>
          <PlaceRow
            icon={iconHome}
            title={`하차 지점 · ${destination?.name ?? "지도에서 지정"}`}
            subtitle="오늘만 바꾸기"
            onClick={onChooseDestination}
            className="border-line-alternative min-h-15 border"
          />
          <dl className="text-label2 mt-3 mb-5 flex items-center justify-between gap-3">
            <dt className="text-label-alternative shrink-0">도착 권역</dt>
            <dd className="text-label-normal text-right">
              {destination?.districtName ? (
                <>
                  <span className="text-body1 font-semibold">
                    {destination.districtName}
                  </span>{" "}
                  <span className="text-label-alternative">자동</span>
                </>
              ) : (
                "하차 지점을 선택해 주세요"
              )}
            </dd>
          </dl>
          <div className="mb-4 flex items-center justify-between">
            <label id="same-gender-label" className="text-body1 font-semibold">
              동성끼리만 매칭
              <span className="text-label1 text-label-alternative mt-0.5 block font-normal">
                {sameGenderOnly
                  ? "기본으로 켜져 있어요"
                  : "동성 조건 없이 매칭해요"}
              </span>
            </label>
            <Switch
              labelledBy="same-gender-label"
              checked={sameGenderOnly}
              onChange={onSameGenderChange}
            />
          </div>
          <Button
            className="w-full"
            disabled={!canContinue}
            onClick={onContinue}
          >
            다음: 출발 시간 고르기
          </Button>
        </>
      )}
    </>
  );
}
