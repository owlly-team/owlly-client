import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { isPoint } from "../../matching/utils/mapUtils";
import { canResolveFailure } from "../utils/matchingFailureData";
import useMatchingFailure from "./useMatchingFailure";

export default function useFailureRoute() {
  const { state, search } = useLocation();
  const navigate = useNavigate();
  const userId = useSessionStore((session) => session.user?.id);
  const requestId = new URLSearchParams(search).get("requestId");
  const selection =
    String(state?.userId) === String(userId) ? state?.selection : undefined;
  const failure = useMatchingFailure(requestId, selection);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 1000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);
  const data = failure.data;
  return {
    ...failure,
    now,
    requestId,
    canChoose: canResolveFailure(data),
    goHome: () => navigate("/"),
    retryRegistration: () => {
      if (!canResolveFailure(data) || failure.saving) return;
      navigate(
        isPoint(data.selection?.destination?.point) && data.nextSlot
          ? "/start-time"
          : "/pickup",
        {
          state: data.selection,
        },
      );
    },
    openTransport: (kind) =>
      navigate(
        `/${kind === "BUS" ? "train" : "solo-taxi"}?requestId=${encodeURIComponent(requestId)}`,
        {
          state: { userId, selection: data?.selection },
        },
      ),
    openFailure: () =>
      navigate(`/matching/failed?requestId=${encodeURIComponent(requestId)}`, {
        state: { userId, selection: data?.selection },
      }),
    chooseAndClose: async (mode) => {
      const result = await failure.choose(mode);
      if (result)
        navigate("/", {
          replace: true,
          state: { selectedTransport: mode === "BUS" ? "transit" : "taxi" },
        });
    },
  };
}
