package com.group11.mutualfund.model;

public class MutualFund {

    private String ticker;
    private String name;

    public MutualFund(String ticker, String name) {
        this.ticker = ticker;
        this.name = name;
    }

    public String getTicker() {
        return ticker;
    }

    public String getName() {
        return name;
    }
}
