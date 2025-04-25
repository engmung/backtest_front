import { useState } from "react";
import { Card, Row, Col, Form, Button } from "react-bootstrap";
import Plot from "react-plotly.js";

// 다양한 기술적 지표 계산 함수들
const calculateIndicators = (dailyData, options = {}) => {
  if (!dailyData || dailyData.length < 2) return null;

  const sortedData = [...dailyData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  const result = {
    dates: sortedData.map((day) => day.date),
    prices: sortedData.map((day) => day.close),
  };

  // 이동평균 계산
  if (options.ma) {
    const periods = options.ma.periods || [20, 50, 200];
    periods.forEach((period) => {
      if (sortedData.length >= period) {
        result[`ma${period}`] = [];

        for (let i = period - 1; i < sortedData.length; i++) {
          const slice = sortedData.slice(i - period + 1, i + 1);
          const sum = slice.reduce((total, day) => total + day.close, 0);
          const avg = sum / period;

          result[`ma${period}`].push({
            date: sortedData[i].date,
            value: avg,
          });
        }
      }
    });
  }

  // 볼린저 밴드 계산
  if (options.bollinger) {
    const period = options.bollinger.period || 20;
    const stdDevMultiplier = options.bollinger.stdDevMultiplier || 2;

    if (sortedData.length >= period) {
      result.bollingerMiddle = [];
      result.bollingerUpper = [];
      result.bollingerLower = [];

      for (let i = period - 1; i < sortedData.length; i++) {
        const slice = sortedData.slice(i - period + 1, i + 1);
        const prices = slice.map((day) => day.close);

        // 이동평균 (중간선)
        const mean = prices.reduce((sum, price) => sum + price, 0) / period;

        // 표준편차 계산
        const variance =
          prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
          period;
        const stdDev = Math.sqrt(variance);

        // 상단/하단 밴드
        const upper = mean + stdDev * stdDevMultiplier;
        const lower = mean - stdDev * stdDevMultiplier;

        result.bollingerMiddle.push({ date: sortedData[i].date, value: mean });
        result.bollingerUpper.push({ date: sortedData[i].date, value: upper });
        result.bollingerLower.push({ date: sortedData[i].date, value: lower });
      }
    }
  }

  // RSI 계산
  if (options.rsi) {
    const period = options.rsi.period || 14;

    if (sortedData.length > period) {
      result.rsi = [];

      // 가격 변화 계산
      const changes = [];
      for (let i = 1; i < sortedData.length; i++) {
        changes.push(sortedData[i].close - sortedData[i - 1].close);
      }

      // 첫 번째 평균 이득/손실 계산
      let avgGain = 0;
      let avgLoss = 0;

      for (let i = 0; i < period; i++) {
        if (changes[i] > 0) {
          avgGain += changes[i];
        } else {
          avgLoss += Math.abs(changes[i]);
        }
      }

      avgGain /= period;
      avgLoss /= period;

      // 첫 번째 RSI 계산
      let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // 0으로 나누기 방지
      let rsiValue = 100 - 100 / (1 + rs);

      result.rsi.push({
        date: sortedData[period].date,
        value: rsiValue,
      });

      // 나머지 기간 RSI 계산 (Wilder의 스무딩 방식)
      for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
        rsiValue = 100 - 100 / (1 + rs);

        result.rsi.push({
          date: sortedData[i + 1].date,
          value: rsiValue,
        });
      }
    }
  }

  return result;
};

const AdvancedAnalysisPanel = ({ data }) => {
  const [indicators, setIndicators] = useState({
    showMA20: true,
    showMA50: true,
    showMA200: false,
    showBollinger: false,
    showRSI: false,
  });

  // 기술적 지표 계산
  const analysisData = calculateIndicators(data?.daily_data, {
    ma: { periods: [20, 50, 200] },
    bollinger: { period: 20, stdDevMultiplier: 2 },
    rsi: { period: 14 },
  });

  if (!analysisData) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-secondary text-white">
          <h5 className="mb-0">고급 기술 분석</h5>
        </Card.Header>
        <Card.Body className="text-center p-5">
          <p>분석을 위한 충분한 데이터가 없습니다.</p>
        </Card.Body>
      </Card>
    );
  }

  // 가격 차트 데이터 준비
  const plotData = [
    // 기본 가격 차트
    {
      x: analysisData.dates,
      y: analysisData.prices,
      type: "scatter",
      name: "가격",
      line: { color: "rgb(41, 121, 255)" },
    },
  ];

  // 이동평균선 추가
  if (indicators.showMA20 && analysisData.ma20) {
    plotData.push({
      x: analysisData.ma20.map((item) => item.date),
      y: analysisData.ma20.map((item) => item.value),
      type: "scatter",
      name: "20일 이동평균",
      line: { color: "orange", width: 2 },
    });
  }

  if (indicators.showMA50 && analysisData.ma50) {
    plotData.push({
      x: analysisData.ma50.map((item) => item.date),
      y: analysisData.ma50.map((item) => item.value),
      type: "scatter",
      name: "50일 이동평균",
      line: { color: "red", width: 2 },
    });
  }

  if (indicators.showMA200 && analysisData.ma200) {
    plotData.push({
      x: analysisData.ma200.map((item) => item.date),
      y: analysisData.ma200.map((item) => item.value),
      type: "scatter",
      name: "200일 이동평균",
      line: { color: "purple", width: 2 },
    });
  }

  // 볼린저 밴드 추가
  if (indicators.showBollinger && analysisData.bollingerMiddle) {
    plotData.push(
      {
        x: analysisData.bollingerMiddle.map((item) => item.date),
        y: analysisData.bollingerMiddle.map((item) => item.value),
        type: "scatter",
        name: "볼린저 중간선",
        line: { color: "green", width: 1, dash: "dash" },
      },
      {
        x: analysisData.bollingerUpper.map((item) => item.date),
        y: analysisData.bollingerUpper.map((item) => item.value),
        type: "scatter",
        name: "볼린저 상단",
        line: { color: "green", width: 1 },
      },
      {
        x: analysisData.bollingerLower.map((item) => item.date),
        y: analysisData.bollingerLower.map((item) => item.value),
        type: "scatter",
        name: "볼린저 하단",
        line: { color: "green", width: 1 },
      }
    );
  }

  // RSI 차트 준비
  const rsiPlotData =
    indicators.showRSI && analysisData.rsi
      ? [
          {
            x: analysisData.rsi.map((item) => item.date),
            y: analysisData.rsi.map((item) => item.value),
            type: "scatter",
            name: "RSI (14)",
            line: { color: "blue" },
          },
        ]
      : [];

  const handleIndicatorChange = (e) => {
    const { name, checked } = e.target;
    setIndicators((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-secondary text-white">
        <h5 className="mb-0">고급 기술 분석</h5>
      </Card.Header>
      <Card.Body>
        <Row className="mb-3">
          <Col>
            <div className="d-flex flex-wrap gap-3">
              <Form.Check
                type="switch"
                id="ma20-switch"
                name="showMA20"
                label="20일 이동평균"
                checked={indicators.showMA20}
                onChange={handleIndicatorChange}
              />
              <Form.Check
                type="switch"
                id="ma50-switch"
                name="showMA50"
                label="50일 이동평균"
                checked={indicators.showMA50}
                onChange={handleIndicatorChange}
              />
              <Form.Check
                type="switch"
                id="ma200-switch"
                name="showMA200"
                label="200일 이동평균"
                checked={indicators.showMA200}
                onChange={handleIndicatorChange}
              />
              <Form.Check
                type="switch"
                id="bollinger-switch"
                name="showBollinger"
                label="볼린저 밴드"
                checked={indicators.showBollinger}
                onChange={handleIndicatorChange}
              />
              <Form.Check
                type="switch"
                id="rsi-switch"
                name="showRSI"
                label="RSI (14)"
                checked={indicators.showRSI}
                onChange={handleIndicatorChange}
              />
            </div>
          </Col>
        </Row>

        {/* 가격 차트 (이동평균선, 볼린저 밴드 포함) */}
        <Plot
          data={plotData}
          layout={{
            title: `${data.name || data.symbol} (${data.symbol}) 기술적 분석`,
            xaxis: { title: "날짜" },
            yaxis: { title: "가격" },
            height: 500,
            margin: { l: 50, r: 50, b: 50, t: 50 },
            template: "plotly_white",
            legend: {
              orientation: "h",
              yanchor: "bottom",
              y: 1.02,
              xanchor: "right",
              x: 1,
            },
          }}
          config={{
            displayModeBar: true,
            responsive: true,
          }}
          style={{ width: "100%", height: "100%" }}
        />

        {/* RSI 차트 (선택적으로 표시) */}
        {indicators.showRSI && analysisData.rsi && (
          <div className="mt-4">
            <Plot
              data={rsiPlotData}
              layout={{
                title: `RSI (14) - ${data.name || data.symbol}`,
                xaxis: { title: "날짜" },
                yaxis: {
                  title: "RSI",
                  range: [0, 100],
                  tickvals: [30, 50, 70],
                  ticktext: ["30 (과매도)", "50 (중립)", "70 (과매수)"],
                },
                shapes: [
                  // 70선 (과매수)
                  {
                    type: "line",
                    x0: analysisData.rsi[0].date,
                    y0: 70,
                    x1: analysisData.rsi[analysisData.rsi.length - 1].date,
                    y1: 70,
                    line: {
                      color: "red",
                      width: 1,
                      dash: "dash",
                    },
                  },
                  // 30선 (과매도)
                  {
                    type: "line",
                    x0: analysisData.rsi[0].date,
                    y0: 30,
                    x1: analysisData.rsi[analysisData.rsi.length - 1].date,
                    y1: 30,
                    line: {
                      color: "green",
                      width: 1,
                      dash: "dash",
                    },
                  },
                ],
                height: 250,
                margin: { l: 50, r: 50, b: 50, t: 50 },
                template: "plotly_white",
              }}
              config={{
                displayModeBar: true,
                responsive: true,
              }}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AdvancedAnalysisPanel;
