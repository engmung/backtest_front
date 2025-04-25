import React, { useMemo, useState, useEffect } from "react";
import Plot from "react-plotly.js";

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

// Investment performance calculation function (stable version)
const calculateInvestmentPerformance = (dailyData, investmentAmount) => {
  /* ...as before... */
  if (!dailyData || dailyData.length < 2) return null;
  const sortedData = [...dailyData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  const initialPrice = sortedData[0].close;
  if (initialPrice <= 0) return null;
  const finalPrice = sortedData[sortedData.length - 1].close;
  const sharesBought = investmentAmount / initialPrice;
  const finalValue = sharesBought * finalPrice;
  const profit = finalValue - investmentAmount;
  const profitPercentage =
    investmentAmount !== 0 ? (profit / investmentAmount) * 100 : 0;
  const dailyReturns = [];
  for (let i = 1; i < sortedData.length; i++) {
    const prevClose = sortedData[i - 1].close;
    const currClose = sortedData[i].close;
    dailyReturns.push({
      date: sortedData[i].date,
      return: prevClose !== 0 ? (currClose / prevClose - 1) * 100 : 0,
    });
  }
  const cumulativeReturns = [{ date: sortedData[0].date, return: 0 }];
  let cumReturn = 0;
  for (let i = 0; i < dailyReturns.length; i++) {
    const dailyReturnDecimal = dailyReturns[i].return / 100;
    cumReturn = (1 + cumReturn) * (1 + dailyReturnDecimal) - 1;
    cumulativeReturns.push({
      date: dailyReturns[i].date,
      return: cumReturn * 100,
    });
  }
  let peak = -Infinity;
  let maxDrawdown = 0;
  const drawdowns = sortedData.map((day) => {
    const currentPrice = day.close;
    peak = Math.max(peak, currentPrice);
    const drawdown = peak > 0 ? ((peak - currentPrice) / peak) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    return { date: day.date, drawdown: drawdown };
  });
  const returnsDecimal = dailyReturns.map((day) => day.return / 100);
  let annualizedVolatility = 0;
  let sharpeRatio = 0;
  let annualizedReturn = 0;
  if (returnsDecimal.length >= 2) {
    const avgReturn =
      returnsDecimal.reduce((sum, ret) => sum + ret, 0) / returnsDecimal.length;
    const variance =
      returnsDecimal.reduce(
        (sum, ret) => sum + Math.pow(ret - avgReturn, 2),
        0
      ) /
      (returnsDecimal.length - 1);
    const stdDev = Math.sqrt(variance);
    annualizedVolatility = stdDev * Math.sqrt(252) * 100;
    const firstDate = new Date(sortedData[0].date);
    const lastDate = new Date(sortedData[sortedData.length - 1].date);
    const days = Math.max(
      1,
      (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const years = days / 365.25;
    const totalReturnDecimal = cumReturn;
    annualizedReturn =
      years > 0 ? (Math.pow(1 + totalReturnDecimal, 1 / years) - 1) * 100 : 0;
    sharpeRatio =
      annualizedVolatility > 0 ? annualizedReturn / annualizedVolatility : 0;
  }
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
    annualizedReturn,
    dailyReturns,
    cumulativeReturns,
    drawdowns,
    tradeHistory: [
      {
        date: sortedData[0].date,
        action: "매수",
        price: initialPrice,
        shares: sharesBought,
        value: investmentAmount,
      },
      {
        date: sortedData[sortedData.length - 1].date,
        action: "평가",
        price: finalPrice,
        shares: sharesBought,
        value: finalValue,
      },
    ],
  };
};

// Style Config
const styleConfig = {
  /* ...as before... */
  colors: {
    primary: "#80BFFF",
    secondary: "#79F2C0",
    buy: "#A3BE8C",
    sell: "#F28B82",
    background: "rgba(0,0,0,0)",
    plotBackground: "rgba(0,0,0,0)",
    grid: "#3C414C",
    text: "#EAECEF",
    textSecondary: "#BDC1C6",
    axisLine: "#5F6368",
    hoverBg: "#202124",
    hoverBorder: "#5F6368",
  },
  font: {
    family: "'Inter', 'Noto Sans KR', sans-serif",
    size: 15,
    color: "#EAECEF",
  },
  lineStyle: { shape: "spline", width: 1.5 },
  markerSize: 13,
};

// Chart Component
const PriceChart = ({ data, currency }) => {
  const { colors, font: commonFont, lineStyle, markerSize } = styleConfig;
  const [width] = useWindowSize(); // Get window width
  const isMobile = width < 600; // Define mobile breakpoint

  const analysis = useMemo(() => {
    /* ...as before... */
    if (
      !data?.daily_data ||
      data.daily_data.length < 2 ||
      !data.initial_investment
    )
      return null;
    const initialInvestment = Number(data.initial_investment);
    if (isNaN(initialInvestment) || initialInvestment <= 0) return null;
    return calculateInvestmentPerformance(data.daily_data, initialInvestment);
  }, [data]);

  // Calculate price units/formats based on currency
  const { priceUnit, priceSuffix, yAxisTickFormat, yAxisTickPrefix } =
    useMemo(() => {
      if (!data?.daily_data || data.daily_data.length === 0) {
        const isKRW = currency === "KRW";
        return {
          priceUnit: 1,
          priceSuffix: isKRW ? "원" : "",
          yAxisTickFormat: isKRW ? ",.0f" : ",.2f",
          yAxisTickPrefix: isKRW ? "" : "$",
        };
      }
      const maxPrice = Math.max(...data.daily_data.map((d) => d.close));
      if (currency === "KRW") {
        const useManwon = maxPrice > 10000;
        return {
          priceUnit: useManwon ? 10000 : 1,
          priceSuffix: useManwon ? "만원" : "원",
          yAxisTickFormat: useManwon ? ",.1f" : ",.0f",
          yAxisTickPrefix: "",
        };
      } else {
        /* USD */ return {
          priceUnit: 1,
          priceSuffix: "",
          yAxisTickFormat: ",.2f",
          yAxisTickPrefix: "$",
        };
      }
    }, [data?.daily_data, currency]);

  // Calculate original and axis prices
  const { originalPrices, pricesForAxis } = useMemo(() => {
    /* ...as before... */
    if (!analysis || !analysis.cumulativeReturns)
      return { originalPrices: null, pricesForAxis: null };
    const priceMap = (data.daily_data || []).reduce((map, day) => {
      map[day.date] = day.close;
      return map;
    }, {});
    const dates = analysis.cumulativeReturns.map((item) => item.date);
    const originalPricesMapped = dates.map((date) => priceMap[date] ?? null);
    const pricesForAxisMapped = originalPricesMapped.map((p) =>
      p !== null ? p / priceUnit : null
    );
    return {
      originalPrices: originalPricesMapped,
      pricesForAxis: pricesForAxisMapped,
    };
  }, [analysis, data?.daily_data, priceUnit]);

  // Check for sufficient data
  if (
    !analysis ||
    !pricesForAxis ||
    !analysis.tradeHistory ||
    analysis.tradeHistory.length < 2
  ) {
    return (
      <div
        style={{
          width: "100%",
          height: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.textSecondary /*...*/,
        }}
      >
        차트 데이터 부족
      </div>
    );
  }

  const dates = analysis.cumulativeReturns.map((item) => item.date);
  const buyPoint = analysis.tradeHistory[0];
  const evalPoint = analysis.tradeHistory[1];
  const buyPriceForAxis = buyPoint.price / priceUnit;
  const evalPriceForAxis = evalPoint.price / priceUnit;

  // --- Simplified hover templates ---
  const priceHoverTemplate = `<b>%{x|%Y-%m-%d}</b><br>가격: %{y:${yAxisTickFormat}}${
    priceSuffix ? priceSuffix : ""
  }<extra></extra>`;
  const returnHoverTemplate = `<b>%{x|%Y-%m-%d}</b><br>누적수익률: %{y:.2f}%<extra></extra>`;
  const formatOriginalPriceForHover = (price) => {
    /* ...as before... */
    if (price === null || price === undefined) return "N/A";
    const locale = currency === "KRW" ? "ko-KR" : "en-US";
    const options =
      currency === "KRW"
        ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    const prefix = currency === "KRW" ? "" : "$";
    const suffix = currency === "KRW" ? "원" : "";
    return `${prefix}${Number(price).toLocaleString(locale, options)}${suffix}`;
  };
  const buyHoverTemplate = `<b>매수</b><br>%{x|%Y-%m-%d}<br>${formatOriginalPriceForHover(
    buyPoint.price
  )}<extra></extra>`;
  const evalHoverTemplate = `<b>평가</b><br>%{x|%Y-%m-%d}<br>${formatOriginalPriceForHover(
    evalPoint.price
  )}<extra></extra>`;

  // --- Plotly Data ---
  const plotData = [
    /* ...as before... */
    {
      x: dates,
      y: pricesForAxis,
      type: "scatter",
      mode: "lines",
      name: "가격",
      line: { color: colors.primary, ...lineStyle },
      yaxis: "y",
      hovertemplate: priceHoverTemplate,
      connectgaps: true,
    },
    {
      x: dates,
      y: analysis.cumulativeReturns.map((item) => item.return),
      type: "scatter",
      mode: "lines",
      name: "누적 수익률",
      line: { color: colors.secondary, ...lineStyle },
      yaxis: "y2",
      hovertemplate: returnHoverTemplate,
      connectgaps: true,
    },
    {
      x: [buyPoint.date],
      y: [buyPriceForAxis],
      type: "scatter",
      mode: "markers",
      name: "매수",
      marker: {
        symbol: "triangle-up",
        size: markerSize,
        color: colors.buy,
        line: { color: colors.hoverBg, width: 1.5 },
      },
      yaxis: "y",
      hovertemplate: buyHoverTemplate,
    },
    {
      x: [evalPoint.date],
      y: [evalPriceForAxis],
      type: "scatter",
      mode: "markers",
      name: "평가",
      marker: {
        symbol: "circle",
        size: markerSize,
        color: colors.sell,
        line: { color: colors.hoverBg, width: 1.5 },
      },
      yaxis: "y",
      hovertemplate: evalHoverTemplate,
    },
  ];

  // --- Plotly Layout Modifications ---
  const layout = {
    autosize: true,
    // <<< Conditional Title with Line Break >>>
    title: {
      text: `${data.name || data.symbol} (${data.symbol}) ${
        isMobile ? "<br>" : ""
      }가격 및 누적 수익률`, // Add <br> on mobile
      font: {
        ...commonFont,
        size: commonFont.size + (isMobile ? 1 : 4),
        color: colors.text,
      }, // Slightly smaller title on mobile
      y: 0.95,
      x: 0.5,
      xanchor: "center",
    },
    font: { ...commonFont, size: commonFont.size - (isMobile ? 1 : 0) }, // Slightly smaller base font on mobile
    paper_bgcolor: colors.background,
    plot_bgcolor: colors.plotBackground,
    xaxis: {
      title: {
        text: "날짜",
        font: { size: commonFont.size - (isMobile ? 2 : 1) },
      }, // Smaller axis title on mobile
      gridcolor: colors.grid,
      linecolor: colors.axisLine,
      tickfont: {
        size: commonFont.size - (isMobile ? 3 : 2),
        color: colors.textSecondary,
      }, // Smaller tick font on mobile
      automargin: true,
      showgrid: true,
      tickformatstops: [
        /*...*/
      ],
    },
    yaxis: {
      // Price Axis
      // <<< Fix Title: Ensure suffix is added correctly >>>
      title: {
        text: `가격 ${priceSuffix ? `(${priceSuffix})` : ""}`,
        font: {
          size: commonFont.size - (isMobile ? 2 : 1),
          color: colors.primary,
        },
      },
      gridcolor: colors.grid,
      linecolor: colors.axisLine,
      tickfont: {
        size: commonFont.size - (isMobile ? 3 : 2),
        color: colors.textSecondary,
      },
      tickformat: yAxisTickFormat,
      tickprefix: yAxisTickPrefix,
      ticksuffix: priceSuffix && yAxisTickPrefix === "" ? priceSuffix : "",
      automargin: true,
      zeroline: false,
    },
    yaxis2: {
      // Return Axis
      title: {
        text: "누적 수익률 (%)",
        font: {
          size: commonFont.size - (isMobile ? 2 : 1),
          color: colors.secondary,
        },
      },
      tickfont: {
        size: commonFont.size - (isMobile ? 3 : 2),
        color: colors.textSecondary,
      },
      overlaying: "y",
      side: "right",
      showgrid: false,
      zeroline: true,
      zerolinecolor: colors.grid,
      zerolinewidth: 1,
      ticksuffix: "%",
      tickformat: ".2f",
      automargin: true,
    },
    // <<< Legend Adjustment for Multi-Row >>>
    legend: {
      orientation: "h", // Horizontal layout first
      yanchor: "top",
      y: isMobile ? -0.35 : -0.25, // More space below on mobile
      xanchor: "center",
      x: 0.5,
      font: {
        size: commonFont.size - (isMobile ? 2 : 1),
        color: colors.textSecondary,
      }, // Slightly smaller legend font
      bgcolor: "rgba(0,0,0,0)",
      borderwidth: 0,
      // Plotly might wrap automatically with 'h' if space is limited by margins/width
    },
    // <<< Adjusted Margins for Mobile >>>
    margin: {
      l: isMobile ? 45 : 65, // Less left margin on mobile
      r: isMobile ? 45 : 65, // Less right margin on mobile
      b: isMobile ? 120 : 110, // Slightly more bottom margin for potentially wrapped legend
      t: 60,
      pad: 4,
    },
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: colors.hoverBg,
      font: { size: commonFont.size - 1, color: commonFont.color },
      bordercolor: colors.hoverBorder,
      align: "left",
    },
    dragmode: "zoom",
  };

  return (
    <Plot
      data={plotData}
      layout={layout}
      config={{
        displayModeBar: "hover",
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["select2d", "lasso2d"],
        scrollZoom: true,
      }}
      // <<< Use key to force re-render on width change for layout adjustments >>>
      key={width}
      style={{ width: "100%", height: "100%", minHeight: "400px" }}
      useResizeHandler={true}
      className="price-chart-container price-chart-dark"
    />
  );
};

export default PriceChart;
