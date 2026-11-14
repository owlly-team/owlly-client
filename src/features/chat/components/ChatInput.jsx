import iconSend from "../../../assets/icons/send.svg";

export default function ChatInput({
  placeholder = "메시지 보내기",
  value,
  onChange,
  onSend,
  disabled = false,
  className = "",
}) {
  const canSend =
    !disabled &&
    Boolean(onSend) &&
    Boolean(value?.trim()) &&
    value.length <= 200;

  function submit(event) {
    event.preventDefault();
    if (canSend) onSend();
  }

  return (
    <form
      onSubmit={submit}
      className={`border-fill-normal flex w-full items-center gap-2 border-t px-3 pt-2.5 pb-[max(30px,env(safe-area-inset-bottom))] ${className}`}
    >
      <input
        aria-label="메시지"
        maxLength={200}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.nativeEvent.isComposing)
            event.preventDefault();
        }}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="bg-fill-normal text-body2 text-label-normal placeholder:text-label-disable h-11 min-w-0 flex-1 rounded-full px-4 outline-none disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!canSend}
        title="보내기"
        className="bg-fill-normal flex size-11 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed"
      >
        <img src={iconSend} alt="보내기" className="size-5" />
      </button>
    </form>
  );
}
