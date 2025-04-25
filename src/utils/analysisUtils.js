// src/utils/analysisUtils.js

/**
 * 일별 데이터를 기반으로 투자 성과를 계산합니다.
 * @param {Array} dailyData 일별 가격 데이터 배열
 * @param {number} investmentAmount 초기 투자 금액
 * @returns {Object} 투자 성과 분석 결과
 */
export const calculateInvestmentPerformance = (dailyData, investmentAmount) => {
  if (!dailyData || dailyData.length < 2) {
    return null;
  }

  const sortedData = [...dailyData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // 초기 및 최종 가격
  const initialPrice = sortedData[0].close;
  const finalPrice = sortedData[sortedData.length - 1].close;

  // 매수 수량 및 최종 가치
  const sharesBought = investmentAmount / initialPrice;
  const finalValue = sharesBought * finalPrice;

  // 수익 계산
  const profit = finalValue - investmentAmount;
  const profitPercentage = (profit / investmentAmount) * 100;

  // 일간 수익률 계산
  const dailyReturns = [];
  for (let i = 1; i < sortedData.length; i++) {
    const prevClose = sortedData[i - 1].close;
    const currClose = sortedData[i].close;
    const dailyReturn = (currClose / prevClose - 1) * 100;
    dailyReturns.push({
      date: sortedData[i].date,
      return: dailyReturn,
    });
  }

  // 누적 수익률 계산
  const cumulativeReturns = [];
  let cumReturn = 0;

  for (let i = 0; i < dailyReturns.length; i++) {
    const dailyReturn = dailyReturns[i].return / 100; // 소수점으로 변환
    cumReturn = (1 + cumReturn) * (1 + dailyReturn) - 1;
    cumulativeReturns.push({
      date: dailyReturns[i].date,
      return: cumReturn * 100,
    });
  }

  // 최대 낙폭(MDD) 계산
  let peak = sortedData[0].close;
  let maxDrawdown = 0;

  const drawdowns = sortedData.map((day) => {
    peak = Math.max(peak, day.close);
    const drawdown = ((peak - day.close) / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);

    return {
      date: day.date,
      drawdown: drawdown,
    };
  });

  // 변동성 계산 (연간화된 표준편차)
  const returns = dailyReturns.map((day) => day.return);
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance =
    returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) /
    returns.length;
  const stdDev = Math.sqrt(variance);
  const annualizedVolatility = stdDev * Math.sqrt(252); // 252 거래일 기준

  // 샤프 비율 계산 (무위험 수익률 0% 가정)
  const annualizedReturn = profitPercentage / (sortedData.length / 252);
  const sharpeRatio =
    annualizedVolatility > 0 ? annualizedReturn / annualizedVolatility : 0;

  return {
    initialPrice,
    finalPrice,
    sharesBought,
    finalValue,
    profit,
    profitPercentage,
    maxDrawdown,
    volatility: annualizedVolatility,
    sharpeRatio,
    dailyReturns,
    cumulativeReturns,
    drawdowns,
  };
};

/**
 * 추가 기술적 지표 계산 (이동평균, RSI 등)
 * @param {Array} dailyData 일별 가격 데이터 배열
 * @returns {Object} 기술적 지표 계산 결과
 */
export const calculateTechnicalIndicators = (dailyData) => {
  // 여기에 이동평균, 볼린저 밴드, RSI 등의 계산 추가 가능
  if (!dailyData || dailyData.length < 20) {
    return null;
  }

  const sortedData = [...dailyData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // 이동평균 계산 (20일, 50일)
  const ma20 = calculateMovingAverage(sortedData, 20);
  const ma50 = calculateMovingAverage(sortedData, 50);

  return {
    ma20,
    ma50,
    // 추가 지표들...
  };
};

// 이동평균 계산 헬퍼 함수
const calculateMovingAverage = (data, period) => {
  const result = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((total, day) => total + day.close, 0);
    const avg = sum / period;

    result.push({
      date: data[i].date,
      value: avg,
    });
  }

  return result;
};
