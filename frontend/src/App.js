import { useState, useEffect } from 'react';
import FundSelector from './components/FundSelector';
import InvestmentInput from './components/InvestmentInput';
import TimeHorizonInput from './components/TimeHorizonInput';
import ResultsCard from './components/ResultsCard';
import './App.css';

const API_BASE_URL = 'http://localhost:8080/api';

function App() {
  const [funds, setFunds] = useState([]);
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [amount, setAmount] = useState('');
  const [years, setYears] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch mutual funds on component mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/funds`)
      .then(res => res.json())
      .then(data => setFunds(data))
      .catch(err => setError('Failed to load mutual funds'));
  }, []);

  const handleAddFund = (ticker) => {
    setSelectedFunds((prev) => [...prev, ticker]);
  };

  const handleRemoveFund = (ticker) => {
    setSelectedFunds((prev) => prev.filter((t) => t !== ticker));
    setResults((prev) => prev.filter((r) => r.fundTicker !== ticker));
  };

  const isFormValid =
    selectedFunds.length > 0 &&
    amount &&
    years &&
    parseFloat(amount) > 0 &&
    parseFloat(years) > 0;

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);

    try {
      const allResults = await Promise.all(
        selectedFunds.map(async (ticker) => {
          const response = await fetch(
            `${API_BASE_URL}/calculate?ticker=${ticker}&amount=${amount}&years=${years}`
          );
          const data = await response.json();
          const returnPct = ((data.futureValue - data.principal) / data.principal) * 100;
          const annualReturn = data.expectedReturn;
          const numYears = data.years;
          const principal = data.principal;

          // Build year-by-year growth data for the chart
          const yearlyData = [];
          for (let y = 0; y <= numYears; y++) {
            yearlyData.push({
              year: y,
              value: principal * Math.exp(annualReturn * y)
            });
          }

          return {
            futureValue: data.futureValue,
            fundTicker: data.ticker,
            initialAmount: principal,
            years: numYears,
            returnPct,
            expectedReturn: data.expectedReturn,
            beta: data.beta,
            riskFreeRate: data.riskFreeRate,
            yearlyData
          };
        })
      );
      setResults(allResults);
    } catch (err) {
      setError('Failed to calculate future value');
    } finally {
      setLoading(false);
    }
  };
// recommendation button onclick
const handleRecommend = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch(`${API_BASE_URL}/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        riskLevel: "medium" // you can later replace this with user input
      })
    });

    const data = await response.json();
    console.log(data);

    alert(
      "Recommended Funds: " +
      data.recommendedFunds.join(", ") +
      "\n\n" +
      data.explanation
    );

  } catch (err) {
    setError("Failed to get recommendation");
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="app">
      <nav className="navbar">
        <h1 className="navbar-title">Mutual Funds Calculator</h1>
      </nav>

      <div className="app-content">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <span className="sidebar-label">Investment Details</span>
            <div className="decorative-line" aria-hidden="true" />
          </div>

          <div className="form">
            <FundSelector
              funds={funds}
              selectedFunds={selectedFunds}
              onAddFund={handleAddFund}
              onRemoveFund={handleRemoveFund}
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
            <button
              className="button button-secondary"
              disabled={loading}
              onClick={handleRecommend}
            >
              Get Recommendation
            </button>

            {error && <div className="error">{error}</div>}
          </div>
        </aside>


        <main className="main-panel">
          {results.length > 0 ? (
            <div className="fund-columns">
              {results.map((result) => (
                <ResultsCard key={result.fundTicker} result={result} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b8b2a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <p className="empty-state-text">Select up to 3 funds and enter your investment details to compare projected returns side by side.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
