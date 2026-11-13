import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSessionStore from "../../../shared/stores/sessionStore";
import { applySlotDeadlines } from "../../../shared/utils/time";
import { createMatchingApi } from "../api/matchingApi";
import { getSlotDates, upcomingSlots } from "../../home/utils/loadHomeData";
import { isMatchingSelection, isPoint } from "../utils/mapUtils";
import {
  createMockMatchingSlots,
  createMockRegistration,
} from "../mocks/matchingMockData";
import {
  createRegistrationAttempt,
  registrationFingerprint,
  submitRegistration,
} from "../utils/registrationFlow";

export default function useStartTime(selection) {
  const navigate = useNavigate();
  const { csrfToken, user } = useSessionStore();
  const isPreview = import.meta.env.DEV && selection?.isPreview === true;
  const valid =
    isMatchingSelection(selection) &&
    (isPreview || isPoint(selection?.destination?.point));
  const pickupPointId = selection?.pickupPoint?.id;
  const destinationDongId = selection?.destination?.id;
  const sameGenderOnly = selection?.sameGenderOnly;
  const key = JSON.stringify([
    pickupPointId,
    destinationDongId,
    sameGenderOnly,
  ]);
  const [result, setResult] = useState(null);
  const [now, setNow] = useState(Date.now);
  const [chosen, setChosen] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attemptNumber, setAttemptNumber] = useState(0);
  const attempt = useRef(null);
  const operation = useRef(null);
  const loadedSlots = result?.key === key ? (result.slots ?? []) : [];
  const slots = isPreview ? loadedSlots : applySlotDeadlines(loadedSlots, now);
  const selectedSlot =
    chosen?.key === key
      ? slots.find(
          (slot) =>
            slot.departureAt === chosen.departureAt && slot.registrationAllowed,
        )
      : null;
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    let timer;
    const api = createMatchingApi(csrfToken, controller.signal);
    async function refresh() {
      try {
        const dates = getSlotDates();
        const pages = isPreview
          ? dates.map((date) => ({ data: createMockMatchingSlots(date) }))
          : await Promise.all(
              dates.map((date) =>
                api.slots({
                  pickupPointId,
                  destinationDongId,
                  date,
                  sameGenderOnly: String(sameGenderOnly),
                }),
              ),
            );
        if (controller.signal.aborted) return;
        if (pages.some((page) => !Array.isArray(page.data)))
          throw new Error("출발 시간대를 확인할 수 없어요.");
        setResult({
          key,
          slots: upcomingSlots(pages.flatMap((page) => page.data)),
        });
        timer = setTimeout(refresh, 30000);
      } catch (failure) {
        if (controller.signal.aborted) return;
        setResult({ key, error: failure.message, slots: [] });
      }
    }
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    valid,
    isPreview,
    pickupPointId,
    destinationDongId,
    sameGenderOnly,
    csrfToken,
    key,
    attemptNumber,
  ]);

  async function register() {
    if (!selectedSlot || operation.current || !valid) return;
    if (isPreview) {
      navigate("/carpool-registration", {
        state: {
          ...createMockRegistration(selectedSlot, selection),
          isPreview: true,
        },
      });
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setSubmitting(true);
    setError("");
    try {
      if (!user?.id || !csrfToken)
        throw new Error("로그인 상태를 다시 확인해 주세요.");
      if (Date.parse(selectedSlot.departureAt) - Date.now() < 15 * 60000)
        throw new Error(
          "등록 마감 시간이 지났어요. 다른 출발 시간을 선택해 주세요.",
        );
      const fingerprint = registrationFingerprint(selection, selectedSlot);
      if (attempt.current?.fingerprint !== fingerprint)
        attempt.current = createRegistrationAttempt(selection, selectedSlot);
      const rideRequest = await submitRegistration(
        createMatchingApi(csrfToken, controller.signal),
        attempt.current,
      );
      if (
        controller.signal.aborted ||
        useSessionStore.getState().user?.id !== user.id
      )
        return;
      navigate("/carpool-registration", {
        replace: true,
        state: {
          ...selection,
          isPreview: false,
          journeyId: attempt.current.journeyId,
          rideRequest,
          matchingSlot: selectedSlot,
        },
      });
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(
          ["ACTIVE_JOURNEY_CONFLICT", "ACTIVE_REQUEST_EXISTS"].includes(
            failure.code,
          )
            ? "진행 중인 동승 신청이 있어요. 홈에서 등록 내용을 확인해 주세요."
            : failure.message,
        );
        if (failure.code === "INVALID_DEPARTURE_SLOT")
          setAttemptNumber((value) => value + 1);
      }
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }
  return {
    isPreview,
    valid,
    slots,
    selectedSlot,
    submitting,
    error,
    loading: valid && result?.key !== key,
    loadError: result?.key === key ? result.error : null,
    select: (slot) => {
      if (!submitting) setChosen({ key, departureAt: slot.departureAt });
    },
    register,
    retry: () => setAttemptNumber((value) => value + 1),
  };
}
