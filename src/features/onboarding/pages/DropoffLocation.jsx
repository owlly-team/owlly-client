import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PickupMap from "../../matching/components/PickupMap";
import Button from "../../../shared/components/Button";
import IconButton from "../../../shared/components/IconButton";
import iconLocation from "../../../assets/icons/location-pin.svg";
import iconLeft from "../../../assets/icons/chevron-left.svg";

// 지도 핀 선택 UI가 없던 자리. Figma 목업과 같은 영통2동 근방을 기본 중심으로 쓴다.
const DEFAULT_POINT = { latitude: 37.33, longitude: 127.27 };

export default function DropoffLocation() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [draft, setDraft] = useState({
    point: state?.defaultDropoff ?? DEFAULT_POINT,
    name: state?.dropoffDongName ?? null,
  });
  const [currentPosition, setCurrentPosition] = useState(null);
  const [resolving, setResolving] = useState(false);
  const resolution = useRef(0);

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setCurrentPosition({ latitude: coords.latitude, longitude: coords.longitude }),
      () => {},
      { timeout: 10000 },
    );
  }

  function handleDestination(point, maps) {
    const version = ++resolution.current;
    setResolving(true);
    setDraft({ point, name: null });
    new maps.services.Geocoder().coord2RegionCode(point.longitude, point.latitude, (regions, status) => {
      if (version !== resolution.current) return;
      const region =
        status === maps.services.Status.OK
          ? regions.find((item) => item.region_type === "H")
          : null;
      setDraft({ point, name: region?.region_3depth_name ?? null });
      setResolving(false);
    });
  }

  function confirm() {
    navigate("/onboarding/profile", {
      replace: true,
      state: { ...state, defaultDropoff: draft.point, dropoffDongName: draft.name },
    });
  }

  return (
    <div className="bg-map-ground relative -mx-4 h-dvh overflow-hidden">
      <PickupMap
        points={[]}
        destinationMode
        destination={draft}
        currentPosition={currentPosition}
        onSelect={() => {}}
        onDestination={handleDestination}
      />
      <header className="absolute inset-x-3 top-3 z-20 flex items-start gap-2">
        <IconButton
          src={iconLeft}
          onClick={() => navigate(-1)}
          className="shadow-medium size-11 shrink-0 rounded-full bg-white"
        />
        <div className="rounded-16 shadow-medium flex-1 bg-white px-4 py-3">
          <h1 className="text-body1 font-bold">집 근처 하차 지점을 골라 주세요</h1>
          <p className="mt-1 text-caption1 text-label-alternative">
            택시가 설 수 있는 큰길로 지도를 움직여 핀을 맞춰 주세요
          </p>
        </div>
      </header>

      <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-3 p-4">
        <div className="flex justify-end">
          <IconButton
            src={iconLocation}
            onClick={locate}
            className="shadow-medium size-11 shrink-0 rounded-full bg-white"
          />
        </div>
        <div className="flex flex-col gap-3 rounded-t-24 bg-background-normal p-4 shadow-large">
          <div>
            <p className="text-body1 font-semibold text-label-normal">
              {draft.name ?? "지도를 움직여 위치를 골라 주세요"}
            </p>
            <p className="text-caption1 text-label-alternative">
              다른 멤버에게는 행정동만 보여요
            </p>
          </div>
          <Button
            size="md"
            variant="primary"
            className="w-full"
            style={{ backgroundColor: "#3a3a3c" }}
            disabled={resolving || !draft.name}
            onClick={confirm}
          >
            {resolving ? "확인하는 중..." : "이 위치로 할게요"}
          </Button>
        </div>
      </div>
    </div>
  );
}
