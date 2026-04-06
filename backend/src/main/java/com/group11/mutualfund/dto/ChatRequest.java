package com.group11.mutualfund.dto;

import java.util.List;

public class ChatRequest {

    private String message;
    private List<String> selectedFunds;
    private Double amount;
    private Double years;
    private String riskLevel;
    private List<String> recommendedFunds;
    private String preferredLanguage;
    private List<ChatTurn> history;
    private String currentView;
    private List<PortfolioPosition> portfolioPositions;
    private PortfolioMetrics portfolioMetrics;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<String> getSelectedFunds() {
        return selectedFunds;
    }

    public void setSelectedFunds(List<String> selectedFunds) {
        this.selectedFunds = selectedFunds;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public Double getYears() {
        return years;
    }

    public void setYears(Double years) {
        this.years = years;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public List<String> getRecommendedFunds() {
        return recommendedFunds;
    }

    public void setRecommendedFunds(List<String> recommendedFunds) {
        this.recommendedFunds = recommendedFunds;
    }

    public String getPreferredLanguage() {
        return preferredLanguage;
    }

    public void setPreferredLanguage(String preferredLanguage) {
        this.preferredLanguage = preferredLanguage;
    }

    public List<ChatTurn> getHistory() {
        return history;
    }

    public void setHistory(List<ChatTurn> history) {
        this.history = history;
    }

    public String getCurrentView() {
        return currentView;
    }

    public void setCurrentView(String currentView) {
        this.currentView = currentView;
    }

    public List<PortfolioPosition> getPortfolioPositions() {
        return portfolioPositions;
    }

    public void setPortfolioPositions(List<PortfolioPosition> portfolioPositions) {
        this.portfolioPositions = portfolioPositions;
    }

    public PortfolioMetrics getPortfolioMetrics() {
        return portfolioMetrics;
    }

    public void setPortfolioMetrics(PortfolioMetrics portfolioMetrics) {
        this.portfolioMetrics = portfolioMetrics;
    }

    public static class PortfolioPosition {
        private String ticker;
        private String fundName;
        private Double costBasis;
        private Double currentValue;
        private Double unrealizedGain;
        private Double weight;
        private Double beta;
        private Double sharpe;

        public String getTicker() { return ticker; }
        public void setTicker(String ticker) { this.ticker = ticker; }
        public String getFundName() { return fundName; }
        public void setFundName(String fundName) { this.fundName = fundName; }
        public Double getCostBasis() { return costBasis; }
        public void setCostBasis(Double costBasis) { this.costBasis = costBasis; }
        public Double getCurrentValue() { return currentValue; }
        public void setCurrentValue(Double currentValue) { this.currentValue = currentValue; }
        public Double getUnrealizedGain() { return unrealizedGain; }
        public void setUnrealizedGain(Double unrealizedGain) { this.unrealizedGain = unrealizedGain; }
        public Double getWeight() { return weight; }
        public void setWeight(Double weight) { this.weight = weight; }
        public Double getBeta() { return beta; }
        public void setBeta(Double beta) { this.beta = beta; }
        public Double getSharpe() { return sharpe; }
        public void setSharpe(Double sharpe) { this.sharpe = sharpe; }
    }

    public static class PortfolioMetrics {
        private Double totalInvested;
        private Double currentValue;
        private Double totalWithdrawn;
        private Double unrealizedGain;
        private Double realizedGain;
        private Double weightedBeta;
        private Double weightedSharpe;
        private Double volatility;

        public Double getTotalInvested() { return totalInvested; }
        public void setTotalInvested(Double totalInvested) { this.totalInvested = totalInvested; }
        public Double getCurrentValue() { return currentValue; }
        public void setCurrentValue(Double currentValue) { this.currentValue = currentValue; }
        public Double getTotalWithdrawn() { return totalWithdrawn; }
        public void setTotalWithdrawn(Double totalWithdrawn) { this.totalWithdrawn = totalWithdrawn; }
        public Double getUnrealizedGain() { return unrealizedGain; }
        public void setUnrealizedGain(Double unrealizedGain) { this.unrealizedGain = unrealizedGain; }
        public Double getRealizedGain() { return realizedGain; }
        public void setRealizedGain(Double realizedGain) { this.realizedGain = realizedGain; }
        public Double getWeightedBeta() { return weightedBeta; }
        public void setWeightedBeta(Double weightedBeta) { this.weightedBeta = weightedBeta; }
        public Double getWeightedSharpe() { return weightedSharpe; }
        public void setWeightedSharpe(Double weightedSharpe) { this.weightedSharpe = weightedSharpe; }
        public Double getVolatility() { return volatility; }
        public void setVolatility(Double volatility) { this.volatility = volatility; }
    }

    public static class ChatTurn {
        private String sender;
        private String text;

        public String getSender() {
            return sender;
        }

        public void setSender(String sender) {
            this.sender = sender;
        }

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }
    }
}
