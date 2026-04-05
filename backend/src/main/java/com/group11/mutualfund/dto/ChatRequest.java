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
