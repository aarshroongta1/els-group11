package com.group11.mutualfund.service;

import com.group11.mutualfund.dto.BetaResponse;
import com.group11.mutualfund.dto.FutureValueResponse;
import com.group11.mutualfund.model.MutualFund;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MutualFundService {

    private final WebClient webClient;
    
    // Hardcoded risk-free rate (US Treasury 10-year rate)
    private static final double RISK_FREE_RATE = 0.0435; // 4.35% as of Feb 2026
    
    // Hardcoded list of mutual funds
    private static final List<MutualFund> MUTUAL_FUNDS = Arrays.asList(
        new MutualFund("VFIAX", "Vanguard 500 Index Fund"),
        new MutualFund("FXAIX", "Fidelity 500 Index Fund"),
        new MutualFund("SWPPX", "Schwab S&P 500 Index Fund"),
        new MutualFund("VTSAX", "Vanguard Total Stock Market Index Fund"),
        new MutualFund("AGTHX", "American Funds Growth Fund of America"),
        new MutualFund("FCNTX", "Fidelity Contrafund"),
        new MutualFund("VGTSX", "Vanguard Total International Stock Index Fund"),
        new MutualFund("DODGX", "Dodge & Cox Stock Fund")
    );
    
    // Hardcoded expected returns (historical average for previous year)
    // These would ideally come from a data API, but are hardcoded per requirements
    private static final Map<String, Double> EXPECTED_RETURNS = new HashMap<>() {{
        put("VFIAX", 0.26);  // 26%
        put("FXAIX", 0.26);  // 26%
        put("SWPPX", 0.26);  // 26%
        put("VTSAX", 0.25);  // 25%
        put("AGTHX", 0.23);  // 23%
        put("FCNTX", 0.28);  // 28%
        put("VGTSX", 0.15);  // 15%
        put("DODGX", 0.24);  // 24%
    }};

    public MutualFundService() {
        this.webClient = WebClient.builder()
            .baseUrl("https://api.newtonanalytics.com")
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
            
            BetaResponse response = webClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(BetaResponse.class)
                .block();
            
            return response != null && response.getBeta() != null ? response.getBeta() : 1.0;
        } catch (Exception e) {
            // If API call fails, return default beta of 1.0
            System.err.println("Error fetching beta for " + ticker + ": " + e.getMessage());
            return 1.0;
        }
    }

    /**
     * Get expected return for a mutual fund (hardcoded historical averages)
     */
    public double getExpectedReturn(String ticker) {
        return EXPECTED_RETURNS.getOrDefault(ticker, 0.10); // Default 10% if not found
    }

    /**
     * Calculate future value using CAPM
     * Formula: FV = P * (1 + r)^t
     * where r = risk_free_rate + beta * (expected_return - risk_free_rate)
     */
    public FutureValueResponse calculateFutureValue(String ticker, double principal, int years) {
        // Get beta from API
        double beta = getBeta(ticker);
        
        // Get expected return
        double expectedReturn = getExpectedReturn(ticker);
        
        // Calculate rate using CAPM
        double rate = RISK_FREE_RATE + beta * (expectedReturn - RISK_FREE_RATE);
        
        // Calculate future value
        double futureValue = principal * Math.pow(1 + rate, years);
        
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
}
