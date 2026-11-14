import { lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../shared/layout/Layout";
import useSessionStore from "../shared/stores/sessionStore";
import Home from "../features/home/pages/Home";
import Start from "../features/onboarding/pages/Start";

const MatchingFailure = lazy(
  () => import("../features/home/pages/MatchingFailure"),
);
const LastTrain = lazy(() => import("../features/home/pages/LastTrain"));
const SoloTaxi = lazy(() => import("../features/home/pages/SoloTaxi"));
const AdminLogin = lazy(() => import("../features/admin/pages/AdminLogin"));
const DemandMapAdmin = lazy(
  () => import("../features/admin/pages/DemandMapAdmin"),
);
const RouteCandidateDetail = lazy(
  () => import("../features/admin/pages/RouteCandidateDetail"),
);
const ReportExport = lazy(() => import("../features/admin/pages/ReportExport"));
const MyInfo = lazy(() => import("../features/mypage/pages/MyInfo"));
const DemandMap = lazy(() => import("../features/demand/pages/DemandMap"));
const SchoolVerification = lazy(
  () => import("../features/onboarding/pages/SchoolVerification"),
);
const PermissionNotice = lazy(
  () => import("../features/onboarding/pages/PermissionNotice"),
);
const Profile = lazy(() => import("../features/onboarding/pages/Profile"));
const DropoffLocation = lazy(
  () => import("../features/onboarding/pages/DropoffLocation"),
);
const MatchNotification = lazy(
  () => import("../features/onboarding/pages/MatchNotification"),
);
const StartTime = lazy(() => import("../features/matching/pages/StartTime"));
const CarpoolRegistration = lazy(
  () => import("../features/matching/pages/CarpoolRegistration"),
);
const PickupLocation = lazy(
  () => import("../features/matching/pages/PickupLocation"),
);
const MatchingResult = lazy(
  () => import("../features/matching/pages/MatchingResult"),
);
const ChatRoom = lazy(() => import("../features/chat/pages/ChatRoom"));
const ReportMember = lazy(() => import("../features/chat/pages/ReportMember"));
const SettlementInput = lazy(
  () => import("../features/settlement/pages/SettlementInput"),
);
const SettlementRefund = lazy(
  () => import("../features/settlement/pages/SettlementRefund"),
);
const MemberSettlement = lazy(
  () => import("../features/settlement/pages/MemberSettlement"),
);

export default function AppRouter() {
  useEffect(() => {
    useSessionStore.getState().hydrate();
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Start />} />
        <Route path="home" element={<Home />} />
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
          path="onboarding/dropoff-location"
          element={<DropoffLocation />}
        />
        <Route
          path="onboarding/match-notification"
          element={<MatchNotification />}
        />
        <Route path="pickup" element={<PickupLocation />} />
        <Route path="start-time" element={<StartTime />} />
        <Route path="carpool-registration" element={<CarpoolRegistration />} />
        <Route path="matching/result/:partyId" element={<MatchingResult />} />
        <Route path="parties/:partyId/room" element={<ChatRoom />} />
        <Route path="rooms/:roomId" element={<ChatRoom />} />
        <Route path="parties/:partyId/room/report" element={<ReportMember />} />
        <Route
          path="parties/:partyId/settlement"
          element={<SettlementInput />}
        />
        <Route
          path="parties/:partyId/settlement/refund"
          element={<SettlementRefund />}
        />
        <Route
          path="parties/:partyId/settlement/result"
          element={<MemberSettlement />}
        />
      </Route>
    </Routes>
  );
}
