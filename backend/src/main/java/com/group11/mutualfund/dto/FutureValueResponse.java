package com.group11.mutualfund.dto;

public class FutureValueResponse {
    
    private double futureValue;
    private double principal;
    private double rate;
    private int years;
    private String ticker;
    private double beta;
    private double expectedReturn;
    private double riskFreeRate;

    public FutureValueResponse() {
    }

    public FutureValueResponse(double futureValue, double principal, double rate, int years, 
                              String ticker, double beta, double expectedReturn, double riskFreeRate) {
        this.futureValue = futureValue;
        this.principal = principal;
        this.rate = rate;
        this.years = years;
        this.ticker = ticker;
        this.beta = beta;
        this.expectedReturn = expectedReturn;
        this.riskFreeRate = riskFreeRate;
    }

    // Getters and Setters
    public double getFutureValue() {
        return futureValue;
    }

    public void setFutureValue(double futureValue) {
        this.futureValue = futureValue;
    }

    public double getPrincipal() {
        return principal;
    }

    public void setPrincipal(double principal) {
        this.principal = principal;
    }

    public double getRate() {
        return rate;
    }

    public void setRate(double rate) {
        this.rate = rate;
    }

    public int getYears() {
        return years;
    }

    public void setYears(int years) {
        this.years = years;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public double getBeta() {
        return beta;
    }

    public void setBeta(double beta) {
        this.beta = beta;
    }

    public double getExpectedReturn() {
        return expectedReturn;
    }

    public void setExpectedReturn(double expectedReturn) {
        this.expectedReturn = expectedReturn;
    }

    public double getRiskFreeRate() {
        return riskFreeRate;
    }

    public void setRiskFreeRate(double riskFreeRate) {
        this.riskFreeRate = riskFreeRate;
    }
}
