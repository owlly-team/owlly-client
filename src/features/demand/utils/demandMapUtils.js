import { isPoint } from "../../matching/utils/mapUtils.js";

export const DAY_OPTIONS = [
  "금요일",
  "토요일",
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
];
export const TIME_OPTIONS = ["23~01시", "21~23시", "00~02시"];
const WEEKDAYS = {
  일요일: 0,
  월요일: 1,
  화요일: 2,
  수요일: 3,
  목요일: 4,
  금요일: 5,
  토요일: 6,
};
const SLOT_START = {
  "23~01시": "23:00",
  "21~23시": "21:00",
  "00~02시": "00:00",
};

export function demandQuery(day, time) {
  return {
    weekday: WEEKDAYS[day],
    slotStart: SLOT_START[time],
    candidateOnly: true,
    limit: 5,
  };
}

export function demandStrokeWeight(demand, maximum) {
  return Number.isFinite(demand) && demand >= 0 && maximum > 0
    ? 2 + 5 * Math.sqrt(Math.min(1, demand / maximum))
    : 2;
}

const normalize = (value) => value.replace(/\s/g, "");
function resultPoint(result) {
  if (
    !result ||
    !String(result.x ?? "").trim() ||
    !String(result.y ?? "").trim()
  )
    return null;
  const point = { latitude: Number(result.y), longitude: Number(result.x) };
  return isPoint(point) ? point : null;
}
function resolvePlace(maps, query) {
  if (normalize(query) === "단국대정문") query = "단국대학교 죽전캠퍼스 정문";
  return new Promise((resolve, reject) => {
    new maps.services.Places().keywordSearch(query, (places, status) => {
      if (status !== maps.services.Status.OK)
        return reject(new Error("출발 거점 위치를 찾지 못했어요."));
      const matches = places.filter((place) => {
        const name = normalize(place.place_name);
        return name.length > 2 && normalize(query).endsWith(name);
      });
      const point = resultPoint(matches.length === 1 ? matches[0] : null);
      if (!point)
        return reject(new Error("출발 거점 위치를 정확히 확인할 수 없어요."));
      resolve(point);
    });
  });
}
function resolveArea(maps, query) {
  return new Promise((resolve, reject) => {
    new maps.services.Geocoder().addressSearch(query, (areas, status) => {
      const area =
        status === maps.services.Status.OK && areas.length === 1
          ? areas[0]
          : null;
      const point = resultPoint(area);
      if (!point)
        return reject(new Error("도착 권역 위치를 확인할 수 없어요."));
      resolve(point);
    });
  });
}

export async function resolveDemandPaths(maps, routes) {
  const places = new Map();
  const areas = new Map();
  const lookup = (cache, query, resolver) => {
    if (!query) return Promise.reject(new Error("구간 위치 정보가 없어요."));
    if (!cache.has(query)) cache.set(query, resolver(maps, query));
    return cache.get(query);
  };
  const results = await Promise.allSettled(
    routes.map(async (route) => {
      const [origin, destination] = await Promise.all([
        lookup(places, route.originQuery, resolvePlace),
        lookup(areas, route.destinationQuery, resolveArea),
      ]);
      return { ...route, origin, destination };
    }),
  );
  return {
    paths: results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value),
    missingCount: results.filter((result) => result.status === "rejected")
      .length,
  };
}
