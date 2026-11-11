import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../shared/layout/Layout";
import Home from "../features/home/pages/Home";
import LastTrain from "../features/home/pages/LastTrain";
import SoloTaxi from "../features/home/pages/SoloTaxi";
import StartTime from "../features/matching/pages/StartTime";
import CarpoolRegistration from "../features/matching/pages/CarpoolRegistration";
import PickupLocation from "../features/matching/pages/PickupLocation";
import MatchingResult from "../features/matching/pages/MatchingResult";
import ChatRoom from "../features/chat/pages/ChatRoom";
import ReportMember from "../features/chat/pages/ReportMember";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="last-train" element={<LastTrain />} />
          <Route path="solo-taxi" element={<SoloTaxi />} />
          <Route path="pickup-location" element={<PickupLocation />} />
          <Route path="start-time" element={<StartTime />} /> 
          <Route path="carpool-registration" element={<CarpoolRegistration />} /> 
          <Route path="matching-result/:partyId" element={<MatchingResult />} />
          <Route path="parties/:partyId/room" element={<ChatRoom />} />
          <Route path="rooms/:roomId" element={<ChatRoom />} />
          <Route path="parties/:partyId/room/report" element={<ReportMember />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
