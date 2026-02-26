package com.group11.mutualfund.controller;
import com.group11.mutualfund.model.UserInput;
import com.group11.mutualfund.model.RecommendationResponse;
import com.group11.mutualfund.dto.FutureValueResponse;
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
            "beta", "/api/beta/{ticker}"
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
     * @param years Time period in years
     * @return FutureValueResponse with detailed calculation
     */
    @GetMapping("/api/calculate")
    public FutureValueResponse calculateFutureValue(
            @RequestParam String ticker,
            @RequestParam double amount,
            @RequestParam int years
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

        // Fallback if AI fails
        if (aiResponse == null) {
            return new RecommendationResponse(
                    tickers.stream().limit(3).toList(),
                    "AI service failed. Default funds provided."
            );
        }

        List<String> recommendedFunds = (List<String>) aiResponse.get("recommendedFunds");
        String explanation = (String) aiResponse.get("explanation");

        if (recommendedFunds == null || recommendedFunds.isEmpty()) {
            recommendedFunds = tickers.stream().limit(3).toList();
        }

        if (explanation == null || explanation.isEmpty()) {
            explanation = "Default recommendation based on available funds.";
        }
        return new RecommendationResponse(recommendedFunds, explanation);

    }


    private String generateExplanation(UserInput input, List<String> funds) {

        String risk = input.getRiskLevel();

        if (risk.equalsIgnoreCase("low")) {
            return "Based on your low-risk preference, we selected stable funds with lower volatility: " + funds;
        } else if (risk.equalsIgnoreCase("high")) {
            return "Given your high-risk appetite, these funds offer strong growth potential: " + funds;
        } else {
            return "For a balanced strategy, these funds provide both growth and stability: " + funds;
        }
    }



}
