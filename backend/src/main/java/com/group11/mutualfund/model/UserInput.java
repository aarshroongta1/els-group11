package com.group11.mutualfund.model;

import java.util.Map;

public class UserInput {

    private double amount;
    private int years;
    private String riskLevel;
    private Map<String, Double> projectedReturns;

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public int getYears() {
        return years;
    }

    public void setYears(int years) {
        this.years = years;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public Map<String, Double> getProjectedReturns() {
        return projectedReturns;
    }

    public void setProjectedReturns(Map<String, Double> projectedReturns) {
        this.projectedReturns = projectedReturns;
    }
}
