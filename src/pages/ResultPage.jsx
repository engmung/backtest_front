import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import PriceChart from "../components/charts/PriceChart";
import DrawdownChart from "../components/charts/DrawdownChart";
import ReturnDistributionChart from "../components/charts/ReturnDistributionChart";
import TechnicalAnalysisChart from "../components/charts/TechnicalAnalysisChart";

// --- Utility Hook for Window Size ---
function useWindowSize() {
  const [size, setSize] = useState([window.innerWidth, window.innerHeight]);
  useEffect(() => {
    const handleResize = () => {
      setSize([window.innerWidth, window.innerHeight]);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}
// --- End Utility Hook ---

// --- Helper Function for Currency Formatting ---
// <<< KRW 포맷 변경: 1,000,000원 형식으로 >>>
const formatCurrency = (amount, currencyCode) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "-"; // Handle invalid amounts
  }

  const actualCurrencyCode = currencyCode === "KRW" ? "KRW" : "USD"; // Explicitly KRW or USD

  try {
    let numAmount = Number(amount);

    if (actualCurrencyCode === "KRW") {
      // <<< KRW: 숫자 포맷 후 '원' 접미사 추가 >>>
      numAmount = Math.floor(numAmount); // 원화는 버림
      return numAmount.toLocaleString("ko-KR") + "원";
    } else {
      // USD or others
      // <<< USD: 기존 Intl.NumberFormat 사용 >>>
      const options = {
        style: "currency",
        currency: "USD", // Hardcode USD for non-KRW cases for now
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };
      numAmount = parseFloat(numAmount.toFixed(2)); // Round to 2 decimals for USD
      return numAmount.toLocaleString("en-US", options);
    }
  } catch (e) {
    console.error(
      "Error formatting currency:",
      e,
      "Amount:",
      amount,
      "Currency:",
      currencyCode
    );
    // Fallback for very large/small numbers or other errors
    // <<< Fallback도 KRW 형식에 맞게 수정 >>>
    return `${actualCurrencyCode === "KRW" ? "" : "$"}${Number(
      amount
    ).toLocaleString()}${actualCurrencyCode === "KRW" ? "원" : ""}`;
  }
};
// --- End Helper Function ---

const ResultPage = ({ backtestResult }) => {
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState("distribution");
  // <<< Add window size hook >>>
  const [width] = useWindowSize();
  const isMobile = width < 600; // Define mobile breakpoint

  useEffect(() => {
    if (!backtestResult) {
      navigate("/");
    }
  }, [backtestResult, navigate]);

  if (!backtestResult) {
    return null;
  }

  // --- Extract data safely ---
  const resultData = backtestResult.result || {};
  const assetCurrency = resultData.currency || "USD"; // Asset's actual currency
  const initialInvestment = resultData.initial_investment || 0;

  const getNumericValue = (value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") return parseFloat(value);
    if (typeof value === "object" && value !== null) {
      if (value._value !== undefined) return Number(value._value);
      const values = Object.values(value);
      if (values.length > 0 && typeof values[0] === "number") return values[0];
    }
    return NaN;
  };

  const rawFinalValue = getNumericValue(resultData.final_value);
  const finalValue = !isNaN(rawFinalValue) ? rawFinalValue : 0;

  const rawProfitPercentage = getNumericValue(resultData.profit_percentage);
  const profitPercentage = !isNaN(rawProfitPercentage)
    ? rawProfitPercentage
    : 0;

  const isProfit = profitPercentage >= 0;

  let firstPrice = null;
  let firstPriceDate = null;
  let lastPrice = null;
  let lastPriceDate = null;

  if (resultData.daily_data && resultData.daily_data.length > 0) {
    try {
      const sortedDataForPrice = [...resultData.daily_data].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      const firstDataPoint = sortedDataForPrice[0];
      if (
        firstDataPoint &&
        typeof firstDataPoint.close === "number" &&
        firstDataPoint.date
      ) {
        firstPrice = firstDataPoint.close;
        firstPriceDate = firstDataPoint.date;
      }
      const lastDataPoint = sortedDataForPrice[sortedDataForPrice.length - 1];
      if (
        lastDataPoint &&
        typeof lastDataPoint.close === "number" &&
        lastDataPoint.date
      ) {
        lastPrice = lastDataPoint.close;
        lastPriceDate = lastDataPoint.date;
      }
    } catch (error) {
      console.error("Error extracting first/last price:", error);
      firstPrice = null;
      lastPrice = null;
      firstPriceDate = null;
      lastPriceDate = null;
    }
  }

  const [metrics, setMetrics] = useState({
    maxDrawdown: "0.00",
    volatility: "0.00",
    sharpeRatio: "0.00",
  });

  useEffect(() => {
    // --- Metrics calculation logic (no changes needed here from previous version) ---
    const calculateMetrics = () => {
      let maxDrawdown = "0.00";
      let volatility = "0.00";
      let sharpeRatio = "0.00";
      try {
        const dailyData = resultData.daily_data;
        if (dailyData && dailyData.length > 1) {
          const sortedData = [...dailyData].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );
          // MDD
          let peak = -Infinity;
          let maxDrawdownCalc = 0;
          sortedData.forEach((day) => {
            peak = Math.max(peak, day.close);
            if (peak > 0) {
              maxDrawdownCalc = Math.max(
                maxDrawdownCalc,
                (peak - day.close) / peak
              );
            }
          });
          // Returns
          const dailyReturns = [];
          for (let i = 1; i < sortedData.length; i++) {
            const prevClose = sortedData[i - 1].close;
            const currClose = sortedData[i].close;
            dailyReturns.push(
              prevClose > 0 ? (currClose - prevClose) / prevClose : 0
            );
          }
          // Volatility, Sharpe
          if (dailyReturns.length > 0) {
            const avgReturn =
              dailyReturns.reduce((sum, ret) => sum + ret, 0) /
              dailyReturns.length;
            const variance =
              dailyReturns.reduce(
                (sum, ret) => sum + Math.pow(ret - avgReturn, 2),
                0
              ) / (dailyReturns.length > 1 ? dailyReturns.length - 1 : 1);
            const stdDev = Math.sqrt(variance);
            const annualizedVolatility = stdDev * Math.sqrt(252);
            // Annualized Return (CAGR)
            const firstDate = new Date(sortedData[0].date);
            const lastDate = new Date(sortedData[sortedData.length - 1].date);
            const days = Math.max(
              1,
              (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            const years = days / 365.25;
            const totalReturnDecimal = profitPercentage / 100;
            const annualizedReturn =
              years > 0 ? Math.pow(1 + totalReturnDecimal, 1 / years) - 1 : 0;
            const sharpeRatioCalc =
              annualizedVolatility > 0
                ? annualizedReturn / annualizedVolatility
                : 0;
            // Format & Clamp
            maxDrawdown = (maxDrawdownCalc * 100).toFixed(2);
            volatility = (annualizedVolatility * 100).toFixed(2);
            sharpeRatio = sharpeRatioCalc.toFixed(2);
            if (parseFloat(maxDrawdown) > 100 || parseFloat(maxDrawdown) < 0)
              maxDrawdown = Math.min(
                100,
                Math.max(0, parseFloat(maxDrawdown))
              ).toFixed(2);
            if (parseFloat(volatility) > 500 || parseFloat(volatility) < 0)
              volatility = Math.min(
                500,
                Math.max(0, parseFloat(volatility))
              ).toFixed(2);
            if (Math.abs(parseFloat(sharpeRatio)) > 20)
              sharpeRatio = parseFloat(sharpeRatio) < 0 ? "-20.00" : "20.00";
          }
        }
      } catch (error) {
        console.error("Error calculating metrics:", error);
        maxDrawdown = "N/A";
        volatility = "N/A";
        sharpeRatio = "N/A";
      }
      setMetrics({ maxDrawdown, volatility, sharpeRatio });
    };
    if (backtestResult) {
      calculateMetrics();
    }
  }, [backtestResult, resultData, profitPercentage]);

  return (
    <div className="container">
      <header className="branding">
        <Link to="/" className="logo-link">
          <div className="app-logo">그때 살껄</div>
        </Link>
        <p className="tagline">
          아주 쉬운 모의투자, 과거 투자의 가치를 손쉽게 확인하세요
        </p>
      </header>
      <div className="main-content">
        <div className="content-column">
          {/* Chat History */}
          <div className="chat-history result-chat">
            <div className="system-message">어떤 백테스팅을 도와드릴까요?</div>
            <div className="user-message">{backtestResult.request}</div>
            <div className="system-message">
              {resultData.name || resultData.symbol} ({resultData.symbol})의
              백테스팅 결과입니다
            </div>
          </div>
          <div className="results-container">
            {/* Investment Summary */}
            <div className="investment-summary">
              <div className="summary-line">
                {/* <<< Always format investment summary in KRW (1,000,000원 format) >>> */}
                <span className="amount">
                  {formatCurrency(initialInvestment, "KRW")}
                </span>{" "}
                →{" "}
                <span className="amount">
                  {formatCurrency(finalValue, "KRW")}
                </span>
                (
                <span className={isProfit ? "profit" : "loss"}>
                  {isProfit ? "+" : ""}
                  {profitPercentage.toFixed(2)}%
                </span>
                )
              </div>

              {/* Price Trend Info */}
              {/* <<< Format item price trend in the asset's actual currency >>> */}
              {firstPrice !== null &&
                lastPrice !== null &&
                firstPriceDate &&
                lastPriceDate && (
                  <div
                    className="price-trend-info"
                    style={{
                      fontSize: "0.8em", // Adjusted font size
                      color: "#aaa",
                      marginTop: "8px",
                      fontWeight: "300",
                      lineHeight: isMobile ? "1.6" : "1.2", // Conditional line height
                    }}
                  >
                    <span style={{ fontWeight: "500" }}> 종목 가격: </span>
                    <span className="start-price">
                      ({firstPriceDate}){" "}
                      {formatCurrency(firstPrice, assetCurrency)}{" "}
                      {/* Use assetCurrency */}
                    </span>
                    {/* <<< Conditional Line Break for Mobile >>> */}
                    {isMobile ? (
                      <>
                        <br />
                        {" → "}
                      </>
                    ) : (
                      " → "
                    )}
                    <span className="end-price">
                      ({lastPriceDate}){" "}
                      {formatCurrency(lastPrice, assetCurrency)}{" "}
                      {/* Use assetCurrency */}
                    </span>
                  </div>
                )}
            </div>

            {/* Chart Area */}
            <div className="chart-container">
              {/* Pass the asset's actual currency to the chart */}
              <PriceChart data={resultData} currency={assetCurrency} />
            </div>

            {/* Key Metrics */}
            <div className="key-metrics">
              {/* <<< Always format monetary metrics in KRW (1,000,000원 format) >>> */}
              <div className="metric-item">
                <span className="metric-label">초기 투자금</span>
                <span className="metric-value">
                  {formatCurrency(initialInvestment, "KRW")}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">최종 평가금액</span>
                <span className="metric-value">
                  {formatCurrency(finalValue, "KRW")}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">수익률</span>
                <span
                  className={`metric-value ${isProfit ? "profit" : "loss"}`}
                >
                  {isProfit ? "+" : ""}
                  {profitPercentage.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          {/* Advanced Analysis Toggle */}
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "기본 정보만 보기" : "고급 분석 정보 보기 +"}
          </button>
          {/* Advanced Analysis Section */}
          <div className={`advanced-content ${showAdvanced ? "show" : ""}`}>
            {/* Technical Indicators Summary */}
            <div className="technical-info">
              <div className="technical-item">
                <span className="technical-label">최대 낙폭 (MDD)</span>
                <span className="technical-value">
                  {metrics.maxDrawdown === "N/A"
                    ? "N/A"
                    : `${metrics.maxDrawdown}%`}
                </span>
              </div>
              <div className="technical-item">
                <span className="technical-label">변동성 (연율화)</span>
                <span className="technical-value">
                  {metrics.volatility === "N/A"
                    ? "N/A"
                    : `${metrics.volatility}%`}
                </span>
              </div>
              <div className="technical-item">
                <span className="technical-label">샤프 비율</span>
                <span className="technical-value">{metrics.sharpeRatio}</span>
              </div>
            </div>
            {/* Description */}
            <p className="volatility-description">
              변동성은 자산 가격의 불확실성을 측정합니다. 높은 변동성은 큰 가격
              움직임을 의미하며, 샤프 비율은 위험 대비 수익을 평가합니다. 샤프
              비율이 높을수록 위험 대비 더 나은 수익을 나타냅니다. 최대
              낙폭(MDD)은 투자 기간 중 최고점에서 최저점까지의 가장 큰
              하락폭입니다.
            </p>
            {/* Tabs */}
            <div className="advanced-tabs">
              <button
                className={`advanced-tab ${
                  activeTab === "distribution" ? "active" : ""
                }`}
                onClick={() => setActiveTab("distribution")}
              >
                수익률 분포
              </button>
              <button
                className={`advanced-tab ${
                  activeTab === "drawdown" ? "active" : ""
                }`}
                onClick={() => setActiveTab("drawdown")}
              >
                최대 낙폭
              </button>
              <button
                className={`advanced-tab ${
                  activeTab === "technical" ? "active" : ""
                }`}
                onClick={() => setActiveTab("technical")}
              >
                이동평균/RSI
              </button>
            </div>
            {/* Tab Content */}
            <div
              className={`advanced-tab-content ${
                activeTab === "distribution" ? "active" : ""
              }`}
            >
              <div className="chart-container">
                <ReturnDistributionChart data={resultData} />
              </div>
              <p className="tab-description">
                일일 수익률 분포는 각 거래일의 수익률을 히스토그램이나
                밀도곡선으로 나타낸 것이고, 분포 폭이 좁고 평균 근처에 모여
                있으면 변동성이 낮아 안정적인 시장 환경을 의미하므로, 이를 통해
                포지션 사이즈나 리스크 관리 전략을 점검하면 좋습니다.
              </p>
            </div>
            <div
              className={`advanced-tab-content ${
                activeTab === "drawdown" ? "active" : ""
              }`}
            >
              <div className="chart-container">
                <DrawdownChart data={resultData} />
              </div>
              <p className="tab-description">
                최대 낙폭(MDD)은 포트폴리오 가치가 최고점에서 최저점으로 하락한
                최대 비율을 의미하고, 이 값이 작을수록 손실 방어력이 높다는
                뜻이므로, 자신의 위험 허용 범위를 설정하거나 방어적 전략을
                검토할 때 참고하면 좋습니다.
              </p>
            </div>
            <div
              className={`advanced-tab-content ${
                activeTab === "technical" ? "active" : ""
              }`}
            >
              <div className="chart-container">
                {/* Pass the asset's actual currency to the chart */}
                <TechnicalAnalysisChart
                  data={resultData}
                  currency={assetCurrency}
                />
              </div>
              <p className="tab-description">
                이동평균선은 일정 기간 종가의 평균을 연결해 추세를 부드럽게
                보여주는 지표이고, 단기선이 장기선을 상향 돌파할 때 매수, 하향
                이탈할 때 매도 시그널로 활용하면 좋습니다.
                <br />
                <br />
                RSI(상대강도지수)는 최근 일정 기간의 평균 상승폭과 평균 하락폭을
                비교해 0~100 범위로 표시하는 모멘텀 지표이고, 70 이상이면 과매수
                구간으로 조정 가능성이, 30 이하이면 과매도 구간으로 반등
                가능성이 높으니 매매 타이밍 보조지표로 활용하면 좋습니다.
              </p>
            </div>
          </div>{" "}
          {/* advanced-content end */}
          {/* Navigation Button */}
          <div className="navigation-elements">
            <button className="nav-button" onClick={() => navigate("/")}>
              <i
                className="fas fa-arrow-left"
                style={{ marginRight: "8px" }}
              ></i>{" "}
              새로운 투자 분석하기
            </button>
          </div>
        </div>{" "}
        {/* content-column end */}
      </div>{" "}
      {/* main-content end */}
    </div> /* container end */
  );
};

export default ResultPage;
