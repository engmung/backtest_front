import React, { useMemo, useState, useEffect } from "react"; // Import React
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

// --- Return Distribution Calculation (Stable Version) ---
const calculateReturnDistribution = (dailyData) => {
  if (!dailyData || dailyData.length < 2) {
    return null;
  }
  const sortedData = [...dailyData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  const dailyReturns = [];
  for (let i = 1; i < sortedData.length; i++) {
    const prevClose = sortedData[i - 1].close;
    const currClose = sortedData[i].close;
    const dailyReturn = prevClose !== 0 ? (currClose / prevClose - 1) * 100 : 0;
    dailyReturns.push({ date: sortedData[i].date, return: dailyReturn });
  }
  if (dailyReturns.length === 0) return null;
  const returns = dailyReturns.map((day) => day.return);
  const meanReturn =
    returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const histogramData = {};
  const binSize = 0.25; // Adjust bin size if needed
  returns.forEach((ret) => {
    const bin = Math.round(ret / binSize) * binSize;
    histogramData[bin] = (histogramData[bin] || 0) + 1;
  });
  const values = Object.values(histogramData);
  const maxFrequency = values.length > 0 ? Math.max(...values) : 1;
  return { dailyReturns, meanReturn, histogramData, maxFrequency };
};

// --- Style Config ---
const styleConfig = {
  colors: {
    primary: "#80BFFF",
    secondary: "#79F2C0",
    /* ... other colors */ background: "rgba(0,0,0,0)",
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
};

// --- Chart Component ---
const ReturnDistributionChart = ({ data }) => {
  const { colors, font: commonFont } = styleConfig;
  const [width] = useWindowSize(); // Get window width
  const isMobile = width < 600; // Define mobile breakpoint

  const returnAnalysis = useMemo(() => {
    if (!data?.daily_data || data.daily_data.length < 2) {
      return null;
    }
    return calculateReturnDistribution(data.daily_data);
  }, [data]);

  // --- Check for sufficient data ---
  if (!returnAnalysis) {
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
        수익률 분포 차트 데이터 부족
      </div>
    );
  }

  const { dailyReturns, meanReturn, maxFrequency } = returnAnalysis;
  const histogramHoverTemplate = `수익률 범위: %{x:.2f}%<br>빈도: %{y}일<extra></extra>`; // Format range and add unit

  // --- Plotly Data ---
  const plotData = [
    {
      x: dailyReturns.map((item) => item.return),
      type: "histogram",
      name: "수익률 분포",
      marker: {
        color: colors.secondary,
        opacity: 0.7,
        line: { color: colors.hoverBg, width: 0.5 },
      },
      nbinsx: 40, // Adjust bin count as needed
      hovertemplate: histogramHoverTemplate,
    },
  ];

  // --- Plotly Layout Modifications ---
  const layout = {
    autosize: true,
    // <<< Conditional Title with Specific Line Break >>>
    title: {
      text: `${data.name || data.symbol} (${data.symbol})<br>일일 ${
        isMobile ? "수익률<br>분포" : "수익률 분포"
      }`, // Specific break on mobile
      font: {
        ...commonFont,
        size: commonFont.size + (isMobile ? 1 : 4),
        color: colors.text,
      },
      y: isMobile ? 0.95 : 0.97, // Adjust title position slightly on mobile
      x: 0.5,
      xanchor: "center",
    },
    font: { ...commonFont, size: commonFont.size - (isMobile ? 1 : 0) },
    paper_bgcolor: colors.background,
    plot_bgcolor: colors.plotBackground,
    xaxis: {
      title: {
        text: "일일 수익률 (%)",
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
      ticksuffix: "%",
    },
    yaxis: {
      title: {
        text: "빈도 (일)",
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
    },
    shapes: [
      // Mean return line
      {
        type: "line",
        x0: meanReturn,
        y0: 0,
        x1: meanReturn,
        y1: maxFrequency * 0.8,
        line: { color: colors.primary, width: 2, dash: "dash" },
      },
    ],
    annotations: [
      // Mean return text
      {
        x: meanReturn,
        y: maxFrequency * 0.85,
        text: `평균: ${meanReturn.toFixed(2)}%`,
        showarrow: true,
        arrowhead: 1,
        ax: 0,
        ay: -40,
        font: {
          size: commonFont.size - (isMobile ? 3 : 2),
          color: colors.textSecondary,
        },
        bgcolor: colors.hoverBg,
        borderpad: 4,
      },
    ],
    // <<< Adjusted Margins for Mobile >>>
    margin: {
      l: isMobile ? 45 : 65,
      r: isMobile ? 30 : 50,
      b: isMobile ? 90 : 80,
      t: isMobile ? 80 : 60,
      pad: 4,
    }, // Adjusted top/bottom for title
    showlegend: false,
    bargap: 0.1,
    hovermode: "closest",
    hoverlabel: {
      bgcolor: colors.hoverBg,
      font: { size: commonFont.size - 1, color: commonFont.color },
      bordercolor: colors.hoverBorder,
      align: "left",
    },
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
      key={width} // Force re-render on width change
      style={{ width: "100%", height: "100%", minHeight: "490px" }}
      useResizeHandler={true}
      className="return-distribution-chart"
    />
  );
};

export default ReturnDistributionChart;
