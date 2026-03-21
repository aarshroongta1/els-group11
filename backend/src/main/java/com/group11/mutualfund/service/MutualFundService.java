package com.group11.mutualfund.service;

import com.group11.mutualfund.dto.BetaResponse;
import com.group11.mutualfund.dto.FutureValueResponse;
import com.group11.mutualfund.model.MutualFund;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MutualFundService {

    private final WebClient newtonClient;
    private final WebClient alphaVantageClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Double> expectedReturnCache = new ConcurrentHashMap<>();

    private static final String ALPHA_VANTAGE_API_KEY = "7MLN1V774I3VMJ07";

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
            // If API call fails, return default beta of 1.0
            System.err.println("Error fetching beta for " + ticker + ": " + e.getMessage());
            return 1.0;
        }
    }

    /**
     * Get expected return for a mutual fund from Alpha Vantage historical data.
     * Formula: (last day of year value - first day of year value) / first day of year value
     */
    public double getExpectedReturn(String ticker) {
        if (expectedReturnCache.containsKey(ticker)) {
            return expectedReturnCache.get(ticker);
        }

        try {
            String url = String.format(
                "/query?function=TIME_SERIES_MONTHLY&symbol=%s&apikey=%s",
                ticker, ALPHA_VANTAGE_API_KEY
            );

            String responseBody = alphaVantageClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode monthlyData = root.get("Monthly Time Series");

            if (monthlyData == null) {
                System.err.println("No monthly data for " + ticker + ", using default");
                return 0.10;
            }

            // Get the dates sorted (most recent first)
            Iterator<String> dates = monthlyData.fieldNames();
            String firstDayOfLastYear = null;
            String lastDayOfLastYear = null;
            int lastYear = java.time.LocalDate.now().getYear() - 1;

            while (dates.hasNext()) {
                String date = dates.next();
                int year = Integer.parseInt(date.substring(0, 4));
                if (year == lastYear) {
                    if (lastDayOfLastYear == null) {
                        lastDayOfLastYear = date; // First encountered = most recent in that year
                    }
                    firstDayOfLastYear = date; // Keep updating = earliest in that year
                }
            }

            if (firstDayOfLastYear == null || lastDayOfLastYear == null) {
                System.err.println("Insufficient data for " + ticker + ", using default");
                return 0.10;
            }

            double firstValue = monthlyData.get(firstDayOfLastYear).get("1. open").asDouble();
            double lastValue = monthlyData.get(lastDayOfLastYear).get("4. close").asDouble();

            double expectedReturn = (lastValue - firstValue) / firstValue;
            expectedReturnCache.put(ticker, expectedReturn);
            System.out.println("Fetched expected return for " + ticker + ": " + String.format("%.4f", expectedReturn));
            return expectedReturn;
        } catch (Exception e) {
            System.err.println("Error fetching expected return for " + ticker + ": " + e.getMessage());
            return 0.10; // Default 10% if API fails
        }
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
}
