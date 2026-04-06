package com.group11.mutualfund.dto;

public class PricePoint {
    private long timestamp;
    private double price;

    public PricePoint(long timestamp, double price) {
        this.timestamp = timestamp;
        this.price = price;
    }

    public long getTimestamp() { return timestamp; }
    public double getPrice() { return price; }
}
