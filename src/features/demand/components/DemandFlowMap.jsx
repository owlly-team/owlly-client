import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "../../../shared/kakaoMaps";
import {
  demandStrokeWeight,
  resolveDemandPaths,
} from "../utils/demandMapUtils";

function labelNode(name, kind) {
  const element = document.createElement("div");
  element.className = `demand-map-label demand-map-label-${kind}`;
  element.textContent = name;
  return element;
}

export default function DemandFlowMap({ routes, selectedId, onSelect }) {
  const container = useRef(null);
  const callback = useRef(onSelect);
  const selection = useRef(selectedId);
  const lines = useRef([]);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState(null);
  const activeKey = JSON.stringify([
    routes.map((route) => [
      route.id,
      route.originQuery,
      route.destinationQuery,
      route.weeklyDemand,
    ]),
    attempt,
  ]);
  useEffect(() => {
    callback.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    selection.current = selectedId;
    lines.current.forEach(({ line, route, weight }) =>
      line.setOptions({
        strokeWeight: weight + (route.id === selectedId ? 1 : 0),
        strokeOpacity: route.id === selectedId || route.isMine ? 0.95 : 0.65,
      }),
    );
  }, [selectedId]);
  useEffect(() => {
    if (!routes.length) return;
    let active = true;
    let observer;
    const drawings = [];
    const listeners = [];
    const canvas = container.current;
    loadKakaoMaps()
      .then(async (maps) => {
        const { paths, missingCount } = await resolveDemandPaths(maps, routes);
        if (!active) return;
        if (!paths.length)
          throw new Error(
            "구간의 지도 위치를 찾지 못했어요. 다시 시도해 주세요.",
          );
        canvas.replaceChildren();
        const style = getComputedStyle(canvas);
        const cyan = style.getPropertyValue("--color-accent-cyan").trim();
        const blue = style.getPropertyValue("--color-primary-normal").trim();
        const map = new maps.Map(canvas, {
          center: new maps.LatLng(
            paths[0].origin.latitude,
            paths[0].origin.longitude,
          ),
          level: 7,
        });
        const bounds = new maps.LatLngBounds();
        const origins = new Set();
        const maximum = Math.max(
          0,
          ...paths.map((route) => route.weeklyDemand ?? 0),
        );
        for (const route of paths) {
          const start = new maps.LatLng(
            route.origin.latitude,
            route.origin.longitude,
          );
          const end = new maps.LatLng(
            route.destination.latitude,
            route.destination.longitude,
          );
          bounds.extend(start);
          bounds.extend(end);
          const weight = demandStrokeWeight(route.weeklyDemand, maximum);
          const line = new maps.Polyline({
            map,
            path: [start, end],
            strokeColor: route.isMine ? blue : cyan,
            strokeWeight: weight + (route.id === selection.current ? 1 : 0),
            strokeOpacity:
              route.id === selection.current || route.isMine ? 0.95 : 0.65,
          });
          const click = () => callback.current?.(route.id);
          maps.event.addListener(line, "click", click);
          listeners.push(() => maps.event.removeListener(line, "click", click));
          drawings.push(line);
          lines.current.push({ line, route, weight });
          const originKey = `${route.origin.latitude}:${route.origin.longitude}`;
          if (!origins.has(originKey)) {
            origins.add(originKey);
            drawings.push(
              new maps.CustomOverlay({
                map,
                position: start,
                content: labelNode(route.title.split(" → ")[0], "origin"),
                yAnchor: 0,
                zIndex: 3,
              }),
            );
          }
          drawings.push(
            new maps.CustomOverlay({
              map,
              position: end,
              content: labelNode(
                route.destinationLabel,
                route.isMine ? "mine" : "destination",
              ),
              yAnchor: 1.4,
              zIndex: 2,
            }),
          );
        }
        const fit = () => {
          map.relayout();
          map.setBounds(bounds, 36, 44, 42, 44);
        };
        fit();
        observer = new ResizeObserver(fit);
        observer.observe(canvas);
        setStatus({ key: activeKey, missingCount });
      })
      .catch((error) => {
        if (active) setStatus({ key: activeKey, error });
      });
    return () => {
      active = false;
      observer?.disconnect();
      listeners.forEach((remove) => remove());
      drawings.forEach((drawing) => drawing.setMap(null));
      lines.current = [];
      canvas.replaceChildren();
    };
  }, [routes, attempt, activeKey]);
  const current = status?.key === activeKey ? status : null;
  return (
    <section
      aria-label="심야 귀가 수요 지도"
      className="rounded-16 bg-background-alternative overflow-hidden"
    >
      <div className="relative h-52">
        <div
          ref={container}
          className="absolute inset-0"
          aria-label="출발 거점과 도착 권역의 귀가 흐름"
        />
        {(!routes.length || !current || current.error) && (
          <div className="bg-background-alternative absolute inset-0 flex items-center justify-center p-5 text-center">
            <div role="status" className="text-label2 text-label-neutral">
              <p>
                {!routes.length
                  ? "선택한 시간대에 표시할 구간이 없어요."
                  : (current?.error?.message ??
                    "귀가 수요 지도를 불러오고 있어요.")}
              </p>
              {current?.error && (
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                  className="text-primary-normal mt-2 min-h-12 px-3 font-semibold"
                >
                  지도 다시 불러오기
                </button>
              )}
            </div>
          </div>
        )}
        {current?.missingCount > 0 && (
          <p
            role="status"
            className="bg-background-normal/90 text-caption2 rounded-8 absolute inset-x-2 bottom-2 px-2 py-1"
          >
            일부 구간의 위치를 확인하지 못했어요.
          </p>
        )}
      </div>
      <div className="text-caption2 text-label-alternative flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
        <span className="flex items-center gap-1">
          <span className="bg-accent-cyan h-0.5 w-4 rounded-full" />
          심야 귀가 흐름 · 굵을수록 많음
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-primary-normal h-0.5 w-4 rounded-full" />내 귀가가
          반영된 구간
        </span>
      </div>
    </section>
  );
}
