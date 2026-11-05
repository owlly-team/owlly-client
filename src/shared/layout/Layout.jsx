import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    // h-211 max-h-211 -> min-h-dvh
    <div className="mx-auto flex min-h-dvh max-w-110 min-w-97.5 flex-col justify-between px-4 text-center">
      {/* 상단바 위치 */}
      상단바
      <main>
        <Outlet />
      </main>
      {/* 하단바 위치 */}
      하단바
    </div>
  );
}
