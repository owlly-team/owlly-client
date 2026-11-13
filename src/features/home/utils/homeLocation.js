import { distanceMeters, isPoint } from "../../matching/utils/mapUtils.js";

export function nearestPickupPoint(points, location) {
  if (!isPoint(location)) return null;
  return points
    .filter((point) => isPoint(point.point))
    .reduce(
      (nearest, point) =>
        !nearest ||
        distanceMeters(location, point.point) <
          distanceMeters(location, nearest.point)
          ? point
          : nearest,
      null,
    );
}

// 권한 조회로 새 허용 팝업을 띄우지 않고, 이미 허용한 경우에만 현재 위치를 읽는다.
export function observeHomeLocation(browser, onChange) {
  let disposed = false;
  let generation = 0;
  let permission;
  const emit = (value) => {
    if (!disposed) onChange(value);
  };
  const unavailable = () => emit({ status: "unavailable", point: null });
  const update = () => {
    const request = ++generation;
    if (permission.state !== "granted") {
      emit({ status: permission.state, point: null });
      return;
    }
    browser.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (disposed || request !== generation) return;
        const point = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        if (isPoint(point)) emit({ status: "granted", point });
        else unavailable();
      },
      () => {
        if (request === generation) unavailable();
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  };
  Promise.resolve()
    .then(async () => {
      if (!browser.permissions?.query || !browser.geolocation)
        return unavailable();
      permission = await browser.permissions.query({ name: "geolocation" });
      if (disposed) return;
      permission.addEventListener("change", update);
      update();
    })
    .catch(unavailable);
  return () => {
    disposed = true;
    generation += 1;
    permission?.removeEventListener("change", update);
  };
}
