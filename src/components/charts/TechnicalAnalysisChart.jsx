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

// Style Config
const styleConfig = {
  /* ...as before... */
  colors: {
    primary: "#80BFFF",
    secondary: "#79F2C0",
    buy: "#A3BE8C",
    sell: "#F28B82",
    ma1: "#F6E05E",
    ma2: "#94E2D5",
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
};

// Chart Component
const TechnicalAnalysisChart = ({ data, currency }) => {
  const { colors, font: commonFont, lineStyle } = styleConfig;
  const [showRSI, setShowRSI] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [width] = useWindowSize(); // Get window width
  const isMobile = width < 600; // Define mobile breakpoint

  // Calculate price units/formats based on currency
  const { priceUnit, priceSuffix, yAxisTickFormat, yAxisTickPrefix } =
    useMemo(() => {
      /* ...as in PriceChart... */
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
        return {
          priceUnit: 1,
          priceSuffix: "",
          yAxisTickFormat: ",.2f",
          yAxisTickPrefix: "$",
        };
      }
    }, [data?.daily_data, currency]);

  // Data calculation logic
  useEffect(() => {
    /* ...as before... */
    if (!data?.daily_data || data.daily_data.length < 10) {
      setChartData(null);
      return;
    }
    try {
      const sortedData = [...data.daily_data].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      const dates = sortedData.map((day) => day.date);
      const originalPrices = sortedData.map((day) => day.close);
      const calculateMA = (period) => {
        if (sortedData.length < period) return [];
        const ma = [];
        for (let i = period - 1; i < sortedData.length; i++) {
          const window = sortedData.slice(i - period + 1, i + 1);
          const avg = window.reduce((sum, day) => sum + day.close, 0) / period;
          ma.push({ date: sortedData[i].date, value: avg });
        }
        return ma;
      };
      const originalMa20 = calculateMA(20);
      const originalMa50 = calculateMA(50);
      const calculateRSI = (period = 14) => {
        if (sortedData.length < period + 1) return [];
        const rsiResult = [];
        const changes = [];
        for (let i = 1; i < sortedData.length; i++) {
          changes.push(sortedData[i].close - sortedData[i - 1].close);
        }
        let avgGain = 0;
        let avgLoss = 0;
        for (let i = 0; i < period; i++) {
          if (changes[i] > 0) avgGain += changes[i];
          else avgLoss += Math.abs(changes[i]);
        }
        avgGain /= period;
        avgLoss = avgLoss / period || 0.00001;
        for (let i = period; i < changes.length; i++) {
          const gain = changes[i] > 0 ? changes[i] : 0;
          const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
          avgGain = (avgGain * (period - 1) + gain) / period;
          avgLoss = (avgLoss * (period - 1) + loss) / period || 0.00001;
          const rs = avgGain / avgLoss;
          const rsiValue = 100 - 100 / (1 + rs);
          rsiResult.push({ date: sortedData[i + 1].date, value: rsiValue });
        }
        return rsiResult;
      };
      const rsi = calculateRSI(14);
      setChartData({
        dates,
        originalPrices,
        originalMa20: originalMa20.length > 0 ? originalMa20 : null,
        originalMa50: originalMa50.length > 0 ? originalMa50 : null,
        rsi: rsi.length > 0 ? rsi : null,
      });
    } catch (error) {
      console.error("Tech chart data calculation error:", error);
      setChartData(null);
    }
  }, [data]);

  // Rendering Logic
  if (!chartData) {
    return (
      <div
        style={{
          width: "100%",
          height: "400px",
          display: "flex" /* ... styles */,
        }}
      >
        기술적 분석 차트 데이터 부족...
      </div>
    );
  }

  const { dates, originalPrices, originalMa20, originalMa50, rsi } = chartData;

  // Apply priceUnit to axis data
  const pricesForAxis = originalPrices.map((p) =>
    p !== null ? p / priceUnit : null
  );
  const ma20ForAxis = originalMa20
    ? originalMa20.map((item) => item.value / priceUnit)
    : [];
  const ma50ForAxis = originalMa50
    ? originalMa50.map((item) => item.value / priceUnit)
    : [];

  // Simplified hover templates
  const priceHoverTemplate = `<b>%{x|%Y-%m-%d}</b><br>가격: %{y:${yAxisTickFormat}}${
    priceSuffix ? priceSuffix : ""
  }<extra></extra>`;
  const maHoverTemplate = (period) =>
    `<b>%{x|%Y-%m-%d}</b><br>MA(${period}): %{y:${yAxisTickFormat}}${
      priceSuffix ? priceSuffix : ""
    }<extra></extra>`;
  const rsiHoverTemplate = `<b>%{x|%Y-%m-%d}</b><br>RSI(14): %{y:.1f}<extra></extra>`;

  // Plotly Data Configuration
  const plotData = [];
  plotData.push({
    x: dates,
    y: pricesForAxis,
    type: "scatter",
    mode: "lines",
    name: "가격",
    line: { color: colors.primary, width: lineStyle.width },
    hovertemplate: priceHoverTemplate,
    connectgaps: true,
    yaxis: "y",
  });
  if (originalMa20)
    plotData.push({
      x: originalMa20.map((item) => item.date),
      y: ma20ForAxis,
      type: "scatter",
      mode: "lines",
      name: "MA(20)",
      line: { color: colors.ma1, width: lineStyle.width },
      hovertemplate: maHoverTemplate(20),
      connectgaps: true,
      yaxis: "y",
    });
  if (originalMa50)
    plotData.push({
      x: originalMa50.map((item) => item.date),
      y: ma50ForAxis,
      type: "scatter",
      mode: "lines",
      name: "MA(50)",
      line: { color: colors.ma2, width: lineStyle.width, dash: "dash" },
      hovertemplate: maHoverTemplate(50),
      connectgaps: true,
      yaxis: "y",
    });
  if (rsi && showRSI)
    plotData.push({
      x: rsi.map((item) => item.date),
      y: rsi.map((item) => item.value),
      type: "scatter",
      mode: "lines",
      name: "RSI(14)",
      line: { color: colors.secondary, width: 1 },
      yaxis: "y2",
      hovertemplate: rsiHoverTemplate,
      connectgaps: true,
    });

  // --- Plotly Layout Modifications ---
  const layout = {
    autosize: true,
    // <<< Conditional Title with Line Break >>>
    title: {
      text: `${data.name || data.symbol} (${data.symbol}) ${
        isMobile ? "<br>" : ""
      }기술적 분석`, // Add <br> on mobile
      font: {
        ...commonFont,
        size: commonFont.size + (isMobile ? 1 : 4),
        color: colors.text,
      }, // Smaller title on mobile
      y: 0.97,
      x: 0.5,
      xanchor: "center",
    },
    font: { ...commonFont, size: commonFont.size - (isMobile ? 1 : 0) }, // Smaller base font on mobile
    paper_bgcolor: colors.background,
    plot_bgcolor: colors.plotBackground,
    xaxis: {
      title: {
        text: "날짜",
        font: { size: commonFont.size - (isMobile ? 2 : 1) },
      },
      gridcolor: colors.grid,
      linecolor: colors.axisLine,
      tickfont: {
        size: commonFont.size - (isMobile ? 3 : 2),
        color: colors.textSecondary,
      },
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
      domain: showRSI && rsi ? [0.3, 1.0] : [0, 1.0], // <<< Adjust domain based on rsi & showRSI >>>
    },
    // <<< Legend Adjustment for Multi-Row >>>
    legend: {
      showlegend: true,
      orientation: "h",
      yanchor: "top",
      y: isMobile ? -0.25 : -0.18, // Adjusted space below
      xanchor: "center",
      x: 0.5,
      font: {
        size: commonFont.size - (isMobile ? 2 : 1),
        color: colors.textSecondary,
      },
      bgcolor: "rgba(0,0,0,0)",
      borderwidth: 0,
    },
    // <<< Adjusted Margins for Mobile >>>
    margin: {
      l: isMobile ? 45 : 65,
      r: isMobile ? (rsi && showRSI ? 50 : 30) : rsi && showRSI ? 65 : 50, // Adjust right margin based on RSI too
      b: isMobile ? 130 : 110, // More bottom margin on mobile for legend
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
  // Add RSI Y-axis and shapes conditionally
  if (rsi && showRSI) {
    layout.yaxis2 = {
      // RSI Axis
      title: {
        text: "RSI(14)",
        font: {
          color: colors.secondary,
          size: commonFont.size - (isMobile ? 2 : 1),
        },
      },
      tickfont: {
        color: colors.textSecondary,
        size: commonFont.size - (isMobile ? 3 : 2),
      },
      side: "right",
      overlaying: "y",
      range: [0, 100],
      showgrid: false,
      zeroline: false,
      linecolor: colors.axisLine,
      automargin: true,
      anchor: "x",
      domain: [0, 0.25], // Bottom 25% height for RSI
    };
    layout.shapes = [
      /* ... RSI shapes config ... */
      {
        type: "line",
        x0: dates[0],
        y0: 70,
        x1: dates[dates.length - 1],
        y1: 70,
        line: { color: colors.sell, width: 1, dash: "dash" },
        xref: "x",
        yref: "y2",
        layer: "below",
      },
      {
        type: "line",
        x0: dates[0],
        y0: 30,
        x1: dates[dates.length - 1],
        y1: 30,
        line: { color: colors.buy, width: 1, dash: "dash" },
        xref: "x",
        yref: "y2",
        layer: "below",
      },
    ];
    // Main y-axis domain already adjusted above
  } else {
    delete layout.yaxis2;
    delete layout.shapes;
  }

  const showRsiToggleButton = rsi && rsi.length > 0;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* RSI Toggle Button */}
      {showRsiToggleButton && (
        <button
          onClick={() => setShowRSI(!showRSI)}
          style={{
            /* ... button style */ position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 10 /*...*/,
          }}
        >
          {showRSI ? "RSI 숨기기" : "RSI 표시"}
        </button>
      )}
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
        // <<< Use key to force re-render on width change >>>
        key={width}
        style={{ width: "100%", height: "100%", minHeight: "490px" }}
        useResizeHandler={true}
        className="technical-analysis-chart"
      />
    </div>
  );
};

export default TechnicalAnalysisChart;
