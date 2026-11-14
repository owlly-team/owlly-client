import { useEffect, useRef, useState } from "react";

export default function LocationSheet({ open, onClose, label, children }) {
  const gesture = useRef(null);
  const ignoreClick = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  function startDrag(event) {
    if (event.button !== 0) return;
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
    if (event.type !== "pointercancel" && distance >= 60) onClose();
  }

  return <div className={`grid transition-[grid-template-rows] duration-250 ease-out motion-reduce:transition-none ${open ? "pointer-events-auto grid-rows-[1fr]" : "pointer-events-none grid-rows-[0fr]"}`}
    inert={!open} aria-hidden={!open}>
    <div className="min-h-0 overflow-hidden">
      <section aria-label={label} className="flex max-h-[52dvh] flex-col rounded-t-24 bg-white shadow-large"
        style={{ transform: `translateY(${dragOffset}px)` }}>
        <button type="button" aria-label="하단 바 내리기" className="flex h-8 w-full shrink-0 touch-none cursor-grab items-center justify-center rounded-t-24 active:cursor-grabbing"
          onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
          onLostPointerCapture={() => { gesture.current = null; setDragOffset(0); }}
          onClick={() => { if (!ignoreClick.current) onClose(); ignoreClick.current = false; }}>
          <span className="h-1 w-10 rounded-full bg-fill-strong" />
        </button>
        <div className="overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </section>
    </div>
  </div>;
}
