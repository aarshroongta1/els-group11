import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import FundSelector from "./components/FundSelector";
import InvestmentInput from "./components/InvestmentInput";
import TimeHorizonInput from "./components/TimeHorizonInput";
import ResultsCard from "./components/ResultsCard";
import PortfolioView from "./components/PortfolioView";
import Navbar from "./components/Navbar";
import AuthPage from "./components/AuthPage";
import "./App.css";

const API_BASE_URL = "http://localhost:8080/api";

function App() {
  const [funds, setFunds] = useState([]);
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [timeUnit, setTimeUnit] = useState("years");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [currentView, setCurrentView] = useState("calculator");

  // Fetch mutual funds on component mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/funds`)
      .then((res) => res.json())
      .then((data) => setFunds(data))
      .catch((err) => setError("Failed to load mutual funds"));
  }, []);

  // Auth session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSessionLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentView("calculator");
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const handleSignIn = () => {
    setCurrentView("auth");
  };

  const handleAuthSuccess = () => {
    setCurrentView("portfolio");
  };

  const handleSaveInvestment = async (result) => {
    const fund = funds.find((f) => f.ticker === result.fundTicker);
    const { error } = await supabase.from("investments").insert({
      user_id: user.id,
      ticker: result.fundTicker,
      fund_name: fund?.name || result.fundTicker,
      amount: result.initialAmount,
      years: result.years,
      future_value: result.futureValue,
      expected_return: result.expectedReturn,
      beta: result.beta,
      return_pct: result.returnPct,
    });
    if (error) throw error;
  };

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
  const renderCalculator = () => (
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
          <div className="fund-columns">
            {results.map((result) => (
              <ResultsCard key={result.fundTicker} result={result} user={user} onSave={handleSaveInvestment} onNavigate={handleViewChange} />
            ))}
          </div>
        ) : (
          <div className="welcome">
            {user && (
              <h1 className="welcome-greeting">
                {(() => {
                  const hour = new Date().getHours();
                  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
                  const name = user.email.split("@")[0].charAt(0).toUpperCase() + user.email.split("@")[0].slice(1);
                  return `${greeting}, ${name}!`;
                })()}
              </h1>
            )}
            <h2 className="welcome-heading">
              Select a fund to see projected returns.
            </h2>

            <div className="welcome-header">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9a9488"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <span className="welcome-label">Market Insights</span>
            </div>
            <div className="insights-row">
              <a
                className="insight-card"
                href="https://www.reuters.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="insight-sentiment insight-sentiment--bullish">
                  Bullish
                </span>
                <p className="insight-headline">
                  S&P 500 Index Funds See Record Inflows as Investors Bet on
                  Continued Growth
                </p>
                <span className="insight-source">Reuters</span>
              </a>
              <a
                className="insight-card"
                href="https://www.cnbc.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="insight-sentiment insight-sentiment--neutral">
                  Neutral
                </span>
                <p className="insight-headline">
                  Fed Holds Rates Steady, Markets Weigh Impact on Bond and
                  Equity Funds
                </p>
                <span className="insight-source">CNBC</span>
              </a>
              <a
                className="insight-card"
                href="https://www.bloomberg.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="insight-sentiment insight-sentiment--bullish">
                  Bullish
                </span>
                <p className="insight-headline">
                  Vanguard and Fidelity Lead Mutual Fund Industry With
                  Low-Cost Offerings
                </p>
                <span className="insight-source">Bloomberg</span>
              </a>
              <a
                className="insight-card"
                href="https://www.wsj.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="insight-sentiment insight-sentiment--bearish">
                  Bearish
                </span>
                <p className="insight-headline">
                  International Fund Managers Warn of Emerging Market
                  Volatility Ahead
                </p>
                <span className="insight-source">WSJ</span>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );

  const renderMainContent = () => {
    if (currentView === "auth") {
      return <AuthPage onAuthSuccess={handleAuthSuccess} />;
    }
    if (currentView === "portfolio") {
      return <PortfolioView user={user} onSignIn={() => setCurrentView("auth")} />;
    }
    return renderCalculator();
  };

  if (sessionLoading) {
    return null;
  }

  return (
    <div className="app">
      <Navbar
        user={user}
        currentView={currentView}
        onViewChange={handleViewChange}
        onSignOut={handleSignOut}
        onSignIn={handleSignIn}
      />

      {renderMainContent()}
    </div>
  );
}

export default App;
