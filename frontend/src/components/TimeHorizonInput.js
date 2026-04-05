function TimeHorizonInput({ duration, unit, onDurationChange, onUnitChange }) {
  return (
    <div className="field">
      <label className="label" htmlFor="duration-input">
        Time Horizon <span className="required">*</span>
      </label>
      <div className="time-horizon-row">
        <div className="input-wrapper time-horizon-input">
          <input
            id="duration-input"
            type="number"
            className="input"
            placeholder="Duration"
            min="1"
            step="1"
            value={duration}
            onChange={(e) => onDurationChange(e.target.value)}
          />
        </div>
        <div className="time-unit-toggle">
          {['days', 'months', 'years'].map((u) => (
            <button
              key={u}
              type="button"
              className={`time-unit-btn ${unit === u ? 'time-unit-btn--active' : ''}`}
              onClick={() => onUnitChange(u)}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TimeHorizonInput;
