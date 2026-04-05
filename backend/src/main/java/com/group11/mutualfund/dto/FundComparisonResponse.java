package com.group11.mutualfund.dto;

import java.util.List;

public class FundComparisonResponse {

    private List<FundSnapshot> funds;
    private String summary;
    private String bestForGrowth;
    private String bestForStability;
    private String bestValue;

    public FundComparisonResponse(List<FundSnapshot> funds, String summary, String bestForGrowth,
                                  String bestForStability, String bestValue) {
        this.funds = funds;
        this.summary = summary;
        this.bestForGrowth = bestForGrowth;
        this.bestForStability = bestForStability;
        this.bestValue = bestValue;
    }

    public List<FundSnapshot> getFunds() {
        return funds;
    }

    public String getSummary() {
        return summary;
    }

    public String getBestForGrowth() {
        return bestForGrowth;
    }

    public String getBestForStability() {
        return bestForStability;
    }

    public String getBestValue() {
        return bestValue;
    }

    public static class FundSnapshot {
        private String ticker;
        private String name;
        private String type;
        private double expectedReturn;
        private double standardDeviation;
        private double expenseRatio;
        private double sharpeRatio;
        private Double return3Y;
        private Double return5Y;
        private String investorFit;

        public FundSnapshot(String ticker, String name, String type, double expectedReturn, double standardDeviation,
                            double expenseRatio, double sharpeRatio, Double return3Y, Double return5Y, String investorFit) {
            this.ticker = ticker;
            this.name = name;
            this.type = type;
            this.expectedReturn = expectedReturn;
            this.standardDeviation = standardDeviation;
            this.expenseRatio = expenseRatio;
            this.sharpeRatio = sharpeRatio;
            this.return3Y = return3Y;
            this.return5Y = return5Y;
            this.investorFit = investorFit;
        }

        public String getTicker() {
            return ticker;
        }

        public String getName() {
            return name;
        }

        public String getType() {
            return type;
        }

        public double getExpectedReturn() {
            return expectedReturn;
        }

        public double getStandardDeviation() {
            return standardDeviation;
        }

        public double getExpenseRatio() {
            return expenseRatio;
        }

        public double getSharpeRatio() {
            return sharpeRatio;
        }

        public Double getReturn3Y() {
            return return3Y;
        }

        public Double getReturn5Y() {
            return return5Y;
        }

        public String getInvestorFit() {
            return investorFit;
        }
    }
}
