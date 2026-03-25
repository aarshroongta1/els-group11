import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

function PortfolioView() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvestments();
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

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalProjected = investments.reduce((sum, inv) => sum + (inv.future_value || 0), 0);
  const investmentCount = investments.length;

  if (loading) {
    return (
      <div className="portfolio-view">
        <h2 className="portfolio-heading">My Portfolio</h2>
        <p className="portfolio-loading">Loading your investments...</p>
      </div>
    );
  }

  return (
    <div className="portfolio-view">
      <h2 className="portfolio-heading">My Portfolio</h2>

      {error && <p className="error">{error}</p>}

      {/* Summary Cards */}
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
          <p className="summary-card-label">Number of Investments</p>
          <p className="summary-card-value">{investmentCount}</p>
        </div>
      </div>

      {/* Table or Empty State */}
      {investments.length === 0 ? (
        <p className="empty-portfolio">
          No saved investments yet. Calculate a fund and save it to start tracking.
        </p>
      ) : (
        <div className="portfolio-table-wrapper">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Date Saved</th>
                <th>Fund</th>
                <th>Amount</th>
                <th>Time Horizon</th>
                <th>Projected Value</th>
                <th>Return %</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    {new Date(inv.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td>
                    <span className="portfolio-ticker">{inv.ticker}</span>
                    {inv.fund_name && (
                      <span style={{ marginLeft: '0.5rem', color: '#6B7C93', fontSize: '0.82rem' }}>
                        {inv.fund_name}
                      </span>
                    )}
                  </td>
                  <td>{formatCurrency(inv.amount)}</td>
                  <td>{inv.years} yr{inv.years !== 1 ? 's' : ''}</td>
                  <td>{formatCurrency(inv.future_value)}</td>
                  <td>
                    <span className="portfolio-return-positive">
                      +{(inv.return_pct || 0).toFixed(1)}%
                    </span>
                  </td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PortfolioView;
