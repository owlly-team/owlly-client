import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../shared/layout/Layout";
import Home from "../features/home/pages/Home";
import LastTrain from "../features/home/pages/LastTrain";
import SoloTaxi from "../features/home/pages/SoloTaxi";
import Start from "../features/onboarding/pages/Start";
import SchoolVerification from "../features/onboarding/pages/SchoolVerification";
import PermissionNotice from "../features/onboarding/pages/PermissionNotice";
import Profile from "../features/onboarding/pages/Profile";
import MatchNotification from "../features/onboarding/pages/MatchNotification";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="last-train" element={<LastTrain />} />
          <Route path="solo-taxi" element={<SoloTaxi />} />
          <Route path="onboarding" element={<Start />} />
          <Route
            path="onboarding/school-verification"
            element={<SchoolVerification />}
          />
          <Route
            path="onboarding/permissions"
            element={<PermissionNotice />}
          />
          <Route path="onboarding/profile" element={<Profile />} />
          <Route
            path="onboarding/match-notification"
            element={<MatchNotification />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
