import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';

const API_BASE_URL = "http://localhost:8080/api";

const CHART_COLORS = [
  '#003A70', '#10AC84', '#E8712B', '#8B5CF6', '#E63946',
  '#F4A623', '#0ABDE3', '#6C5CE7', '#2E86DE', '#EC4899',
];

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

/* ─── Allocation Pie Chart ─── */
function AllocationChart({ positions, priceData }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 80;

  const entries = positions
    .map((p) => {
      const price = priceData[p.ticker];
      const value = price != null ? p.totalUnits * price : p.totalCostBasis;
      return [p.ticker, value];
    })
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total === 0) return null;

  let cumAngle = -Math.PI / 2;
  const slices = entries.map(([ticker, amount], i) => {
    const fraction = amount / total;
    const startAngle = cumAngle;
    const endAngle = cumAngle + fraction * 2 * Math.PI;
    cumAngle = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = fraction > 0.5 ? 1 : 0;

    const path = entries.length === 1
      ? `M ${cx},${cy - radius} A ${radius},${radius} 0 1,1 ${cx - 0.01},${cy - radius} Z`
      : `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;

    return { ticker, amount, fraction, path, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  return (
    <div className="portfolio-chart-card">
      <h3 className="portfolio-chart-title">Portfolio Allocation</h3>
      <div className="portfolio-chart-content">
        <svg viewBox={`0 0 ${size} ${size}`} className="allocation-chart">
          {slices.map((s) => (
            <path key={s.ticker} d={s.path} fill={s.color} stroke="#ffffff" strokeWidth="2" />
          ))}
          <circle cx={cx} cy={cy} r="45" fill="#ffffff" />
          <text x={cx} y={cy - 6} textAnchor="middle" className="chart-center-label">Total</text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="chart-center-value">
            {formatCurrency(total)}
          </text>
        </svg>
        <div className="allocation-legend">
          {slices.map((s) => (
            <div key={s.ticker} className="allocation-legend-item">
              <span className="chart-legend-dot" style={{ background: s.color }} />
              <span className="chart-legend-ticker">{s.ticker}</span>
              <span className="chart-legend-pct">{(s.fraction * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Growth Projection Chart (5-year forward) ─── */
function GrowthProjectionChart({ positions, funds, selectedFund, priceData }) {
  const width = 500;
  const height = 220;
  const padL = 55;
  const padR = 15;
  const padTop = 15;
  const padBottom = 30;

  const formatDate = (date) => {
    const m = date.toLocaleString('en-US', { month: 'short' });
    const y = date.getFullYear().toString().slice(-2);
    return `${m} '${y}`;
  };

  if (positions.length === 0) return null;

  const now = new Date();
  const projectionYears = 5;

  // Start from real current value if prices available, else cost basis
  const getStartValue = (pos) => {
    const price = priceData[pos.ticker];
    return price != null ? pos.totalUnits * price : pos.totalCostBasis;
  };
  const totalStartValue = positions.reduce((s, p) => s + getStartValue(p), 0);

  // Build aggregate portfolio curve (5 years forward from today)
  const aggregatePoints = [];
  for (let y = 0; y <= projectionYears; y++) {
    const date = new Date(now);
    date.setFullYear(date.getFullYear() + y);
    let totalValue = 0;
    positions.forEach((pos) => {
      totalValue += getStartValue(pos) * Math.exp(pos.expectedReturn * y);
    });
    aggregatePoints.push({ date, timestamp: date.getTime(), value: totalValue });
  }

  // Build individual fund curve for the selected fund
  let fundCurve = null;
  if (selectedFund) {
    const pos = positions.find((p) => p.ticker === selectedFund);
    if (pos) {
      const startVal = getStartValue(pos);
      const points = [];
      for (let y = 0; y <= projectionYears; y++) {
        const date = new Date(now);
        date.setFullYear(date.getFullYear() + y);
        points.push({ date, timestamp: date.getTime(), value: startVal * Math.exp(pos.expectedReturn * y) });
      }
      fundCurve = { ticker: selectedFund, points, color: '#2E86DE' };
    }
  }

  // S&P 500 benchmark curve
  const spyFund = funds.find((f) => f.ticker === 'SPY');
  const spyReturn = spyFund ? spyFund.expectedReturn : 0.1635;
  const benchmarkPoints = [];
  for (let y = 0; y <= projectionYears; y++) {
    const date = new Date(now);
    date.setFullYear(date.getFullYear() + y);
    benchmarkPoints.push({ date, timestamp: date.getTime(), value: totalStartValue * Math.exp(spyReturn * y) });
  }

  const allPoints = [...aggregatePoints, ...benchmarkPoints, ...(fundCurve ? fundCurve.points : [])];
  const minTime = Math.min(...allPoints.map((p) => p.timestamp));
  const maxTime = Math.max(...allPoints.map((p) => p.timestamp));
  const timeRange = maxTime - minTime || 1;
  const maxVal = Math.max(...allPoints.map((p) => p.value));
  const range = maxVal || 1;

  const toX = (ts) => padL + ((ts - minTime) / timeRange) * (width - padL - padR);
  const toY = (value) => padTop + (1 - value / range) * (height - padTop - padBottom);

  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];
  const xTickCount = 4;
  const xTicks = [];
  for (let i = 0; i < xTickCount; i++) {
    const ts = minTime + (i / (xTickCount - 1)) * timeRange;
    xTicks.push({ ts, label: formatDate(new Date(ts)) });
  }

  const makePath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.timestamp)},${toY(p.value)}`).join(' ');

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} className="growth-projection-chart">
        {yTicks.map((val, i) => (
          <g key={i}>
            <line x1={padL} y1={toY(val)} x2={width - padR} y2={toY(val)} stroke="#E8EEF5" strokeWidth="1" />
            <text x={padL - 8} y={toY(val) + 4} textAnchor="end" className="chart-axis-label">
              {val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`}
            </text>
          </g>
        ))}
        {xTicks.map((tick, i) => (
          <text key={i} x={toX(tick.ts)} y={height - 6} textAnchor="middle" className="chart-axis-label">
            {tick.label}
          </text>
        ))}
        <path d={makePath(benchmarkPoints)} fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5,3" strokeLinecap="round" strokeLinejoin="round" />
        {fundCurve && (
          <g>
            <path d={makePath(fundCurve.points)} fill="none" stroke={fundCurve.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={toX(fundCurve.points[fundCurve.points.length - 1].timestamp)} cy={toY(fundCurve.points[fundCurve.points.length - 1].value)} r="3.5" fill={fundCurve.color} />
          </g>
        )}
        <path d={makePath(aggregatePoints)} fill="none" stroke="#003A70" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={toX(aggregatePoints[aggregatePoints.length - 1].timestamp)} cy={toY(aggregatePoints[aggregatePoints.length - 1].value)} r="4" fill="#003A70" />
      </svg>
      <div className="chart-legend">
        <div className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: '#003A70' }} />
          <span className="chart-legend-ticker">Portfolio</span>
          <span className="chart-legend-pct">{formatCurrency(aggregatePoints[aggregatePoints.length - 1].value)}</span>
        </div>
        {fundCurve && (
          <div className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: fundCurve.color }} />
            <span className="chart-legend-ticker">{fundCurve.ticker}</span>
            <span className="chart-legend-pct">{formatCurrency(fundCurve.points[fundCurve.points.length - 1].value)}</span>
          </div>
        )}
        <div className="chart-legend-item">
          <span className="chart-legend-dash" />
          <span className="chart-legend-ticker">S&P 500</span>
          <span className="chart-legend-pct">{formatCurrency(benchmarkPoints[benchmarkPoints.length - 1].value)}</span>
        </div>
      </div>
    </>
  );
}

/* ─── Historical "Since Inception" Chart (real prices) ─── */
function HistoricalValueChart({ transactions, priceHistory, selectedFund }) {
  const width = 500;
  const height = 220;
  const padL = 55;
  const padR = 15;
  const padTop = 15;
  const padBottom = 30;

  const formatDate = (date) => {
    const m = date.toLocaleString('en-US', { month: 'short' });
    const y = date.getFullYear().toString().slice(-2);
    return `${m} '${y}`;
  };

  if (transactions.length === 0) return null;

  // Get all tickers that have price history
  const tickers = [...new Set(transactions.map((tx) => tx.ticker))];
  const allHaveHistory = tickers.every((t) => priceHistory[t] && priceHistory[t].length > 0);
  if (!allHaveHistory) return <p style={{ color: '#6B7C93', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>Loading price data...</p>;

  // Build a unified timeline from all price histories
  const allTimestamps = new Set();
  tickers.forEach((ticker) => {
    priceHistory[ticker].forEach((p) => allTimestamps.add(p.timestamp));
  });
  const sortedTimestamps = [...allTimestamps].sort((a, b) => a - b);

  // Build price lookup: ticker -> timestamp -> price
  const priceLookup = {};
  tickers.forEach((ticker) => {
    priceLookup[ticker] = {};
    priceHistory[ticker].forEach((p) => {
      priceLookup[ticker][p.timestamp] = p.price;
    });
  });

  // Helper: get price for a ticker at a given timestamp
  const getPrice = (ticker, ts) => {
    const prices = priceHistory[ticker];
    if (!prices) return null;
    for (let i = prices.length - 1; i >= 0; i--) {
      if (prices[i].timestamp <= ts) return prices[i].price;
    }
    return null;
  };

  // Helper: get units held for a ticker at a given timestamp
  const getUnitsAt = (ticker, ts) => {
    let units = 0;
    transactions.forEach((tx) => {
      if (tx.ticker !== ticker) return;
      if (new Date(tx.date).getTime() / 1000 > ts) return;
      const txUnits = Number(tx.units || 0);
      if (tx.type === 'buy') units += txUnits;
      else units -= txUnits;
    });
    return units;
  };

  // Helper: portfolio value at a timestamp
  const getPortfolioValue = (ts) => {
    let value = 0;
    tickers.forEach((ticker) => {
      const price = getPrice(ticker, ts);
      if (price == null) return;
      const units = getUnitsAt(ticker, ts);
      if (units > 0) value += units * price;
    });
    return value;
  };

  // Precompute transaction timestamps in seconds for matching
  const txWithTs = transactions.map((tx) => ({
    ...tx,
    tsSec: new Date(tx.date).getTime() / 1000,
    cf: tx.type === 'buy' ? Number(tx.amount) : -Number(tx.amount),
  }));

  // Compute TWR: chain daily returns, adjusting for cash flows between timestamps
  const dataPoints = [];
  let cumReturn = 1.0;
  let prevValue = null;
  let prevTs = null;

  sortedTimestamps.forEach((ts) => {
    const tsMs = ts * 1000;
    const value = getPortfolioValue(ts);
    if (value <= 0 && prevValue === null) return;

    if (prevValue !== null && prevValue > 0 && prevTs !== null) {
      // Sum cash flows from transactions between prevTs and ts
      let cf = 0;
      txWithTs.forEach((tx) => {
        if (tx.tsSec > prevTs && tx.tsSec <= ts) {
          cf += tx.cf;
        }
      });

      const adjustedPrev = prevValue + cf;
      if (adjustedPrev > 0) {
        const dailyReturn = value / adjustedPrev;
        cumReturn *= dailyReturn;
      }
    }

    prevValue = value;
    prevTs = ts;
    const returnPct = (cumReturn - 1) * 100;
    dataPoints.push({ date: new Date(tsMs), timestamp: tsMs, value: returnPct });
  });

  // Selected fund curve — simple price return % from first buy price
  let fundCurve = null;
  if (selectedFund && priceHistory[selectedFund]) {
    const fundTxs = transactions.filter((tx) => tx.ticker === selectedFund && tx.type === 'buy');
    if (fundTxs.length > 0) {
      const firstBuyPrice = Number(fundTxs[0].price_per_unit);
      if (firstBuyPrice > 0) {
        const points = [];
        const firstBuyTs = new Date(fundTxs[0].date).getTime() / 1000;
        sortedTimestamps.forEach((ts) => {
          if (ts < firstBuyTs) return;
          const price = getPrice(selectedFund, ts);
          if (price == null) return;
          const returnPct = ((price / firstBuyPrice) - 1) * 100;
          points.push({ date: new Date(ts * 1000), timestamp: ts * 1000, value: returnPct });
        });
        if (points.length > 0) fundCurve = { ticker: selectedFund, points, color: '#2E86DE' };
      }
    }
  }

  if (dataPoints.length === 0) return null;

  const allPoints = [...dataPoints, ...(fundCurve ? fundCurve.points : [])];
  const minTime = Math.min(...allPoints.map((p) => p.timestamp));
  const maxTime = Math.max(...allPoints.map((p) => p.timestamp));
  const timeRange = maxTime - minTime || 1;
  const maxVal = Math.max(...allPoints.map((p) => p.value));
  const minVal = Math.min(...allPoints.map((p) => p.value));
  const valRange = maxVal - minVal || 1;

  const toX = (ts) => padL + ((ts - minTime) / timeRange) * (width - padL - padR);
  const toY = (value) => padTop + (1 - (value - minVal) / valRange) * (height - padTop - padBottom);

  const yTicks = [minVal, minVal + (maxVal - minVal) * 0.33, minVal + (maxVal - minVal) * 0.66, maxVal];
  const xTickCount = 4;
  const xTicks = [];
  for (let i = 0; i < xTickCount; i++) {
    const ts = minTime + (i / (xTickCount - 1)) * timeRange;
    xTicks.push({ ts, label: formatDate(new Date(ts)) });
  }

  const makePath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.timestamp)},${toY(p.value)}`).join(' ');

  const finalReturn = dataPoints[dataPoints.length - 1].value;
  const lineColor = finalReturn >= 0 ? '#059669' : '#DC2626';

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} className="growth-projection-chart">
        {yTicks.map((val, i) => (
          <g key={i}>
            <line x1={padL} y1={toY(val)} x2={width - padR} y2={toY(val)} stroke="#E8EEF5" strokeWidth="1" />
            <text x={padL - 8} y={toY(val) + 4} textAnchor="end" className="chart-axis-label">
              {val >= 0 ? '+' : ''}{val.toFixed(1)}%
            </text>
          </g>
        ))}
        {xTicks.map((tick, i) => (
          <text key={i} x={toX(tick.ts)} y={height - 6} textAnchor="middle" className="chart-axis-label">
            {tick.label}
          </text>
        ))}
        {/* Zero line */}
        {minVal < 0 && maxVal > 0 && (
          <line x1={padL} y1={toY(0)} x2={width - padR} y2={toY(0)} stroke="#94A3B8" strokeWidth="0.75" strokeDasharray="4,3" />
        )}
        {/* Selected fund curve */}
        {fundCurve && (
          <g>
            <path d={makePath(fundCurve.points)} fill="none" stroke={fundCurve.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={toX(fundCurve.points[fundCurve.points.length - 1].timestamp)} cy={toY(fundCurve.points[fundCurve.points.length - 1].value)} r="3.5" fill={fundCurve.color} />
          </g>
        )}
        {/* Portfolio TWR curve */}
        <path d={makePath(dataPoints)} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={toX(dataPoints[dataPoints.length - 1].timestamp)} cy={toY(dataPoints[dataPoints.length - 1].value)} r="4" fill={lineColor} />
      </svg>
      <div className="chart-legend">
        <div className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: lineColor }} />
          <span className="chart-legend-ticker">Portfolio</span>
          <span className="chart-legend-pct" style={{ color: lineColor, fontWeight: 700 }}>
            {finalReturn >= 0 ? '+' : ''}{finalReturn.toFixed(2)}%
          </span>
        </div>
        {fundCurve && (
          <div className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: fundCurve.color }} />
            <span className="chart-legend-ticker">{fundCurve.ticker}</span>
            <span className="chart-legend-pct" style={{ color: fundCurve.points[fundCurve.points.length - 1].value >= 0 ? '#059669' : '#DC2626', fontWeight: 700 }}>
              {fundCurve.points[fundCurve.points.length - 1].value >= 0 ? '+' : ''}{fundCurve.points[fundCurve.points.length - 1].value.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Main PortfolioView Component ─── */
function PortfolioView({ user, onSignIn }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [funds, setFunds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [timeUnit, setTimeUnit] = useState('years');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [txType, setTxType] = useState('buy');

  // Chart/display state
  const [historicalData, setHistoricalData] = useState({});
  const [betaData, setBetaData] = useState({});
  const [priceData, setPriceData] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const [selectedFund, setSelectedFund] = useState(null);
  const [chartMode, setChartMode] = useState('historic');
  const [historyPeriod, setHistoryPeriod] = useState('ALL');
  const searchRef = useRef(null);

  const toggleFundSelect = (ticker) => {
    setSelectedFund((prev) => (prev === ticker ? null : ticker));
  };

  /* ─── Derive positions from transactions (unit-based) ─── */
  const positions = useMemo(() => {
    const byTicker = {};
    transactions.forEach((tx) => {
      if (!byTicker[tx.ticker]) byTicker[tx.ticker] = { buys: [], sells: [], fund_name: tx.fund_name };
      byTicker[tx.ticker][tx.type === 'buy' ? 'buys' : 'sells'].push(tx);
      byTicker[tx.ticker].fund_name = tx.fund_name;
    });

    const result = [];
    Object.entries(byTicker).forEach(([ticker, { buys, sells, fund_name }]) => {
      const totalBuyUnits = buys.reduce((s, tx) => s + Number(tx.units || 0), 0);
      const totalSellUnits = sells.reduce((s, tx) => s + Number(tx.units || 0), 0);
      const totalUnits = totalBuyUnits - totalSellUnits;
      if (totalUnits <= 0) return;

      const totalCostBasis = buys.reduce((s, tx) => s + Number(tx.amount), 0)
        - sells.reduce((s, tx) => s + Number(tx.amount), 0);
      const avgCostPerUnit = totalUnits > 0 ? totalCostBasis / totalUnits : 0;

      const totalBought = buys.reduce((s, tx) => s + Number(tx.amount), 0);
      const weightedReturn = totalBought > 0
        ? buys.reduce((s, tx) => s + Number(tx.expected_return || 0) * Number(tx.amount), 0) / totalBought
        : 0;
      const earliestBuy = new Date(Math.min(...buys.map((tx) => new Date(tx.date).getTime())));

      result.push({
        ticker,
        fund_name,
        totalUnits,
        totalCostBasis,
        avgCostPerUnit,
        expectedReturn: weightedReturn,
        earliestBuy,
      });
    });
    return result;
  }, [transactions]);

  /* ─── Derive gains (real prices) ─── */
  const { totalUnrealizedGain, totalRealizedGain, positionsWithGains, realizedGainByTx } = useMemo(() => {
    let totalUnrealizedGain = 0;
    let totalRealizedGain = 0;
    const realizedGainByTx = {};

    // Unrealized gains — using live prices
    const positionsWithGains = positions.map((pos) => {
      const currentPrice = priceData[pos.ticker];
      const currentValue = currentPrice != null ? pos.totalUnits * currentPrice : null;
      const unrealizedGain = currentValue != null ? currentValue - pos.totalCostBasis : null;
      if (unrealizedGain != null) totalUnrealizedGain += unrealizedGain;
      return { ...pos, currentValue, unrealizedGain };
    });

    // Realized gains — using actual price at sell time
    const byTicker = {};
    transactions.forEach((tx) => {
      if (!byTicker[tx.ticker]) byTicker[tx.ticker] = { buys: [], sells: [] };
      byTicker[tx.ticker][tx.type === 'buy' ? 'buys' : 'sells'].push(tx);
    });

    Object.entries(byTicker).forEach(([, { buys, sells }]) => {
      if (sells.length === 0) return;

      const allTx = [...buys, ...sells].sort((a, b) => new Date(a.date) - new Date(b.date));
      let totalUnits = 0;
      let costBasisPool = 0;

      allTx.forEach((tx) => {
        if (tx.type === 'buy') {
          totalUnits += Number(tx.units || 0);
          costBasisPool += Number(tx.amount);
        } else {
          const sellUnits = Number(tx.units || 0);
          const sellPrice = Number(tx.price_per_unit || 0);
          const avgCost = totalUnits > 0 ? costBasisPool / totalUnits : 0;
          const gain = (sellPrice - avgCost) * sellUnits;
          realizedGainByTx[tx.id] = gain;
          totalRealizedGain += gain;
          costBasisPool -= avgCost * sellUnits;
          totalUnits -= sellUnits;
        }
      });
    });

    return { totalUnrealizedGain, totalRealizedGain, positionsWithGains, realizedGainByTx };
  }, [positions, transactions, priceData]);

  const totalInvested = transactions.filter((tx) => tx.type === 'buy').reduce((s, tx) => s + Number(tx.amount), 0);
  const totalWithdrawn = transactions.filter((tx) => tx.type === 'sell').reduce((s, tx) => s + Number(tx.amount), 0);
  const totalCurrentValue = positionsWithGains.reduce((s, p) => s + (p.currentValue || p.totalCostBasis), 0);
  const totalReturn = totalUnrealizedGain + totalRealizedGain;
  const openCostBasis = positions.reduce((s, p) => s + p.totalCostBasis, 0);

  /* ─── Data fetching ─── */
  useEffect(() => {
    if (user) {
      fetchTransactions();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (positions.length === 0) return;
    const tickers = [...new Set(positions.map((p) => p.ticker))];
    tickers.forEach((ticker) => {
      if (historicalData[ticker]) return;
      fetch(`${API_BASE_URL}/historical/${ticker}`)
        .then((res) => res.json())
        .then((data) => {
          setHistoricalData((prev) => ({ ...prev, [ticker]: data }));
        })
        .catch(() => {});
    });
  }, [positions]);

  // Fetch live beta for each position ticker
  useEffect(() => {
    if (positions.length === 0) return;
    const tickers = [...new Set(positions.map((p) => p.ticker))];
    tickers.forEach((ticker) => {
      if (betaData[ticker] != null) return;
      fetch(`${API_BASE_URL}/beta/${ticker}`)
        .then((res) => res.json())
        .then((data) => {
          setBetaData((prev) => ({ ...prev, [ticker]: data }));
        })
        .catch(() => {});
    });
  }, [positions]);

  // Fetch live prices for each position ticker
  useEffect(() => {
    if (positions.length === 0) return;
    const tickers = [...new Set(positions.map((p) => p.ticker))];
    tickers.forEach((ticker) => {
      fetch(`${API_BASE_URL}/price/${ticker}`)
        .then((res) => res.json())
        .then((data) => {
          setPriceData((prev) => ({ ...prev, [ticker]: data.currentPrice }));
        })
        .catch(() => {});
    });
  }, [positions]);

  // Fetch price history for historical chart
  useEffect(() => {
    if (positions.length === 0 || chartMode !== 'historic') return;
    const rangeMap = { '1M': '1mo', '3M': '3mo', '1Y': '1y', 'ALL': 'max' };
    const range = rangeMap[historyPeriod] || 'max';
    const tickers = [...new Set(positions.map((p) => p.ticker))];
    tickers.forEach((ticker) => {
      fetch(`${API_BASE_URL}/price-history/${ticker}?range=${range}`)
        .then((res) => res.json())
        .then((data) => {
          setPriceHistory((prev) => ({ ...prev, [ticker]: data.history }));
        })
        .catch(() => {});
    });
  }, [positions, chartMode, historyPeriod]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/funds`)
      .then((res) => res.json())
      .then((data) => setFunds(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchTransactions() {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: true });
      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }

  /* ─── Form helpers ─── */
  const getYears = () => {
    const val = parseFloat(duration);
    if (!val || val <= 0) return 0;
    if (timeUnit === 'months') return val / 12;
    if (timeUnit === 'days') return val / 365;
    return val;
  };

  const resetForm = () => {
    setSelectedTicker('');
    setAmount('');
    setDuration('');
    setSearchQuery('');
    setAddError('');
  };

  const isBuyFormValid = selectedTicker && amount && duration && parseFloat(amount) > 0 && getYears() > 0;
  const isSellFormValid = selectedTicker && amount && parseFloat(amount) > 0;
  const isAddFormValid = txType === 'buy' ? isBuyFormValid : isSellFormValid;

  // For sell mode, only show tickers with open positions
  const filteredFunds = txType === 'sell'
    ? positions.filter((p) =>
        p.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.fund_name.toLowerCase().includes(searchQuery.toLowerCase())
      ).map((p) => ({ ticker: p.ticker, name: p.fund_name }))
    : funds.filter(
        (fund) =>
          fund.ticker !== selectedTicker &&
          (fund.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
            fund.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  async function handleAddTransaction(e) {
    e.preventDefault();
    if (!isAddFormValid || adding) return;
    setAdding(true);
    setAddError('');

    try {
      if (txType === 'sell') {
        const position = positions.find((p) => p.ticker === selectedTicker);
        if (!position) {
          setAddError('No open position for this fund.');
          setAdding(false);
          return;
        }
        // Fetch current price
        const priceRes = await fetch(`${API_BASE_URL}/price/${selectedTicker}`);
        const priceJson = await priceRes.json();
        const currentPrice = priceJson.currentPrice;
        const unitsToSell = parseFloat(amount) / currentPrice;

        if (unitsToSell > position.totalUnits) {
          setAddError(`Sell amount exceeds current position (${formatCurrency(position.totalUnits * currentPrice)} available).`);
          setAdding(false);
          return;
        }

        const { error: insertError } = await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'sell',
          date: new Date().toISOString(),
          ticker: selectedTicker,
          fund_name: position.fund_name,
          amount: parseFloat(amount),
          price_per_unit: currentPrice,
          units: unitsToSell,
          expected_return: position.expectedReturn,
        });
        if (insertError) throw insertError;
      } else {
        const years = getYears();
        // Fetch current price and CAPM data in parallel
        const [priceRes, calcRes] = await Promise.all([
          fetch(`${API_BASE_URL}/price/${selectedTicker}`),
          fetch(`${API_BASE_URL}/calculate?ticker=${selectedTicker}&amount=${amount}&years=${years}`),
        ]);
        const priceJson = await priceRes.json();
        const data = await calcRes.json();
        const currentPrice = priceJson.currentPrice;
        const units = data.principal / currentPrice;
        const fund = funds.find((f) => f.ticker === selectedTicker);

        const { error: insertError } = await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'buy',
          date: new Date().toISOString(),
          ticker: selectedTicker,
          fund_name: fund?.name || selectedTicker,
          amount: data.principal,
          price_per_unit: currentPrice,
          units: units,
          expected_return: data.expectedReturn,
        });
        if (insertError) throw insertError;
      }

      await fetchTransactions();
      resetForm();
    } catch (err) {
      setAddError(err.message || `Failed to record ${txType}.`);
    } finally {
      setAdding(false);
    }
  }

  /* ─── Unauthenticated state ─── */
  if (!user) {
    return (
      <div className="app-content">
        <main className="main-panel" style={{ justifyContent: 'center' }}>
          <div className="portfolio-auth-prompt">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#003A70" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <h3 className="portfolio-auth-title">Sign in to track your investments</h3>
            <p className="portfolio-auth-text">
              Create an account or sign in to save your investments and track their projected performance over time.
            </p>
            <button className="button portfolio-auth-btn" onClick={onSignIn}>
              Sign In / Create Account
            </button>
          </div>
        </main>
      </div>
    );
  }

  /* ─── Main authenticated view ─── */
  return (
    <div className="app-content">
      {/* Sidebar — Transaction Form */}
      <aside className="sidebar">
        <div className="sidebar-heading">
          <span className="sidebar-label">Add Transaction</span>
          <div className="decorative-line" aria-hidden="true" />
        </div>

        <div className="form">
          {/* Buy/Sell Toggle */}
          <div className="portfolio-tx-toggle">
            <button
              type="button"
              className={`portfolio-tx-toggle-btn${txType === 'buy' ? ' portfolio-tx-toggle-btn--active' : ''}`}
              onClick={() => { setTxType('buy'); resetForm(); }}
            >
              Buy
            </button>
            <button
              type="button"
              className={`portfolio-tx-toggle-btn${txType === 'sell' ? ' portfolio-tx-toggle-btn--active portfolio-tx-toggle-btn--sell' : ''}`}
              onClick={() => { setTxType('sell'); resetForm(); }}
            >
              Sell
            </button>
          </div>

          {/* Fund Search */}
          <div className="field" ref={searchRef}>
            <label className="label">
              Fund <span className="required">*</span>
            </label>
            {selectedTicker ? (
              <div className="portfolio-selected-fund">
                <span className="portfolio-selected-ticker">{selectedTicker}</span>
                <span className="portfolio-selected-name">
                  {txType === 'sell'
                    ? positions.find((p) => p.ticker === selectedTicker)?.fund_name || ''
                    : funds.find((f) => f.ticker === selectedTicker)?.name || ''}
                </span>
                <button
                  type="button"
                  className="portfolio-selected-remove"
                  onClick={() => { setSelectedTicker(''); setSearchQuery(''); }}
                >
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="search-select">
                <div className="search-input-wrapper">
                  <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7C93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    className="input search-input"
                    placeholder={txType === 'sell' ? 'Search your holdings...' : 'Search by ticker or name...'}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                  />
                </div>
                {dropdownOpen && (
                  <ul className="search-dropdown">
                    {filteredFunds.length > 0 ? (
                      filteredFunds.map((fund) => (
                        <li
                          key={fund.ticker}
                          className="search-option"
                          onMouseDown={() => {
                            setSelectedTicker(fund.ticker);
                            setSearchQuery('');
                            setDropdownOpen(false);
                          }}
                        >
                          <span className="search-option-ticker">{fund.ticker}</span>
                          <span className="search-option-name">{fund.name}</span>
                        </li>
                      ))
                    ) : (
                      <li className="search-no-results">{txType === 'sell' ? 'No open positions' : 'No funds found'}</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="field">
            <label className="label">
              {txType === 'sell' ? 'Sell Amount' : 'Investment Amount'} <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="number"
                className="input input-with-prefix"
                placeholder={txType === 'sell' ? 'Amount to sell' : 'Enter investment amount'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
              />
            </div>
            {txType === 'sell' && selectedTicker && (() => {
              const pos = positions.find((p) => p.ticker === selectedTicker);
              const price = priceData[selectedTicker];
              const available = pos && price ? pos.totalUnits * price : null;
              return pos ? (
                <span style={{ fontSize: '0.72rem', color: '#6B7C93', marginTop: '0.25rem', display: 'block' }}>
                  Available: {available != null ? formatCurrency(available) : 'Loading...'}
                </span>
              ) : null;
            })()}
          </div>

          {/* Duration (buy only) */}
          {txType === 'buy' && (
            <div className="field">
              <label className="label">
                Time Horizon <span className="required">*</span>
              </label>
              <div className="time-horizon-row">
                <div className="input-wrapper time-horizon-input">
                  <input
                    type="number"
                    className="input"
                    placeholder="Duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="time-unit-toggle">
                  {['days', 'months', 'years'].map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      className={`time-unit-btn${timeUnit === unit ? ' time-unit-btn--active' : ''}`}
                      onClick={() => setTimeUnit(unit)}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {addError && <div className="error">{addError}</div>}

          <button
            className={`button${txType === 'sell' ? ' button-sell' : ''}`}
            disabled={!isAddFormValid || adding}
            onClick={handleAddTransaction}
          >
            {adding
              ? (txType === 'sell' ? 'Selling...' : 'Adding...')
              : (txType === 'sell' ? 'Sell from Portfolio' : 'Add to Portfolio')}
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-panel">
        {loading ? (
          <p className="portfolio-loading">Loading your portfolio...</p>
        ) : (
          <div className="portfolio-main">
            {error && <p className="error">{error}</p>}

            {/* Summary Bar */}
            {positions.length > 0 && (() => {
              const missingFundData = positions.some((p) => !funds.find((f) => f.ticker === p.ticker));
              const allBetasLoaded = positions.every((p) => betaData[p.ticker] != null);
              const weightedBeta = openCostBasis > 0 && allBetasLoaded
                ? positions.reduce((sum, p) => sum + (betaData[p.ticker] || 0) * p.totalCostBasis, 0) / openCostBasis
                : null;
              const weightedSharpe = openCostBasis > 0 && !missingFundData
                ? positions.reduce((sum, p) => {
                    const fundData = funds.find((f) => f.ticker === p.ticker);
                    return sum + (fundData?.sharpeRatio || 0) * p.totalCostBasis;
                  }, 0) / openCostBasis
                : null;
              const portfolioVolatility = openCostBasis > 0 && !missingFundData
                ? positions.reduce((sum, p) => {
                    const fundData = funds.find((f) => f.ticker === p.ticker);
                    return sum + (fundData?.standardDeviation || 0) * p.totalCostBasis;
                  }, 0) / openCostBasis
                : null;
              return (
                <div className="portfolio-summary-bar">
                  <div className="summary-stat summary-stat--wide">
                    <span className="summary-stat-label">
                      Total Invested
                      <span className="summary-stat-info">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#003A70" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.5V11" strokeLinecap="round"/><circle cx="8" cy="5.5" r="0.5" fill="#003A70" stroke="none"/></svg>
                        <span className="summary-stat-tooltip">Total money you've put in across all buy transactions.</span>
                      </span>
                    </span>
                    <span className="summary-stat-value">{formatCurrency(totalInvested)}</span>
                  </div>
                  <div className="summary-stat summary-stat--wide">
                    <span className="summary-stat-label">
                      Current Value
                      <span className="summary-stat-info">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#003A70" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.5V11" strokeLinecap="round"/><circle cx="8" cy="5.5" r="0.5" fill="#003A70" stroke="none"/></svg>
                        <span className="summary-stat-tooltip">What your open positions are worth today, based on projected growth since purchase.</span>
                      </span>
                    </span>
                    <span className="summary-stat-value">{formatCurrency(totalCurrentValue)}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-stat-label">
                      Withdrawn
                      <span className="summary-stat-info">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#003A70" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.5V11" strokeLinecap="round"/><circle cx="8" cy="5.5" r="0.5" fill="#003A70" stroke="none"/></svg>
                        <span className="summary-stat-tooltip">Total money you've taken out by selling positions.</span>
                      </span>
                    </span>
                    <span className="summary-stat-value">{formatCurrency(totalWithdrawn)}</span>
                  </div>
                  <div className="summary-stat summary-stat--wide">
                    <span className="summary-stat-label">
                      Unrealized Gain
                      <span className="summary-stat-info">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#003A70" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.5V11" strokeLinecap="round"/><circle cx="8" cy="5.5" r="0.5" fill="#003A70" stroke="none"/></svg>
                        <span className="summary-stat-tooltip">Gain or loss on positions you still hold. This is not locked in until you sell.</span>
                      </span>
                    </span>
                    <span className={`summary-stat-value ${totalUnrealizedGain >= 0 ? 'summary-stat-positive' : 'summary-stat-negative'}`}>
                      {totalUnrealizedGain >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedGain)}
                    </span>
                  </div>
                  <div className="summary-stat summary-stat--wide">
                    <span className="summary-stat-label">
                      Realized Gain
                      <span className="summary-stat-info">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#003A70" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.5V11" strokeLinecap="round"/><circle cx="8" cy="5.5" r="0.5" fill="#003A70" stroke="none"/></svg>
                        <span className="summary-stat-tooltip">Gain or loss from positions you've sold, based on growth between buy and sell dates.</span>
                      </span>
                    </span>
                    <span className={`summary-stat-value ${totalRealizedGain >= 0 ? 'summary-stat-positive' : 'summary-stat-negative'}`}>
                      {totalRealizedGain >= 0 ? '+' : ''}{formatCurrency(totalRealizedGain)}
                    </span>
                  </div>
                  <div className="summary-stat summary-stat--narrow">
                    <span className="summary-stat-label">
                      Beta
                      <span className="summary-stat-info">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#003A70" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.5V11" strokeLinecap="round"/><circle cx="8" cy="5.5" r="0.5" fill="#003A70" stroke="none"/></svg>
                        <span className="summary-stat-tooltip summary-stat-tooltip--right">How closely your portfolio moves with the S&amp;P 500. A beta of 1.0 means it moves in line with the market.</span>
                      </span>
                    </span>
                    <span className="summary-stat-value">{weightedBeta != null ? weightedBeta.toFixed(2) : <span className="summary-stat-error">ERR</span>}</span>
                  </div>
                  <div className="summary-stat summary-stat--narrow">
                    <span className="summary-stat-label">
                      Sharpe
                      <span className="summary-stat-info">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#003A70" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.5V11" strokeLinecap="round"/><circle cx="8" cy="5.5" r="0.5" fill="#003A70" stroke="none"/></svg>
                        <span className="summary-stat-tooltip summary-stat-tooltip--right">How much return your portfolio earns for the risk it takes. Higher is better.</span>
                      </span>
                    </span>
                    <span className="summary-stat-value">{weightedSharpe != null ? weightedSharpe.toFixed(2) : <span className="summary-stat-error">ERR</span>}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-stat-label">
                      Volatility
                      <span className="summary-stat-info">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#003A70" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.5V11" strokeLinecap="round"/><circle cx="8" cy="5.5" r="0.5" fill="#003A70" stroke="none"/></svg>
                        <span className="summary-stat-tooltip summary-stat-tooltip--right">How much your portfolio's value is expected to swing up or down. Higher means more risk.</span>
                      </span>
                    </span>
                    <span className="summary-stat-value">{portfolioVolatility != null ? `${(portfolioVolatility * 100).toFixed(1)}%` : <span className="summary-stat-error">ERR</span>}</span>
                  </div>
                </div>
              );
            })()}

            {/* Charts */}
            {positions.length > 0 && (
              <div className="portfolio-charts-row">
                <AllocationChart positions={positions} priceData={priceData} />
                <div className="portfolio-chart-card">
                  <div className="portfolio-chart-header">
                    <div className="portfolio-chart-toggle">
                      <button
                        type="button"
                        className={`portfolio-chart-toggle-btn${chartMode === 'historic' ? ' portfolio-chart-toggle-btn--active' : ''}`}
                        onClick={() => setChartMode('historic')}
                      >
                        Historic
                      </button>
                      <button
                        type="button"
                        className={`portfolio-chart-toggle-btn${chartMode === 'projected' ? ' portfolio-chart-toggle-btn--active' : ''}`}
                        onClick={() => setChartMode('projected')}
                      >
                        Projected
                      </button>
                    </div>
                    {chartMode === 'historic' && (
                      <div className="portfolio-period-filter">
                        {['1M', '3M', '1Y', 'ALL'].map((p) => (
                          <button
                            key={p}
                            type="button"
                            className={`portfolio-period-btn${historyPeriod === p ? ' portfolio-period-btn--active' : ''}`}
                            onClick={() => setHistoryPeriod(p)}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {chartMode === 'historic'
                    ? <HistoricalValueChart transactions={transactions} priceHistory={priceHistory} selectedFund={selectedFund} />
                    : <GrowthProjectionChart positions={positions} funds={funds} selectedFund={selectedFund} priceData={priceData} />
                  }
                </div>
              </div>
            )}

            {/* Holdings Table */}
            {positions.length === 0 ? (
              <p className="empty-portfolio">
                No holdings yet. Use the sidebar to record your first transaction.
              </p>
            ) : (
              <div className="portfolio-table-wrapper">
                <h3 className="portfolio-chart-title" style={{ padding: '1rem 1.25rem 0' }}>Holdings</h3>
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Fund</th>
                      <th>Cost Basis</th>
                      <th>Weight</th>
                      <th>Current Value</th>
                      <th>Unreal. Gain</th>
                      <th>Unreal. %</th>
                      <th>Beta</th>
                      <th>Sharpe</th>
                      <th>1Y</th>
                      <th>3Y</th>
                      <th>5Y</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionsWithGains.map((pos) => {
                      const weight = openCostBasis > 0 ? (pos.totalCostBasis / openCostBasis * 100) : 0;
                      const fundData = funds.find((f) => f.ticker === pos.ticker);
                      const sharpe = fundData?.sharpeRatio;
                      const unrealPct = pos.totalCostBasis > 0 && pos.unrealizedGain != null ? (pos.unrealizedGain / pos.totalCostBasis * 100) : null;
                      const isSelected = selectedFund === pos.ticker;
                      return (
                        <tr
                          key={pos.ticker}
                          className={isSelected ? 'portfolio-row-selected' : ''}
                          onClick={() => toggleFundSelect(pos.ticker)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td title={pos.fund_name}>
                            <span className="portfolio-ticker">{pos.ticker}</span>
                          </td>
                          <td>{formatCurrency(pos.totalCostBasis)}</td>
                          <td>{weight.toFixed(1)}%</td>
                          <td>{pos.currentValue != null ? formatCurrency(pos.currentValue) : '...'}</td>
                          <td>
                            {pos.unrealizedGain != null ? (
                              <span className={pos.unrealizedGain >= 0 ? 'portfolio-return-positive' : 'portfolio-return-negative'}>
                                {pos.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedGain)}
                              </span>
                            ) : '...'}
                          </td>
                          <td>
                            {unrealPct != null ? (
                              <span className={unrealPct >= 0 ? 'portfolio-return-positive' : 'portfolio-return-negative'}>
                                {unrealPct >= 0 ? '+' : ''}{unrealPct.toFixed(1)}%
                              </span>
                            ) : '...'}
                          </td>
                          <td>{betaData[pos.ticker] != null ? betaData[pos.ticker].toFixed(2) : <span className="portfolio-data-error">...</span>}</td>
                          <td>{sharpe != null ? sharpe.toFixed(2) : <span className="portfolio-data-error">ERR</span>}</td>
                          {['return1Y', 'return3Y', 'return5Y'].map((key) => {
                            const hist = historicalData[pos.ticker];
                            const val = hist ? hist[key] : undefined;
                            return (
                              <td key={key}>
                                {val != null ? (
                                  <span className={val >= 0 ? 'portfolio-return-positive' : 'portfolio-return-negative'}>
                                    {val >= 0 ? '+' : ''}{(val * 100).toFixed(1)}%
                                  </span>
                                ) : (
                                  <span style={{ color: '#94A3B8' }}>N/A</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Transaction History */}
            {transactions.length > 0 && (
              <div className="portfolio-table-wrapper" style={{ marginTop: '1.25rem' }}>
                <h3 className="portfolio-chart-title" style={{ padding: '1rem 1.25rem 0' }}>Transaction History</h3>
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Fund</th>
                      <th>Amount</th>
                      <th>Realized Gain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...transactions].reverse().map((tx) => (
                      <tr key={tx.id}>
                        <td>
                          {new Date(tx.date).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </td>
                        <td>
                          <span className={tx.type === 'buy' ? 'portfolio-tx-buy' : 'portfolio-tx-sell'}>
                            {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td title={tx.fund_name}>
                          <span className="portfolio-ticker">{tx.ticker}</span>
                        </td>
                        <td>{tx.type === 'sell' ? '-' : ''}{formatCurrency(tx.amount)}</td>
                        <td>
                          {tx.type === 'sell' && realizedGainByTx[tx.id] != null ? (
                            <span className={realizedGainByTx[tx.id] >= 0 ? 'portfolio-return-positive' : 'portfolio-return-negative'}>
                              {realizedGainByTx[tx.id] >= 0 ? '+' : ''}{formatCurrency(realizedGainByTx[tx.id])}
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default PortfolioView;
