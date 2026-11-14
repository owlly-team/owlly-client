import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../shared/components/Button";
import { useDemoStore } from "./demoStore";
import { useRoomMessagesStore } from "../chat/stores/roomMessagesStore";

export default function DemoControls() {
  const { session, match, prepay, reset, stop } = useDemoStore();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { pathname, search, state } = useLocation();
  const navigate = useNavigate();
  const matchAt = session?.matchAt;
  // 진입 쿼리는 한 번 소비한다. 이후 새로고침에서는 현재 진행 상태를 복원한다.
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (!params.has("demo")) return;
    params.delete("demo");
    navigate({ pathname, search: params.toString() }, { replace: true, state });
  }, [pathname, search, state, navigate]);
  useEffect(() => {
    if (!matchAt) return;
    const timer = setTimeout(match, Math.max(0, matchAt - Date.now()));
    return () => clearTimeout(timer);
  }, [matchAt, match]);
  useEffect(() => {
    if (!session) return;
    const onKey = (event) => {
      if (!event.altKey) return;
      if (event.code === "KeyH") {
        event.preventDefault();
        setHidden((value) => !value);
      }
      if (event.code === "KeyN") {
        event.preventDefault();
        if (session.home.rideRequest?.status === "WAITING") match();
        else if (/\/rooms\/|\/room$/.test(pathname)) prepay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, pathname, match, prepay]);
  if (!session || hidden || state?.isPreview === false) return null;
  function restart(role = session.role, scenario) {
    useRoomMessagesStore.getState().resetPreview();
    reset(role, scenario);
    navigate("/", { replace: true, state: null });
  }
  return (
    <aside aria-label="시연 도구" className="fixed top-2 right-2 z-50 max-w-72">
      <Button
        size="sm"
        variant="secondary"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        시연
      </Button>
      {open && (
        <div className="bg-background-normal border-line-normal rounded-12 shadow-medium mt-2 flex flex-col gap-2 border p-3">
          <p className="text-label2">
            {session.role === "member" ? "일반 멤버" : "대표"} 시연 · 등록 후
            10초 뒤 매칭
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={match}
            disabled={session.home.rideRequest?.status !== "WAITING"}
          >
            지금 매칭 완료
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={prepay}
            disabled={!session.matchingResult}
          >
            집결 시각으로 이동
          </Button>
          <Button size="sm" variant="secondary" onClick={() => restart()}>
            처음부터 다시 촬영
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => restart(session.role, "afterLastTransit")}
          >
            막차 종료부터 시작
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              restart(session.role === "member" ? "representative" : "member")
            }
          >
            역할 바꿔 다시 시작
          </Button>
          <p className="text-caption1">
            Alt+N: 매칭 완료 / 집결 시각
            <br />
            Alt+H: 시연 도구 숨기기·표시
          </p>
          <Button
            size="sm"
            variant="text"
            onClick={() => {
              stop();
              navigate("/", { replace: true, state: null });
            }}
          >
            시연 종료
          </Button>
        </div>
      )}
    </aside>
  );
}
