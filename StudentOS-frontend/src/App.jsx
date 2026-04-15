import { BrowserRouter, Routes, Route } from "react-router-dom";
import Examify from "./pages/Examify";
import StudentOS from "./pages/StudentOS";
import Handwriting from "./pages/Handwriting";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudentOS />} />
        <Route path="/examify" element={<Examify />} />
        <Route path="/handwriting" element={<Handwriting />} />
      </Routes>
    </BrowserRouter>
  );
}