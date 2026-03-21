const MAX_FUNDS = 3;

function FundSelector({ funds, selectedFunds, onAddFund, onRemoveFund }) {
  const atLimit = selectedFunds.length >= MAX_FUNDS;
  const availableFunds = funds.filter(
    (fund) => !selectedFunds.includes(fund.ticker)
  );

  return (
    <div className="field">
      <label className="label" htmlFor="fund-select">
        Select Funds ({selectedFunds.length}/{MAX_FUNDS}) <span className="required">*</span>
      </label>
      <div className="select-wrapper">
        <select
          id="fund-select"
          className="select"
          value=""
          disabled={atLimit}
          onChange={(e) => {
            if (e.target.value) onAddFund(e.target.value);
          }}
        >
          <option value="" disabled>
            {atLimit
              ? 'Maximum funds selected'
              : 'Choose a mutual fund...'}
          </option>
          {availableFunds.map((fund) => (
            <option key={fund.ticker} value={fund.ticker}>
              {fund.ticker} — {fund.name}
            </option>
          ))}
        </select>
        <svg
          className="select-chevron"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="#9a9488"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {selectedFunds.length > 0 && (
        <div className="pills">
          {selectedFunds.map((ticker) => (
            <span key={ticker} className="pill">
              {ticker}
              <button
                className="pill-remove"
                onClick={() => onRemoveFund(ticker)}
                aria-label={`Remove ${ticker}`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 3L9 9M9 3L3 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default FundSelector;
