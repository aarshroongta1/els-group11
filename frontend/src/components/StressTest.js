import { useState, useRef, useEffect } from "react";

const PRESETS = [
  { label: "2008 Financial Crisis", shock: -0.38, color: "#a84848", icon: "📉" },
  { label: "COVID Crash (2020)", shock: -0.34, color: "#c25a3c", icon: "🦠" },
  { label: "2022 Bear Market", shock: -0.19, color: "#d4864a", icon: "🐻" },
  { label: "Mild Correction", shock: -0.10, color: "#b89a5a", icon: "⚡" },
  { label: "Steady Growth", shock: 0.12, color: "#5a8a5e", icon: "📈" },
  { label: "Bull Run", shock: 0.30, color: "#2e7a3a", icon: "🚀" },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatPct = (value) => {
  const pct = (value * 100).toFixed(1);
  return value >= 0 ? `+${pct}%` : `${pct}%`;
};

function ComparisonChart({ normalData, stressData, years }) {
  const width = 400;
  const height = 180;
  const padX = 48;
  const padTop = 16;
  const padBottom = 28;
  const padRight = 12;

  const allVals = [...normalData, ...stressData].map((d) => d.value);
  const dataMax = Math.max(...allVals);
  const dataMin = Math.min(...allVals);
  const padding = (dataMax - dataMin) * 0.15 || dataMax * 0.05 || 1;
  const maxVal = dataMax + padding;
  const minVal = dataMin - padding;
  const range = maxVal - minVal || 1;

  const toPoint = (data) =>
    data.map((d, i) => ({
      x: padX + (i / (data.length - 1)) * (width - padX - padRight),
      y:
        padTop +
        (1 - (d.value - minVal) / range) * (height - padTop - padBottom),
      ...d,
    }));

  const normalPts = toPoint(normalData);
  const stressPts = toPoint(stressData);

  const toLine = (pts) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const toArea = (pts) =>
    `${toLine(pts)} L${pts[pts.length - 1].x},${height - padBottom} L${pts[0].x},${height - padBottom} Z`;

  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal];

  const xLabelIdxs =
    normalPts.length <= 6
      ? normalPts.map((_, i) => i)
      : [0, Math.floor(normalPts.length / 2), normalPts.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="stress-chart">
      <defs>
        <linearGradient id="normalGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a5a8c" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3a5a8c" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a84848" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#a84848" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {yLabels.map((val, i) => {
        const y =
          padTop +
          (1 - (val - minVal) / range) * (height - padTop - padBottom);
        return (
          <g key={i}>
            <line
              x1={padX}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke="#e0dcd4"
              strokeWidth="0.5"
              strokeDasharray={i === 1 ? "3,3" : "none"}
            />
            <text
              x={padX - 6}
              y={y + 3}
              textAnchor="end"
              className="chart-label"
            >
              {Math.abs(val) >= 1000
                ? `$${(val / 1000).toFixed(0)}k`
                : `$${val.toFixed(0)}`}
            </text>
          </g>
        );
      })}

      {/* X labels */}
      {xLabelIdxs.map((i) => (
        <text
          key={i}
          x={normalPts[i].x}
          y={height - 6}
          textAnchor="middle"
          className="chart-label"
        >
          {normalPts[i].year < 1 ? `${Math.round(normalPts[i].year * 12)}mo` : `Yr ${normalPts[i].year}`}
        </text>
      ))}

      {/* Stress area + line */}
      <path d={toArea(stressPts)} fill="url(#stressGrad)" />
      <path
        d={toLine(stressPts)}
        fill="none"
        stroke="#a84848"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6,3"
      />
      <circle
        cx={stressPts[stressPts.length - 1].x}
        cy={stressPts[stressPts.length - 1].y}
        r="3.5"
        fill="#a84848"
      />

      {/* Normal area + line */}
      <path d={toArea(normalPts)} fill="url(#normalGrad)" />
      <path
        d={toLine(normalPts)}
        fill="none"
        stroke="#3a5a8c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={normalPts[normalPts.length - 1].x}
        cy={normalPts[normalPts.length - 1].y}
        r="3.5"
        fill="#3a5a8c"
      />
    </svg>
  );
}

function StressTest({ results }) {
  const [customShock, setCustomShock] = useState(0);
  const [activePreset, setActivePreset] = useState(null);
  const sliderRef = useRef(null);

  const shock = activePreset !== null ? PRESETS[activePreset].shock : customShock;

  // Clear preset when slider is used
  const handleSliderChange = (e) => {
    setCustomShock(parseFloat(e.target.value));
    setActivePreset(null);
  };

  const handlePresetClick = (idx) => {
    setActivePreset(idx === activePreset ? null : idx);
    setCustomShock(PRESETS[idx].shock);
  };

  // Compute stress-adjusted data for each fund
  const stressResults = results.map((result) => {
    const { beta, expectedReturn, initialAmount, years, fundTicker } = result;
    const riskFreeRate = result.riskFreeRate;

    // Stressed market return = normal expected return + shock
    const stressedMarketReturn = expectedReturn + shock;

    // CAPM with stressed market
    const stressedRate =
      riskFreeRate + beta * (stressedMarketReturn - riskFreeRate);

    // Build data points for both normal and stressed
    const normalData = [];
    const stressData = [];
    if (years < 1) {
      // Sub-year: use monthly data points
      const months = Math.ceil(years * 12);
      for (let m = 0; m <= months; m++) {
        const t = m / 12;
        normalData.push({ year: parseFloat(t.toFixed(2)), value: initialAmount * Math.exp(expectedReturn * t) });
        stressData.push({ year: parseFloat(t.toFixed(2)), value: initialAmount * Math.exp(stressedRate * t) });
      }
    } else {
      for (let y = 0; y <= Math.ceil(years); y++) {
        const t = Math.min(y, years);
        normalData.push({ year: t, value: initialAmount * Math.exp(expectedReturn * t) });
        stressData.push({ year: t, value: initialAmount * Math.exp(stressedRate * t) });
      }
    }

    const normalFV = normalData[normalData.length - 1].value;
    const stressFV = stressData[stressData.length - 1].value;
    const impact = stressFV - normalFV;
    const impactPct = ((stressFV - normalFV) / normalFV) * 100;

    return {
      fundTicker,
      beta,
      normalFV,
      stressFV,
      impact,
      impactPct,
      normalData,
      stressData,
      years,
    };
  });

  // Slider fill percentage for styling
  const sliderPct = ((customShock + 0.5) / 1.0) * 100;
  const shockColor =
    shock < -0.25
      ? "#a84848"
      : shock < -0.1
        ? "#c25a3c"
        : shock < 0
          ? "#d4864a"
          : shock < 0.15
            ? "#5a8a5e"
            : "#2e7a3a";

  return (
    <div className="stress-test">
      {/* Header */}
      <div className="stress-header">
        <div className="stress-title-row">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#003A70"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3 className="stress-title">Stress Test</h3>
        </div>
        <p className="stress-subtitle">
          Simulate market shocks and see how your portfolio reacts based on each fund's beta sensitivity.
        </p>
      </div>

      {/* Presets */}
      <div className="stress-presets">
        {PRESETS.map((preset, idx) => (
          <button
            key={idx}
            className={`stress-preset-btn ${activePreset === idx ? "stress-preset-btn--active" : ""}`}
            onClick={() => handlePresetClick(idx)}
            style={{
              "--preset-color": preset.color,
              borderColor:
                activePreset === idx ? preset.color : "transparent",
            }}
          >
            <span className="stress-preset-icon">{preset.icon}</span>
            <span className="stress-preset-label">{preset.label}</span>
            <span
              className="stress-preset-value"
              style={{ color: preset.color }}
            >
              {formatPct(preset.shock)}
            </span>
          </button>
        ))}
      </div>

      {/* Custom Slider */}
      <div className="stress-slider-section">
        <div className="stress-slider-header">
          <span className="stress-slider-label">Custom Market Shock</span>
          <span className="stress-slider-value" style={{ color: shockColor }}>
            {formatPct(shock)}
          </span>
        </div>
        <div className="stress-slider-track-wrapper">
          <input
            ref={sliderRef}
            type="range"
            min="-0.50"
            max="0.50"
            step="0.01"
            value={activePreset !== null ? PRESETS[activePreset].shock : customShock}
            onChange={handleSliderChange}
            className="stress-slider"
            style={{
              "--fill-pct": `${sliderPct}%`,
              "--thumb-color": shockColor,
            }}
          />
          <div className="stress-slider-labels">
            <span>-50%</span>
            <span>0%</span>
            <span>+50%</span>
          </div>
        </div>
      </div>

      {/* Results per fund */}
      <div className="stress-results">
        {stressResults.map((sr) => (
          <div key={sr.fundTicker} className="stress-card">
            <div className="stress-card-header">
              <span className="stress-card-ticker">{sr.fundTicker}</span>
              <span className="stress-card-beta">β {sr.beta.toFixed(2)}</span>
            </div>

            {/* Chart */}
            <div className="stress-card-chart">
              <ComparisonChart
                normalData={sr.normalData}
                stressData={sr.stressData}
                years={sr.years}
              />
              <div className="stress-chart-legend">
                <span className="stress-legend-item">
                  <span
                    className="stress-legend-dot"
                    style={{ background: "#3a5a8c" }}
                  ></span>
                  Normal
                </span>
                <span className="stress-legend-item">
                  <span
                    className="stress-legend-dot stress-legend-dot--dashed"
                    style={{ background: "#a84848" }}
                  ></span>
                  Stressed
                </span>
              </div>
            </div>

            {/* Impact numbers */}
            <div className="stress-card-impact">
              <div className="stress-impact-row">
                <span className="stress-impact-label">Normal Projection</span>
                <span className="stress-impact-value">
                  {formatCurrency(sr.normalFV)}
                </span>
              </div>
              <div className="stress-impact-row">
                <span className="stress-impact-label">Stressed Projection</span>
                <span
                  className="stress-impact-value"
                  style={{ color: sr.stressFV < sr.normalFV ? "#a84848" : "#2e7a3a" }}
                >
                  {formatCurrency(sr.stressFV)}
                </span>
              </div>
              <div className="stress-impact-divider" />
              <div className="stress-impact-row stress-impact-row--total">
                <span className="stress-impact-label">Portfolio Impact</span>
                <span
                  className="stress-impact-delta"
                  style={{ color: sr.impact < 0 ? "#a84848" : "#2e7a3a" }}
                >
                  {sr.impact >= 0 ? "+" : ""}
                  {formatCurrency(sr.impact)}
                  <span className="stress-impact-pct">
                    ({sr.impactPct >= 0 ? "+" : ""}
                    {sr.impactPct.toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StressTest;
