package com.group11.mutualfund.controller;
import com.group11.mutualfund.dto.ChatRequest;
import com.group11.mutualfund.dto.FundComparisonResponse;
import com.group11.mutualfund.dto.PriceResponse;
import com.group11.mutualfund.model.UserInput;
import com.group11.mutualfund.model.RecommendationResponse;
import com.group11.mutualfund.dto.FutureValueResponse;
import com.group11.mutualfund.dto.HistoricalPerformanceResponse;
import com.group11.mutualfund.model.MutualFund;
import com.group11.mutualfund.service.AIService;
import com.group11.mutualfund.service.MutualFundService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class HelloController {

    private final MutualFundService mutualFundService;
    private final AIService aiService;
    @Autowired
    public HelloController(MutualFundService mutualFundService, AIService aiService) {
        this.mutualFundService = mutualFundService;
        this.aiService = aiService;
    }

    /**
     * Root endpoint - API information
     */
    @GetMapping("/")
    public Map<String, Object> root() {
        Map<String, Object> info = new HashMap<>();
        info.put("application", "Mutual Fund Calculator API");
        info.put("version", "1.0.0");
        info.put("endpoints", Map.of(
            "funds", "/api/funds",
            "calculate", "/api/calculate?ticker={ticker}&amount={amount}&years={years}",
            "beta", "/api/beta/{ticker}",
            "compare", "/api/compare?tickers=VFIAX,FXAIX,VTSAX",
            "recommend", "/api/recommend",
            "chat", "/api/chat"
        ));
        return info;
    }

    /**
     * GET /api/funds
     * Returns list of all available mutual funds
     */
    @GetMapping("/api/funds")
    public List<MutualFund> getFunds() {
        return mutualFundService.getAllMutualFunds();
    }

    /**
     * GET /api/calculate
     * Calculate future value of investment
     * @param ticker Mutual fund ticker symbol
     * @param amount Initial investment amount
     * @param years Time period in years (supports fractional years)
     * @return FutureValueResponse with detailed calculation
     */
    @GetMapping("/api/calculate")
    public FutureValueResponse calculateFutureValue(
            @RequestParam String ticker,
            @RequestParam double amount,
            @RequestParam double years
    ) {
        return mutualFundService.calculateFutureValue(ticker, amount, years);
    }

    /**
     * GET /api/beta/{ticker}
     * Get beta value for a specific mutual fund
     * @param ticker Mutual fund ticker symbol
     * @return Beta value
     */
    @GetMapping("/api/beta/{ticker}")
    public double getBeta(@PathVariable String ticker) {
        return mutualFundService.getBeta(ticker);
    }


    @PostMapping("/api/recommend")
    public RecommendationResponse recommend(@RequestBody UserInput input) {
        List<String> tickers = mutualFundService.getAllMutualFunds()
                .stream()
                .map(MutualFund::getTicker)
                .toList();

        Map<String, Object> aiResponse = aiService.getPortfolioRecommendation(input, tickers);

        if (aiResponse == null) {
            return new RecommendationResponse(
                    buildDefaultRecommendations(tickers, input),
                    "AI service failed. Default funds provided.",
                    mutualFundService.buildPortfolioWarnings(input, tickers.stream().limit(3).toList())
            );
        }

        List<RecommendationResponse.RecommendedFund> recommendedFunds =
                parseRecommendedFunds(aiResponse.get("recommendedFunds"), input);
        String explanation = (String) aiResponse.get("explanation");

        if (recommendedFunds == null || recommendedFunds.isEmpty()) {
            recommendedFunds = buildDefaultRecommendations(tickers, input);
        }

        if (explanation == null || explanation.isEmpty()) {
            explanation = buildRecommendationSummary(input, recommendedFunds);
        }

        List<String> recommendedTickers = recommendedFunds.stream()
                .map(RecommendationResponse.RecommendedFund::getName)
                .toList();

        return new RecommendationResponse(
                recommendedFunds,
                explanation,
                mutualFundService.buildPortfolioWarnings(input, recommendedTickers)
        );
    }

    @GetMapping("/api/compare")
    public FundComparisonResponse compareFunds(@RequestParam List<String> tickers) {
        return mutualFundService.compareFunds(tickers);
    }


    /**
     * GET /api/news
     * Fetch latest financial market news with sentiment
     */
    @GetMapping("/api/news")
    public List<Map<String, String>> getNews() {
        return mutualFundService.getMarketNews();
    }

    /**
     * GET /api/historical/{ticker}
     * Get historical performance (1Y, 3Y, 5Y trailing returns) from Yahoo Finance
     */
    @GetMapping("/api/historical/{ticker}")
    public HistoricalPerformanceResponse getHistoricalPerformance(@PathVariable String ticker) {
        return mutualFundService.getHistoricalPerformance(ticker);
    }

    /**
     * GET /api/price/{ticker}
     * Get current NAV for a fund from Yahoo Finance
     */
    @GetMapping("/api/price/{ticker}")
    public Map<String, Object> getCurrentPrice(@PathVariable String ticker) {
        double price = mutualFundService.getCurrentPrice(ticker);
        return Map.of("ticker", ticker, "currentPrice", price);
    }

    /**
     * GET /api/price-history/{ticker}
     * Get historical daily prices from Yahoo Finance
     * @param range one of: 1mo, 3mo, 1y, 5y, max
     */
    @GetMapping("/api/price-history/{ticker}")
    public PriceResponse getPriceHistory(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "1y") String range
    ) {
        return mutualFundService.getPriceHistory(ticker, range);
    }

    @PostMapping("/api/chat")
    public Map<String, String> chat(@RequestBody ChatRequest request) {
        String reply = aiService.chat(request);

        return Map.of("reply", reply);
    }

    private List<RecommendationResponse.RecommendedFund> parseRecommendedFunds(Object rawFunds, UserInput input) {
        if (!(rawFunds instanceof List<?> funds) || funds.isEmpty()) {
            return List.of();
        }

        return funds.stream()
                .limit(3)
                .map(fund -> toRecommendedFund(fund, input))
                .toList();
    }

    private RecommendationResponse.RecommendedFund toRecommendedFund(Object rawFund, UserInput input) {
        if (rawFund instanceof String fundName) {
            return mutualFundService.enrichRecommendation(
                    fundName,
                    buildFallbackFundExplanation(fundName, input),
                    input
            );
        }

        if (rawFund instanceof Map<?, ?> fundMap) {
            Object rawName = fundMap.get("name");
            Object rawExplanation = fundMap.get("explanation");
            String fundName = rawName instanceof String ? (String) rawName : "Unknown Fund";
            String fundExplanation = rawExplanation instanceof String && !((String) rawExplanation).isBlank()
                    ? (String) rawExplanation
                    : buildFallbackFundExplanation(fundName, input);

            return mutualFundService.enrichRecommendation(fundName, fundExplanation, input);
        }

        return new RecommendationResponse.RecommendedFund(
                "Unknown Fund",
                "This fund was included in the recommendation, but no explanation was returned.",
                60,
                List.of("Recommendation available", "More details unavailable")
        );
    }

    private List<RecommendationResponse.RecommendedFund> buildDefaultRecommendations(List<String> tickers, UserInput input) {
        return tickers.stream()
                .limit(3)
                .map(ticker -> mutualFundService.enrichRecommendation(
                        ticker,
                        buildFallbackFundExplanation(ticker, input),
                        input
                ))
                .toList();
    }

    private String buildFallbackFundExplanation(String fundName, UserInput input) {
        String riskLevel = input.getRiskLevel() == null ? "medium" : input.getRiskLevel().toLowerCase();

        return switch (riskLevel) {
            case "low" -> "fits a more conservative strategy with broader diversification and steadier performance.";
            case "high" -> "offers stronger growth potential for a higher-risk, long-term strategy.";
            default -> "balances growth and diversification for a moderate investment strategy.";
        };
    }

    private String buildRecommendationSummary(UserInput input, List<RecommendationResponse.RecommendedFund> recommendedFunds) {
        String riskLevel = input.getRiskLevel() == null ? "medium" : input.getRiskLevel().toLowerCase();
        int years = input.getYears();

        String strategy = switch (riskLevel) {
            case "low" -> "stability, diversification, and lower volatility";
            case "high" -> "growth potential, long-term upside, and stronger return opportunities";
            default -> "balanced growth, diversification, and overall fund quality";
        };

        boolean hasLowCost = recommendedFunds.stream()
                .map(RecommendationResponse.RecommendedFund::getHighlights)
                .filter(highlights -> highlights != null)
                .flatMap(List::stream)
                .anyMatch(highlight -> highlight.toLowerCase().contains("low cost"));

        String costFactor = hasLowCost ? " low fund costs," : "";

        return "These are the funds we recommend based on your " + riskLevel + " risk level, a " +
                years + "-year time horizon," + costFactor +
                " and how strongly each fund fit our selection factors for " + strategy + ".";
    }

}
