import RouteSteps from "./RouteSteps";
import iconPeople from "../../../assets/icons/transport-carpool.svg";
import iconSend from "../../../assets/icons/send.svg";
import iconTaxi from "../../../assets/icons/taxi-call.svg";
import iconLocation from "../../../assets/icons/location.svg";
import iconHome from "../../../assets/icons/nav-home.svg";
import ChevronRight from "../../../assets/icons/chevron-right-sm.svg?react";

const ICONS = {
  meet: iconPeople,
  prepay: iconSend,
  taxi: iconTaxi,
  dropoff: iconLocation,
  home: iconHome,
  settlement: iconHome,
};

export default function HomeRideProgress({ view, onOpenRoom, roomError }) {
  if (!view) return null;
  return (
    <>
      <section
        aria-labelledby="ride-progress-title"
        className="rounded-16 border-primary-normal bg-primary-tint relative mt-5 overflow-hidden border p-4 pb-0"
      >
        <div className="flex min-h-6 items-center justify-between gap-2">
          <p className="text-caption1 text-primary-normal font-semibold">
            진행 중인 동승
          </p>
          {view.unreadCount != null && (
            <span className="bg-primary-normal text-static-white text-caption2 rounded-full px-2.5 py-1 font-semibold">
              새 메시지 {view.unreadCount}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="ride-progress-title"
              className="text-headline2 text-label-strong font-bold break-words"
            >
              {view.title}
            </h2>
            <p className="text-caption1 text-label-neutral mt-1">
              {view.subtitle}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-caption2 text-label-alternative">확인 코드</p>
            {view.verificationCode ? (
              <p
                aria-label={`확인 코드 ${view.verificationCode}`}
                className="text-title3 text-primary-normal mt-0.5 font-bold tracking-[0.18em]"
              >
                {view.verificationCode}
              </p>
            ) : (
              <p className="text-caption1 text-label-neutral mt-1">
                {roomError ? "확인 불가" : "확인 중"}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenRoom}
          aria-label={`${view.title} 동승 채팅방으로 이동`}
          className="rounded-16 focus-visible:outline-primary-normal absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-4"
        />
        <div
          aria-hidden="true"
          className="border-line-alternative text-label2 text-primary-normal mt-3 flex min-h-12 w-full items-center justify-end gap-1 border-t font-semibold"
        >
          채팅방으로{" "}
          <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
        </div>
      </section>
      <section aria-labelledby="ride-order-title" className="mt-5 pb-6">
        <h2
          id="ride-order-title"
          className="text-body1 text-label-normal font-semibold"
        >
          오늘 귀가 순서
        </h2>
        <RouteSteps
          className="mt-4"
          steps={view.steps.map((step) => ({
            ...step,
            icon: ICONS[step.kind],
            iconClassName:
              step.kind === "home"
                ? "brightness-0 invert"
                : step.kind === "meet"
                  ? "brightness-0 opacity-60"
                  : "",
          }))}
        />
      </section>
    </>
  );
}
