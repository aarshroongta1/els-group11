const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

function ResultsCard({ result }) {
  return (
    <div className="results-card">
      <div className="results-inner">
        <p className="results-label">Projected Future Value</p>
        <p className="results-value">{formatCurrency(result.futureValue)}</p>
        <div className="results-meta">
          <span className="results-badge">
            +{result.returnPct.toFixed(1)}% return
          </span>
        </div>
        <div className="results-details">
          <div className="results-detail-row">
            <span className="results-detail-label">Fund</span>
            <span className="results-detail-value">
              {result.fundTicker}
            </span>
          </div>
          <div className="results-detail-row">
            <span className="results-detail-label">Initial Investment</span>
            <span className="results-detail-value">
              {formatCurrency(result.initialAmount)}
            </span>
          </div>
          <div className="results-detail-row">
            <span className="results-detail-label">Time Horizon</span>
            <span className="results-detail-value">
              {result.years} year{result.years !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsCard;
