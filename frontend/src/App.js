import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import FundSelector from "./components/FundSelector";
import InvestmentInput from "./components/InvestmentInput";
import TimeHorizonInput from "./components/TimeHorizonInput";
import ResultsCard from "./components/ResultsCard";
import PortfolioView from "./components/PortfolioView";
import Navbar from "./components/Navbar";
import AuthPage from "./components/AuthPage";
import StressTest from "./components/StressTest";
import MarketInsights from "./components/MarketInsights";
import ChatBot from "./components/ChatBot";
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
  const [riskLevel, setRiskLevel] = useState("medium");
  const [recommendation, setRecommendation] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);

  const handlePortfolioChange = useCallback((data) => {
    setPortfolioData(data);
  }, []);

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
    // Fetch current price for unit calculation
    const priceRes = await fetch(`${API_BASE_URL}/price/${result.fundTicker}`);
    const priceJson = await priceRes.json();
    const currentPrice = priceJson.currentPrice;
    const units = result.initialAmount / currentPrice;

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: 'buy',
      date: new Date().toISOString(),
      ticker: result.fundTicker,
      fund_name: fund?.name || result.fundTicker,
      amount: result.initialAmount,
      price_per_unit: currentPrice,
      units: units,
      expected_return: result.expectedReturn,
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

          if (data.futureValue == null || data.principal == null || data.expectedReturn == null || data.beta == null) {
            throw new Error(`Missing data from API for ${ticker}`);
          }

          const futureValue = data.futureValue;
          const principal = data.principal;
          const annualReturn = data.expectedReturn;
          const numYears = data.years;

          const returnPct = principal > 0
            ? ((futureValue - principal) / principal) * 100
            : 0;

          // Build year-by-year growth data for the chart
          const yearlyData = [];
          
          if (numYears < 1) {
            // For less than 1 year, create monthly data points
            const months = Math.ceil(numYears * 12);
            for (let m = 0; m <= months; m++) {
              const yearFraction = (m / 12);
              yearlyData.push({
                year: yearFraction,
                value: principal * Math.exp(annualReturn * yearFraction),
              });
            }
          } else {
            // For 1+ years, create yearly data points
            for (let y = 0; y <= Math.ceil(numYears); y++) {
              const actualYear = Math.min(y, numYears);
              yearlyData.push({
                year: actualYear,
                value: principal * Math.exp(annualReturn * actualYear),
              });
            }
          }

          return {
            futureValue,
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
      const projectedReturns = {};
      results.forEach((r) => {
        projectedReturns[r.fundTicker] = r.futureValue;
      });

      const response = await fetch(`${API_BASE_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          years: getYears(),
          riskLevel: riskLevel,
          projectedReturns: projectedReturns
        })
      });

      if (!response.ok) {
        throw new Error("Recommendation service unavailable");
      }
      const data = await response.json();
      setRecommendation(data);
    } catch (err) {
      setError(err.message || "Failed to get recommendation");
    } finally {
      setLoading(false);
    }
  };

  const chatbotContext = {
    currentView,
    selectedFunds,
    amount: amount ? parseFloat(amount) : null,
    years: getYears() || null,
    riskLevel,
    recommendedFunds:
      recommendation?.recommendedFunds?.map((fund) =>
        typeof fund === "string" ? fund : fund.name,
      ) ?? [],
    portfolioPositions: portfolioData?.portfolioPositions ?? [],
    portfolioMetrics: portfolioData?.portfolioMetrics ?? null,
  };

  const recommendationIntro =
    recommendation?.explanation ||
    `These are the funds we recommend based on your ${riskLevel} risk level, ${getYears()} year time horizon, and the overall fit of each fund.`;
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
          <div className="field">
            <label className="label">
              Risk Level <span className="required">*</span>
            </label>
            <select
              className="input"
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

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
        {results.length > 0 || recommendation ? (
          <div className="results-section">
            {recommendation && (
              <div className="recommendation-panel">
                <h3 className="recommendation-header">Recommended Funds</h3>
                <p className="recommendation-intro">{recommendationIntro}</p>
                <div className="recommendation-content">
                  {recommendation.recommendedFunds?.map((fundObj, index) => {
                    const fundName = typeof fundObj === "string" ? fundObj : fundObj.name;
                    const fundExplanation = typeof fundObj === "string" ? "" : fundObj.explanation;
                    const fitScore = typeof fundObj === "string" ? null : fundObj.fitScore;
                    return (
                      <div key={index} className="recommendation-item">
                        <div className="recommendation-item-top">
                          <span className="recommendation-rank">Top pick {index + 1}</span>
                          {fitScore != null && (
                            <span className="recommendation-score">Fit Score {fitScore}</span>
                          )}
                          <strong className="recommendation-fund-name">{fundName}</strong>
                        </div>
                        {fundExplanation && (
                          <p className="recommendation-text">{fundExplanation}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {recommendation.warnings?.length > 0 && (
                  <div className="recommendation-warnings">
                    {recommendation.warnings.map((warning) => (
                      <p key={warning} className="recommendation-warning">{warning}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {results.length > 0 && (
              <div className="fund-columns">
                {results.map((result) => (
                  <ResultsCard key={result.fundTicker} result={result} user={user} onSave={handleSaveInvestment} onNavigate={handleViewChange} />
                ))}
              </div>
            )}
            {results.length > 0 && <StressTest results={results} />}
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

            <MarketInsights />
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
      return <PortfolioView user={user} onSignIn={() => setCurrentView("auth")} onPortfolioChange={handlePortfolioChange} />;
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
      <ChatBot context={chatbotContext} />
    </div>
  );
}

export default App;
