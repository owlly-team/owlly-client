import { useRef, useState } from "react";

export default function BottomSheet({ children, className = "", onClose }) {
  const gesture = useRef(null);
  const ignoreClick = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);

  function startDrag(event) {
    if (!event.isPrimary || event.button !== 0) return;
    ignoreClick.current = false;
    gesture.current = { pointerId: event.pointerId, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    const distance = event.clientY - gesture.current.startY;
    if (Math.abs(distance) > 8) ignoreClick.current = true;
    setDragOffset(Math.max(0, distance));
  }

  function endDrag(event) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    const distance = event.clientY - gesture.current.startY;
    gesture.current = null;
    setDragOffset(0);
    if (event.type === "pointerup" && distance >= 60) {
      ignoreClick.current = true;
      onClose();
    }
  }

  return (
    <div
      className={`flex w-full flex-col items-center gap-3.5 rounded-t-24 bg-background-normal px-4 pt-2.5 pb-[30px] shadow-large ${className}`}
      style={onClose ? { transform: `translateY(${dragOffset}px)` } : undefined}
    >
      {onClose ? <button type="button" aria-label="아래로 드래그하거나 눌러 닫기"
        className="-my-2.5 flex h-6 w-full shrink-0 touch-none cursor-grab items-center justify-center active:cursor-grabbing"
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
        onLostPointerCapture={() => { gesture.current = null; setDragOffset(0); }}
        onClick={() => { if (!ignoreClick.current) onClose(); ignoreClick.current = false; }}>
        <span className="h-1 w-10 rounded-full bg-fill-strong" />
      </button> : <span className="h-1 w-10 shrink-0 rounded-full bg-fill-strong" />}
      {children}
    </div>
  );
}
