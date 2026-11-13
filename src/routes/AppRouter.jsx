import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../shared/layout/Layout";
import useSessionStore from "../shared/stores/sessionStore";
import Home from "../features/home/pages/Home";
import MatchingFailure from "../features/home/pages/MatchingFailure";
import LastTrain from "../features/home/pages/LastTrain";
import SoloTaxi from "../features/home/pages/SoloTaxi";
import AdminLogin from "../features/admin/pages/AdminLogin";
import DemandMapAdmin from "../features/admin/pages/DemandMapAdmin";
import RouteCandidateDetail from "../features/admin/pages/RouteCandidateDetail";
import ReportExport from "../features/admin/pages/ReportExport";
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
import ChatRoom from "../features/chat/pages/ChatRoom";
import ReportMember from "../features/chat/pages/ReportMember";
import SettlementInput from "../features/settlement/pages/SettlementInput";
import SettlementRefund from "../features/settlement/pages/SettlementRefund";
import MemberSettlement from "../features/settlement/pages/MemberSettlement";

export default function AppRouter() {
  useEffect(() => {
    useSessionStore.getState().hydrate();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="matching/failed" element={<MatchingFailure />} />
          <Route path="train" element={<LastTrain />} />
          <Route path="solo-taxi" element={<SoloTaxi />} />
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin" element={<DemandMapAdmin />} />
          <Route
            path="admin/routes/:routeId"
            element={<RouteCandidateDetail />}
          />
          <Route path="admin/report" element={<ReportExport />} />
          <Route path="my-info" element={<MyInfo />} />
          <Route path="demand-map" element={<DemandMap />} />
          <Route path="onboarding" element={<Start />} />
          <Route
            path="onboarding/school-verification"
            element={<SchoolVerification />}
          />
          <Route path="onboarding/permissions" element={<PermissionNotice />} />
          <Route path="onboarding/profile" element={<Profile />} />
          <Route
            path="onboarding/match-notification"
            element={<MatchNotification />}
          />
          <Route path="pickup" element={<PickupLocation />} />
          <Route path="start-time" element={<StartTime />} />
          <Route
            path="carpool-registration"
            element={<CarpoolRegistration />}
          />
          <Route path="matching/result/:partyId" element={<MatchingResult />} />
          <Route path="parties/:partyId/room" element={<ChatRoom />} />
          <Route path="rooms/:roomId" element={<ChatRoom />} />
          <Route
            path="parties/:partyId/room/report"
            element={<ReportMember />}
          />
          <Route
            path="parties/:partyId/settlement"
            element={<SettlementInput />}
          />
          <Route
            path="parties/:partyId/settlement/refund"
            element={<SettlementRefund /> }
          />
          <Route
            path="parties/:partyId/settlement/result"
            element={<MemberSettlement />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
