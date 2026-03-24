package com.group11.mutualfund.model;

public class MutualFund {

    private String ticker;
    private String name;
    private double expectedReturn;  // Annual expected return (e.g., 0.1642 = 16.42%)

    public MutualFund(String ticker, String name, double expectedReturn) {
        this.ticker = ticker;
        this.name = name;
        this.expectedReturn = expectedReturn;
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
}
