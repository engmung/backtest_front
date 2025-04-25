import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next"; // <-- 1. Import SpeedInsights
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

// 컴포넌트 임포트
import HomePage from "./pages/HomePage";
import ResultPage from "./pages/ResultPage";
import Footer from "./components/Footer";

function App() {
  // 백테스트 결과를 저장할 상태
  const [backtestResult, setBacktestResult] = useState(null);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route
            path="/"
            element={<HomePage setBacktestResult={setBacktestResult} />}
          />
          <Route
            path="/result"
            element={<ResultPage backtestResult={backtestResult} />}
          />
        </Routes>
        <Footer />
        <Analytics /> {/* Vercel Analytics 컴포넌트 */}
        <SpeedInsights /> {/* <-- 2. Add SpeedInsights component here */}
      </div>
    </Router>
  );
}

export default App;
