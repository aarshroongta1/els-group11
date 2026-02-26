package com.group11.mutualfund.model;

import java.util.List;

public class RecommendationResponse {

    private List<String> recommendedFunds;
    private String explanation;

    public RecommendationResponse(List<String> recommendedFunds, String explanation) {
        this.recommendedFunds = recommendedFunds;
        this.explanation = explanation;
    }

    public List<String> getRecommendedFunds() {
        return recommendedFunds;
    }

    public String getExplanation() {
        return explanation;
    }
}
