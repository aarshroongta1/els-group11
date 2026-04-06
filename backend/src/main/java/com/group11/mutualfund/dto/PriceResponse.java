package com.group11.mutualfund.dto;

import java.util.List;

public class PriceResponse {
    private String ticker;
    private double currentPrice;
    private List<PricePoint> history;

    public PriceResponse(String ticker, double currentPrice) {
        this.ticker = ticker;
        this.currentPrice = currentPrice;
        this.history = null;
    }

    public PriceResponse(String ticker, double currentPrice, List<PricePoint> history) {
        this.ticker = ticker;
        this.currentPrice = currentPrice;
        this.history = history;
    }

    public String getTicker() { return ticker; }
    public double getCurrentPrice() { return currentPrice; }
    public List<PricePoint> getHistory() { return history; }
}
