export default function ChatBubble({ variant = "incoming", sender, message, masked = false, className = "" }) {
  if (variant === "system") {
    return (
      <div className={`flex w-full justify-center ${className}`}>
        <span className="max-w-full rounded-full bg-fill-alternative px-3 py-1.5 text-center text-caption1 text-label-alternative">
          {message}
        </span>
      </div>
    );
  }

  const isOutgoing = variant === "outgoing";
  const parts = typeof message === "string" ? message.split(/(\[가려진 번호\])/g) : [message];
  const hasMaskedNumber = parts.includes("[가려진 번호]");
  const maskedNumberClass = "inline-block whitespace-nowrap rounded-[3px] bg-fill-strong px-1 align-baseline text-caption2 leading-[1.2] text-label-alternative";

  return (
    <div className={`flex w-full flex-col gap-0.5 ${isOutgoing ? "items-end" : "items-start"} ${className}`}>
      {sender && !isOutgoing && (
        <span className="text-caption1 text-label-alternative">{sender}</span>
      )}
      <p
        className={`max-w-[80%] rounded-16 px-3.5 py-2.5 text-body2 ${
          isOutgoing ? "bg-primary-tint text-label-normal" : "bg-fill-normal text-label-normal"
        }`}
      >
        {parts.map((part, index) => part === "[가려진 번호]"
          ? <span key={index} className={maskedNumberClass}>가려진 번호</span>
          : part)}
        {masked && !hasMaskedNumber && <span className={`ml-1 ${maskedNumberClass}`}>가려진 번호</span>}
      </p>
    </div>
  );
}
