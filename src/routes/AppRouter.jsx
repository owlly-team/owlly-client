import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../shared/layout/Layout";
import Home from "../features/home/pages/Home";
import LastTrain from "../features/home/pages/LastTrain";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="last-train" element={<LastTrain />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
