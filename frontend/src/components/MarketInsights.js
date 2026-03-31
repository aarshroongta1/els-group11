import { useState, useEffect } from "react";

const API_BASE_URL = "/api";

// Relative time formatter
function timeAgo(dateStr) {
  if (!dateStr) return "";
  // Alpha Vantage format: "20260326T143000"
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const hour = dateStr.substring(9, 11);
  const min = dateStr.substring(11, 13);
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${min}:00Z`);

  if (isNaN(parsed.getTime())) return "";

  const now = new Date();
  const diffMs = now - parsed;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function sentimentClass(label) {
  if (!label) return "neutral";
  const l = label.toLowerCase();
  if (l.includes("bullish")) return "bullish";
  if (l.includes("bearish")) return "bearish";
  return "neutral";
}

function sentimentDisplay(label) {
  if (!label) return "Neutral";
  const l = label.toLowerCase();
  if (l.includes("strongly") && l.includes("bullish")) return "Strong Buy";
  if (l.includes("bullish")) return "Bullish";
  if (l.includes("strongly") && l.includes("bearish")) return "Strong Sell";
  if (l.includes("bearish")) return "Bearish";
  return "Neutral";
}


function MarketInsights() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/news`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && data.length > 0) {
          setArticles(data);
          setIsLive(true);
        } else {
          setArticles([]);
          setIsLive(false);
        }
      })
      .catch((err) => {
        console.error("MarketInsights fetch failed:", err);
        setArticles([]);
        setIsLive(false);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mi">
        <div className="mi-skeleton">
          <div className="mi-skeleton-bar" style={{ width: "60%" }} />
          <div className="mi-skeleton-bar" style={{ width: "40%" }} />
          <div className="mi-skeleton-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="mi-skeleton-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!loading && articles.length === 0) {
    return (
      <div className="mi">
        <div className="mi-header">
          <div className="mi-header-left">
            <div className="mi-title-row">
              <h2 className="mi-title">Market Insights</h2>
            </div>
            <p className="mi-date">{today}</p>
          </div>
        </div>
        <div className="mi-empty">
          <p>Live market news is temporarily unavailable. Check back shortly.</p>
        </div>
      </div>
    );
  }

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="mi">
      {/* Header */}
      <div className="mi-header">
        <div className="mi-header-left">
          <div className="mi-title-row">
            <h2 className="mi-title">Market Insights</h2>
            {isLive && (
              <span className="mi-live-badge">
                <span className="mi-live-dot" />
                Live
              </span>
            )}
          </div>
          <p className="mi-date">{today}</p>
        </div>
      </div>

      {/* Featured Article */}
      {featured && (
        <a
          href={featured.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mi-featured"
        >
          <div className="mi-featured-content">
            <div className="mi-featured-meta">
              <span
                className={`mi-sentiment mi-sentiment--${sentimentClass(featured.sentiment)}`}
              >
                {sentimentDisplay(featured.sentiment)}
              </span>
              <span className="mi-source">{featured.source}</span>
              {featured.publishedAt && (
                <span className="mi-time">{timeAgo(featured.publishedAt)}</span>
              )}
            </div>
            <h3 className="mi-featured-title">{featured.title}</h3>
            {featured.summary && (
              <p className="mi-featured-summary">
                {featured.summary.length > 160
                  ? featured.summary.substring(0, 160) + "..."
                  : featured.summary}
              </p>
            )}
            <span className="mi-read-more">
              Read full article
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </div>
          {featured.image && (
            <div className="mi-featured-image-wrap">
              <img
                src={featured.image}
                alt=""
                className="mi-featured-image"
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>
          )}
        </a>
      )}

      {/* Article Grid */}
      <div className="mi-grid">
        {rest.map((article, idx) => (
          <a
            key={idx}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mi-card"
            style={{ animationDelay: `${0.1 + idx * 0.06}s` }}
          >
            <div className="mi-card-meta">
              <span
                className={`mi-sentiment mi-sentiment--${sentimentClass(article.sentiment)}`}
              >
                {sentimentDisplay(article.sentiment)}
              </span>
              {article.publishedAt && (
                <span className="mi-time">{timeAgo(article.publishedAt)}</span>
              )}
            </div>
            <h4 className="mi-card-title">{article.title}</h4>
            <span className="mi-source">{article.source}</span>
          </a>
        ))}
      </div>

      {/* Sentiment bar */}
      {articles.length > 1 && <SentimentBar articles={articles} />}
    </div>
  );
}

function SentimentBar({ articles }) {
  const scores = articles
    .map((a) => parseFloat(a.sentimentScore))
    .filter((s) => !isNaN(s));
  if (scores.length === 0) return null;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const bullish = scores.filter((s) => s > 0.1).length;
  const bearish = scores.filter((s) => s < -0.1).length;
  const neutral = scores.length - bullish - bearish;

  const bullPct = (bullish / scores.length) * 100;
  const neutralPct = (neutral / scores.length) * 100;
  const bearPct = (bearish / scores.length) * 100;

  const overallLabel =
    avg > 0.15
      ? "Bullish"
      : avg < -0.15
        ? "Bearish"
        : avg > 0.05
          ? "Slightly Bullish"
          : avg < -0.05
            ? "Slightly Bearish"
            : "Neutral";

  const overallColor =
    avg > 0.1 ? "#2e7a3a" : avg < -0.1 ? "#a84848" : "#6B7C93";

  return (
    <div className="mi-sentiment-bar">
      <div className="mi-sentiment-bar-header">
        <span className="mi-sentiment-bar-label">Market Mood</span>
        <span className="mi-sentiment-bar-overall" style={{ color: overallColor }}>
          {overallLabel}
        </span>
      </div>
      <div className="mi-sentiment-track">
        {bearPct > 0 && (
          <div
            className="mi-sentiment-fill mi-sentiment-fill--bear"
            style={{ width: `${bearPct}%` }}
          />
        )}
        {neutralPct > 0 && (
          <div
            className="mi-sentiment-fill mi-sentiment-fill--neutral"
            style={{ width: `${neutralPct}%` }}
          />
        )}
        {bullPct > 0 && (
          <div
            className="mi-sentiment-fill mi-sentiment-fill--bull"
            style={{ width: `${bullPct}%` }}
          />
        )}
      </div>
      <div className="mi-sentiment-legend">
        <span>
          <span className="mi-legend-dot mi-legend-dot--bear" />
          Bearish ({bearish})
        </span>
        <span>
          <span className="mi-legend-dot mi-legend-dot--neutral" />
          Neutral ({neutral})
        </span>
        <span>
          <span className="mi-legend-dot mi-legend-dot--bull" />
          Bullish ({bullish})
        </span>
      </div>
    </div>
  );
}

export default MarketInsights;
