package com.group11.mutualfund.model;

public class MutualFund {

    private String ticker;
    private String name;
    private double expectedReturn;  // Annual expected return (e.g., 0.1642 = 16.42%)
    private String type;  // "Mutual Fund" or "ETF"

    public MutualFund(String ticker, String name, double expectedReturn, String type) {
        this.ticker = ticker;
        this.name = name;
        this.expectedReturn = expectedReturn;
        this.type = type;
    }

    public String getTicker() {
        return ticker;
    }

    public String getName() {
        return name;
    }

    public double getExpectedReturn() {
        return expectedReturn;
    }

    public String getType() {
        return type;
    }
}
