import iconSend from "../../../assets/icons/send.svg";

export default function ChatInput({ placeholder = "메시지 보내기", value, onChange, onSend, className = "" }) {
  return (
    <div className={`flex w-full items-center gap-2 border-t border-fill-normal px-3 pb-[30px] pt-2.5 ${className}`}>
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="h-11 flex-1 rounded-full bg-fill-normal px-4 text-body2 text-label-normal placeholder:text-label-disable outline-none"
      />
      <button
        type="button"
        onClick={onSend}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fill-normal"
      >
        <img src={iconSend} alt="보내기" className="size-5" />
      </button>
    </div>
  );
}
