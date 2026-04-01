package com.group11.mutualfund.model;

public class MutualFund {

    private String ticker;
    private String name;
    private double expectedReturn;
    private String type;
    private double standardDeviation;
    private double expenseRatio;
    private double dividendYield;
    private double sharpeRatio;
    private Double return1Y;
    private Double return3Y;
    private Double return5Y;

    public MutualFund(String ticker, String name, double expectedReturn, String type,
                      double standardDeviation, double expenseRatio, double dividendYield,
                      double sharpeRatio, Double return1Y, Double return3Y, Double return5Y) {
        this.ticker = ticker;
        this.name = name;
        this.expectedReturn = expectedReturn;
        this.type = type;
        this.standardDeviation = standardDeviation;
        this.expenseRatio = expenseRatio;
        this.dividendYield = dividendYield;
        this.sharpeRatio = sharpeRatio;
        this.return1Y = return1Y;
        this.return3Y = return3Y;
        this.return5Y = return5Y;
    }

    public String getTicker() { return ticker; }
    public String getName() { return name; }
    public double getExpectedReturn() { return expectedReturn; }
    public String getType() { return type; }
    public double getStandardDeviation() { return standardDeviation; }
    public double getExpenseRatio() { return expenseRatio; }
    public double getDividendYield() { return dividendYield; }
    public double getSharpeRatio() { return sharpeRatio; }
    public Double getReturn1Y() { return return1Y; }
    public Double getReturn3Y() { return return3Y; }
    public Double getReturn5Y() { return return5Y; }
}
