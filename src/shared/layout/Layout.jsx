import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-110 min-w-97.5 flex-col justify-between bg-background-normal px-4 text-left">
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
