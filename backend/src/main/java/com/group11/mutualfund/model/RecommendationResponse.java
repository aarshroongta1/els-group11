package com.group11.mutualfund.model;

import java.util.List;

public class RecommendationResponse {

    private List<RecommendedFund> recommendedFunds;
    private String explanation;
    private List<String> warnings;

    public RecommendationResponse() {
    }

    public RecommendationResponse(List<RecommendedFund> recommendedFunds, String explanation, List<String> warnings) {
        this.recommendedFunds = recommendedFunds;
        this.explanation = explanation;
        this.warnings = warnings;
    }

    public List<RecommendedFund> getRecommendedFunds() {
        return recommendedFunds;
    }

    public void setRecommendedFunds(List<RecommendedFund> recommendedFunds) {
        this.recommendedFunds = recommendedFunds;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    public static class RecommendedFund {
        private String name;
        private String explanation;
        private Integer fitScore;
        private List<String> highlights;

        public RecommendedFund() {
        }

        public RecommendedFund(String name, String explanation, Integer fitScore, List<String> highlights) {
            this.name = name;
            this.explanation = explanation;
            this.fitScore = fitScore;
            this.highlights = highlights;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getExplanation() {
            return explanation;
        }

        public void setExplanation(String explanation) {
            this.explanation = explanation;
        }

        public Integer getFitScore() {
            return fitScore;
        }

        public void setFitScore(Integer fitScore) {
            this.fitScore = fitScore;
        }

        public List<String> getHighlights() {
            return highlights;
        }

        public void setHighlights(List<String> highlights) {
            this.highlights = highlights;
        }
    }
}
