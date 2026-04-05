import { useState, useRef, useEffect } from 'react';

const MAX_FUNDS = 3;

function FundSelector({ funds, selectedFunds, onAddFund, onRemoveFund }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [fundType, setFundType] = useState('All');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const atLimit = selectedFunds.length >= MAX_FUNDS;

  const filtered = funds.filter(
    (fund) =>
      !selectedFunds.includes(fund.ticker) &&
      (fundType === 'All' || fund.type === fundType) &&
      (fund.ticker.toLowerCase().includes(query.toLowerCase()) ||
        fund.name.toLowerCase().includes(query.toLowerCase()))
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (ticker) => {
    onAddFund(ticker);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="field">
      <label className="label" htmlFor="fund-search">
        Select Funds ({selectedFunds.length}/{MAX_FUNDS}) <span className="required">*</span>
      </label>

      <div className="fund-type-toggle">
        {['All', 'Mutual Fund', 'ETF'].map((type) => (
          <button
            key={type}
            type="button"
            className={`fund-type-btn ${fundType === type ? 'fund-type-btn--active' : ''}`}
            onClick={() => setFundType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="search-select" ref={wrapperRef}>
        <div className="search-input-wrapper">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            id="fund-search"
            type="text"
            className="input search-input"
            placeholder={atLimit ? 'Maximum funds selected' : 'Search by ticker or name'}
            value={query}
            disabled={atLimit}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
        </div>

        {open && !atLimit && (
          <ul className="search-dropdown">
            {filtered.length > 0 ? (
              filtered.map((fund) => (
                <li
                  key={fund.ticker}
                  className="search-option"
                  onMouseDown={() => handleSelect(fund.ticker)}
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
