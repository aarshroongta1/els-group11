function FundSelector({ funds, selectedFund, onFundChange }) {
  return (
    <div className="field">
      <label className="label" htmlFor="fund-select">
        Select Fund
      </label>
      <div className="select-wrapper">
        <select
          id="fund-select"
          className="select"
          value={selectedFund}
          onChange={(e) => onFundChange(e.target.value)}
        >
          <option value="" disabled>
            Choose a mutual fund...
          </option>
          {funds.map((fund) => (
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
    </div>
  );
}

export default FundSelector;
