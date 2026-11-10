import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../shared/layout/Layout";
import Home from "../features/home/pages/Home";
import LastTrain from "../features/home/pages/LastTrain";
import SoloTaxi from "../features/home/pages/SoloTaxi";
import DemandMapAdmin from "../features/admin/pages/DemandMapAdmin";
import RouteCandidateDetail from "../features/admin/pages/RouteCandidateDetail";
import ReportExport from "../features/admin/pages/ReportExport";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="last-train" element={<LastTrain />} />
          <Route path="solo-taxi" element={<SoloTaxi />} />
          <Route path="admin" element={<DemandMapAdmin />} />
          <Route
            path="admin/routes/:routeId"
            element={<RouteCandidateDetail />}
          />
          <Route path="admin/report" element={<ReportExport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
