package com.group11.mutualfund.controller;

import com.group11.mutualfund.dto.FutureValueResponse;
import com.group11.mutualfund.model.MutualFund;
import com.group11.mutualfund.service.MutualFundService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class HelloController {

    private final MutualFundService mutualFundService;

    @Autowired
    public HelloController(MutualFundService mutualFundService) {
        this.mutualFundService = mutualFundService;
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
}
