import { useState, useEffect } from 'react';
import FundSelector from './components/FundSelector';
import InvestmentInput from './components/InvestmentInput';
import TimeHorizonInput from './components/TimeHorizonInput';
import ResultsCard from './components/ResultsCard';
import './App.css';

const API_BASE_URL = 'http://localhost:8080/api';

function App() {
  const [funds, setFunds] = useState([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [amount, setAmount] = useState('');
  const [years, setYears] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch mutual funds on component mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/funds`)
      .then(res => res.json())
      .then(data => setFunds(data))
      .catch(err => setError('Failed to load mutual funds'));
  }, []);

  const isFormValid =
    selectedFund &&
    amount &&
    years &&
    parseFloat(amount) > 0 &&
    parseFloat(years) > 0;

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/calculate?ticker=${selectedFund}&amount=${amount}&years=${years}`
      );
      const data = await response.json();
      
      // Transform backend response to match ResultsCard format
      const returnPct = ((data.futureValue - data.principal) / data.principal) * 100;
      
      setResult({
        futureValue: data.futureValue,
        fundTicker: data.ticker,
        initialAmount: data.principal,
        years: data.years,
        returnPct: returnPct
      });
    } catch (err) {
      setError('Failed to calculate future value');
    } finally {
      setLoading(false);
    }
  };

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
            funds={funds}
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
            disabled={!isFormValid || loading}
            onClick={handleCalculate}
          >
            {loading ? 'Calculating...' : 'Calculate Future Value'}
          </button>

          {error && <div className="error">{error}</div>}
        </div>

        {result && <ResultsCard result={result} />}
      </div>
    </div>
  );
}

export default App;
