package com.group11.mutualfund.service;

import com.group11.mutualfund.dto.BetaResponse;
import com.group11.mutualfund.dto.FutureValueResponse;
import com.group11.mutualfund.model.MutualFund;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Arrays;
import java.util.List;

@Service
public class MutualFundService {

    private final WebClient newtonClient;

    // Hardcoded risk-free rate (US Treasury 10-year rate)
    private static final double RISK_FREE_RATE = 0.0435; // 4.35% as of Feb 2026
    
    // Hardcoded list of mutual funds, ETFs, and stocks with 2025 returns
    // Returns are actual 2025 data from Alpha Vantage API (fetched March 2026)
    // Money market funds show 2025 7-day SEC yields
    // Beta values are fetched live from Newton Analytics API
    private static final List<MutualFund> MUTUAL_FUNDS = Arrays.asList(
        // MUTUAL FUNDS
        new MutualFund("VSMPX", "Vanguard Total Stock Market Index Fund Institutional Plus", 0.1573),
        new MutualFund("FXAIX", "Fidelity 500 Index Fund", 0.1642),
        new MutualFund("VFIAX", "Vanguard 500 Index Fund Admiral", 0.1641),
        new MutualFund("VTSAX", "Vanguard Total Stock Market Index Fund Admiral", 0.1572),
        new MutualFund("SPAXX", "Fidelity Government Money Market Fund", 0.0470),
        new MutualFund("VMFXX", "Vanguard Federal Money Market Fund Investor", 0.0465),
        new MutualFund("VGTSX", "Vanguard Total International Stock Index Fund Investor", 0.2786),
        new MutualFund("SWVXX", "Schwab Prime Advantage Money Fund Inv", 0.0475),
        new MutualFund("FDRXX", "Fidelity Government Cash Reserves", 0.0468),
        new MutualFund("FGTXX", "Goldman Sachs FS Government Fund Institutional", 0.0472),
        new MutualFund("OGVXX", "JPMorgan US Government Money Market Fund Capital", 0.0470),
        new MutualFund("FCTDX", "Fidelity Strategic Advisers Fidelity US Total Stk", 0.1349),
        new MutualFund("VIIIX", "Vanguard Institutional Index Fund Inst Plus", 0.1528),
        new MutualFund("FRGXX", "Fidelity Instl Government Portfolio Institutional", 0.0468),
        new MutualFund("VTBNX", "Vanguard Total Bond Market II Index Fund Institutional", 0.0385),
        new MutualFund("MVRXX", "Morgan Stanley Inst Liq Government Port Institutional", 0.0472),
        new MutualFund("TFDXX", "BlackRock Liquidity FedFund Institutional", 0.0471),
        new MutualFund("GVMXX", "State Street US Government Money Market Fund Prem", 0.0469),
        new MutualFund("AGTHX", "American Funds Growth Fund of America A", 0.1425),
        new MutualFund("VTBIX", "Vanguard Total Bond Market II Index Fund Investor", 0.0383),
        new MutualFund("CJTXX", "JPMorgan 100% US Treasury Securities Money Market Fund Capital", 0.0465),
        new MutualFund("TTTXX", "BlackRock Liquidity Treasury Trust Fund Institutional", 0.0467),
        new MutualFund("FCNTX", "Fidelity Contrafund", 0.1580),
        new MutualFund("SNAXX", "Schwab Prime Advantage Money Fund Ultra", 0.0476),
        new MutualFund("PIMIX", "PIMCO Income Fund Institutional", 0.0620),
        
        // POPULAR ETFs
        new MutualFund("SPY", "SPDR S&P 500 ETF Trust", 0.1638),
        new MutualFund("QQQ", "Invesco QQQ Trust (Nasdaq-100)", 0.2045),
        new MutualFund("VTI", "Vanguard Total Stock Market ETF", 0.1555),
        new MutualFund("IWM", "iShares Russell 2000 ETF", 0.1185),
        new MutualFund("EEM", "iShares MSCI Emerging Markets ETF", 0.0895),
        new MutualFund("VEA", "Vanguard FTSE Developed Markets ETF", 0.1320),
        new MutualFund("AGG", "iShares Core U.S. Aggregate Bond ETF", 0.0410),
        new MutualFund("GLD", "SPDR Gold Shares", 0.0625),
        new MutualFund("XLF", "Financial Select Sector SPDR Fund", 0.1480),
        new MutualFund("XLK", "Technology Select Sector SPDR Fund", 0.2250),
        new MutualFund("VOO", "Vanguard S&P 500 ETF", 0.1640),
        new MutualFund("DIA", "SPDR Dow Jones Industrial Average ETF", 0.1510),
        
        // POPULAR STOCKS
        new MutualFund("AAPL", "Apple Inc.", 0.1820),
        new MutualFund("MSFT", "Microsoft Corporation", 0.2175),
        new MutualFund("GOOGL", "Alphabet Inc. (Google)", 0.1545),
        new MutualFund("AMZN", "Amazon.com Inc.", 0.2480),
        new MutualFund("NVDA", "NVIDIA Corporation", 0.3520),
        new MutualFund("TSLA", "Tesla Inc.", 0.1050),
        new MutualFund("META", "Meta Platforms Inc. (Facebook)", 0.1980),
        new MutualFund("BRK.B", "Berkshire Hathaway Inc. Class B", 0.1340),
        new MutualFund("JPM", "JPMorgan Chase & Co.", 0.1620),
        new MutualFund("V", "Visa Inc.", 0.1705),
        new MutualFund("JNJ", "Johnson & Johnson", 0.0885),
        new MutualFund("WMT", "Walmart Inc.", 0.1265),
        new MutualFund("PG", "Procter & Gamble Co.", 0.0945),
        new MutualFund("MA", "Mastercard Incorporated", 0.1755),
        new MutualFund("DIS", "The Walt Disney Company", 0.0670),
        new MutualFund("NFLX", "Netflix Inc.", 0.2850),
        new MutualFund("ADBE", "Adobe Inc.", 0.1590),
        new MutualFund("CRM", "Salesforce Inc.", 0.1420),
        new MutualFund("INTC", "Intel Corporation", 0.0320),
        new MutualFund("AMD", "Advanced Micro Devices Inc.", 0.2640)
    );
    

    public MutualFundService() {
        this.newtonClient = WebClient.builder()
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
}
