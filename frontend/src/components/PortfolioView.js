import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';

const API_BASE_URL = "http://localhost:8080/api";

const CHART_COLORS = [
  '#003A70', '#2E86DE', '#54A0FF', '#0ABDE3', '#10AC84',
  '#F368E0', '#EE5A24', '#F9CA24', '#6C5CE7', '#FDA7DF',
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
function AllocationChart({ positions }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 80;

  const entries = positions
    .map((p) => [p.ticker, p.currentAmount])
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
        <div className="chart-legend">
          {slices.map((s) => (
            <div key={s.ticker} className="chart-legend-item">
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
function GrowthProjectionChart({ positions, funds, selectedFund }) {
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
  const totalInvested = positions.reduce((s, p) => s + p.currentAmount, 0);

  // Build aggregate portfolio curve (5 years forward from today)
  const aggregatePoints = [];
  for (let y = 0; y <= projectionYears; y++) {
    const date = new Date(now);
    date.setFullYear(date.getFullYear() + y);
    let totalValue = 0;
    positions.forEach((pos) => {
      totalValue += pos.currentAmount * Math.exp(pos.expectedReturn * y);
    });
    aggregatePoints.push({ date, timestamp: date.getTime(), value: totalValue });
  }

  // Build individual fund curve for the selected fund
  let fundCurve = null;
  if (selectedFund) {
    const pos = positions.find((p) => p.ticker === selectedFund);
    if (pos) {
      const points = [];
      for (let y = 0; y <= projectionYears; y++) {
        const date = new Date(now);
        date.setFullYear(date.getFullYear() + y);
        points.push({ date, timestamp: date.getTime(), value: pos.currentAmount * Math.exp(pos.expectedReturn * y) });
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
    benchmarkPoints.push({ date, timestamp: date.getTime(), value: totalInvested * Math.exp(spyReturn * y) });
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

/* ─── Historical "Since Inception" Chart ─── */
function HistoricalValueChart({ transactions, period }) {
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

  const now = new Date();
  const firstDate = new Date(transactions[0].date);

  // Determine start date based on period filter
  let startDate;
  if (period === '1M') {
    startDate = new Date(now); startDate.setDate(startDate.getDate() - 30);
  } else if (period === '3M') {
    startDate = new Date(now); startDate.setMonth(startDate.getMonth() - 3);
  } else if (period === '1Y') {
    startDate = new Date(now); startDate.setFullYear(startDate.getFullYear() - 1);
  } else {
    startDate = firstDate;
  }
  if (startDate < firstDate) startDate = firstDate;

  const startMs = startDate.getTime();
  const endMs = now.getTime();
  const span = endMs - startMs;
  if (span <= 0) return null;

  // Generate ~80 evaluation points
  const numPoints = 80;
  const dataPoints = [];

  for (let i = 0; i <= numPoints; i++) {
    const evalMs = startMs + (i / numPoints) * span;
    const evalDate = new Date(evalMs);

    // Compute portfolio value at this date
    // Group transactions by ticker up to this date
    const byTicker = {};
    transactions.forEach((tx) => {
      if (new Date(tx.date).getTime() > evalMs) return;
      if (!byTicker[tx.ticker]) byTicker[tx.ticker] = { buys: [], sells: [] };
      byTicker[tx.ticker][tx.type === 'buy' ? 'buys' : 'sells'].push(tx);
    });

    let portfolioValue = 0;
    Object.entries(byTicker).forEach(([, { buys, sells }]) => {
      const totalBought = buys.reduce((s, tx) => s + Number(tx.amount), 0);
      const totalSold = sells.reduce((s, tx) => s + Number(tx.amount), 0);
      const netInvested = totalBought - totalSold;
      if (netInvested <= 0) return;

      // Weighted average buy date and expected return
      const weightedDateMs = buys.reduce((s, tx) => s + new Date(tx.date).getTime() * Number(tx.amount), 0) / totalBought;
      const weightedReturn = buys.reduce((s, tx) => s + Number(tx.expected_return) * Number(tx.amount), 0) / totalBought;

      const yearsElapsed = (evalMs - weightedDateMs) / MS_PER_YEAR;
      portfolioValue += netInvested * Math.exp(weightedReturn * Math.max(yearsElapsed, 0));
    });

    dataPoints.push({ date: evalDate, timestamp: evalMs, value: portfolioValue });
  }

  if (dataPoints.length === 0) return null;

  const minTime = dataPoints[0].timestamp;
  const maxTime = dataPoints[dataPoints.length - 1].timestamp;
  const timeRange = maxTime - minTime || 1;
  const maxVal = Math.max(...dataPoints.map((p) => p.value));
  const minVal = Math.min(...dataPoints.map((p) => p.value));
  const valRange = maxVal - minVal || 1;

  const toX = (ts) => padL + ((ts - minTime) / timeRange) * (width - padL - padR);
  const toY = (value) => padTop + (1 - (value - minVal) / valRange) * (height - padTop - padBottom);

  const yTicks = [minVal, minVal + valRange * 0.33, minVal + valRange * 0.66, maxVal];
  const xTickCount = 4;
  const xTicks = [];
  for (let i = 0; i < xTickCount; i++) {
    const ts = minTime + (i / (xTickCount - 1)) * timeRange;
    xTicks.push({ ts, label: formatDate(new Date(ts)) });
  }

  const makePath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.timestamp)},${toY(p.value)}`).join(' ');

  const totalGain = dataPoints[dataPoints.length - 1].value - dataPoints[0].value;
  const lineColor = totalGain >= 0 ? '#059669' : '#DC2626';

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
        <path d={makePath(dataPoints)} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={toX(dataPoints[dataPoints.length - 1].timestamp)} cy={toY(dataPoints[dataPoints.length - 1].value)} r="4" fill={lineColor} />
      </svg>
      <div className="chart-legend">
        <div className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: lineColor }} />
          <span className="chart-legend-ticker">Portfolio</span>
          <span className="chart-legend-pct">{formatCurrency(dataPoints[dataPoints.length - 1].value)}</span>
        </div>
        <div className="chart-legend-item">
          <span className="chart-legend-ticker" style={{ color: lineColor, fontWeight: 700 }}>
            {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
          </span>
        </div>
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
  const [selectedFund, setSelectedFund] = useState(null);
  const [chartMode, setChartMode] = useState('projected');
  const [historyPeriod, setHistoryPeriod] = useState('ALL');
  const searchRef = useRef(null);

  const toggleFundSelect = (ticker) => {
    setSelectedFund((prev) => (prev === ticker ? null : ticker));
  };

  /* ─── Derive positions from transactions ─── */
  const positions = useMemo(() => {
    const byTicker = {};
    transactions.forEach((tx) => {
      if (!byTicker[tx.ticker]) byTicker[tx.ticker] = { buys: [], sells: [], fund_name: tx.fund_name };
      byTicker[tx.ticker][tx.type === 'buy' ? 'buys' : 'sells'].push(tx);
      byTicker[tx.ticker].fund_name = tx.fund_name;
    });

    const result = [];
    Object.entries(byTicker).forEach(([ticker, { buys, sells, fund_name }]) => {
      const totalBought = buys.reduce((s, tx) => s + Number(tx.amount), 0);
      const totalSold = sells.reduce((s, tx) => s + Number(tx.amount), 0);
      const currentAmount = totalBought - totalSold;
      if (currentAmount <= 0) return;

      const weightedReturn = buys.reduce((s, tx) => s + Number(tx.expected_return) * Number(tx.amount), 0) / totalBought;
      const weightedBeta = buys.reduce((s, tx) => s + Number(tx.beta) * Number(tx.amount), 0) / totalBought;
      const earliestBuy = new Date(Math.min(...buys.map((tx) => new Date(tx.date).getTime())));

      result.push({
        ticker,
        fund_name,
        currentAmount,
        totalBought,
        totalSold,
        expectedReturn: weightedReturn,
        beta: weightedBeta,
        earliestBuy,
      });
    });
    return result;
  }, [transactions]);

  /* ─── Derive gains ─── */
  const { totalUnrealizedGain, totalRealizedGain, positionsWithGains } = useMemo(() => {
    const now = new Date();
    let totalUnrealizedGain = 0;
    let totalRealizedGain = 0;

    // Unrealized gains
    const positionsWithGains = positions.map((pos) => {
      const yearsHeld = (now.getTime() - pos.earliestBuy.getTime()) / MS_PER_YEAR;
      const projectedCurrentValue = pos.currentAmount * Math.exp(pos.expectedReturn * yearsHeld);
      const unrealizedGain = projectedCurrentValue - pos.currentAmount;
      totalUnrealizedGain += unrealizedGain;
      return { ...pos, projectedCurrentValue, unrealizedGain, yearsHeld };
    });

    // Realized gains
    const byTicker = {};
    transactions.forEach((tx) => {
      if (!byTicker[tx.ticker]) byTicker[tx.ticker] = { buys: [], sells: [] };
      byTicker[tx.ticker][tx.type === 'buy' ? 'buys' : 'sells'].push(tx);
    });

    Object.entries(byTicker).forEach(([, { buys, sells }]) => {
      if (sells.length === 0) return;

      const allTx = [...buys, ...sells].sort((a, b) => new Date(a.date) - new Date(b.date));
      let costBasisPool = 0;
      let positionSize = 0;

      allTx.forEach((tx) => {
        const amt = Number(tx.amount);
        if (tx.type === 'buy') {
          costBasisPool += amt;
          positionSize += amt;
        } else {
          const proportionalCost = positionSize > 0 ? (amt / positionSize) * costBasisPool : amt;
          const buyDates = buys.filter((b) => new Date(b.date) <= new Date(tx.date));
          if (buyDates.length > 0) {
            const earliestBuyMs = Math.min(...buyDates.map((b) => new Date(b.date).getTime()));
            const weightedReturn = buyDates.reduce((s, b) => s + Number(b.expected_return) * Number(b.amount), 0) /
              buyDates.reduce((s, b) => s + Number(b.amount), 0);
            const yearsHeld = (new Date(tx.date).getTime() - earliestBuyMs) / MS_PER_YEAR;
            const projectedValueAtSell = proportionalCost * Math.exp(weightedReturn * Math.max(yearsHeld, 0));
            totalRealizedGain += projectedValueAtSell - proportionalCost;
          }
          costBasisPool -= proportionalCost;
          positionSize -= amt;
        }
      });
    });

    return { totalUnrealizedGain, totalRealizedGain, positionsWithGains };
  }, [positions, transactions]);

  const totalInvested = positions.reduce((s, p) => s + p.currentAmount, 0);
  const totalCurrentValue = positionsWithGains.reduce((s, p) => s + p.projectedCurrentValue, 0);

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
        if (!position || parseFloat(amount) > position.currentAmount) {
          setAddError('Sell amount exceeds current position.');
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
          expected_return: position.expectedReturn,
          beta: position.beta,
        });
        if (insertError) throw insertError;
      } else {
        const years = getYears();
        const response = await fetch(
          `${API_BASE_URL}/calculate?ticker=${selectedTicker}&amount=${amount}&years=${years}`
        );
        const data = await response.json();
        const fund = funds.find((f) => f.ticker === selectedTicker);

        const { error: insertError } = await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'buy',
          date: new Date().toISOString(),
          ticker: selectedTicker,
          fund_name: fund?.name || selectedTicker,
          amount: data.principal,
          expected_return: data.expectedReturn,
          beta: data.beta,
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
                placeholder={txType === 'sell' ? 'Amount to sell' : '10,000'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
              />
            </div>
            {txType === 'sell' && selectedTicker && (() => {
              const pos = positions.find((p) => p.ticker === selectedTicker);
              return pos ? (
                <span style={{ fontSize: '0.72rem', color: '#6B7C93', marginTop: '0.25rem', display: 'block' }}>
                  Available: {formatCurrency(pos.currentAmount)}
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
                    placeholder="5"
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
              const weightedBeta = totalInvested > 0
                ? positions.reduce((sum, p) => sum + p.beta * p.currentAmount, 0) / totalInvested
                : null;
              const weightedSharpe = totalInvested > 0 && !missingFundData
                ? positions.reduce((sum, p) => {
                    const fundData = funds.find((f) => f.ticker === p.ticker);
                    return sum + (fundData?.sharpeRatio || 0) * p.currentAmount;
                  }, 0) / totalInvested
                : null;
              const portfolioVolatility = totalInvested > 0 && !missingFundData
                ? positions.reduce((sum, p) => {
                    const fundData = funds.find((f) => f.ticker === p.ticker);
                    return sum + (fundData?.standardDeviation || 0) * p.currentAmount;
                  }, 0) / totalInvested
                : null;
              return (
                <div className="portfolio-summary-bar">
                  <div className="summary-stat">
                    <span className="summary-stat-label">Invested</span>
                    <span className="summary-stat-value">{formatCurrency(totalInvested)}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-stat-label">Current Value</span>
                    <span className="summary-stat-value">{formatCurrency(totalCurrentValue)}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-stat-label">Unrealized</span>
                    <span className={`summary-stat-value ${totalUnrealizedGain >= 0 ? 'summary-stat-positive' : 'summary-stat-negative'}`}>
                      {totalUnrealizedGain >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedGain)}
                    </span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-stat-label">Realized</span>
                    <span className={`summary-stat-value ${totalRealizedGain >= 0 ? 'summary-stat-positive' : 'summary-stat-negative'}`}>
                      {totalRealizedGain >= 0 ? '+' : ''}{formatCurrency(totalRealizedGain)}
                    </span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-stat-label">Holdings</span>
                    <span className="summary-stat-value">{positions.length}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-stat-label">Beta</span>
                    <span className="summary-stat-value">{weightedBeta != null ? weightedBeta.toFixed(2) : <span className="summary-stat-error">ERR</span>}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-stat-label">Sharpe</span>
                    <span className="summary-stat-value">{weightedSharpe != null ? weightedSharpe.toFixed(2) : <span className="summary-stat-error">ERR</span>}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-stat-label">Volatility</span>
                    <span className="summary-stat-value">{portfolioVolatility != null ? `${(portfolioVolatility * 100).toFixed(1)}%` : <span className="summary-stat-error">ERR</span>}</span>
                  </div>
                </div>
              );
            })()}

            {/* Charts */}
            {positions.length > 0 && (
              <div className="portfolio-charts-row">
                <AllocationChart positions={positions} />
                <div className="portfolio-chart-card">
                  <div className="portfolio-chart-header">
                    <div className="portfolio-chart-toggle">
                      <button
                        type="button"
                        className={`portfolio-chart-toggle-btn${chartMode === 'projected' ? ' portfolio-chart-toggle-btn--active' : ''}`}
                        onClick={() => setChartMode('projected')}
                      >
                        Projected
                      </button>
                      <button
                        type="button"
                        className={`portfolio-chart-toggle-btn${chartMode === 'since-inception' ? ' portfolio-chart-toggle-btn--active' : ''}`}
                        onClick={() => setChartMode('since-inception')}
                      >
                        Since Inception
                      </button>
                    </div>
                    {chartMode === 'since-inception' && (
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
                  {chartMode === 'projected'
                    ? <GrowthProjectionChart positions={positions} funds={funds} selectedFund={selectedFund} />
                    : <HistoricalValueChart transactions={transactions} period={historyPeriod} />
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
                      const weight = totalInvested > 0 ? (pos.currentAmount / totalInvested * 100) : 0;
                      const fundData = funds.find((f) => f.ticker === pos.ticker);
                      const sharpe = fundData?.sharpeRatio;
                      const unrealPct = pos.currentAmount > 0 ? (pos.unrealizedGain / pos.currentAmount * 100) : 0;
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
                          <td>{formatCurrency(pos.currentAmount)}</td>
                          <td>{weight.toFixed(1)}%</td>
                          <td>{formatCurrency(pos.projectedCurrentValue)}</td>
                          <td>
                            <span className={pos.unrealizedGain >= 0 ? 'portfolio-return-positive' : 'portfolio-return-negative'}>
                              {pos.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedGain)}
                            </span>
                          </td>
                          <td>
                            <span className={unrealPct >= 0 ? 'portfolio-return-positive' : 'portfolio-return-negative'}>
                              {unrealPct >= 0 ? '+' : ''}{unrealPct.toFixed(1)}%
                            </span>
                          </td>
                          <td>{pos.beta != null ? pos.beta.toFixed(2) : <span className="portfolio-data-error">ERR</span>}</td>
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
                      <th>Exp. Return</th>
                      <th>Beta</th>
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
                        <td>{(Number(tx.expected_return) * 100).toFixed(2)}%</td>
                        <td>{Number(tx.beta).toFixed(2)}</td>
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
