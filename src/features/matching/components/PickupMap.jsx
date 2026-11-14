import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "../../../shared/kakaoMaps";
import { isPoint } from "../utils/mapUtils";
import iconLocationPin from "../../../assets/icons/location-pin.svg";

//거점 이름 말풍선과 원형 핀 생성
function createPickupMarker(point, { selected, isNearest, onSelect }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `pickup-map-marker${isNearest ? " is-nearest" : ""}`;
  button.setAttribute("aria-pressed", String(selected));

  const label = document.createElement("span");
  label.className = "pickup-map-marker-label";
  const name = document.createElement("span");
  name.className = "pickup-map-marker-name";
  name.textContent = point.name;
  label.append(name);
  if (isNearest) {
    const caption = document.createElement("span");
    caption.className = "pickup-map-marker-caption";
    caption.textContent = "가장 가까운 거점";
    label.append(caption);
  }

  const pin = document.createElement("span");
  pin.className = "pickup-map-marker-pin";
  const icon = document.createElement("img");
  icon.src = iconLocationPin;
  icon.alt = "";
  pin.append(icon);
  button.append(label, pin);
  button.onclick = () => onSelect(point);
  return button;
}

//지도 표시와 이벤트만 담당. 선택값과 가까운 거점 계산은 usePickupLocation에서 관리
export default function PickupMap({
  points, selectedId, nearestId, destinationMode, destination, currentPosition, onSelect, onDestination,
}) {
  const container = useRef(null);
  const [map, setMap] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onSelect, onDestination });
  useEffect(() => { callbacks.current = { onSelect, onDestination }; }, [onSelect, onDestination]);

  useEffect(() => {
    let active = true;
    let observer;
    loadKakaoMaps().then((maps) => {
      if (!active) return;
      const instance = new maps.Map(container.current, {
        center: new maps.LatLng(37.5665, 126.978), level: 5,
      });
      observer = new ResizeObserver(() => instance.relayout());
      observer.observe(container.current);
      setError("");
      setMap(instance);
    }).catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; observer?.disconnect(); };
  }, [attempt]);

  useEffect(() => {
    if (!map) return;
    const maps = window.kakao.maps;
    const validPoints = points.filter((point) => isPoint(point.point));
    const overlays = validPoints.map((point) => {
      const isNearest = point.id === nearestId;
      const button = createPickupMarker(point, {
        selected: point.id === selectedId,
        isNearest,
        onSelect: (selectedPoint) => callbacks.current.onSelect(selectedPoint),
      });
      return new maps.CustomOverlay({
        map, position: new maps.LatLng(point.point.latitude, point.point.longitude),
        content: button, yAnchor: 1, zIndex: isNearest ? 2 : 1,
      });
    });
    return () => overlays.forEach((overlay) => overlay.setMap(null));
  }, [map, points, selectedId, nearestId]);

  useEffect(() => {
    if (!map) return;
    const point = destinationMode && isPoint(destination?.point)
      ? destination.point : points.find((item) => item.id === selectedId)?.point ?? points[0]?.point;
    if (isPoint(point)) map.panTo(new window.kakao.maps.LatLng(point.latitude, point.longitude));
  }, [map, selectedId, points, destinationMode, destination?.point]);

  useEffect(() => {
    if (!map || !isPoint(currentPosition)) return;
    const maps = window.kakao.maps;
    const position = new maps.LatLng(currentPosition.latitude, currentPosition.longitude);
    const dot = document.createElement("div");
    dot.className = "pickup-map-current";
    dot.setAttribute("aria-label", "현재 위치");
    const overlay = new maps.CustomOverlay({ map, position, content: dot });
    map.panTo(position);
    return () => overlay.setMap(null);
  }, [map, currentPosition]);

  useEffect(() => {
    if (!map || !destinationMode) return;
    const maps = window.kakao.maps;
    const update = (position) => callbacks.current.onDestination({
      latitude: position.getLat(), longitude: position.getLng(),
    }, maps);
    const onDrag = () => update(map.getCenter());
    const onClick = (event) => {
      map.panTo(event.latLng);
      update(event.latLng);
    };
    maps.event.addListener(map, "dragend", onDrag);
    maps.event.addListener(map, "click", onClick);
    return () => {
      maps.event.removeListener(map, "dragend", onDrag);
      maps.event.removeListener(map, "click", onClick);
    };
  }, [map, destinationMode]);

  return <>
    <div ref={container} className="absolute inset-0" aria-label="카카오맵에서 출발 거점과 하차 위치 선택" />
    {!map && <div className="absolute inset-0 z-10 flex items-center justify-center bg-map-ground p-6 text-center">
      <div role="status"><p>{error || "지도를 불러오고 있어요…"}</p>
        {error && <button type="button" className="mt-3 text-primary-normal" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>다시 시도</button>}
      </div>
    </div>}
    {map && destinationMode && <div aria-hidden="true" className="pickup-map-destination"><span>⌂</span></div>}
  </>;
}
