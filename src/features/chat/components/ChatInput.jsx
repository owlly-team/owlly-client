import iconSend from "../../../assets/icons/send.svg";

export default function ChatInput({ placeholder = "메시지 보내기", value, onChange, onSend, disabled = false, className = "" }) {
  const canSend = !disabled && Boolean(onSend) && Boolean(value?.trim()) && value.length <= 2000;

  function submit(event) {
    event.preventDefault();
    if (canSend) onSend();
  }

  return (
    <form onSubmit={submit} className={`flex w-full items-center gap-2 border-t border-fill-normal px-3 pb-[max(30px,env(safe-area-inset-bottom))] pt-2.5 ${className}`}>
      <input
        aria-label="메시지"
        maxLength={2000}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
        }}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="h-11 min-w-0 flex-1 rounded-full bg-fill-normal px-4 text-body2 text-label-normal placeholder:text-label-disable outline-none disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!canSend}
        title="보내기"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fill-normal disabled:cursor-not-allowed"
      >
        <img src={iconSend} alt="보내기" className="size-5" />
      </button>
    </form>
  );
}
