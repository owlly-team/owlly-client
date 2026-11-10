import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="mx-auto flex max-w-110 min-w-80 max-h-239 h-dvh flex-col justify-between bg-background-normal text-left">
      <div className="flex min-w-0 flex-1 min-h-0 overflow-y-auto flex-col px-4">
        <Outlet />
      </div>
    </div>
  );
}
