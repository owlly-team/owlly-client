import { useLocation, useNavigate } from "react-router-dom";

const TAB_ROUTES = {
  home: "/",
  return: "/pickup",
  map: "/demand-map",
  profile: "/my-info",
};

export default function useBottomTabNavigation({ onReturn } = {}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeTab = Object.keys(TAB_ROUTES).find(
    (tab) => TAB_ROUTES[tab] === pathname,
  );

  function handleTabChange(tab) {
    if (tab === activeTab) return;
    if (tab === "return" && onReturn) {
      onReturn();
      return;
    }
    const route = TAB_ROUTES[tab];
    if (route) navigate(route);
  }

  return { activeTab, handleTabChange };
}
