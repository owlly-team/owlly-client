import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BottomSheet from "../../../shared/components/BottomSheet";
import Button from "../../../shared/components/Button";

export default function DropoffOrderSheet({ rows, onApply, onClose }) {
  const dialog = useRef(null);
  const list = useRef(null);
  const gesture = useRef(null);
  const scrollFrame = useRef(null);
  const positions = useRef(new Map());
  const rowAnimations = useRef(new Map());
  const preview = useRef(null);
  const dropAnimation = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const [draft, setDraft] = useState(rows);
  const [dragging, setDragging] = useState(null);
  const changed = draft.some(
    (row, index) => row.memberId !== rows[index].memberId,
  );

  useLayoutEffect(() => {
    const animations = rowAnimations.current;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    for (const element of list.current.children) {
      const memberId = element.dataset.dropoffId;
      const before = positions.current.get(memberId);
      animations.get(memberId)?.cancel();
      const after = element.getBoundingClientRect();
      if (
        before == null ||
        reduceMotion ||
        memberId === gesture.current?.memberId
      )
        continue;
      const distance = before - after.top;
      if (Math.abs(distance) < 1) continue;
      animations.set(
        memberId,
        element.animate(
          [
            { transform: `translateY(${distance}px)` },
            { transform: "translateY(0)" },
          ],
          { duration: 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        ),
      );
    }
    positions.current.clear();
  }, [draft]);

  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    const animations = rowAnimations.current;
    document.body.style.overflow = "hidden";
    element.showModal();
    element.querySelector("h2")?.focus({ preventScroll: true });
    return () => {
      window.cancelAnimationFrame(scrollFrame.current);
      dropAnimation.current?.cancel();
      animations.forEach((animation) => animation.cancel());
      element.close();
      document.body.style.overflow = overflow;
      focused?.focus();
    };
  }, []);

  function move(memberId, targetId) {
    positions.current = new Map(
      Array.from(list.current.children, (element) => [
        element.dataset.dropoffId,
        element.getBoundingClientRect().top,
      ]),
    );
    setDraft((current) => {
      const from = current.findIndex((row) => row.memberId === memberId);
      const to = current.findIndex((row) => row.memberId === targetId);
      if (
        from < 0 ||
        to < 0 ||
        from === to ||
        current[from].isRepresentative ||
        current[to].isRepresentative
      )
        return current;
      const next = [...current];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }

  function finish(event) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    const active = gesture.current;
    gesture.current = null;
    window.cancelAnimationFrame(scrollFrame.current);
    if (event.type === "pointercancel") {
      setDraft(active.before);
      setDragging(null);
      return;
    }
    const target = Array.from(list.current.children).find(
      (element) => element.dataset.dropoffId === active.memberId,
    );
    if (
      !target ||
      !preview.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDragging(null);
      return;
    }
    dropAnimation.current = preview.current.animate(
      [
        { transform: getComputedStyle(preview.current).transform },
        {
          transform: `translateY(${target.getBoundingClientRect().top - active.top}px)`,
        },
      ],
      { duration: 160, easing: "ease-out", fill: "forwards" },
    );
    dropAnimation.current.finished.then(
      () => setDragging(null),
      () => {},
    );
  }

  function moveAtPointer() {
    const active = gesture.current;
    const element = list.current;
    if (!active || !element) return;
    const children = Array.from(element.children);
    const from = children.findIndex(
      (child) => child.dataset.dropoffId === active.memberId,
    );
    if (from < 0) return;
    const center = active.top + active.y - active.startY + active.height / 2;
    const listTop = element.getBoundingClientRect().top;
    let destination = from;
    for (let index = 0; index < children.length; index++) {
      const child = children[index];
      if (child.dataset.fixed === "true") continue;
      const midpoint =
        listTop + child.offsetTop - element.scrollTop + child.offsetHeight / 2;
      if (index < from && center < midpoint) {
        destination = index;
        break;
      }
      if (index > from && center > midpoint) destination = index;
    }
    if (destination !== from)
      move(active.memberId, children[destination].dataset.dropoffId);
  }

  function scrollWhileDragging() {
    const active = gesture.current;
    const element = list.current;
    if (!active || !element) return;
    const bounds = element.getBoundingClientRect();
    const direction =
      active.y < bounds.top + 24 ? -1 : active.y > bounds.bottom - 24 ? 1 : 0;
    const before = element.scrollTop;
    element.scrollTop += direction * 4;
    if (before !== element.scrollTop) {
      moveAtPointer();
    }
    scrollFrame.current = window.requestAnimationFrame(scrollWhileDragging);
  }

  function drag(event) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    gesture.current.x = event.clientX;
    gesture.current.y = event.clientY;
    const deltaY = event.clientY - gesture.current.startY;
    setDragging(
      (current) =>
        current && {
          ...current,
          deltaY,
        },
    );
    moveAtPointer();
  }

  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom ||
          event.clientX < bounds.left ||
          event.clientX > bounds.right
        )
          onClose();
      }}
      className="rounded-t-24 text-label-normal backdrop:bg-material-dimmer fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[min(50dvh,400px)] w-full max-w-110 overflow-visible border-0 bg-transparent p-0"
    >
      <BottomSheet
        onClose={onClose}
        className="max-h-[min(50dvh,400px)] min-h-0 gap-2! overflow-hidden pb-[max(16px,env(safe-area-inset-bottom))]"
      >
        <div className="w-full shrink-0">
          <h2
            id={titleId}
            tabIndex={-1}
            className="text-heading2 font-bold outline-none"
          >
            내린 순서 고치기
          </h2>
          <p
            id={descriptionId}
            className="text-label2 text-label-alternative mt-1"
          >
            실제로 내린 순서를 맞춰 주세요. 대표는 항상 마지막이에요.
          </p>
        </div>
        <ol
          ref={list}
          className="settlement-order-scroll relative flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-2"
          aria-label="하차 순서"
          onPointerMove={drag}
          onPointerUp={finish}
          onPointerCancel={finish}
          onLostPointerCapture={() => {
            if (!gesture.current) return;
            setDraft(gesture.current.before);
            gesture.current = null;
            window.cancelAnimationFrame(scrollFrame.current);
            setDragging(null);
          }}
        >
          {draft.map((row, index) => (
            <li
              key={row.memberId}
              data-dropoff-id={row.memberId}
              data-fixed={row.isRepresentative ? "true" : undefined}
              className={`rounded-12 flex shrink-0 items-center gap-2 border p-2 select-none ${dragging?.row.memberId === row.memberId ? "border-primary-normal bg-primary-tint border-dashed opacity-30" : "border-line-alternative bg-background-normal"}`}
            >
              <span
                className="bg-fill-normal text-label2 flex size-7 shrink-0 items-center justify-center rounded-full font-semibold"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body2 font-semibold">{row.name}</p>
                <p className="text-caption1 text-label-alternative">
                  {row.note}
                </p>
              </div>
              {row.isRepresentative ? (
                <span className="text-caption1 text-label-alternative">
                  마지막 고정
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={`${row.name} 순서 이동. 위아래 방향키로도 이동할 수 있어요`}
                  className="rounded-8 text-label-alternative focus-visible:outline-primary-normal flex size-12 shrink-0 cursor-grab touch-none items-center justify-center focus-visible:outline-2 active:cursor-grabbing"
                  onPointerDown={(event) => {
                    if (!event.isPrimary || event.button !== 0 || dragging)
                      return;
                    event.preventDefault();
                    const bounds = event.currentTarget
                      .closest("li")
                      .getBoundingClientRect();
                    gesture.current = {
                      pointerId: event.pointerId,
                      before: draft,
                      memberId: row.memberId,
                      startY: event.clientY,
                      x: event.clientX,
                      y: event.clientY,
                      top: bounds.top,
                      height: bounds.height,
                    };
                    setDragging({
                      row,
                      left: bounds.left,
                      top: bounds.top,
                      width: bounds.width,
                      deltaY: 0,
                    });
                    // 고정된 목록에서 포인터를 잡아 행이 재배치되어도 드래그를 유지한다.
                    event.currentTarget
                      .closest("ol")
                      .setPointerCapture(event.pointerId);
                    scrollFrame.current =
                      window.requestAnimationFrame(scrollWhileDragging);
                  }}
                  onKeyDown={(event) => {
                    if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
                    event.preventDefault();
                    const target =
                      draft[index + (event.key === "ArrowUp" ? -1 : 1)];
                    if (target) move(row.memberId, target.memberId);
                  }}
                >
                  <span aria-hidden="true" className="flex w-5 flex-col gap-1">
                    <span className="h-0.5 rounded-full bg-current" />
                    <span className="h-0.5 rounded-full bg-current" />
                    <span className="h-0.5 rounded-full bg-current" />
                  </span>
                </button>
              )}
            </li>
          ))}
        </ol>
        <p className="sr-only" aria-live="polite">
          현재 순서: {draft.map((row) => row.name).join(", ")}
        </p>
        <p className="text-caption2 text-label-alternative w-full shrink-0">
          손잡이를 위아래로 끌어 순서를 바꿀 수 있어요.
        </p>
        <div className="flex w-full shrink-0 flex-col gap-2">
          <Button
            disabled={!changed || dragging !== null}
            onClick={() => onApply(draft)}
          >
            이 순서로 고칠게요
          </Button>
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </BottomSheet>
      {dragging && (
        <div
          ref={preview}
          aria-hidden="true"
          data-drag-preview
          className="rounded-12 border-primary-normal bg-background-normal shadow-large pointer-events-none fixed z-50 flex items-center gap-2 border p-2 select-none"
          style={{
            left: dragging.left,
            top: dragging.top,
            width: dragging.width,
            transform: `translateY(${dragging.deltaY}px)`,
          }}
        >
          <span className="bg-primary-tint text-label2 text-primary-normal flex size-7 shrink-0 items-center justify-center rounded-full font-semibold">
            {draft.findIndex((row) => row.memberId === dragging.row.memberId) +
              1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body2 font-semibold">{dragging.row.name}</p>
            <p className="text-caption1 text-label-alternative">
              {dragging.row.note}
            </p>
          </div>
          <span className="text-primary-normal flex size-12 shrink-0 items-center justify-center">
            <span className="flex w-5 flex-col gap-1">
              <span className="h-0.5 rounded-full bg-current" />
              <span className="h-0.5 rounded-full bg-current" />
              <span className="h-0.5 rounded-full bg-current" />
            </span>
          </span>
        </div>
      )}
    </dialog>,
    document.body,
  );
}
