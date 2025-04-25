import BacktestForm from "../components/BacktestForm";
import { Link } from "react-router-dom";

const HomePage = ({ setBacktestResult }) => {
  return (
    <div className="container">
      <header className="branding">
        <Link to="/" className="logo-link">
          <div className="app-logo">그때 살껄</div>
        </Link>
        <p className="tagline">과거 투자의 현재 가치를 간단하게 확인하세요</p>
      </header>

      <div className="main-content">
        <div className="content-column">
          {/* 채팅형 입력 폼 */}
          <BacktestForm setBacktestResult={setBacktestResult} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
