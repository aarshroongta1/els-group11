import { useState } from 'react';
import FundSelector from './components/FundSelector';
import InvestmentInput from './components/InvestmentInput';
import TimeHorizonInput from './components/TimeHorizonInput';
import './App.css';

function App() {
  const [selectedFund, setSelectedFund] = useState('');
  const [amount, setAmount] = useState('');
  const [years, setYears] = useState('');

  const isFormValid =
    selectedFund &&
    amount &&
    years &&
    parseFloat(amount) > 0 &&
    parseFloat(years) > 0;

  return (
    <div className="app">
      <div className="card">
        <header className="header">
          <h1 className="greeting">Mutual Fund<br />Calculator</h1>
          <p className="subtitle">Estimate your investment growth using a CAPM-based projection model.</p>
          <div className="decorative-line" aria-hidden="true" />
        </header>

        <div className="form">
          <FundSelector
            funds={[]}
            selectedFund={selectedFund}
            onFundChange={setSelectedFund}
          />
          <InvestmentInput
            amount={amount}
            onAmountChange={setAmount}
          />
          <TimeHorizonInput
            years={years}
            onYearsChange={setYears}
          />

          <button
            className="button"
            disabled={!isFormValid}
          >
            Calculate Future Value
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
