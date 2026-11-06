import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LastDepartureCard from "../components/LastDepartureCard";
import TransportOptionCard from "../components/TransportOptionCard";
import iconLocation from "../../../assets/icons/location.svg";
import HomeIcon from "../../../assets/icons/nav-home.svg?react";
import iconBus from "../../../assets/icons/transport-bus.svg";
import iconCarpool from "../../../assets/icons/transport-carpool.svg";
import iconTaxi from "../../../assets/icons/transport-taxi.svg";
import BottomTabBar from "../../../shared/components/BottomTabBar";

const homeData = {
  origin: "단국대 정문 근처",
  destination: "영통2동",
  lastDeparture: {
    time: "22:58",
    place: "정문 정류장 · 도보 4분",
    note: "22:49까지 출발해야 해요",
  },
  transportOptions: [
    {
      id: "bus",
      icon: iconBus,
      iconTone: "cyan",
      title: "막차",
      description: "22:58 출발 · 23:41 도착",
      price: "1,550원",
      priceLabel: "1인",
    },
    {
      id: "carpool",
      icon: iconCarpool,
      iconTone: "primary",
      title: "동승",
      description: "23:30 출발 · 00:00 도착",
      highlight: "영통구 방향 2명 대기",
      price: "약 7,900원",
      priceLabel: "예상 1인 부담",
    },
    {
      id: "taxi",
      icon: iconTaxi,
      iconTone: "neutral",
      title: "혼자 택시",
      description: "지금 출발 · 23:05 도착",
      price: "27,400원",
      priceLabel: "1인",
    },
  ],
};

export default function Home() {
  const navigate = useNavigate();
  const [selectedTransport, setSelectedTransport] = useState("carpool");
  const [selectedTab, setSelectedTab] = useState("home");

  return (
    <div className="flex w-full flex-1 flex-col pt-1.5">
      <header className="text-label2 text-label-neutral flex min-h-5.5 items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5">
          <img src={iconLocation} className="size-4 shrink-0" />
          {homeData.origin}
        </p>
        <p className="flex min-w-0 items-center gap-1.5">
          <HomeIcon aria-hidden="true" className="size-4 shrink-0 text-label-alternative" />
          {homeData.destination}
        </p>
      </header>
      <div className="mt-5">
        <LastDepartureCard {...homeData.lastDeparture} />
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <h2 className="text-heading2 mb-1.4 font-bold">귀가 방법 비교</h2>
        {homeData.transportOptions.map(({ id, ...option }) => (
          <TransportOptionCard
            key={id}
            {...option}
            selected={selectedTransport === id}
            onClick={() => {
              setSelectedTransport(id);
              if (id === "bus") navigate("/last-train");
            }}
          />
        ))}
      </div>
      <footer className="mt-auto -mx-4 bg-background-normal">
        <BottomTabBar
          activeTab={selectedTab}
          onTabChange={setSelectedTab}
        />
      </footer>
    </div>
  );
}
