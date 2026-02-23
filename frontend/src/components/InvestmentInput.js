function InvestmentInput({ amount, onAmountChange }) {
  return (
    <div className="field">
      <label className="label" htmlFor="amount-input">
        Investment Amount
      </label>
      <div className="input-wrapper">
        <span className="input-prefix">$</span>
        <input
          id="amount-input"
          type="number"
          className="input input-with-prefix"
          placeholder="10,000"
          min="0"
          step="100"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export default InvestmentInput;
