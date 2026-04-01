import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const API_BASE_URL = "http://localhost:8080/api";

const CHART_COLORS = [
  '#003A70', '#2E86DE', '#54A0FF', '#0ABDE3', '#10AC84',
  '#F368E0', '#EE5A24', '#F9CA24', '#6C5CE7', '#FDA7DF',
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

function AllocationChart({ investments }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 80;

  // Aggregate by ticker
  const byTicker = {};
  investments.forEach((inv) => {
    if (!byTicker[inv.ticker]) byTicker[inv.ticker] = 0;
    byTicker[inv.ticker] += Number(inv.amount);
  });
  const entries = Object.entries(byTicker).sort((a, b) => b[1] - a[1]);
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

function GrowthProjectionChart({ investments, funds }) {
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

  // Build growth curves using real dates from created_at
  const curves = investments.map((inv, idx) => {
    const principal = Number(inv.amount);
    const rate = Number(inv.expected_return);
    const years = Number(inv.years);
    const startDate = new Date(inv.created_at);
    const points = [];
    for (let y = 0; y <= years; y++) {
      const date = new Date(startDate);
      date.setFullYear(date.getFullYear() + y);
      points.push({ date, timestamp: date.getTime(), value: principal * Math.exp(rate * y) });
    }
    return { ticker: inv.ticker, points, color: CHART_COLORS[idx % CHART_COLORS.length] };
  });

  // Build S&P 500 benchmark curve
  const spyFund = funds.find((f) => f.ticker === 'SPY');
  const spyReturn = spyFund ? spyFund.expectedReturn : 0.1635;
  const totalInvestedForBenchmark = investments.reduce((s, inv) => s + Number(inv.amount), 0);
  const earliestStart = investments.length > 0
    ? new Date(Math.min(...investments.map((inv) => new Date(inv.created_at).getTime())))
    : new Date();
  const longestYears = investments.length > 0
    ? Math.max(...investments.map((inv) => Number(inv.years)))
    : 1;
  const benchmarkPoints = [];
  for (let y = 0; y <= longestYears; y++) {
    const date = new Date(earliestStart);
    date.setFullYear(date.getFullYear() + y);
    benchmarkPoints.push({ date, timestamp: date.getTime(), value: totalInvestedForBenchmark * Math.exp(spyReturn * y) });
  }

  if (curves.length === 0) return null;

  // Find global min/max timestamps and values (including benchmark)
  const allPoints = [...curves.flatMap((c) => c.points), ...benchmarkPoints];
  const minTime = Math.min(...allPoints.map((p) => p.timestamp));
  const maxTime = Math.max(...allPoints.map((p) => p.timestamp));
  const timeRange = maxTime - minTime || 1;
  const maxVal = Math.max(...allPoints.map((p) => p.value));
  const range = maxVal || 1;

  const toX = (ts) => padL + ((ts - minTime) / timeRange) * (width - padL - padR);
  const toY = (value) => padTop + (1 - value / range) * (height - padTop - padBottom);

  // Y-axis labels
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  // X-axis: pick ~4 evenly spaced dates
  const xTickCount = 4;
  const xTicks = [];
  for (let i = 0; i < xTickCount; i++) {
    const ts = minTime + (i / (xTickCount - 1)) * timeRange;
    xTicks.push({ ts, label: formatDate(new Date(ts)) });
  }

  return (
    <div className="portfolio-chart-card">
      <h3 className="portfolio-chart-title">Growth Projection</h3>
      <div className="portfolio-chart-content">
        <svg viewBox={`0 0 ${width} ${height}`} className="growth-projection-chart">
          {/* Grid lines */}
          {yTicks.map((val, i) => (
            <g key={i}>
              <line x1={padL} y1={toY(val)} x2={width - padR} y2={toY(val)} stroke="#E8EEF5" strokeWidth="1" />
              <text x={padL - 8} y={toY(val) + 4} textAnchor="end" className="chart-axis-label">
                {val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`}
              </text>
            </g>
          ))}

          {/* X-axis labels — real dates */}
          {xTicks.map((tick, i) => (
            <text key={i} x={toX(tick.ts)} y={height - 6} textAnchor="middle" className="chart-axis-label">
              {tick.label}
            </text>
          ))}

          {/* S&P 500 Benchmark Line */}
          {(() => {
            const d = benchmarkPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.timestamp)},${toY(p.value)}`).join(' ');
            return (
              <path d={d} fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="5,3" strokeLinecap="round" strokeLinejoin="round" />
            );
          })()}

          {/* Lines */}
          {curves.map((curve) => {
            const d = curve.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.timestamp)},${toY(p.value)}`).join(' ');
            return (
              <g key={curve.ticker}>
                <path d={d} fill="none" stroke={curve.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={toX(curve.points[curve.points.length - 1].timestamp)} cy={toY(curve.points[curve.points.length - 1].value)} r="4" fill={curve.color} />
              </g>
            );
          })}
        </svg>
        <div className="chart-legend">
          {curves.map((c) => (
            <div key={c.ticker} className="chart-legend-item">
              <span className="chart-legend-dot" style={{ background: c.color }} />
              <span className="chart-legend-ticker">{c.ticker}</span>
              <span className="chart-legend-pct">{formatCurrency(c.points[c.points.length - 1].value)}</span>
            </div>
          ))}
          <div className="chart-legend-item">
            <span className="chart-legend-dash" />
            <span className="chart-legend-ticker">S&P 500</span>
            <span className="chart-legend-pct">{formatCurrency(benchmarkPoints[benchmarkPoints.length - 1].value)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioView({ user, onSignIn }) {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add investment form state
  const [funds, setFunds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [timeUnit, setTimeUnit] = useState('years');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [historicalData, setHistoricalData] = useState({});
  const searchRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchInvestments();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Fetch historical performance for each unique ticker
  useEffect(() => {
    if (investments.length === 0) return;
    const tickers = [...new Set(investments.map((inv) => inv.ticker))];
    tickers.forEach((ticker) => {
      if (historicalData[ticker]) return;
      fetch(`${API_BASE_URL}/historical/${ticker}`)
        .then((res) => res.json())
        .then((data) => {
          setHistoricalData((prev) => ({ ...prev, [ticker]: data }));
        })
        .catch(() => {});
    });
  }, [investments]);

  // Fetch available funds for the search
  useEffect(() => {
    fetch(`${API_BASE_URL}/funds`)
      .then((res) => res.json())
      .then((data) => setFunds(data))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchInvestments() {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setInvestments(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load investments.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      const { error: deleteError } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      setInvestments((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete investment.');
    }
  }

  const getYears = () => {
    const val = parseFloat(duration);
    if (!val || val <= 0) return 0;
    if (timeUnit === 'months') return val / 12;
    if (timeUnit === 'days') return val / 365;
    return val;
  };

  const isAddFormValid = selectedTicker && amount && duration && parseFloat(amount) > 0 && getYears() > 0;

  async function handleAddInvestment(e) {
    e.preventDefault();
    if (!isAddFormValid || adding) return;
    setAdding(true);
    setAddError('');

    try {
      // Call the backend to calculate future value
      const years = getYears();
      const response = await fetch(
        `${API_BASE_URL}/calculate?ticker=${selectedTicker}&amount=${amount}&years=${years}`
      );
      const data = await response.json();
      const returnPct = ((data.futureValue - data.principal) / data.principal) * 100;
      const fund = funds.find((f) => f.ticker === selectedTicker);

      // Save to Supabase
      const { error: insertError } = await supabase.from('investments').insert({
        user_id: user.id,
        ticker: selectedTicker,
        fund_name: fund?.name || selectedTicker,
        amount: data.principal,
        years: data.years,
        future_value: data.futureValue,
        expected_return: data.expectedReturn,
        beta: data.beta,
        return_pct: returnPct,
      });
      if (insertError) throw insertError;

      // Refresh list and reset form
      await fetchInvestments();
      setSelectedTicker('');
      setAmount('');
      setDuration('');
      setSearchQuery('');
    } catch (err) {
      setAddError(err.message || 'Failed to add investment.');
    } finally {
      setAdding(false);
    }
  }

  const filteredFunds = funds.filter(
    (fund) =>
      fund.ticker !== selectedTicker &&
      (fund.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fund.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const totalProjected = investments.reduce((sum, inv) => sum + Number(inv.future_value || 0), 0);

  // Unauthenticated state
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

  return (
    <div className="app-content">
      {/* Sidebar — Add Investment Form */}
      <aside className="sidebar">
        <div className="sidebar-heading">
          <span className="sidebar-label">Add Investment</span>
          <div className="decorative-line" aria-hidden="true" />
        </div>

        <div className="form">
          {/* Fund Search */}
          <div className="field" ref={searchRef}>
            <label className="label">
              Fund <span className="required">*</span>
            </label>
            {selectedTicker ? (
              <div className="portfolio-selected-fund">
                <span className="portfolio-selected-ticker">{selectedTicker}</span>
                <span className="portfolio-selected-name">
                  {funds.find((f) => f.ticker === selectedTicker)?.name || ''}
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
                    placeholder="Search by ticker or name..."
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
                      <li className="search-no-results">No funds found</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="field">
            <label className="label">
              Investment Amount <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="number"
                className="input input-with-prefix"
                placeholder="10,000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Duration */}
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

          {addError && <div className="error">{addError}</div>}

          <button
            className="button"
            disabled={!isAddFormValid || adding}
            onClick={handleAddInvestment}
          >
            {adding ? 'Adding...' : 'Add to Portfolio'}
          </button>
        </div>
      </aside>

      {/* Main Panel — Portfolio Content */}
      <main className="main-panel">
        {loading ? (
          <p className="portfolio-loading">Loading your investments...</p>
        ) : (
          <div className="portfolio-main">
            {error && <p className="error">{error}</p>}

            {/* Summary Cards */}
            {investments.length > 0 && (() => {
              const weightedBeta = totalInvested > 0
                ? investments.reduce((sum, inv) => sum + Number(inv.beta || 1.0) * Number(inv.amount), 0) / totalInvested
                : 1.0;
              const weightedSharpe = totalInvested > 0
                ? investments.reduce((sum, inv) => {
                    const fundData = funds.find((f) => f.ticker === inv.ticker);
                    const sharpe = fundData?.sharpeRatio || 0;
                    return sum + sharpe * Number(inv.amount);
                  }, 0) / totalInvested
                : 0;
              const portfolioVolatility = totalInvested > 0
                ? investments.reduce((sum, inv) => {
                    const fundData = funds.find((f) => f.ticker === inv.ticker);
                    const stdDev = fundData?.standardDeviation || 0.15;
                    return sum + stdDev * Number(inv.amount);
                  }, 0) / totalInvested
                : 0;
              return (
              <div className="portfolio-summary">
                <div className="summary-card">
                  <p className="summary-card-label">Total Invested</p>
                  <p className="summary-card-value">{formatCurrency(totalInvested)}</p>
                </div>
                <div className="summary-card">
                  <p className="summary-card-label">Total Projected Value</p>
                  <p className="summary-card-value">{formatCurrency(totalProjected)}</p>
                </div>
                <div className="summary-card">
                  <p className="summary-card-label">Investments</p>
                  <p className="summary-card-value">{investments.length}</p>
                </div>
                <div className="summary-card">
                  <p className="summary-card-label">Portfolio Beta</p>
                  <p className="summary-card-value">{weightedBeta.toFixed(2)}</p>
                </div>
                <div className="summary-card">
                  <p className="summary-card-label">Sharpe Ratio</p>
                  <p className="summary-card-value">{weightedSharpe.toFixed(2)}</p>
                </div>
                <div className="summary-card">
                  <p className="summary-card-label">Volatility</p>
                  <p className="summary-card-value">{(portfolioVolatility * 100).toFixed(1)}%</p>
                </div>
              </div>
              );
            })()}

            {/* Charts */}
            {investments.length > 0 && (
              <div className="portfolio-charts-row">
                <AllocationChart investments={investments} />
                <GrowthProjectionChart investments={investments} funds={funds} />
              </div>
            )}

            {/* Table or Empty State */}
            {investments.length === 0 ? (
              <p className="empty-portfolio">
                No investments yet. Use the sidebar to add your first investment.
              </p>
            ) : (
              <div className="portfolio-table-wrapper">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Fund</th>
                      <th>Amount</th>
                      <th>Weight</th>
                      <th>Yrs</th>
                      <th>Proj. Value</th>
                      <th>Return</th>
                      <th>Beta</th>
                      <th>Sharpe</th>
                      <th>1Y</th>
                      <th>3Y</th>
                      <th>5Y</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {investments.map((inv) => {
                      const weight = totalInvested > 0 ? (Number(inv.amount) / totalInvested * 100) : 0;
                      const fundData = funds.find((f) => f.ticker === inv.ticker);
                      const sharpe = fundData?.sharpeRatio || 0;
                      return (
                      <tr key={inv.id}>
                        <td>
                          {new Date(inv.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </td>
                        <td title={inv.fund_name || inv.ticker}>
                          <span className="portfolio-ticker">{inv.ticker}</span>
                        </td>
                        <td>{formatCurrency(inv.amount)}</td>
                        <td>{weight.toFixed(1)}%</td>
                        <td>{inv.years} yr{inv.years !== 1 ? 's' : ''}</td>
                        <td>{formatCurrency(inv.future_value)}</td>
                        <td>
                          <span className="portfolio-return-positive">
                            +{Number(inv.return_pct || 0).toFixed(1)}%
                          </span>
                        </td>
                        <td>{Number(inv.beta || 1.0).toFixed(2)}</td>
                        <td>{sharpe.toFixed(2)}</td>
                        {['return1Y', 'return3Y', 'return5Y'].map((key) => {
                          const hist = historicalData[inv.ticker];
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
                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(inv.id)}
                            title="Delete investment"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                      );
                    })}
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
