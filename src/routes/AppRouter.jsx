import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../shared/layout/Layout";
import Home from "../features/home/pages/Home";
import LastTrain from "../features/home/pages/LastTrain";
import SoloTaxi from "../features/home/pages/SoloTaxi";
import MyInfo from "../features/mypage/pages/MyInfo";
import DemandMap from "../features/demand/pages/DemandMap";
import Start from "../features/onboarding/pages/Start";
import SchoolVerification from "../features/onboarding/pages/SchoolVerification";
import PermissionNotice from "../features/onboarding/pages/PermissionNotice";
import Profile from "../features/onboarding/pages/Profile";
import MatchNotification from "../features/onboarding/pages/MatchNotification";
import StartTime from "../features/matching/pages/StartTime";
import CarpoolRegistration from "../features/matching/pages/CarpoolRegistration";
import PickupLocation from "../features/matching/pages/PickupLocation";
import MatchingResult from "../features/matching/pages/MatchingResult";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="last-train" element={<LastTrain />} />
          <Route path="solo-taxi" element={<SoloTaxi />} />
          <Route path="my-info" element={<MyInfo />} />
          <Route path="demand-map" element={<DemandMap />} />
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
          <Route path="pickup-location" element={<PickupLocation />} />
          <Route path="start-time" element={<StartTime />} />
          <Route path="carpool-registration" element={<CarpoolRegistration />} />
          <Route path="matching-result/:partyId" element={<MatchingResult />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
