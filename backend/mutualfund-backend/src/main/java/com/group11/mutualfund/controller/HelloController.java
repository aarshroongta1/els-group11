package com.group11.mutualfund.controller;

import com.group11.mutualfund.model.MutualFund;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
public class HelloController {

    // Hardcoded list of mutual funds
    @GetMapping("/funds")
    public List<MutualFund> getFunds() {
        return Arrays.asList(
                new MutualFund("VFIAX", "Vanguard 500 Index Fund"),
                new MutualFund("SWPPX", "Schwab S&P 500 Index Fund"),
                new MutualFund("FXAIX", "Fidelity 500 Index Fund")
        );
    }

    // Hardcoded beta values from your tables
    private final Map<String, Double> betaMap = Map.of(
            "VFIAX", 1.0,
            "SWPPX", 1.0,
            "FXAIX", 1.0
    );
    private final Map<String, Double> expectedReturnMap = Map.of(
            "VFIAX", 0.13,   // example: 13% last year return
            "SWPPX", 0.13,
            "FXAIX", 0.13
    );

    @GetMapping("/calculate")
    public double calculateFutureValue(
            @RequestParam String ticker,
            @RequestParam double amount,
            @RequestParam int years
    ) {
        double riskFreeRate = 0.04;   // 4% US Treasury
        double expectedReturn = expectedReturnMap.getOrDefault(ticker, 0.08);
        // Get beta from map, default to 1.0 if ticker not found
        double beta = betaMap.getOrDefault(ticker, 1.0);

        // Capital Asset Pricing Model (CAPM)
        double r = riskFreeRate + beta * (expectedReturn - riskFreeRate);
        
        // Future value calculation
        return amount * Math.pow(1 + r, years);
    }
}
