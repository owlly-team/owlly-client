export default function ChatBubble({ variant = "incoming", sender, message, className = "" }) {
  if (variant === "system") {
    return (
      <div className={`flex w-full justify-center ${className}`}>
        <span className="rounded-full bg-fill-alternative px-3 py-1.5 text-caption1 text-label-alternative">
          {message}
        </span>
      </div>
    );
  }

  const isOutgoing = variant === "outgoing";

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
        {message}
      </p>
    </div>
  );
}
