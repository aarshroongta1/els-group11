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
    
    // Hardcoded list of top 25 mutual funds
    private static final List<MutualFund> MUTUAL_FUNDS = Arrays.asList(
        new MutualFund("VSMPX", "Vanguard Total Stock Market Index Fund Institutional Plus"),
        new MutualFund("FXAIX", "Fidelity 500 Index Fund"),
        new MutualFund("VFIAX", "Vanguard 500 Index Fund Admiral"),
        new MutualFund("VTSAX", "Vanguard Total Stock Market Index Fund Admiral"),
        new MutualFund("SPAXX", "Fidelity Government Money Market Fund"),
        new MutualFund("VMFXX", "Vanguard Federal Money Market Fund Investor"),
        new MutualFund("VGTSX", "Vanguard Total International Stock Index Fund Investor"),
        new MutualFund("SWVXX", "Schwab Prime Advantage Money Fund Inv"),
        new MutualFund("FDRXX", "Fidelity Government Cash Reserves"),
        new MutualFund("FGTXX", "Goldman Sachs FS Government Fund Institutional"),
        new MutualFund("OGVXX", "JPMorgan US Government Money Market Fund Capital"),
        new MutualFund("FCTDX", "Fidelity Strategic Advisers Fidelity US Total Stk"),
        new MutualFund("VIIIX", "Vanguard Institutional Index Fund Inst Plus"),
        new MutualFund("FRGXX", "Fidelity Instl Government Portfolio Institutional"),
        new MutualFund("VTBNX", "Vanguard Total Bond Market II Index Fund Institutional"),
        new MutualFund("MVRXX", "Morgan Stanley Inst Liq Government Port Institutional"),
        new MutualFund("TFDXX", "BlackRock Liquidity FedFund Institutional"),
        new MutualFund("GVMXX", "State Street US Government Money Market Fund Prem"),
        new MutualFund("AGTHX", "American Funds Growth Fund of America A"),
        new MutualFund("VTBIX", "Vanguard Total Bond Market II Index Fund Investor"),
        new MutualFund("CJTXX", "JPMorgan 100% US Treasury Securities Money Market Fund Capital"),
        new MutualFund("TTTXX", "BlackRock Liquidity Treasury Trust Fund Institutional"),
        new MutualFund("FCNTX", "Fidelity Contrafund"),
        new MutualFund("SNAXX", "Schwab Prime Advantage Money Fund Ultra"),
        new MutualFund("PIMIX", "PIMCO Income Fund Institutional")
    );
    
    // Hardcoded expected returns (historical average for previous year)
    // Stock index funds: ~20-26%, Money market funds: ~4-5%, Bond funds: ~3-6%, Growth funds: ~23-28%
    private static final Map<String, Double> EXPECTED_RETURNS = new HashMap<>() {{
        put("VSMPX", 0.25);  // 25% - Total stock market
        put("FXAIX", 0.26);  // 26% - S&P 500
        put("VFIAX", 0.26);  // 26% - S&P 500
        put("VTSAX", 0.25);  // 25% - Total stock market
        put("SPAXX", 0.045); // 4.5% - Money market
        put("VMFXX", 0.044); // 4.4% - Money market
        put("VGTSX", 0.15);  // 15% - International stocks
        put("SWVXX", 0.048); // 4.8% - Money market
        put("FDRXX", 0.046); // 4.6% - Money market
        put("FGTXX", 0.047); // 4.7% - Money market
        put("OGVXX", 0.045); // 4.5% - Money market
        put("FCTDX", 0.24);  // 24% - Total stock
        put("VIIIX", 0.26);  // 26% - S&P 500
        put("FRGXX", 0.046); // 4.6% - Money market
        put("VTBNX", 0.035); // 3.5% - Bond fund
        put("MVRXX", 0.047); // 4.7% - Money market
        put("TFDXX", 0.046); // 4.6% - Money market
        put("GVMXX", 0.045); // 4.5% - Money market
        put("AGTHX", 0.23);  // 23% - Growth fund
        put("VTBIX", 0.035); // 3.5% - Bond fund
        put("CJTXX", 0.044); // 4.4% - Money market
        put("TTTXX", 0.045); // 4.5% - Money market
        put("FCNTX", 0.28);  // 28% - Growth fund
        put("SNAXX", 0.048); // 4.8% - Money market
        put("PIMIX", 0.055); // 5.5% - Income fund
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
