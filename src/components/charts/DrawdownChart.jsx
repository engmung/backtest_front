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

// --- Drawdown Calculation (Stable Version) ---
const calculateDrawdowns = (dailyData) => {
  if (!dailyData || dailyData.length < 2) {
    return null;
  }
  const sortedData = [...dailyData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  let peak = -Infinity;
  let maxDrawdown = 0;
  const drawdowns = sortedData.map((day) => {
    peak = Math.max(peak, day.close);
    const drawdown = peak > 0 ? ((peak - day.close) / peak) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    return { date: day.date, drawdown: drawdown };
  });
  // Recalculate maxDrawdown accurately after finding the initial peak
  if (sortedData.length > 0) {
    peak = sortedData[0].close;
    maxDrawdown = 0;
    sortedData.forEach((day) => {
      peak = Math.max(peak, day.close);
      const drawdown = peak > 0 ? ((peak - day.close) / peak) * 100 : 0;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
  }
  return { drawdowns, maxDrawdown };
};

// --- Style Config ---
const styleConfig = {
  colors: {
    primary: "#80BFFF",
    secondary: "#79F2C0",
    buy: "#A3BE8C",
    sell: "#F28B82",
    /* ... */ background: "rgba(0,0,0,0)",
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
  lineStyle: { width: 1.5 },
};

// --- Hex to RGBA Helper ---
const hexToRgba = (hex, alpha) => {
  hex = hex.replace("#", "");
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// --- Chart Component ---
const DrawdownChart = ({ data }) => {
  const { colors, font: commonFont, lineStyle } = styleConfig;
  const [width] = useWindowSize(); // Get window width
  const isMobile = width < 600; // Define mobile breakpoint

  const drawdownAnalysis = useMemo(() => {
    if (!data?.daily_data || data.daily_data.length < 2) {
      return null;
    }
    return calculateDrawdowns(data.daily_data);
  }, [data]);

  // --- Check for sufficient data ---
  if (!drawdownAnalysis) {
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
        낙폭 차트 데이터 부족
      </div>
    );
  }

  const { drawdowns, maxDrawdown } = drawdownAnalysis;
  const drawdownDates = drawdowns.map((item) => item.date);
  const drawdownValues = drawdowns.map((item) => item.drawdown);
  const drawdownHoverTemplate = `<b>%{x|%Y-%m-%d}</b><br>낙폭: %{y:.2f}%<extra></extra>`;
  // Find MDD annotation position
  const mddIndex = drawdownValues.findIndex((dd) => dd >= maxDrawdown);
  const annotationX =
    mddIndex !== -1
      ? drawdownDates[mddIndex]
      : drawdownDates[Math.floor(drawdownDates.length / 2)];

  // --- Plotly Data ---
  const plotData = [
    {
      x: drawdownDates,
      y: drawdownValues,
      type: "scatter",
      mode: "lines",
      fill: "tozeroy",
      fillcolor: hexToRgba(colors.sell, 0.2),
      line: { color: colors.sell, width: lineStyle.width },
      name: "Drawdown (%)",
      hovertemplate: drawdownHoverTemplate,
    },
  ];

  // --- Plotly Layout Modifications ---
  const layout = {
    autosize: true,
    // <<< Conditional Title with Specific Line Break >>>
    title: {
      text: `${data.name || data.symbol} (${data.symbol})<br>${
        isMobile ? "낙폭 분석" : "낙폭 분석"
      }`, // Specific break on mobile
      font: {
        ...commonFont,
        size: commonFont.size + (isMobile ? 1 : 4),
        color: colors.text,
      },
      y: isMobile ? 0.94 : 0.97, // Adjust title position slightly on mobile
      x: 0.5,
      xanchor: "center",
    },
    font: { ...commonFont, size: commonFont.size - (isMobile ? 1 : 0) },
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
      title: {
        text: "낙폭 (%)",
        font: { size: commonFont.size - (isMobile ? 2 : 1) },
      },
      gridcolor: colors.grid,
      linecolor: colors.axisLine,
      tickfont: {
        size: commonFont.size - (isMobile ? 3 : 2),
        color: colors.textSecondary,
      },
      tickformat: ".2f",
      ticksuffix: "%",
      autorange: "reversed", // Keep reversed axis
      zeroline: true,
      zerolinecolor: colors.grid,
      zerolinewidth: 1,
      automargin: true,
    },
    shapes: [
      // MDD Line
      {
        type: "line",
        x0: drawdownDates[0],
        y0: maxDrawdown,
        x1: drawdownDates[drawdownDates.length - 1],
        y1: maxDrawdown,
        line: { color: colors.sell, width: 1.5, dash: "dash" },
      },
    ],
    annotations: [
      // MDD Text
      {
        x: annotationX,
        y: maxDrawdown,
        text: `MDD: <b>${maxDrawdown.toFixed(2)}%</b>`,
        showarrow: true,
        arrowhead: 2,
        ax: 0,
        ay: -45,
        font: {
          size: commonFont.size - (isMobile ? 3 : 2),
          color: colors.textSecondary,
        },
        bgcolor: colors.hoverBg,
        bordercolor: colors.axisLine,
        borderpad: 4,
      },
    ],
    // <<< Adjusted Margins for Mobile >>>
    margin: {
      l: isMobile ? 50 : 65,
      r: isMobile ? 30 : 50,
      b: isMobile ? 90 : 80,
      t: isMobile ? 90 : 60,
      pad: 4,
    }, // Adjusted top/bottom for title
    showlegend: false,
    hovermode: "x unified",
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
      className="drawdown-chart"
    />
  );
};

export default DrawdownChart;
