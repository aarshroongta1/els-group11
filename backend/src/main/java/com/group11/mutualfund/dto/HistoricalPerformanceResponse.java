package com.group11.mutualfund.dto;

public class HistoricalPerformanceResponse {

    private String ticker;
    private Double return1Y;
    private Double return3Y;
    private Double return5Y;

    public HistoricalPerformanceResponse() {
    }

    public HistoricalPerformanceResponse(String ticker, Double return1Y, Double return3Y, Double return5Y) {
        this.ticker = ticker;
        this.return1Y = return1Y;
        this.return3Y = return3Y;
        this.return5Y = return5Y;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public Double getReturn1Y() {
        return return1Y;
    }

    public void setReturn1Y(Double return1Y) {
        this.return1Y = return1Y;
    }

    public Double getReturn3Y() {
        return return3Y;
    }

    public void setReturn3Y(Double return3Y) {
        this.return3Y = return3Y;
    }

    public Double getReturn5Y() {
        return return5Y;
    }

    public void setReturn5Y(Double return5Y) {
        this.return5Y = return5Y;
    }
}
