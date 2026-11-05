import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../shared/layout/Layout";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* 라우팅 해주면 됨 */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
