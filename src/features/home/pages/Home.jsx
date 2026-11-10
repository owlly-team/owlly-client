import LastDepartureCard from "../components/LastDepartureCard";
import TransportOptionCard from "../components/TransportOptionCard";
import HomeMatchingCard from "../components/HomeMatchingCard";
import iconLocation from "../../../assets/icons/location.svg";
import HomeIcon from "../../../assets/icons/nav-home.svg?react";
import BottomTabBar from "../../../shared/components/BottomTabBar";
import { homeScenarios } from "../mocks/homeMockData";
import useHome from "../hooks/useHome";

export default function Home({ data = homeScenarios.matched, onViewMatchingResult }) {
  const {
    viewData,
    matchingUiState,
    transitAvailable,
    showTransitAlternative,
    showTransportOptions,
    transportOptions,
    selectedTab,
    setSelectedTab,
    handleTransportSelect,
    handleViewRegistration,
    handleViewMatchingResult,
  } = useHome(data);
  const { pickupPoint, destinationLabel, lastTransit, matchingDisplay } = viewData;

  return (
    <div className="flex w-full flex-1 flex-col pt-1.5">
      <header className="text-label2 text-label-neutral flex min-h-5.5 items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5">
          <img src={iconLocation} className="size-4 shrink-0" />
          {pickupPoint?.name}
        </p>
        <p className="flex min-w-0 items-center gap-1.5">
          <HomeIcon
            aria-hidden="true"
            className="text-label-alternative size-4 shrink-0"
          />
          {destinationLabel}
        </p>
      </header>
      <HomeMatchingCard
        uiState={matchingUiState}
        display={matchingDisplay}
        onViewRegistration={handleViewRegistration}
        onViewMatchingResult={data.rideRequest?.status === "MATCHED" && data.rideRequest?.partyId
          ? () => (onViewMatchingResult ?? handleViewMatchingResult)(data.rideRequest.partyId)
          : undefined}
      />
      <div className="mt-5">
        {lastTransit && (
          <LastDepartureCard
            {...lastTransit}
            available={transitAvailable}
          />
        )}
      </div>
      {showTransitAlternative && (
        <p className="text-caption1 text-label-alternative mt-5">
          확정하지 않으면 막차를 타도 돼요.
        </p>
      )}
      {showTransportOptions && (
        <div className="mt-5 flex flex-col gap-2">
          <h2 className="text-heading2 mb-1.4 font-bold">귀가 방법 비교</h2>
          {transportOptions.map(({ id, ...option }) => (
            <TransportOptionCard
              key={id}
              {...option}
              onClick={() => handleTransportSelect(id)}
            />
          ))}
        </div>
      )}
      <footer className="bg-background-normal -mx-4 mt-auto">
        <BottomTabBar activeTab={selectedTab} onTabChange={setSelectedTab} />
      </footer>
    </div>
  );
}
