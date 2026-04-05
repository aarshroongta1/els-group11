import { useEffect, useMemo, useRef, useState } from "react";
import "./ChatBot.css";

const API_BASE_URL = "http://localhost:8080/api";
const SAVED_INSIGHTS_KEY = "atlas_saved_insights";
const PERSONA_NAME = "Atlas";

const QUICK_PROMPTS = [
  "How do recommendations work?",
  "Explain beta in simple words",
  "What happens in a bear market?",
  "I am stuck using the app",
];

const LANGUAGE_OPTIONS = [
  { value: "english", label: "English", speechCode: "en-US" },
  { value: "hindi", label: "Hindi", speechCode: "hi-IN" },
  { value: "spanish", label: "Spanish", speechCode: "es-ES" },
  { value: "french", label: "French", speechCode: "fr-FR" },
  { value: "arabic", label: "Arabic", speechCode: "ar-SA" },
  { value: "chinese", label: "Chinese", speechCode: "zh-CN" },
];

function buildLocalFallbackReply(message, context, language) {
  const normalized = (message || "").toLowerCase();
  const selectedFunds = context?.selectedFunds ?? [];
  const recommendedFunds = context?.recommendedFunds ?? [];

  const englishReplies = {
    welcome:
      "You are in the right place. I can help with the app, your funds, risk levels, scenarios, and recommendations.",
    recommend:
      recommendedFunds.length > 0
        ? `Your latest recommendation includes ${recommendedFunds.join(", ")}. These picks are matched to your risk level and time horizon.`
        : "Recommendations are based on your risk level, time horizon, and the funds available in the app.",
    risk:
      "Low risk is steadier, medium risk balances growth and stability, and high risk aims for stronger growth with bigger ups and downs.",
    compare:
      selectedFunds.length > 0
        ? `A smart next step is to compare ${selectedFunds.join(", ")} by return, volatility, and cost.`
        : "You can compare funds by expected return, beta, cost, and long-term performance.",
    help:
      "Start by selecting funds, entering your amount and time horizon, choosing a risk level, then using Calculate or Get Recommendation.",
    future:
      "Future value shows how your investment may grow over time based on the selected fund's return assumptions.",
    beta:
      "Beta shows how much a fund may move compared with the market. Higher beta often means bigger swings.",
    sharpe:
      "Sharpe ratio helps show return compared with risk. A higher Sharpe ratio often means stronger risk-adjusted performance.",
    expense:
      "Expense ratio is the annual cost of holding a fund. Lower costs can help more of your return stay invested.",
    scenario:
      "A bull case shows stronger growth, a base case shows a more typical path, and a bear case shows how your plan may behave in a tougher market.",
    greeting:
      "Hello. How can I help you today?",
    general:
      "I can help with that. Ask me anything, and if you want, I can give a quick answer or a simple explanation.",
  };

  let baseReply = englishReplies.welcome;
  if (normalized === "hi" || normalized === "hello" || normalized === "hey" || normalized.includes("good morning") || normalized.includes("good evening")) {
    baseReply = englishReplies.greeting;
  } else if (normalized.includes("recommend")) {
    baseReply = englishReplies.recommend;
  } else if (normalized.includes("risk")) {
    baseReply = englishReplies.risk;
  } else if (normalized.includes("compare")) {
    baseReply = englishReplies.compare;
  } else if (
    normalized.includes("stuck") ||
    normalized.includes("help") ||
    normalized.includes("how do i use") ||
    normalized.includes("how to use") ||
    normalized.includes("app")
  ) {
    baseReply = englishReplies.help;
  } else if (normalized.includes("future value") || normalized.includes("calculate")) {
    baseReply = englishReplies.future;
  } else if (normalized.includes("beta")) {
    baseReply = englishReplies.beta;
  } else if (normalized.includes("sharpe")) {
    baseReply = englishReplies.sharpe;
  } else if (normalized.includes("expense")) {
    baseReply = englishReplies.expense;
  } else if (
    normalized.includes("scenario") ||
    normalized.includes("bull") ||
    normalized.includes("bear") ||
    normalized.includes("base case")
  ) {
    baseReply = englishReplies.scenario;
  } else if (normalized.includes("who are you")) {
    baseReply = `I am ${PERSONA_NAME}, your in-app assistant. I can help with investments, the app, and general questions.`;
  } else if (normalized.includes("what can you do")) {
    baseReply = "I can explain the app, compare funds, answer investment questions, explain key metrics, and help with general questions too.";
  } else if (normalized.endsWith("?")) {
    baseReply = englishReplies.general;
  }

  if (language === "spanish") {
    if (baseReply === englishReplies.greeting) {
      return "Hola. Como puedo ayudarte hoy?";
    }
    return "Puedo ayudarte con la aplicacion, fondos, riesgo, escenarios, recomendaciones y preguntas generales.";
  }
  if (language === "hindi") {
    if (baseReply === englishReplies.greeting) {
      return "Namaste. Main aaj aapki kaise madad kar sakta hoon?";
    }
    return "Main app, funds, risk, scenarios, recommendations aur general questions mein aapki madad kar sakta hoon.";
  }
  if (language === "french") {
    if (baseReply === englishReplies.greeting) {
      return "Bonjour. Comment puis-je vous aider aujourd hui ?";
    }
    return "Je peux vous aider avec l application, les fonds, le risque, les scenarios, les recommandations et les questions generales.";
  }
  if (language === "arabic") {
    if (baseReply === englishReplies.greeting) {
      return "Hello. How can I help you today?";
    }
    return "I can help in Arabic, but the local fallback is shown in English right now.";
  }
  if (language === "chinese") {
    if (baseReply === englishReplies.greeting) {
      return "Hello. How can I help you today?";
    }
    return "I can help in Chinese, but the local fallback is shown in English right now.";
  }

  return baseReply;
}

function getSavedInsights() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_INSIGHTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function ChatBot({ context }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: `Welcome. I am ${PERSONA_NAME}, your investment guide. I can explain the app, make metrics easier to understand, and help you think through scenarios clearly.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState("english");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [savedInsights, setSavedInsights] = useState(getSavedInsights);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const selectedLanguage = useMemo(
    () => LANGUAGE_OPTIONS.find((option) => option.value === language) ?? LANGUAGE_OPTIONS[0],
    [language],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, open]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SAVED_INSIGHTS_KEY, JSON.stringify(savedInsights));
    }
  }, [savedInsights]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return undefined;
    }

    setVoiceSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = selectedLanguage.speechCode;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      setInput((prev) => (prev ? `${prev} ${transcript}`.trim() : transcript.trim()));
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [selectedLanguage]);

  const saveInsight = (text) => {
    if (!text) return;
    setSavedInsights((prev) => {
      if (prev.includes(text)) {
        return prev;
      }
      return [text, ...prev].slice(0, 6);
    });
  };

  const clearInsights = () => {
    setSavedInsights([]);
  };

  const sendMessage = async (presetMessage) => {
    const outgoingText = (presetMessage ?? input).trim();
    if (!outgoingText) return;

    const userMessage = { sender: "user", text: outgoingText };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsTyping(true);

    const history = nextMessages.slice(-6).map((messageItem) => ({
      sender: messageItem.sender,
      text: messageItem.text,
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: outgoingText,
          selectedFunds: context?.selectedFunds ?? [],
          amount: context?.amount ?? null,
          years: context?.years ?? null,
          riskLevel: context?.riskLevel ?? null,
          recommendedFunds: context?.recommendedFunds ?? [],
          preferredLanguage: language,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = await response.json();
      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : buildLocalFallbackReply(outgoingText, context, language);

      const genericBackendFallback =
        "You are in the right place. I can help with the app, your funds, risk levels, scenarios, and recommendations.";
      const finalReply =
        reply === genericBackendFallback
          ? buildLocalFallbackReply(outgoingText, context, language)
          : reply;

      setMessages((prev) => [...prev, { sender: "bot", text: finalReply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: buildLocalFallbackReply(outgoingText, context, language),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    recognitionRef.current.lang = selectedLanguage.speechCode;
    recognitionRef.current.start();
    setIsListening(true);
  };

  return (
    <>
      <button className="chatbot-button" onClick={() => setOpen((prev) => !prev)} aria-label="Open chatbot">
        <span className="chatbot-button-icon">AI</span>
      </button>

      {open && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="chatbot-header-copy">
              <div className="chatbot-title-row">
                <span className="chatbot-status-dot" />
                <h3 className="chatbot-title">{PERSONA_NAME}</h3>
              </div>
              <p className="chatbot-subtitle">Your multilingual investment guide for the app, metrics, and market scenarios</p>
            </div>

            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close chatbot">
              X
            </button>
          </div>

          <div className="chatbot-toolbar">
            <label className="chatbot-language">
              <span className="chatbot-language-label">Language</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {voiceSupported && (
              <button
                type="button"
                className={`chatbot-voice-btn${isListening ? " chatbot-voice-btn--active" : ""}`}
                onClick={handleVoiceToggle}
              >
                {isListening ? "Listening..." : "Voice"}
              </button>
            )}
          </div>

          <div className="chatbot-messages">
            <div className="chatbot-welcome-card">
              <p className="chatbot-welcome-title">Ask anything</p>
              <p className="chatbot-welcome-text">
                I can explain recommendations, beta, Sharpe ratio, expense ratio, market scenarios, and every step of the app.
              </p>
            </div>

            {savedInsights.length > 0 && (
              <div className="chatbot-insights-card">
                <div className="chatbot-insights-header">
                  <p className="chatbot-insights-title">Saved insights</p>
                  <button
                    type="button"
                    className="chatbot-clear-insights"
                    onClick={clearInsights}
                  >
                    Clear
                  </button>
                </div>
                <div className="chatbot-insights-list">
                  {savedInsights.map((insight) => (
                    <button
                      key={insight}
                      type="button"
                      className="chatbot-saved-insight"
                      onClick={() => setInput(insight)}
                    >
                      {insight}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="chatbot-quick-prompts">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="chatbot-prompt-chip"
                  onClick={() => sendMessage(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {messages.map((msg, index) => (
              <div key={`${msg.sender}-${index}`} className={`chatbot-row chatbot-row--${msg.sender}`}>
                {msg.sender === "bot" && <div className="chatbot-avatar">AT</div>}
                <div className="chatbot-message-wrap">
                  <div className={`chatbot-message chatbot-message--${msg.sender}`}>{msg.text}</div>
                  {msg.sender === "bot" && (
                    <button
                      type="button"
                      className="chatbot-save-insight"
                      onClick={() => saveInsight(msg.text)}
                    >
                      Save insight
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chatbot-row chatbot-row--bot">
                <div className="chatbot-avatar">AT</div>
                <div className="chatbot-message-wrap">
                  <div className="chatbot-message chatbot-message--bot chatbot-message--typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the app, metrics, scenarios, recommendations, or use voice..."
            />
            <button onClick={() => sendMessage()} type="button">
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBot;
