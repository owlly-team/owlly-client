import LastDepartureCard from "../components/LastDepartureCard";
import TransportOptionCard from "../components/TransportOptionCard";
import { useId, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HomeMatchingCard from "../components/HomeMatchingCard";
import iconLocation from "../../../assets/icons/location.svg";
import HomeIcon from "../../../assets/icons/nav-home.svg?react";
import BottomTabBar from "../../../shared/components/BottomTabBar";
import { homeScenarios } from "../mocks/homeMockData";
import useHome from "../hooks/useHome";
import useHomeData from "../hooks/useHomeData";
import Button from "../../../shared/components/Button";

export default function Home({ data, onViewMatchingResult }) {
  const { search } = useLocation();
  if (
    data ||
    (import.meta.env.DEV &&
      new URLSearchParams(search).get("preview") === "home")
  ) {
    return (
      <HomeContent
        data={{
          ...(data ?? homeScenarios.matched),
          isPreview: data?.isPreview ?? true,
        }}
        onViewMatchingResult={onViewMatchingResult}
      />
    );
  }
  return <LiveHome />;
}

function LiveHome() {
  const home = useHomeData();
  const navigate = useNavigate();
  const pickupDialog = useRef(null);
  const pickupTitleId = useId();
  if (home.status === "loading")
    return (
      <p role="status" className="py-6">
        로그인 상태를 확인하고 있어요.
      </p>
    );
  if (home.status === "guest")
    return (
      <div className="flex flex-col gap-4 py-6">
        <p>로그인하고 귀가 방법을 확인해 주세요.</p>
        <Button onClick={() => navigate("/onboarding")}>로그인하기</Button>
      </div>
    );
  if (!home.allowed)
    return (
      <p role="alert" className="py-6">
        정상 이용 중인 학생 계정으로 이용해 주세요.
      </p>
    );
  return (
    <>
      <HomeContent
        data={home.data ?? { isPreview: false }}
        departureLabel={home.departureLabel}
        onChoosePickup={() => pickupDialog.current?.showModal()}
        statusSlot={
          <>
            {home.loading && (
              <p role="status" className="text-label2 text-label-neutral mt-4">
                귀가 정보를 불러오고 있어요.
              </p>
            )}
            {home.refreshing && (
              <p role="status" className="text-label2 text-label-neutral mt-4">
                귀가 방법을 확인하고 있어요.
              </p>
            )}
            {home.pickupAvailability === "ALL_EMPTY" && (
              <p role="status" className="text-label2 text-label-neutral mt-4">
                등록된 출발 거점이 아직 없어요.
              </p>
            )}
            {home.pickupAvailability === "SCHOOL_EMPTY" && (
              <p role="status" className="text-label2 text-label-neutral mt-4">
                우리 학교에서 이용할 수 있는 출발 거점이 아직 없어요.
              </p>
            )}
            {!home.loading &&
              home.pickupPoints.length > 1 &&
              !home.pickupPoint && (
                <p className="text-label2 text-label-neutral mt-4">
                  상단의 출발 위치를 눌러 거점을 확인해 주세요.
                </p>
              )}
            {home.error && (
              <div role="alert" className="mt-4 flex flex-col gap-2">
                <p className="text-label2 text-label-neutral">
                  {home.error.message}
                </p>
                <Button variant="secondary" onClick={home.retry}>
                  다시 불러오기
                </Button>
              </div>
            )}
          </>
        }
      />
      <dialog
        ref={pickupDialog}
        aria-labelledby={pickupTitleId}
        className="rounded-t-24 bg-background-normal backdrop:bg-material-dimmer fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[70dvh] w-full max-w-110 overflow-y-auto border-0 p-4"
      >
        <section
          className="flex flex-col gap-2 py-4"
          aria-label="출발 거점 선택"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id={pickupTitleId} className="text-headline2 font-bold">
              {home.universityName ?? "우리 학교"} 주변 출발 거점
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {home.pickupPoints.map((point) => (
              <button
                key={point.id}
                type="button"
                aria-pressed={home.pickupPoint?.id === point.id}
                onClick={() => {
                  home.selectPickup(point.id);
                  pickupDialog.current?.close();
                }}
                className={`rounded-12 text-label1 min-h-12 border px-3 py-3 text-left ${
                  home.pickupPoint?.id === point.id ||
                  home.nearestId === point.id
                    ? "border-primary-normal bg-primary-tint text-primary-normal"
                    : "border-line-normal"
                }`}
              >
                {point.name}
                {home.nearestId === point.id ? " · 가장 가까운 거점" : ""}
                {point.universityId === null ? " · 공용 거점" : ""}
                {home.pickupPoint?.id === point.id ? " · 선택됨" : ""}
              </button>
            ))}
          </div>
          {home.loading && <p role="status">거점을 불러오고 있어요.</p>}
          {!home.loading && !home.error && home.pickupPoints.length === 0 && (
            <p role="status">이용 가능한 거점이 없어요.</p>
          )}
        </section>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => pickupDialog.current?.close()}
        >
          닫기
        </Button>
      </dialog>
    </>
  );
}

function HomeContent({
  data,
  onViewMatchingResult,
  onChoosePickup,
  departureLabel,
  statusSlot,
}) {
  const { state } = useLocation();
  const [notice, setNotice] = useState("");
  // 목업에서 나간 팟의 신청만 취소 상태로 표
  const currentData =
    data.isPreview !== false &&
    state?.leftParty &&
    state.leftParty.id === data.rideRequest?.partyId
      ? {
          ...data,
          rideRequest: { ...data.rideRequest, status: "CANCELLED" },
          party: null,
        }
      : data;
  const {
    viewData,
    matchingUiState,
    transitAvailable,
    showTransitAlternative,
    showTransportOptions,
    transportOptions,
    selectedTab,
    handleTabChange,
    handleTransportSelect,
    handleViewRegistration,
    handleViewMatchingResult,
  } = useHome(currentData, {
    onPendingFeature: () => setNotice("상세 안내는 준비 중이에요."),
  });
  const { pickupPoint, destinationLabel, lastTransit, matchingDisplay } =
    viewData;

  return (
    <div className="flex w-full flex-1 flex-col pt-1.5">
      <header className="text-label2 text-label-neutral flex min-h-5.5 items-center justify-between gap-3">
        <button
          type="button"
          onClick={onChoosePickup}
          disabled={!onChoosePickup}
          aria-haspopup={onChoosePickup ? "dialog" : undefined}
          className="flex min-h-11 min-w-0 items-center gap-1.5 text-left"
        >
          <img src={iconLocation} alt="" className="size-4 shrink-0" />
          {departureLabel ?? pickupPoint?.name ?? "출발지 고르기"}
        </button>
        <p className="flex min-w-0 items-center gap-1.5">
          <HomeIcon
            aria-hidden="true"
            className="text-label-alternative size-4 shrink-0"
          />
          {destinationLabel ??
            data.profile?.defaultDongName ??
            "하차 위치 확인 중"}
        </p>
      </header>
      {statusSlot}
      {data.isPreview === true && (
        <p role="status" className="text-caption1 text-primary-normal mt-2">
          미리보기 · 예시 데이터
        </p>
      )}
      {notice && (
        <p role="status" className="text-label2 text-label-neutral mt-3">
          {notice}
        </p>
      )}
      {currentData.settlementError && (
        <p role="status" className="text-label2 text-label-neutral mt-3">
          {currentData.settlementError}
        </p>
      )}
      {currentData.slotsError && (
        <p role="status" className="text-label2 text-label-neutral mt-3">
          {currentData.slotsError}
        </p>
      )}
      {currentData.travelOptions?.warnings?.length > 0 && (
        <p role="status" className="text-label2 text-label-neutral mt-3">
          일부 교통 정보가 부족해요. 요금과 시간은 추정값이에요.
        </p>
      )}
      <HomeMatchingCard
        uiState={matchingUiState}
        display={matchingDisplay}
        onViewRegistration={handleViewRegistration}
        onViewMatchingResult={
          currentData.rideRequest?.status === "MATCHED" &&
          currentData.rideRequest?.partyId
            ? () =>
                (onViewMatchingResult ?? handleViewMatchingResult)(
                  currentData.rideRequest.partyId,
                )
            : undefined
        }
      />
      <div className="mt-5">
        {lastTransit && (
          <LastDepartureCard {...lastTransit} available={transitAvailable} />
        )}
        {!currentData.travelOptions && currentData.isPreview === false && (
          <p className="text-label2 text-label-neutral mt-1">
            출발 위치를 확인하면 막차를 안내해 드려요.
          </p>
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
        <BottomTabBar activeTab={selectedTab} onTabChange={handleTabChange} />
      </footer>
    </div>
  );
}
