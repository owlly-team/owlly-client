import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createHomeApi } from "../api/homeApi";
import { loadCurrentRide } from "../utils/loadHomeData";
import { loadLastTrain } from "../utils/loadLastTrain";
import {
  busChoiceError,
  createTransportAttempt,
  submitTransportChoice,
} from "../utils/busChoice";

export default function useTravelChoice(routeState, isPreview, mode = "BUS") {
  const { status, user, csrfToken } = useSessionStore();
  const userId = user?.id;
  const allowed =
    status === "authenticated" &&
    user?.role === "STUDENT" &&
    user?.status === "ACTIVE";
  const source =
    routeState?.userId === userId ? routeState?.travelContext : null;
  const [snapshot, setSnapshot] = useState(null);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [attemptState, setAttemptState] = useState(null);
  const [now, setNow] = useState(Date.now);
  const operation = useRef(null);
  const attempt = useRef(null);
  const navigate = useNavigate();
  const scope = JSON.stringify([
    userId,
    mode,
    source?.pickupPoint?.id,
    source?.dropoff,
  ]);
  const current =
    snapshot?.scope === scope && snapshot.revision === revision
      ? snapshot
      : null;
  const retrying =
    attemptState?.scope === scope && attemptState.csrfToken === csrfToken;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    attempt.current = null;
    return () => operation.current?.abort();
  }, [scope, isPreview, csrfToken]);
  useEffect(() => {
    if (isPreview || !allowed) return;
    const controller = new AbortController();
    loadLastTrain(createHomeApi(csrfToken, controller.signal), source, userId)
      .then((data) => {
        if (!controller.signal.aborted) setSnapshot({ scope, revision, data });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error.status === 401) useSessionStore.getState().clearSession();
        setSnapshot({ scope, revision, error });
      });
    return () => controller.abort();
  }, [isPreview, allowed, source, userId, csrfToken, scope, revision]);

  async function choose() {
    if (
      isPreview ||
      !allowed ||
      !current?.data ||
      operation.current ||
      retryAt > Date.now()
    )
      return;
    const controller = new AbortController();
    operation.current = controller;
    const active = () =>
      !controller.signal.aborted &&
      useSessionStore.getState().user?.id === userId;
    const api = createHomeApi(csrfToken, controller.signal);
    setSaving(true);
    setActionError("");
    try {
      if (!csrfToken) throw new Error("로그인 상태를 다시 확인해 주세요.");
      if (!attempt.current) {
        const { journey } = await loadCurrentRide(api);
        if (!active()) return;
        attempt.current = createTransportAttempt(
          { ...current.data, journey },
          mode,
        );
        setAttemptState({ scope, csrfToken });
      }
      const journey = await submitTransportChoice(api, attempt.current);
      if (active())
        navigate("/home", {
          replace: true,
          state: {
            selectedTransport: mode === "SOLO" ? "taxi" : "transit",
            journeyId: journey.id,
          },
        });
    } catch (error) {
      if (!active()) return;
      if (error.status === 401) useSessionStore.getState().clearSession();
      setActionError(busChoiceError(error, mode));
      if (error.status === 429)
        setRetryAt(
          Date.now() + Math.max(1000, (Number(error.retryAfter) || 30) * 1000),
        );
    } finally {
      if (operation.current === controller) operation.current = null;
      if (active()) setSaving(false);
    }
  }
  const transit = current?.data?.travelOptions?.transit;
  return {
    status,
    allowed,
    data: allowed ? current?.data : null,
    error: current?.error,
    loading: !isPreview && (status === "loading" || (allowed && !current)),
    saving,
    actionError,
    choose,
    canChoose:
      allowed &&
      current?.data &&
      !current.error &&
      !saving &&
      retryAt <= now &&
      (mode === "SOLO" ||
        (transit?.available === true &&
          (retrying || now <= Date.parse(transit.lastLeaveAt)))),
    expired:
      mode === "BUS" &&
      !retrying &&
      transit?.available === true &&
      now > Date.parse(transit.lastLeaveAt),
    retry: () => {
      if (!operation.current) setRevision((value) => value + 1);
    },
  };
}
