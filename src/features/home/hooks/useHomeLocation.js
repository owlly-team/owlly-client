import { useEffect, useState } from "react";
import { observeHomeLocation } from "../utils/homeLocation";
import { getUserScopedData } from "../utils/loadHomeData";

export default function useHomeLocation(userId, enabled) {
  const [location, setLocation] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    return observeHomeLocation(navigator, (value) =>
      setLocation({ userId, ...value }),
    );
  }, [userId, enabled]);
  return enabled ? (getUserScopedData(location, userId)?.point ?? null) : null;
}
