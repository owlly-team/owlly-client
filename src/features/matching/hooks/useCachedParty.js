import { useStore } from "zustand";
import useSessionStore from "../../../shared/stores/sessionStore";
import { partyCache, partyCacheKey } from "../stores/partyCache";

export default function useCachedParty(partyId, enabled = true) {
  const userId = useSessionStore((state) => state.user?.id);
  const key =
    enabled && userId != null && partyId != null
      ? partyCacheKey(userId, partyId)
      : null;
  return useStore(partyCache.store, (state) =>
    key ? state.entries[key] : undefined,
  );
}
