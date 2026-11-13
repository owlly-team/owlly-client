import { useEffect, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createHomeApi } from "../api/homeApi";
import {
  getSlotDates,
  getUserScopedData,
  loadCurrentRide,
  loadHomePickupPoints,
  selectSchoolPickupPoint,
  upcomingSlots,
} from "../utils/loadHomeData";
import { isPoint } from "../../matching/utils/mapUtils";
import useHomeLocation from "./useHomeLocation";
import { nearestPickupPoint } from "../utils/homeLocation";

export default function useHomeData() {
  const { status, user, csrfToken } = useSessionStore();
  const [bootstrap, setBootstrap] = useState(null);
  const [selection, setSelection] = useState(null);
  const [result, setResult] = useState(null);
  const [rideState, setRideState] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const userId = user?.id;
  const allowed =
    status === "authenticated" &&
    user?.role === "STUDENT" &&
    user?.status === "ACTIVE";
  const base = getUserScopedData(bootstrap, userId);
  const ride = getUserScopedData(rideState, userId);
  const pickupPoints = base?.pickupPoints ?? [];
  const currentLocation = useHomeLocation(userId, allowed);
  const nearestPoint = nearestPickupPoint(pickupPoints, currentLocation);
  const selectedId = getUserScopedData(selection, userId)?.id;
  const selectedPoint = pickupPoints.find((point) => point.id === selectedId);
  const pickupPoint = selectSchoolPickupPoint(pickupPoints, {
    universityId: base?.profile?.user?.universityId ?? user?.universityId,
    selectedId: selectedId ?? nearestPoint?.id,
    activeId: ride?.data?.rideRequest?.pickupPointId,
  });
  const key = JSON.stringify([userId, pickupPoint?.id]);
  const current = result?.key === key ? result : null;

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    const api = createHomeApi(csrfToken, controller.signal);
    let timer;
    async function refreshRide() {
      let delay = 15000;
      try {
        const data = await loadCurrentRide(api);
        if (!controller.signal.aborted) setRideState({ userId, data });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error.status === 401) useSessionStore.getState().clearSession();
        setRideState((previous) => ({
          userId,
          data: previous?.userId === userId ? previous.data : null,
          error,
        }));
        if ([401, 403].includes(error.status)) return;
        const seconds = Number(error.retryAfter);
        delay = Math.max(30000, Number.isFinite(seconds) ? seconds * 1000 : 0);
      }
      if (!controller.signal.aborted) timer = setTimeout(refreshRide, delay);
    }
    refreshRide();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [allowed, userId, csrfToken, retryKey]);

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    const api = createHomeApi(csrfToken, controller.signal);
    api
      .profile()
      .then(async (profile) => {
        if (profile.data?.user?.id !== userId)
          throw new Error("프로필 정보를 확인할 수 없어요.");
        const points = await loadHomePickupPoints(
          api,
          profile.data.user.universityId,
        );
        if (controller.signal.aborted) return;
        setBootstrap({
          userId,
          profile: profile.data,
          ...points,
        });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          if (error.status === 401) useSessionStore.getState().clearSession();
          setBootstrap({ userId, error });
        }
      });
    return () => controller.abort();
  }, [allowed, userId, user?.universityId, csrfToken, retryKey]);

  useEffect(() => {
    if (!allowed || !base?.profile || !pickupPoint) return;
    const controller = new AbortController();
    const api = createHomeApi(csrfToken, controller.signal);
    let timer;
    async function refresh() {
      try {
        const profile = base.profile;
        if (!isPoint(profile.defaultDropoff))
          throw new Error("기본 하차 위치를 확인해 주세요.");
        // 폴링은 완료 후 예약해 느린 요청이 겹치지 않도록 한다.
        const now = new Date();
        const travel = await api.travelOptions({
          pickupPointId: pickupPoint.id,
          dropoff: profile.defaultDropoff,
          departureAt: now.toISOString(),
        });
        const destinationDongId = travel.data?.destinationDongId;
        if (!destinationDongId)
          throw new Error("하차 지점의 교통 정보를 확인할 수 없어요.");
        const slotResults = await Promise.allSettled(
          getSlotDates(now).map((date) =>
            api.slots({
              pickupPointId: pickupPoint.id,
              destinationDongId,
              date,
              sameGenderOnly: String(profile.sameGenderDefault),
            }),
          ),
        );
        const slotFailure = slotResults.find(
          (item) => item.status === "rejected",
        );
        if ([401, 403].includes(slotFailure?.reason?.status))
          throw slotFailure.reason;
        const slotPages = slotResults
          .filter((item) => item.status === "fulfilled")
          .map((item) => item.value);
        if (slotPages.some((page) => !Array.isArray(page.data)))
          throw new Error("출발 시간대를 확인할 수 없어요.");
        if (controller.signal.aborted) return;
        setResult({
          key,
          data: {
            profile,
            pickupPoint,
            isPreview: false,
            travelOptions: {
              ...travel.data,
              destinationDongName:
                travel.data.destinationDongName ??
                (travel.data.destinationDongId === profile.defaultDongId
                  ? profile.defaultDongName
                  : undefined),
              universityId: profile.user.universityId,
              universityName: profile.user.universityName,
            },
            matchingSlots: upcomingSlots(
              slotPages.flatMap((page) => page.data),
              now.getTime(),
            ),
            presentation: {
              directionLabel: travel.data.districtName,
            },
            slotsError: slotFailure
              ? "동승 출발 시간대를 불러오지 못했어요. 잠시 후 다시 확인할게요."
              : null,
          },
        });
        timer = setTimeout(refresh, 60000);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error.status === 401) useSessionStore.getState().clearSession();
        setResult((previous) => ({
          key,
          data: previous?.key === key ? previous.data : null,
          error,
        }));
        if (![401, 403].includes(error.status)) {
          const seconds = Number(error.retryAfter);
          timer = setTimeout(
            refresh,
            Math.max(30000, Number.isFinite(seconds) ? seconds * 1000 : 0),
          );
        }
      }
    }
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [allowed, base, pickupPoint, key, csrfToken, retryKey]);

  return {
    status,
    user,
    allowed,
    data: base?.profile
      ? {
          ...current?.data,
          ...ride?.data,
          isPreview: false,
          profile: base.profile,
          pickupPoint: pickupPoint ?? ride?.data?.party?.pickupPoint,
          // 선택 중인 비교 조건과 다른 신청의 대기 인원을 섞지 않는다.
          matchingSlots: current?.data?.matchingSlots?.filter(
            () =>
              !ride?.data?.rideRequest ||
              (ride.data.rideRequest.pickupPointId === pickupPoint?.id &&
                ride.data.rideRequest.destinationDongId ===
                  current.data.travelOptions?.destinationDongId &&
                ride.data.rideRequest.sameGenderOnly ===
                  base.profile.sameGenderDefault),
          ),
          presentation: {
            directionLabel:
              ride?.data?.party?.districtName ??
              ride?.data?.rideRequest?.districtName ??
              current?.data?.travelOptions?.districtName,
          },
        }
      : null,
    error: base?.error ?? ride?.error ?? current?.error,
    pickupAvailability: base?.pickupAvailability,
    defaultDestinationLabel: base?.profile?.defaultDongName,
    loading: allowed && !base,
    refreshing: Boolean(pickupPoint && !current),
    pickupPoints,
    universityName: base?.profile?.user?.universityName ?? user?.universityName,
    pickupPoint,
    departureLabel:
      selectedPoint?.name ?? nearestPoint?.name ?? "출발지 고르기",
    nearestId: nearestPoint?.id,
    selectPickup: (id) => setSelection({ userId, id }),
    retry: () => setRetryKey((value) => value + 1),
  };
}
