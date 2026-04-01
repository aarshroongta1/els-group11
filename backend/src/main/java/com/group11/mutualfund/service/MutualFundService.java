package com.group11.mutualfund.service;

import com.group11.mutualfund.dto.BetaResponse;
import com.group11.mutualfund.dto.FutureValueResponse;
import com.group11.mutualfund.dto.HistoricalPerformanceResponse;
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
    private static final long NEWS_CACHE_TTL = 3_600_000; // 1 hour

    private static final String ALPHA_VANTAGE_API_KEY = "7MLN1V774I3VMJ07";

    // Hardcoded risk-free rate (US Treasury 10-year rate)
    private static final double RISK_FREE_RATE = 0.0435; // 4.35% as of Feb 2026
    
    // All fund data sourced from Yahoo Finance quoteSummary API via yfinance (March 2026)
    // Constructor: ticker, name, expectedReturn, type, stdDev, expenseRatio, divYield, sharpe, return1Y, return3Y, return5Y
    private static final List<MutualFund> MUTUAL_FUNDS = Arrays.asList(
        // MUTUAL FUNDS
        new MutualFund("VSMPX", "Vanguard Total Stock Market Index Fund Institutional Plus", 0.1573, "Mutual Fund", 0.1537, 0.000200, 0.0112, 0.63, 0.170543, 0.209307, 0.126851),
        new MutualFund("FXAIX", "Fidelity 500 Index Fund", 0.1642, "Mutual Fund", 0.1508, 0.000150, 0.0111, 0.73, 0.169773, 0.217912, 0.141753),
        new MutualFund("VFIAX", "Vanguard 500 Index Fund Admiral", 0.1641, "Mutual Fund", 0.1508, 0.000400, 0.0111, 0.73, 0.169429, 0.217538, 0.141413),
        new MutualFund("VTSAX", "Vanguard Total Stock Market Index Fund Admiral", 0.1572, "Mutual Fund", 0.1537, 0.000400, 0.0110, 0.63, 0.170338, 0.209070, 0.126629),
        new MutualFund("VGTSX", "Vanguard Total International Stock Index Fund Investor", 0.2786, "Mutual Fund", 0.1446, 0.001700, 0.0276, 0.48, 0.398023, 0.197370, 0.097320),
        new MutualFund("FCTDX", "Fidelity Strategic Advisers Fidelity US Total Stk", 0.1349, "Mutual Fund", 0.1485, 0.002100, 0.0088, 0.69, 0.193163, 0.217218, 0.133498),
        new MutualFund("VIIIX", "Vanguard Institutional Index Fund Inst Plus", 0.1528, "Mutual Fund", 0.1508, 0.000200, 0.0113, 0.73, 0.169673, 0.217784, 0.141647),
        new MutualFund("VTBNX", "Vanguard Total Bond Market II Index Fund Institutional", 0.0299, "Mutual Fund", 0.0629, 0.000200, 0.0393, -0.47, 0.061334, 0.051054, 0.004017),
        new MutualFund("AGTHX", "American Funds Growth Fund of America A", 0.0806, "Mutual Fund", 0.1764, 0.005900, 0.0027, 0.49, 0.164393, 0.244859, 0.110648),
        new MutualFund("VTBIX", "Vanguard Total Bond Market II Index Fund Investor", 0.0299, "Mutual Fund", 0.0629, 0.000900, 0.0386, -0.48, 0.060595, 0.050321, 0.003316),
        new MutualFund("FCNTX", "Fidelity Contrafund", 0.1555, "Mutual Fund", 0.1673, 0.007400, 0.0000, 0.75, 0.186898, 0.302658, 0.156416),
        new MutualFund("PIMIX", "PIMCO Income Fund Institutional", 0.0447, "Mutual Fund", 0.0543, 0.005400, 0.0588, 0.17, 0.098487, 0.087465, 0.043127),
        new MutualFund("TRBCX", "T. Rowe Price Blue Chip Growth Fund", 0.1292, "Mutual Fund", 0.1974, 0.007000, 0.0000, 0.42, 0.122598, 0.280031, 0.101452),
        new MutualFund("FDGRX", "Fidelity Growth Discovery Fund", 0.1854, "Mutual Fund", 0.2067, 0.006900, 0.0000, 0.61, 0.301831, 0.326301, 0.148738),
        new MutualFund("FBGRX", "Fidelity Blue Chip Growth Fund", 0.1755, "Mutual Fund", 0.2148, 0.006100, 0.0000, 0.53, 0.204519, 0.315547, 0.131511),
        new MutualFund("FOCPX", "Fidelity OTC Portfolio", 0.1309, "Mutual Fund", 0.1847, 0.007300, 0.0000, 0.63, 0.265231, 0.304200, 0.142720),
        new MutualFund("FBALX", "Fidelity Balanced Fund", 0.0869, "Mutual Fund", 0.1172, 0.004600, 0.0170, 0.55, 0.161539, 0.169071, 0.095698),
        new MutualFund("DODGX", "Dodge & Cox Stock Fund", 0.0321, "Mutual Fund", 0.1500, 0.005100, 0.0127, 0.61, 0.103012, 0.154669, 0.121707),
        new MutualFund("OAKMX", "Oakmark Fund", 0.1309, "Mutual Fund", 0.1734, 0.008900, 0.0091, 0.61, 0.104834, 0.168585, 0.133385),
        new MutualFund("SWPPX", "Schwab S&P 500 Index Fund", 0.1658, "Mutual Fund", 0.1508, 0.000200, 0.0110, 0.73, 0.169367, 0.217590, 0.141473),
        new MutualFund("VIMAX", "Vanguard Mid-Cap Index Fund Admiral", 0.0994, "Mutual Fund", 0.1658, 0.000500, 0.0143, 0.38, 0.149743, 0.144455, 0.087656),
        new MutualFund("VSMAX", "Vanguard Small-Cap Index Fund Admiral", 0.0731, "Mutual Fund", 0.1840, 0.000500, 0.0124, 0.28, 0.183203, 0.136405, 0.071481),
        new MutualFund("VWUSX", "Vanguard U.S. Growth Fund", 0.0545, "Mutual Fund", 0.2138, 0.003500, 0.0006, 0.24, 0.082634, 0.237748, 0.065733),
        new MutualFund("VIGAX", "Vanguard Growth Index Fund Admiral", 0.1890, "Mutual Fund", 0.1947, 0.000500, 0.0043, 0.57, 0.141729, 0.264195, 0.133683),

        // ETFs
        new MutualFund("SPY", "SPDR S&P 500 ETF Trust", 0.1635, "ETF", 0.1506, 0.000945, 0.0106, 0.73, 0.168655, 0.216626, 0.140830),
        new MutualFund("QQQ", "Invesco QQQ Trust (Nasdaq-100)", 0.2016, "ETF", 0.1932, 0.001800, 0.0046, 0.64, 0.200912, 0.281946, 0.147498),
        new MutualFund("VTI", "Vanguard Total Stock Market ETF", 0.1569, "ETF", 0.1537, 0.000300, 0.0111, 0.63, 0.170413, 0.209214, 0.126760),
        new MutualFund("IWM", "iShares Russell 2000 ETF", 0.1140, "ETF", 0.1981, 0.001900, 0.0098, 0.16, 0.232219, 0.129876, 0.049300),
        new MutualFund("EEM", "iShares MSCI Emerging Markets ETF", 0.3082, "ETF", 0.1609, 0.007200, 0.0194, 0.20, 0.484369, 0.206935, 0.055266),
        new MutualFund("VEA", "Vanguard FTSE Developed Markets ETF", 0.3064, "ETF", 0.1556, 0.000300, 0.0286, 0.56, 0.422664, 0.207384, 0.114640),
        new MutualFund("AGG", "iShares Core U.S. Aggregate Bond ETF", 0.0308, "ETF", 0.0635, 0.000300, 0.0383, -0.46, 0.062439, 0.051140, 0.004147),
        new MutualFund("GLD", "SPDR Gold Shares", 0.6368, "ETF", 0.1528, 0.004000, 0.0000, 1.28, 0.835349, 0.414290, 0.240535),
        new MutualFund("XLF", "Financial Select Sector SPDR Fund", 0.1333, "ETF", 0.1784, 0.000800, 0.0140, 0.52, -0.000574, 0.147616, 0.116674),
        new MutualFund("XLK", "Technology Select Sector SPDR Fund", 0.2383, "ETF", 0.2074, 0.000800, 0.0056, 0.70, 0.237688, 0.275874, 0.171541),
        new MutualFund("VOO", "Vanguard S&P 500 ETF", 0.1639, "ETF", 0.1508, 0.000300, 0.0112, 0.73, 0.169529, 0.217657, 0.141464),
        new MutualFund("DIA", "SPDR Dow Jones Industrial Average ETF", 0.1294, "ETF", 0.1466, 0.001600, 0.0140, 0.58, 0.133961, 0.164178, 0.115558),
        new MutualFund("VXUS", "Vanguard Total International Stock ETF", 0.2802, "ETF", 0.1447, 0.000500, 0.0286, 0.49, 0.399127, 0.198660, 0.098513),
        new MutualFund("BND", "Vanguard Total Bond Market ETF", 0.0300, "ETF", 0.0631, 0.000300, 0.0382, -0.46, 0.061565, 0.051157, 0.004149),
        new MutualFund("VNQ", "Vanguard Real Estate ETF", -0.0066, "ETF", 0.1896, 0.001300, 0.0363, 0.20, 0.059439, 0.079702, 0.055682),
        new MutualFund("VIG", "Vanguard Dividend Appreciation ETF", 0.1223, "ETF", 0.1356, 0.000400, 0.0156, 0.68, 0.140783, 0.165386, 0.123952),
        new MutualFund("VYM", "Vanguard High Dividend Yield ETF", 0.1249, "ETF", 0.1374, 0.000400, 0.0226, 0.74, 0.187289, 0.165164, 0.135560),
        new MutualFund("VB", "Vanguard Small-Cap ETF", 0.0735, "ETF", 0.1840, 0.000300, 0.0124, 0.28, 0.183212, 0.136416, 0.071511),
        new MutualFund("VO", "Vanguard Mid-Cap ETF", 0.0988, "ETF", 0.1658, 0.000300, 0.0144, 0.38, 0.149873, 0.144592, 0.087795),
        new MutualFund("IEMG", "iShares Core MSCI Emerging Markets ETF", 0.2872, "ETF", 0.1554, 0.000900, 0.0241, 0.26, 0.480592, 0.209788, 0.065305),
        new MutualFund("IJH", "iShares Core S&P Mid-Cap ETF", 0.0592, "ETF", 0.1778, 0.000500, 0.0125, 0.38, 0.171951, 0.128936, 0.090582),
        new MutualFund("IJR", "iShares Core S&P Small-Cap ETF", 0.0430, "ETF", 0.1945, 0.000600, 0.0133, 0.22, 0.178086, 0.100320, 0.059785),
        new MutualFund("TLT", "iShares 20+ Year Treasury Bond ETF", -0.0019, "ETF", 0.1474, 0.001500, 0.0428, -0.57, 0.025612, 0.002296, -0.057581),
        new MutualFund("SOXX", "iShares Semiconductor ETF", 0.3975, "ETF", 0.2980, 0.003400, 0.0049, 0.69, 0.700977, 0.381690, 0.214609),
        new MutualFund("XLE", "Energy Select Sector SPDR Fund", 0.0439, "ETF", 0.2529, 0.000800, 0.0262, 0.80, 0.269542, 0.139049, 0.228729),
        new MutualFund("XLV", "Health Care Select Sector SPDR Fund", 0.1252, "ETF", 0.1434, 0.000800, 0.0155, 0.43, 0.093875, 0.097922, 0.090150),
        new MutualFund("XLI", "Industrial Select Sector SPDR Fund", 0.1773, "ETF", 0.1786, 0.000800, 0.0113, 0.74, 0.316777, 0.224766, 0.160988),
        new MutualFund("SCHD", "Schwab U.S. Dividend Equity ETF", 0.0040, "ETF", 0.1502, 0.000600, 0.0330, 0.54, 0.157176, 0.126362, 0.110267),
        new MutualFund("ARKK", "ARK Innovation ETF", 0.3549, "ETF", 0.4242, 0.007500, 0.0000, -0.15, 0.311542, 0.226261, -0.108102)
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
        String url = String.format(
            "/stock-beta/?ticker=%s&index=^GSPC&interval=1mo&observations=12",
            ticker
        );

        BetaResponse response = newtonClient.get()
            .uri(url)
            .retrieve()
            .bodyToMono(BetaResponse.class)
            .block();

        if (response == null || response.getBeta() == null) {
            throw new RuntimeException("Newton API returned no beta data for " + ticker);
        }
        return response.getBeta();
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

    /**
     * Get historical performance (1Y, 3Y, 5Y trailing returns) from fund data.
     * Data sourced from Yahoo Finance quoteSummary API via yfinance.
     */
    public HistoricalPerformanceResponse getHistoricalPerformance(String ticker) {
        return MUTUAL_FUNDS.stream()
            .filter(fund -> fund.getTicker().equals(ticker))
            .findFirst()
            .map(fund -> new HistoricalPerformanceResponse(ticker, fund.getReturn1Y(), fund.getReturn3Y(), fund.getReturn5Y()))
            .orElse(new HistoricalPerformanceResponse(ticker, null, null, null));
    }
}
