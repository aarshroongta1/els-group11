import { useState } from 'react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

function GrowthChart({ yearlyData }) {
  const width = 260;
  const height = 120;
  const padX = 30;
  const padRight = 20;
  const padTop = 10;
  const padBottom = 24;

  const maxVal = Math.max(...yearlyData.map((d) => d.value));
  const minVal = Math.min(...yearlyData.map((d) => d.value));
  const range = maxVal - minVal || 1;

  const points = yearlyData.map((d, i) => {
    const x = padX + (i / (yearlyData.length - 1)) * (width - padX - padRight);
    const y = padTop + (1 - (d.value - minVal) / range) * (height - padTop - padBottom);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - padBottom} L${points[0].x},${height - padBottom} Z`;

  // Y-axis labels
  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="growth-chart">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a5a8c" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3a5a8c" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((val, i) => {
        const y = padTop + (1 - (val - minVal) / range) * (height - padTop - padBottom);
        const formattedVal = val != null && !isNaN(val) 
          ? (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0))
          : '0';
        return (
          <g key={i}>
            <line x1={padX} y1={y} x2={width - padRight} y2={y} stroke="#e8e3da" strokeWidth="0.5" />
            <text x={padX - 4} y={y + 3} textAnchor="end" className="chart-label">
              {formattedVal}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {points.filter((_, i) => i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)).map((p) => (
        <text key={p.year} x={p.x} y={height - 6} textAnchor="middle" className="chart-label">
          Yr {p.year.toFixed(2)}
        </text>
      ))}

      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="#3a5a8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* End dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill="#3a5a8c" />
    </svg>
  );
}

function ResultsCard({ result, user, onSave, onNavigate }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const gain = result.futureValue - result.initialAmount;
  
  // Add defensive checks for undefined values
  const returnPct = result.returnPct != null ? result.returnPct : 0;
  const expectedReturn = result.expectedReturn != null ? result.expectedReturn : 0;
  const beta = result.beta;
  const riskFreeRate = result.riskFreeRate != null ? result.riskFreeRate : 0;

  async function handleSave() {
    if (!user || saving || saved) return;
    setSaving(true);
    try {
      await onSave(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save investment:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fund-card">
      {/* Header */}
      <div className="fund-card-header">
        <span className="fund-card-ticker">{result.fundTicker}</span>
        <span className="fund-card-return-badge">
          +{returnPct.toFixed(1)}%
        </span>
      </div>

      {/* Projected Value */}
      <p className="fund-card-value">{formatCurrency(result.futureValue)}</p>
      <p className="fund-card-gain">+{formatCurrency(gain)} gain</p>

      {/* Growth Chart */}
      {result.yearlyData && result.yearlyData.length > 1 && (
        <div className="fund-card-chart">
          <GrowthChart yearlyData={result.yearlyData} />
        </div>
      )}

      {/* Statistics */}
      <div className="fund-card-stats">
        <div className="fund-stat">
          <span className="fund-stat-label">Expected Return</span>
          <span className="fund-stat-value">{(expectedReturn * 100).toFixed(2)}%</span>
        </div>
        <div className="fund-stat">
          <span className="fund-stat-label">Beta</span>
          <span className="fund-stat-value">{beta != null ? beta.toFixed(2) : <span style={{ color: '#DC2626' }}>ERR</span>}</span>
        </div>
        <div className="fund-stat">
          <span className="fund-stat-label">Risk-Free Rate</span>
          <span className="fund-stat-value">{(riskFreeRate * 100).toFixed(2)}%</span>
        </div>
        <div className="fund-stat">
          <span className="fund-stat-label">Initial Investment</span>
          <span className="fund-stat-value">{formatCurrency(result.initialAmount)}</span>
        </div>
        <div className="fund-stat">
          <span className="fund-stat-label">Time Horizon</span>
          <span className="fund-stat-value">{result.years.toFixed(2)} yr{result.years !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Add Investment Button */}
      {!user ? (
        <button className="button-save" onClick={() => onNavigate && onNavigate("portfolio")}>
          Add Investment
        </button>
      ) : (
        <button
          className={`button-save${saved ? ' button-save--saved' : ''}`}
          onClick={handleSave}
          disabled={saving || saved}
        >
          {saving ? 'Saving...' : saved ? 'Added!' : 'Add Investment'}
        </button>
      )}
    </div>
  );
}

export default ResultsCard;
