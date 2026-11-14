import { useEffect, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createHomeApi } from "../api/homeApi";
import {
  getUserScopedData,
  loadCurrentRide,
  loadHomePickupPoints,
  selectSchoolPickupPoint,
} from "../utils/loadHomeData";
import {
  loadHomeComparison,
  mergeHomeComparison,
} from "../utils/loadHomeComparison";
import useHomeLocation from "./useHomeLocation";
import { nearestPickupPoint } from "../utils/homeLocation";
import useCachedParty from "../../matching/hooks/useCachedParty";
import { rideRequestIndex } from "../../matching/stores/rideRequestIndex";

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
  const loadedRide = getUserScopedData(rideState, userId);
  const cached = useCachedParty(loadedRide?.data?.party?.id, allowed);
  const ride = cached?.error
    ? { error: cached.error }
    : loadedRide?.data && cached?.response
      ? {
          ...loadedRide,
          data: {
            ...loadedRide.data,
            party: cached.response.data,
            partyEtag: cached.response.etag,
            mySettlementItem: loadedRide.data.settlement?.items?.find(
              (item) => item.memberId === cached.response.data.myMemberId,
            ),
          },
        }
      : loadedRide;
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
        const data = await loadCurrentRide(api, {
          knownRequests: rideRequestIndex.list(userId),
        });
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
        await loadHomeComparison(
          api,
          {
            profile: base.profile,
            pickupPoint,
            signal: controller.signal,
          },
          (data) => {
            if (!controller.signal.aborted)
              setResult((previous) => ({
                key,
                data: mergeHomeComparison(
                  previous?.key === key ? previous.data : null,
                  data,
                ),
              }));
          },
        );
        if (controller.signal.aborted) return;
        timer = setTimeout(refresh, 60000);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error.status === 401) useSessionStore.getState().clearSession();
        setResult((previous) => ({
          key,
          data:
            ![401, 403].includes(error.status) && previous?.key === key
              ? { ...previous.data, slotsLoading: false }
              : null,
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
