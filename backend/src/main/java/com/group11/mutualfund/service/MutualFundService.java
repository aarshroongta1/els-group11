package com.group11.mutualfund.service;

import com.group11.mutualfund.dto.BetaResponse;
import com.group11.mutualfund.dto.FutureValueResponse;
import com.group11.mutualfund.model.MutualFund;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
public class MutualFundService {

    private final WebClient newtonClient;
    private final WebClient alphaVantageClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private List<Map<String, String>> newsCache = null;
    private long newsCacheTimestamp = 0;
    private static final long NEWS_CACHE_TTL = 300_000; // 5 minutes

    private static final String ALPHA_VANTAGE_API_KEY = "7MLN1V774I3VMJ07";

    // Hardcoded risk-free rate (US Treasury 10-year rate)
    private static final double RISK_FREE_RATE = 0.0435; // 4.35% as of Feb 2026
    
    // 2025 returns sourced from Yahoo Finance: close 12/31/2024 → close 12/31/2025
    private static final List<MutualFund> MUTUAL_FUNDS = Arrays.asList(
        // MUTUAL FUNDS
        new MutualFund("VSMPX", "Vanguard Total Stock Market Index Fund Institutional Plus", 0.1573, "Mutual Fund"),
        new MutualFund("FXAIX", "Fidelity 500 Index Fund", 0.1642, "Mutual Fund"),
        new MutualFund("VFIAX", "Vanguard 500 Index Fund Admiral", 0.1641, "Mutual Fund"),
        new MutualFund("VTSAX", "Vanguard Total Stock Market Index Fund Admiral", 0.1572, "Mutual Fund"),
        new MutualFund("VGTSX", "Vanguard Total International Stock Index Fund Investor", 0.2786, "Mutual Fund"),
        new MutualFund("FCTDX", "Fidelity Strategic Advisers Fidelity US Total Stk", 0.1349, "Mutual Fund"),
        new MutualFund("VIIIX", "Vanguard Institutional Index Fund Inst Plus", 0.1528, "Mutual Fund"),
        new MutualFund("VTBNX", "Vanguard Total Bond Market II Index Fund Institutional", 0.0299, "Mutual Fund"),
        new MutualFund("AGTHX", "American Funds Growth Fund of America A", 0.0806, "Mutual Fund"),
        new MutualFund("VTBIX", "Vanguard Total Bond Market II Index Fund Investor", 0.0299, "Mutual Fund"),
        new MutualFund("FCNTX", "Fidelity Contrafund", 0.1555, "Mutual Fund"),
        new MutualFund("PIMIX", "PIMCO Income Fund Institutional", 0.0447, "Mutual Fund"),
        new MutualFund("TRBCX", "T. Rowe Price Blue Chip Growth Fund", 0.1292, "Mutual Fund"),
        new MutualFund("FDGRX", "Fidelity Growth Discovery Fund", 0.1854, "Mutual Fund"),
        new MutualFund("FBGRX", "Fidelity Blue Chip Growth Fund", 0.1755, "Mutual Fund"),
        new MutualFund("FOCPX", "Fidelity OTC Portfolio", 0.1309, "Mutual Fund"),
        new MutualFund("FBALX", "Fidelity Balanced Fund", 0.0869, "Mutual Fund"),
        new MutualFund("DODGX", "Dodge & Cox Stock Fund", 0.0321, "Mutual Fund"),
        new MutualFund("OAKMX", "Oakmark Fund", 0.1309, "Mutual Fund"),
        new MutualFund("SWPPX", "Schwab S&P 500 Index Fund", 0.1658, "Mutual Fund"),
        new MutualFund("VIMAX", "Vanguard Mid-Cap Index Fund Admiral", 0.0994, "Mutual Fund"),
        new MutualFund("VSMAX", "Vanguard Small-Cap Index Fund Admiral", 0.0731, "Mutual Fund"),
        new MutualFund("VWUSX", "Vanguard U.S. Growth Fund", 0.0545, "Mutual Fund"),
        new MutualFund("VIGAX", "Vanguard Growth Index Fund Admiral", 0.1890, "Mutual Fund"),

        // ETFs
        new MutualFund("SPY", "SPDR S&P 500 ETF Trust", 0.1635, "ETF"),
        new MutualFund("QQQ", "Invesco QQQ Trust (Nasdaq-100)", 0.2016, "ETF"),
        new MutualFund("VTI", "Vanguard Total Stock Market ETF", 0.1569, "ETF"),
        new MutualFund("IWM", "iShares Russell 2000 ETF", 0.1140, "ETF"),
        new MutualFund("EEM", "iShares MSCI Emerging Markets ETF", 0.3082, "ETF"),
        new MutualFund("VEA", "Vanguard FTSE Developed Markets ETF", 0.3064, "ETF"),
        new MutualFund("AGG", "iShares Core U.S. Aggregate Bond ETF", 0.0308, "ETF"),
        new MutualFund("GLD", "SPDR Gold Shares", 0.6368, "ETF"),
        new MutualFund("XLF", "Financial Select Sector SPDR Fund", 0.1333, "ETF"),
        new MutualFund("XLK", "Technology Select Sector SPDR Fund", 0.2383, "ETF"),
        new MutualFund("VOO", "Vanguard S&P 500 ETF", 0.1639, "ETF"),
        new MutualFund("DIA", "SPDR Dow Jones Industrial Average ETF", 0.1294, "ETF"),
        new MutualFund("VXUS", "Vanguard Total International Stock ETF", 0.2802, "ETF"),
        new MutualFund("BND", "Vanguard Total Bond Market ETF", 0.0300, "ETF"),
        new MutualFund("VNQ", "Vanguard Real Estate ETF", -0.0066, "ETF"),
        new MutualFund("VIG", "Vanguard Dividend Appreciation ETF", 0.1223, "ETF"),
        new MutualFund("VYM", "Vanguard High Dividend Yield ETF", 0.1249, "ETF"),
        new MutualFund("VB", "Vanguard Small-Cap ETF", 0.0735, "ETF"),
        new MutualFund("VO", "Vanguard Mid-Cap ETF", 0.0988, "ETF"),
        new MutualFund("IEMG", "iShares Core MSCI Emerging Markets ETF", 0.2872, "ETF"),
        new MutualFund("IJH", "iShares Core S&P Mid-Cap ETF", 0.0592, "ETF"),
        new MutualFund("IJR", "iShares Core S&P Small-Cap ETF", 0.0430, "ETF"),
        new MutualFund("TLT", "iShares 20+ Year Treasury Bond ETF", -0.0019, "ETF"),
        new MutualFund("SOXX", "iShares Semiconductor ETF", 0.3975, "ETF"),
        new MutualFund("XLE", "Energy Select Sector SPDR Fund", 0.0439, "ETF"),
        new MutualFund("XLV", "Health Care Select Sector SPDR Fund", 0.1252, "ETF"),
        new MutualFund("XLI", "Industrial Select Sector SPDR Fund", 0.1773, "ETF"),
        new MutualFund("SCHD", "Schwab U.S. Dividend Equity ETF", 0.0040, "ETF"),
        new MutualFund("ARKK", "ARK Innovation ETF", 0.3549, "ETF")
    );
    

    public MutualFundService() {
        this.newtonClient = WebClient.builder()
            .baseUrl("https://api.newtonanalytics.com")
            .build();
        this.alphaVantageClient = WebClient.builder()
            .baseUrl("https://www.alphavantage.co")
            .build();
    }

    /**
     * Get list of all available mutual funds
     */
    public List<MutualFund> getAllMutualFunds() {
        return MUTUAL_FUNDS;
    }

    /**
     * Get beta value for a mutual fund from Newton Analytics API
     */
    public double getBeta(String ticker) {
        try {
            String url = String.format(
                "/stockbeta/?ticker=%s&index=^GSPC&interval=1mo&observations=12",
                ticker
            );

            BetaResponse response = newtonClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(BetaResponse.class)
                .block();

            return response != null && response.getBeta() != null ? response.getBeta() : 1.0;
        } catch (Exception e) {
            System.err.println("Error fetching beta for " + ticker + ": " + e.getMessage());
            return 1.0;
        }
    }

    /**
     * Get expected return for a mutual fund from hardcoded 2025 data
     */
    public double getExpectedReturn(String ticker) {
        return MUTUAL_FUNDS.stream()
            .filter(fund -> fund.getTicker().equals(ticker))
            .findFirst()
            .map(MutualFund::getExpectedReturn)
            .orElse(0.10); // Default 10% if not found
    }

    /**
     * Calculate future value using CAPM
     * Formula: FV = P * e^(r*t)
     * where r = risk_free_rate + beta * (expected_return_rate - risk_free_rate)
     * P = principal (initial investment)
     * t = time in years (supports fractional years)
     */
    public FutureValueResponse calculateFutureValue(String ticker, double principal, double years) {
        // Get beta from Newton Analytics API
        double beta = getBeta(ticker);

        // Get expected return from hardcoded 2025 data
        double expectedReturn = getExpectedReturn(ticker);

        // Calculate rate using CAPM: r = rf + β(rm - rf)
        double rate = RISK_FREE_RATE + beta * (expectedReturn - RISK_FREE_RATE);

        // Calculate future value using continuous compounding
        double futureValue = principal * Math.exp(rate * years);
        
        return new FutureValueResponse(
            futureValue,
            principal,
            rate,
            years,
            ticker,
            beta,
            expectedReturn,
            RISK_FREE_RATE
        );
    }

    /**
     * Fetch financial market news from Alpha Vantage NEWS_SENTIMENT API.
     * Falls back to empty list if API limit is hit.
     */
    public List<Map<String, String>> getMarketNews() {
        // Return cached news if still fresh
        if (newsCache != null && (System.currentTimeMillis() - newsCacheTimestamp) < NEWS_CACHE_TTL) {
            System.out.println("Returning cached news (" + newsCache.size() + " articles)");
            return newsCache;
        }

        try {
            String url = String.format(
                "/query?function=NEWS_SENTIMENT&topics=financial_markets&sort=LATEST&limit=6&apikey=%s",
                ALPHA_VANTAGE_API_KEY
            );

            String rawResponse = alphaVantageClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            JsonNode root = objectMapper.readTree(rawResponse);
            JsonNode feed = root.get("feed");

            if (feed != null && feed.isArray() && feed.size() > 0) {
                List<Map<String, String>> articles = new java.util.ArrayList<>();
                for (int i = 0; i < Math.min(feed.size(), 6); i++) {
                    JsonNode article = feed.get(i);
                    Map<String, String> item = new java.util.HashMap<>();
                    item.put("title", article.has("title") ? article.get("title").asText() : "");
                    item.put("url", article.has("url") ? article.get("url").asText() : "");
                    item.put("source", article.has("source") ? article.get("source").asText() : "");
                    item.put("publishedAt", article.has("time_published") ? article.get("time_published").asText() : "");
                    item.put("summary", article.has("summary") ? article.get("summary").asText() : "");
                    item.put("image", article.has("banner_image") ? article.get("banner_image").asText() : "");

                    String sentiment = "Neutral";
                    if (article.has("overall_sentiment_label")) {
                        sentiment = article.get("overall_sentiment_label").asText();
                    }
                    item.put("sentiment", sentiment);

                    double sentimentScore = 0;
                    if (article.has("overall_sentiment_score")) {
                        sentimentScore = article.get("overall_sentiment_score").asDouble();
                    }
                    item.put("sentimentScore", String.format("%.4f", sentimentScore));

                    articles.add(item);
                }
                System.out.println("Fetched " + articles.size() + " news articles from Alpha Vantage");
                newsCache = articles;
                newsCacheTimestamp = System.currentTimeMillis();
                return articles;
            }
        } catch (Exception e) {
            System.err.println("Error fetching news: " + e.getMessage());
        }

        System.out.println("Using fallback: no news articles available");
        return List.of();
    }
}
