import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { distanceMeters, isPoint } from "../utils/mapUtils";
import { loadMockPickupPoints, resolveMockDestination } from "../matchingMockData";

//PickupLocation 페이지의 지도·하단 시트에서 사용하는 상태와 동작
export default function usePickupLocation() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [points, setPoints] = useState([]);
  const [pickup, setPickup] = useState(state?.pickupPoint ?? null);
  //처음에는 프로필 기본 하차 지점 사용, 시간 선택 화면에서 돌아오면 오늘 선택값 유지
  const defaultDestination = state?.defaultDestination ?? null;
  const [destination, setDestination] = useState(state?.destination ?? defaultDestination);
  //지도에서 편집 중인 위치. 확정하기 전에는 오늘 하차 지점에 반영하지 않음
  const [destinationDraft, setDestinationDraft] = useState(null);
  const [sameGenderOnly, setSameGenderOnly] = useState(
    state?.sameGenderOnly ?? state?.sameGenderDefault ?? true,
  );
  const [step, setStep] = useState("pickup");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [request, setRequest] = useState({ loading: true, error: "" });
  const [attempt, setAttempt] = useState(0);
  const [locationError, setLocationError] = useState("");
  const [resolving, setResolving] = useState(false);
  const resolution = useRef(0);
  //페이지를 떠난 뒤 도착한 하차 위치 조회 결과는 무시
  useEffect(
    () => () => {
      resolution.current += 1;
    },
    [],
  );

  //지도에 표시할 임시 거점 불러오기. 다시 조회 버튼을 누르면 재실행
  useEffect(() => {
    const controller = new AbortController();
    const source = loadMockPickupPoints();
    source
      .then((data) => {
        if (controller.signal.aborted) return;
        const valid = data.filter((item) => isPoint(item.point));
        setPoints(valid);
        setPickup((previous) => valid.find((item) => item.id === previous?.id) ?? null);
        setRequest({ loading: false, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setRequest({
            loading: false,
            error: error.message,
          });
      });
    return () => controller.abort();
  }, [state?.universityId, attempt]);

  //지도와 하단 시트에서 함께 사용할 가장 가까운 거점
  const sortedPoints = currentPosition
    ? [...points].sort(
        (a, b) =>
          distanceMeters(currentPosition, a.point) - distanceMeters(currentPosition, b.point),
      )
    : points;
  const nearestId = currentPosition ? sortedPoints[0]?.id : null;

  //현재 위치 버튼을 누르면 기기 위치를 확인하고 지도를 이동
  function locate() {
    if (!navigator.geolocation) {
      setLocationError("현재 위치를 지원하지 않는 기기예요.");
      return;
    }
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentPosition({ latitude: coords.latitude, longitude: coords.longitude });
      },
      () => setLocationError("현재 위치를 확인할 수 없어요. 지도에서 직접 선택해 주세요."),
      { timeout: 10000 },
    );
  }

  //하차 선택 지도에서 클릭하거나 드래그한 좌표의 행정동 확인
  function selectDestination(point, maps) {
    setSheetOpen(true);
    const version = ++resolution.current;
    setResolving(true);
    setDestinationDraft({ point });
    new maps.services.Geocoder().coord2RegionCode(
      point.longitude,
      point.latitude,
      (regions, status) => {
        //빠르게 위치를 바꿨을 때 이전 조회 결과가 덮어쓰지 않도록 처리
        if (version !== resolution.current) return;
        const region =
          status === maps.services.Status.OK
            ? regions.find((item) => item.region_type === "H")
            : null;
        if (!region) {
          setDestinationDraft({
            point,
            error: "이 위치의 행정동을 확인할 수 없어요. 다른 위치를 선택해 주세요.",
          });
          setResolving(false);
          return;
        }
        //서버가 좌표로 행정동을 판별한 응답을 흉내 내고, 지도 선택값으로 변환
        const resolved = resolveMockDestination({ region });
        setDestinationDraft({
          id: resolved.destinationDongId,
          name: resolved.destinationDongName,
          districtId: resolved.districtId,
          districtName: resolved.districtName,
          point,
        });
        setResolving(false);
      },
    );
  }

  const destinationMode = step === "destination";
  //하차 지점 PlaceRow를 누르면 지도 편집으로 전환하고 시트 내리기
  function chooseDestination() {
    setDestinationDraft(destination);
    setStep("destination");
    setSheetOpen(false);
  }
  //'이 위치로 할게요' 버튼: 편집한 위치를 오늘 동승에만 적용
  function confirmDestination() {
    if (!destinationDraft?.name || destinationDraft.error || resolving) return;
    setDestination(destinationDraft);
    setStep("pickup");
  }
  //뒤로 가기: 하차 편집 중이면 변경 취소, 출발 선택 중이면 홈으로 이동
  function back() {
    if (destinationMode) {
      resolution.current += 1;
      setResolving(false);
      setDestinationDraft(null);
      setStep("pickup");
    } else navigate("/");
  }

  //지도 거점 마커를 누르면 출발 거점 선택 후 시트 열기
  function selectPickup(point) {
    if (destinationMode) return;
    setPickup(point);
    setSheetOpen(true);
  }

  //거점을 불러오지 못했을 때 '다시 조회' 버튼에서 사용
  function retry() {
    setRequest({ loading: true, error: "" });
    setAttempt((value) => value + 1);
  }

  //'다음: 출발 시간 고르기' 버튼: 오늘 선택값을 StartTime에 전달
  function continueToStartTime() {
    navigate("/start-time", {
      state: {
        pickupPoint: pickup,
        destination,
        defaultDestination,
        sameGenderOnly,
        sameGenderDefault: state?.sameGenderDefault,
        universityId: state?.universityId,
        universityName: state?.universityName,
      },
    });
  }

  //시트가 닫혀 있을 때 지도 위에 표시할 로딩·오류 안내
  const statusMessage =
    locationError ||
    (request.loading
      ? "출발 거점을 불러오고 있어요…"
      : request.error || (points.length === 0 ? "이용 가능한 출발 거점이 없어요." : ""));

  return {
    destinationMode,
    sheetOpen,
    isPreview: true,
    statusMessage,
    canRetry: !request.loading && !!request.error,
    back,
    locate,
    retry,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    //PickupMap에 전달할 지도 표시값과 선택 동작
    mapProps: {
      points,
      selectedId: pickup?.id,
      nearestId,
      destinationMode,
      destination: destinationMode ? destinationDraft : destination,
      currentPosition,
      onSelect: selectPickup,
      onDestination: selectDestination,
    },
    //PickupSheetContent에 전달할 시트 내용과 버튼 동작
    sheetProps: {
      pickup,
      destination: destinationMode ? destinationDraft : destination,
      sameGenderOnly,
      destinationMode,
      request,
      locationError,
      resolving,
      isNearest: pickup?.id === nearestId,
      hasPoints: points.length > 0,
      canContinue: !!pickup && !!destination?.id && !request.loading && !request.error,
      onSameGenderChange: setSameGenderOnly,
      onChooseDestination: chooseDestination,
      onConfirmDestination: confirmDestination,
      onContinue: continueToStartTime,
      onRetry: retry,
    },
  };
}
