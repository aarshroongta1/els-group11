package com.group11.mutualfund.service;

import com.group11.mutualfund.model.UserInput;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.MediaType;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

@Service
public class AIService {

    private final WebClient webClient;

    public AIService() {
        // Step 1: Get the API key from the environment variable
        String apiKey = System.getenv("OPENAI_API_KEY");


        // Step 2: Check if the API key exists
        if (apiKey == null || apiKey.isEmpty()) {
            throw new RuntimeException("OPENAI_API_KEY environment variable not set!");
        }

        // Step 3: Build the WebClient with the API key
        this.webClient = WebClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    public Map<String, Object> getPortfolioRecommendation(UserInput input, List<String> tickers) {
        String prompt = buildPrompt(input, tickers);

        Map<String, Object> response = webClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of(
                        "model", "gpt-4",
                        "messages", List.of(Map.of(
                                "role", "user",
                                "content", prompt
                        )),
                        "max_tokens", 300
                ))
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        try {
            // Step 1: Extract "choices"
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");

            // Step 2: Extract "message"
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");

            // Step 3: Extract actual AI text (this is your JSON string)
            String content = ((String) message.get("content")).trim();

            if (content.startsWith("```")) {
                content = content.replace("```json", "")
                        .replace("```", "")
                        .trim();
            }

            System.out.println("CLEANED AI CONTENT: " + content);

            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> parsed = objectMapper.readValue(content, Map.class);

            return parsed;

        } catch (Exception e) {
            e.printStackTrace();

            // fallback
            return Map.of(
                    "recommendedFunds", List.of("VFIAX", "FXAIX", "VTSAX"),
                    "explanation", "AI parsing failed. Default funds provided."
            );
        }
    }

    private String buildPrompt(UserInput input, List<String> tickers) {
        return "You are a financial assistant.\n\n" +
                "Available mutual funds: " + tickers + "\n" +
                "Risk level: " + input.getRiskLevel() + "\n" +
                "Investment amount: " + input.getAmount() + "\n" +
                "Years: " + input.getYears() + "\n\n" +
                "Choose exactly 3 funds from the list and explain why.\n\n" +
                "Respond in JSON format like this:\n" +
                "{\n" +
                "  \"recommendedFunds\": [\"VFIAX\", \"FXAIX\", \"VTSAX\"],\n" +
                "  \"explanation\": \"your explanation here\"\n" +
                "}\n\n" +
                "Make sure recommendedFunds is NOT empty.";
    }
}