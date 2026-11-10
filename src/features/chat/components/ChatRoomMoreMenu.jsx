import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import BottomSheet from "../../../shared/components/BottomSheet";
import Button from "../../../shared/components/Button";
import IconButton from "../../../shared/components/IconButton";
import iconKebab from "../../../assets/icons/kebab.svg";
import iconLeave from "../../../assets/icons/chevron-left.svg";
import iconReport from "../../../assets/icons/report-flag.svg";

export default function ChatRoomMoreMenu({ canLeave, leaveDisabledReason, leaveError, onLeave, onReport }) {
  const dialog = useRef(null);
  const titleId = useId();

  function open() {
    dialog.current.showModal();
  }

  function dismissBackdrop(event) {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientY < bounds.top || event.clientX < bounds.left || event.clientX > bounds.right) dialog.current.close();
  }

  function leave() {
    if (!canLeave) return;
    if (onLeave()) dialog.current?.close();
  }

  function report() {
    dialog.current.close();
    onReport();
  }

  return <>
    <IconButton src={iconKebab} alt="채팅방 더보기" onClick={open} aria-haspopup="dialog" />
    {createPortal(<dialog ref={dialog} aria-labelledby={titleId} onClick={dismissBackdrop}
      className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[85dvh] w-full max-w-110 overflow-y-auto rounded-t-24 border-0 bg-transparent p-0 text-label-normal backdrop:bg-material-dimmer">
      <BottomSheet className="gap-2 px-4 shadow-none" onClose={() => dialog.current.close()}>
        <h2 id={titleId} className="sr-only">채팅방 더보기</h2>
          <button type="button" disabled={!canLeave} onClick={leave} className="flex w-full items-start gap-3 rounded-12 px-1 py-3 text-left disabled:cursor-not-allowed">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-fill-normal">
              <img src={iconLeave} alt="" className={`size-5 ${canLeave ? "" : "opacity-20"}`} />
            </span>
            <span>
              <span className={`block text-body2 font-semibold ${canLeave ? "text-label-normal" : "text-label-disable"}`}>방 나가기</span>
              <span className="mt-0.5 block text-label2 text-label-neutral">{canLeave ? "출발 15분 전까지 나갈 수 있어요. 나가면 다시 들어올 수 없어요." : leaveDisabledReason}</span>
            </span>
          </button>
          <button type="button" onClick={report} className="flex w-full items-center gap-3 rounded-12 px-1 py-3 text-left">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-status-negative-surface">
              <img src={iconReport} alt="" className="size-5" />
            </span>
            <span>
              <span className="block text-body2 font-semibold">신고하기</span>
              <span className="mt-0.5 block text-label2 text-label-neutral">신고한 사람과는 다시 매칭되지 않아요</span>
            </span>
          </button>
        {leaveError && <p role="alert" className="w-full text-label2 text-status-negative">{leaveError}</p>}
        <Button variant="secondary" className="w-full" onClick={() => dialog.current.close()}>닫기</Button>
      </BottomSheet>
    </dialog>, document.body)}
  </>;
}
