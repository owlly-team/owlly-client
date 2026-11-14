import { Outlet } from "react-router-dom";
import DemoControls from "../../features/demo/DemoControls";

export default function Layout() {
  return (
    <div className="bg-background-normal mx-auto flex h-dvh max-h-239 max-w-110 min-w-80 flex-col justify-between text-left">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4">
        <Outlet />
      </div>
      <DemoControls />
    </div>
  );
}
