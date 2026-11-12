import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import BottomSheet from "./BottomSheet";
import Button from "./Button";
import iconChevronDown from "../../assets/icons/chevron-down.svg";

export default function BankSelectSheet({
  banks,
  value,
  onChange,
  className = "",
}) {
  const dialog = useRef(null);
  const titleId = useId();
  const close = () => dialog.current.close();

  return (
    <>
      <button
        type="button"
        aria-label={`은행 선택: ${banks.find((bank) => bank.code === value)?.name ?? "미선택"}`}
        aria-haspopup="dialog"
        className={`rounded-12 bg-background-normal text-label2 focus-visible:outline-primary-normal flex h-12 w-full min-w-0 items-center justify-between gap-1 px-3 ${className}`}
        onClick={() => dialog.current.showModal()}
      >
        <span className="truncate">
          {banks.find((bank) => bank.code === value)?.name ?? "은행 선택"}
        </span>
        <img src={iconChevronDown} alt="" className="size-3 shrink-0" />
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          aria-labelledby={titleId}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom ||
              event.clientX < bounds.left ||
              event.clientX > bounds.right
            )
              close();
          }}
          className="rounded-t-24 text-label-normal backdrop:bg-material-dimmer fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[70dvh] w-full max-w-110 overflow-y-auto border-0 bg-transparent p-0"
        >
          <BottomSheet
            onClose={close}
            className="pb-[max(16px,env(safe-area-inset-bottom))]"
          >
            <h2 id={titleId} className="text-heading2 w-full font-bold">
              은행 선택
            </h2>
            <div className="grid w-full grid-cols-2 gap-2">
              {banks.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  aria-pressed={value === bank.code}
                  className={`rounded-12 text-body2 min-h-12 border px-3 py-3 ${value === bank.code ? "border-primary-normal bg-primary-tint text-primary-normal font-semibold" : "border-line-alternative bg-background-normal"}`}
                  onClick={() => {
                    onChange(bank.code);
                    close();
                  }}
                >
                  {bank.name}
                </button>
              ))}
            </div>
            <Button variant="secondary" className="w-full" onClick={close}>
              닫기
            </Button>
          </BottomSheet>
        </dialog>,
        document.body,
      )}
    </>
  );
}
