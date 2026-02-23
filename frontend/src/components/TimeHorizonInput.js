function TimeHorizonInput({ years, onYearsChange }) {
  return (
    <div className="field">
      <label className="label" htmlFor="years-input">
        Time Horizon
      </label>
      <div className="input-wrapper">
        <input
          id="years-input"
          type="number"
          className="input input-with-suffix"
          placeholder="10"
          min="1"
          max="50"
          step="1"
          value={years}
          onChange={(e) => onYearsChange(e.target.value)}
        />
        <span className="input-suffix">years</span>
      </div>
    </div>
  );
}

export default TimeHorizonInput;
