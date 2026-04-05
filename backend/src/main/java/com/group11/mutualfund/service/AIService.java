package com.group11.mutualfund.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.group11.mutualfund.dto.ChatRequest;
import com.group11.mutualfund.model.UserInput;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class AIService {

    private static final String CHAT_SYSTEM_PROMPT = """
            You are Atlas, a smart and friendly assistant like ChatGPT inside a mutual fund planning app.

            Core behavior:
            - You can answer any question the user asks.
            - When the question is about finance or investing, give helpful, practical guidance.
            - When the question is about the app, explain the app clearly and accurately.
            - If the question is outside finance or the app, still answer helpfully like a general assistant.

            Style rules:
            - Sound warm, clear, and confident.
            - Keep answers concise, easy to understand, and natural.
            - Use short paragraphs instead of long blocks of text.
            - Avoid repetitive fallback phrasing.
            - Use recent conversation history to answer follow-up questions naturally.
            - If the user seems confused, explain step by step in simple language.
            - If the user writes in a non-English language, reply in that language.
            - If a preferred language is provided, reply in that language.

            Finance rules:
            - Be helpful, but do not promise returns or guarantee outcomes.
            - Use cautious wording such as "may", "can", or "often".
            - Explain metrics like beta, Sharpe ratio, expense ratio, and diversification in plain English when helpful.
            - Explain scenarios such as bull, base, and bear market outcomes clearly.

            App context:
            - Users can select funds, enter an investment amount, choose a time horizon, set a risk level, calculate projected future value, and request fund recommendations.
            - The recommendation section explains why certain funds may fit the user's profile.
            - Users may ask how to use the app, what a result means, or which step to take next.
            """;

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AIService(@Value("${openai.api.key:}") String apiKey) {
        if (apiKey == null || apiKey.isEmpty()) {
            System.err.println("WARNING: OPENAI_API_KEY not set. AI recommendations will use fallback.");
            this.webClient = null;
            return;
        }

        this.webClient = WebClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    public Map<String, Object> getPortfolioRecommendation(UserInput input, List<String> tickers) {
        if (webClient == null) {
            return Map.of(
                    "recommendedFunds", List.of(
                            Map.of("name", "VFIAX", "explanation", "Steady S&P 500 growth with a strong long-term track record."),
                            Map.of("name", "FXAIX", "explanation", "Low-cost exposure to top U.S. companies, making it efficient and reliable."),
                            Map.of("name", "VTSAX", "explanation", "Broad U.S. market coverage for simple, diversified growth.")
                    ),
                    "explanation", "Default recommendations were used because AI is not configured."
            );
        }

        String prompt = buildPrompt(input, tickers);

        Map<String, Object> response = webClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of(
                        "model", "gpt-4",
                        "messages", List.of(
                                Map.of("role", "system", "content", "You are a strict financial advisor."),
                                Map.of("role", "user", "content", prompt)
                        ),
                        "max_tokens", 300
                ))
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

        try {
            List<Map<String, Object>> choices = objectMapper.convertValue(
                    response.get("choices"),
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            Map<String, Object> message = objectMapper.convertValue(
                    choices.get(0).get("message"),
                    new TypeReference<Map<String, Object>>() {}
            );

            String content = ((String) message.get("content")).trim();
            if (content.startsWith("```")) {
                content = content.replace("```json", "")
                        .replace("```", "")
                        .trim();
            }

            return objectMapper.readValue(content, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of(
                    "recommendedFunds", List.of(
                            Map.of("name", "VFIAX", "explanation", "Broad market exposure with steady long-term potential."),
                            Map.of("name", "FXAIX", "explanation", "A low-cost way to invest in leading U.S. companies."),
                            Map.of("name", "VTSAX", "explanation", "One fund that gives you wide U.S. stock market diversification.")
                    ),
                    "explanation", "AI parsing failed. Default funds were provided."
            );
        }
    }

    private String buildPrompt(UserInput input, List<String> tickers) {
        return "You are a strict financial advisor.\n\n" +
                "User profile:\n" +
                "- Amount: $" + input.getAmount() + "\n" +
                "- Duration: " + input.getYears() + " years\n" +
                "- Risk: " + input.getRiskLevel() + "\n\n" +
                "Available funds:\n" +
                String.join(", ", tickers) + "\n\n" +
                "TASK:\n" +
                "1. Select EXACTLY 3 funds.\n" +
                "2. Each fund MUST have its own explanation.\n" +
                "3. Each explanation MUST explain why this fund fits the user's profile.\n" +
                "4. Each explanation MUST be one short, catchy sentence.\n" +
                "5. Use 6 to 14 words only.\n" +
                "6. Make it helpful, appealing, and easy to scan.\n" +
                "7. Do not repeat the fund name inside the explanation.\n" +
                "8. Return ONLY valid JSON.\n\n" +
                "OUTPUT FORMAT:\n" +
                "{\n" +
                "  \"explanation\": \"Short overall summary.\",\n" +
                "  \"recommendedFunds\": [\n" +
                "    {\"name\": \"Fund1\", \"explanation\": \"Why it is recommended.\"},\n" +
                "    {\"name\": \"Fund2\", \"explanation\": \"Why it is recommended.\"},\n" +
                "    {\"name\": \"Fund3\", \"explanation\": \"Why it is recommended.\"}\n" +
                "  ]\n" +
                "}\n";
    }

    public String chat(ChatRequest request) {
        if (webClient == null) {
            return localChatFallback(request);
        }

        try {
            String contextualMessage = buildChatContext(request);
            Map<String, Object> response = webClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of(
                            "model", "gpt-4",
                            "messages", List.of(
                                    Map.of("role", "system", "content", CHAT_SYSTEM_PROMPT),
                                    Map.of("role", "user", "content", contextualMessage)
                            ),
                            "max_tokens", 260,
                            "temperature", 0.7
                    ))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            List<Map<String, Object>> choices = objectMapper.convertValue(
                    response.get("choices"),
                    new TypeReference<List<Map<String, Object>>>() {}
            );
            Map<String, Object> messageObj = objectMapper.convertValue(
                    choices.get(0).get("message"),
                    new TypeReference<Map<String, Object>>() {}
            );

            String reply = (String) messageObj.get("content");
            return reply == null || reply.isBlank() ? localChatFallback(request) : reply;
        } catch (Exception e) {
            return localChatFallback(request);
        }
    }

    private String localChatFallback(ChatRequest request) {
        String message = request == null ? "" : request.getMessage();
        String normalized = message == null ? "" : message.toLowerCase();

        if (containsAny(normalized, "hello", "hi", "hey")) {
            return translateReply(request,
                    "Hi, I am Atlas. I can guide you through the app, explain investing clearly, and help you make sense of your options.");
        }

        if (containsAny(normalized, "how", "use the app", "what do i do", "where do i start", "start")) {
            return translateReply(request,
                    """
                    Start with three steps:
                    1. Choose one or more funds.
                    2. Enter your amount, time horizon, and risk level.
                    3. Use Calculate for projections or Get Recommendation for suggested funds.
                    """);
        }

        if (containsAny(normalized, "recommend", "recommendation", "why these funds")) {
            List<String> recommendedFunds = request == null ? null : request.getRecommendedFunds();
            if (recommendedFunds != null && !recommendedFunds.isEmpty()) {
                return translateReply(request,
                        "The app matches funds to your risk level and time horizon. Right now your latest recommendation includes " + formatList(recommendedFunds) + ".");
            }
            return translateReply(request,
                    "The app matches funds to your risk level and time horizon, then gives short reasons for why each one may fit your profile.");
        }

        if (containsAny(normalized, "risk", "risk level", "low", "medium", "high")) {
            return translateReply(request,
                    "Low risk usually favors steadier options, medium risk balances growth and stability, and high risk aims for more growth with more ups and downs.");
        }

        if (containsAny(normalized, "beta", "sharpe", "expense ratio", "diversification", "metric")) {
            return translateReply(request, buildMetricExplanation(normalized));
        }

        if (containsAny(normalized, "future value", "calculate", "projection", "projected")) {
            return translateReply(request,
                    "Future value shows how your investment could grow over time based on the selected fund's return assumptions. It helps you compare options side by side.");
        }

        if (containsAny(normalized, "bear market", "bull market", "base case", "scenario", "down market", "market falls")) {
            return translateReply(request, buildScenarioExplanation(request));
        }

        if (containsAny(normalized, "fund", "mutual fund", "etf", "difference")) {
            return translateReply(request,
                    "Mutual funds and ETFs both pool investments. In this app, they are shown as fund options you can compare by projected growth, risk, and fit.");
        }

        if (containsAny(normalized, "confused", "stuck", "not working", "problem", "issue", "help")) {
            return translateReply(request,
                    "I can walk you through it step by step. If the app still is not behaving correctly, please contact your app team, instructor, or official support channel for direct help.");
        }

        if (containsAny(normalized, "save", "portfolio")) {
            return translateReply(request,
                    "Use the results cards to review fund projections. If your version supports saving, add investments after comparing the projected returns and risk details.");
        }

        if (containsAny(normalized, "compare")) {
            List<String> selectedFunds = request == null ? null : request.getSelectedFunds();
            if (selectedFunds != null && !selectedFunds.isEmpty()) {
                return translateReply(request,
                        "A good next step is to compare " + formatList(selectedFunds) + " by return, volatility, and cost. I can also help explain what each metric means.");
            }
            return translateReply(request,
                    "You can compare funds by expected return, volatility, expense ratio, and long-term performance.");
        }

        List<ChatRequest.ChatTurn> history = request == null ? null : request.getHistory();
        if (history != null && !history.isEmpty()) {
            return translateReply(request,
                    "I can help with that. Ask it in a little more detail, or tell me whether you want a quick answer, an explanation, or an example.");
        }

        return translateReply(request,
                "I can help with general questions too. If you want, ask me anything directly and I will answer as clearly as I can.");
    }

    private String buildChatContext(ChatRequest request) {
        StringBuilder builder = new StringBuilder();
        builder.append("User message: ").append(request == null ? "" : nullSafe(request.getMessage())).append("\n\n");
        builder.append("Current app context:\n");
        builder.append("- Selected funds: ").append(formatList(request == null ? null : request.getSelectedFunds())).append("\n");
        builder.append("- Investment amount: ").append(request == null || request.getAmount() == null ? "Not set" : "$" + String.format("%.0f", request.getAmount())).append("\n");
        builder.append("- Time horizon: ").append(request == null || request.getYears() == null ? "Not set" : String.format("%.1f years", request.getYears())).append("\n");
        builder.append("- Risk level: ").append(request == null ? "Not set" : nullSafe(request.getRiskLevel())).append("\n");
        builder.append("- Latest recommendations: ").append(formatList(request == null ? null : request.getRecommendedFunds())).append("\n");
        builder.append("- Preferred language: ").append(request == null ? "Auto" : nullSafe(request.getPreferredLanguage())).append("\n");
        builder.append("- Recent conversation:\n").append(formatHistory(request == null ? null : request.getHistory())).append("\n");
        builder.append("\nUse this context when it helps the user.");
        return builder.toString();
    }

    private String buildMetricExplanation(String normalized) {
        if (normalized.contains("beta")) {
            return "Beta shows how strongly a fund may move compared with the market. A higher beta often means bigger swings, while a lower beta usually means steadier movement.";
        }
        if (normalized.contains("sharpe")) {
            return "Sharpe ratio helps show how much return a fund delivers for the risk it takes. Higher Sharpe values often suggest a stronger risk-adjusted profile.";
        }
        if (normalized.contains("expense ratio")) {
            return "Expense ratio is the annual cost of holding a fund. Lower costs can leave more of your return invested over time.";
        }
        if (normalized.contains("diversification")) {
            return "Diversification means spreading money across different holdings so one area does not drive all the risk. It can help smooth out portfolio swings.";
        }
        return "This app uses metrics like beta, Sharpe ratio, expense ratio, and long-term return to help you compare funds more clearly.";
    }

    private String buildScenarioExplanation(ChatRequest request) {
        String riskLevel = request == null || request.getRiskLevel() == null ? "medium" : request.getRiskLevel().toLowerCase();
        String recommended = formatList(request == null ? null : request.getRecommendedFunds());

        if ("high".equals(riskLevel)) {
            return "In a bull market, a higher-risk mix may rise faster. In a bear market, it may also fall more sharply, so it suits investors who can handle bigger swings.";
        }
        if ("low".equals(riskLevel)) {
            return "In a bull market, a lower-risk mix may grow more slowly. In a bear market, it may hold up better and feel more stable.";
        }
        if (!"None".equals(recommended)) {
            return "In a bull market, your current mix may benefit from growth. In a bear market, performance may soften, while a base case suggests steadier long-term progress for " + recommended + ".";
        }
        return "A bull case shows stronger growth, a base case shows more typical progress, and a bear case shows how the portfolio may behave during market stress.";
    }

    private String translateReply(ChatRequest request, String englishReply) {
        String preferredLanguage = request == null ? "" : nullSafe(request.getPreferredLanguage()).toLowerCase();
        return switch (preferredLanguage) {
            case "hindi", "hi" -> translateHindi(englishReply);
            case "spanish", "es" -> translateSpanish(englishReply);
            case "french", "fr" -> translateFrench(englishReply);
            case "arabic", "ar" -> englishReply;
            case "chinese", "zh" -> englishReply;
            default -> englishReply;
        };
    }

    private String translateHindi(String englishReply) {
        if (englishReply.contains("I am Atlas")) {
            return "Namaste. Main Atlas hoon. Main investments, recommendations, risk levels aur app use karne mein aapki madad kar sakta hoon.";
        }
        if (englishReply.contains("Start with three steps")) {
            return "Teen steps se shuru kijiye:\n1. Ek ya adhik funds chuniye.\n2. Amount, time horizon, aur risk level darj kijiye.\n3. Calculate se projections dekhiye ya Get Recommendation se suggestions lijiye.";
        }
        if (englishReply.contains("The app matches funds")) {
            return "Yeh app aapke risk level aur time horizon ke basis par funds choose karta hai aur batata hai ki yeh funds aapke profile se kyun match karte hain.";
        }
        if (englishReply.contains("Low risk")) {
            return "Low risk zyada stable hota hai, medium risk growth aur stability ko balance karta hai, aur high risk zyada growth ke saath zyada ups and downs la sakta hai.";
        }
        if (englishReply.contains("Future value")) {
            return "Future value dikhata hai ki aapki investment selected fund ke assumptions ke basis par time ke saath kitni grow kar sakti hai.";
        }
        if (englishReply.contains("Mutual funds and ETFs")) {
            return "Mutual funds aur ETFs dono pooled investments hote hain. Is app mein aap unhe growth, risk aur fit ke basis par compare kar sakte hain.";
        }
        if (englishReply.contains("walk you through it")) {
            return "Main aapko step by step guide kar sakta hoon. Agar app fir bhi sahi kaam na kare, to apni team, instructor, ya official support channel se sampark kijiye.";
        }
        if (englishReply.contains("results cards")) {
            return "Results cards ka use karke projections dekhiye. Agar aapke version mein saving available hai, to compare karne ke baad investments add kijiye.";
        }
        if (englishReply.contains("compare")) {
            return "Aap funds ko expected return, volatility, cost aur long-term performance ke basis par compare kar sakte hain.";
        }
        return "Main investments, fund comparisons, risk levels, recommendations aur app se jude sawalon mein aapki madad kar sakta hoon.";
    }

    private String translateSpanish(String englishReply) {
        if (englishReply.contains("I am Atlas")) {
            return "Hola. Soy Atlas. Puedo ayudarte con inversiones, recomendaciones, niveles de riesgo y con el uso de la aplicacion.";
        }
        if (englishReply.contains("Start with three steps")) {
            return "Comienza con tres pasos:\n1. Elige uno o mas fondos.\n2. Ingresa tu monto, plazo y nivel de riesgo.\n3. Usa Calculate para proyecciones o Get Recommendation para sugerencias.";
        }
        if (englishReply.contains("The app matches funds")) {
            return "La aplicacion relaciona los fondos con tu nivel de riesgo y horizonte de inversion, y explica por que pueden ajustarse a tu perfil.";
        }
        if (englishReply.contains("Low risk")) {
            return "Riesgo bajo suele ser mas estable, riesgo medio equilibra crecimiento y estabilidad, y riesgo alto busca mas crecimiento con mas variacion.";
        }
        if (englishReply.contains("Future value")) {
            return "El valor futuro muestra como podria crecer tu inversion con el tiempo segun los supuestos de rendimiento del fondo.";
        }
        if (englishReply.contains("Mutual funds and ETFs")) {
            return "Los fondos mutuos y los ETF agrupan inversiones. En esta aplicacion puedes compararlos por crecimiento proyectado, riesgo y ajuste.";
        }
        if (englishReply.contains("walk you through it")) {
            return "Puedo guiarte paso a paso. Si la aplicacion sigue fallando, contacta a tu equipo, instructor o canal oficial de soporte.";
        }
        if (englishReply.contains("results cards")) {
            return "Usa las tarjetas de resultados para revisar proyecciones. Si tu version permite guardar, agrega inversiones despues de comparar.";
        }
        if (englishReply.contains("compare")) {
            return "Puedes comparar fondos por rendimiento esperado, volatilidad, costo y desempeno a largo plazo.";
        }
        return "Puedo ayudarte con inversiones, comparaciones de fondos, niveles de riesgo, recomendaciones y con el uso de la aplicacion.";
    }

    private String translateFrench(String englishReply) {
        if (englishReply.contains("I am Atlas")) {
            return "Bonjour. Je suis Atlas. Je peux vous aider avec les investissements, les recommandations, le niveau de risque et l utilisation de l application.";
        }
        if (englishReply.contains("Start with three steps")) {
            return "Commencez en trois etapes :\n1. Choisissez un ou plusieurs fonds.\n2. Entrez le montant, la duree et le niveau de risque.\n3. Utilisez Calculate pour les projections ou Get Recommendation pour des suggestions.";
        }
        return "Je peux vous aider avec l application, les fonds, le risque, les recommandations et les questions d investissement.";
    }

    private String formatList(List<String> items) {
        if (items == null || items.isEmpty()) {
            return "None";
        }
        return String.join(", ", items);
    }

    private String formatHistory(List<ChatRequest.ChatTurn> history) {
        if (history == null || history.isEmpty()) {
            return "- None";
        }

        StringBuilder builder = new StringBuilder();
        history.stream()
                .limit(6)
                .forEach(turn -> builder
                        .append("- ")
                        .append(nullSafe(turn.getSender()))
                        .append(": ")
                        .append(nullSafe(turn.getText()))
                        .append("\n"));
        return builder.toString().trim();
    }

    private String nullSafe(String value) {
        return value == null || value.isBlank() ? "Not set" : value;
    }

    private boolean containsAny(String text, String... phrases) {
        for (String phrase : phrases) {
            if (text.contains(phrase)) {
                return true;
            }
        }
        return false;
    }
}
