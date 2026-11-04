import iconAppLogo from "../assets/icons/app-logo.svg";

export default function PushNotificationCard({ time = "지금", title, body }) {
  return (
    <div className="grid w-full max-w-[366px] grid-cols-[38px_1fr] gap-x-3 gap-y-1 rounded-[22px] bg-background-normal p-3.5 shadow-[0_0_0_1px_var(--color-fill-alternative)]">
      <div className="row-span-3 flex size-[38px] items-center justify-center self-start rounded-10 bg-primary-tint">
        <img src={iconAppLogo} alt="아울리" className="size-[30px]" />
      </div>
      <div className="flex items-center justify-between text-caption1 text-label-alternative">
        <span>아울리</span>
        <span>{time}</span>
      </div>
      <p className="text-body2 font-semibold text-label-normal">{title}</p>
      <p className="text-label1 text-label-alternative">{body}</p>
    </div>
  );
}
