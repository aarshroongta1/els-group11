import { useState, useEffect } from "react";
import FundSelector from "./components/FundSelector";
import InvestmentInput from "./components/InvestmentInput";
import TimeHorizonInput from "./components/TimeHorizonInput";
import ResultsCard from "./components/ResultsCard";
import StressTest from "./components/StressTest";
import MarketInsights from "./components/MarketInsights";
import "./App.css";

const API_BASE_URL = "/api";

function App() {
  const [funds, setFunds] = useState([]);
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [timeUnit, setTimeUnit] = useState("years");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch mutual funds on component mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/funds`)
      .then((res) => res.json())
      .then((data) => setFunds(data))
      .catch((err) => setError("Failed to load mutual funds"));
  }, []);

  const handleAddFund = (ticker) => {
    setSelectedFunds((prev) => [...prev, ticker]);
  };

  const handleRemoveFund = (ticker) => {
    setSelectedFunds((prev) => prev.filter((t) => t !== ticker));
    setResults((prev) => prev.filter((r) => r.fundTicker !== ticker));
  };

  // Convert duration to years for the API
  const getYears = () => {
    const val = parseFloat(duration);
    if (!val || val <= 0) return 0;
    if (timeUnit === "months") return val / 12;
    if (timeUnit === "days") return val / 365;
    return val;
  };

  const isFormValid =
    selectedFunds.length > 0 &&
    amount &&
    duration &&
    parseFloat(amount) > 0 &&
    getYears() > 0;

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);

    try {
      const allResults = await Promise.all(
        selectedFunds.map(async (ticker) => {
          const response = await fetch(
            `${API_BASE_URL}/calculate?ticker=${ticker}&amount=${amount}&years=${getYears()}`,
          );
          const data = await response.json();
          const returnPct =
            ((data.futureValue - data.principal) / data.principal) * 100;
          const annualReturn = data.expectedReturn;
          const numYears = data.years;
          const principal = data.principal;

          // Build year-by-year growth data for the chart
          const yearlyData = [];
          for (let y = 0; y <= numYears; y++) {
            yearlyData.push({
              year: y,
              value: principal * Math.exp(annualReturn * y),
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
            yearlyData,
          };
        }),
      );
      setResults(allResults);
    } catch (err) {
      setError("Failed to calculate future value");
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          riskLevel: "medium", // you can later replace this with user input
        }),
      });

      const data = await response.json();
      console.log(data);

      alert(
        "Recommended Funds: " +
          data.recommendedFunds.join(", ") +
          "\n\n" +
          data.explanation,
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
            <InvestmentInput amount={amount} onAmountChange={setAmount} />
            <TimeHorizonInput
              duration={duration}
              unit={timeUnit}
              onDurationChange={setDuration}
              onUnitChange={setTimeUnit}
            />

            <button
              className="button"
              disabled={!isFormValid || loading}
              onClick={handleCalculate}
            >
              {loading ? "Calculating..." : "Calculate Future Value"}
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
            <div className="results-section">
              <div className="fund-columns">
                {results.map((result) => (
                  <ResultsCard key={result.fundTicker} result={result} />
                ))}
              </div>
              <StressTest results={results} />
            </div>
          ) : (
            <div className="welcome">
              <h2 className="welcome-heading">
                Select a fund to see projected returns.
              </h2>
              <MarketInsights />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
