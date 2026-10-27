package com.procucev.speechtotext.speech;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Component
public class DeepgramSpeechProvider implements SpeechRecognitionService {

    private static final Logger log = LoggerFactory.getLogger(DeepgramSpeechProvider.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${speech.deepgram.api-key:}")
    private String apiKey;

    @Value("${speech.deepgram.model:nova-2}")
    private String defaultModel;

    @Value("${speech.deepgram.language:hi}")
    private String defaultLanguage;

    @Value("${speech.deepgram.detect-language:true}")
    private boolean detectLanguage;

    @Value("${speech.deepgram.smart-format:true}")
    private boolean smartFormat;

    @Value("${speech.deepgram.endpointing:300}")
    private int endpointing;

    public DeepgramSpeechProvider() {
    }

    public DeepgramSpeechProvider(String apiKey) {
        this.apiKey = apiKey;
    }

    @Override
    public SpeechProviderType getProviderType() {
        return SpeechProviderType.DEEPGRAM;
    }

    @Override
    public SpeechStreamSession startSession(SpeechSessionListener listener, Map<String, Object> sessionConfig) {
        if (apiKey == null || apiKey.trim().isEmpty() || "test-api-key".equals(apiKey)) {
            listener.onEvent(SpeechRecognitionEvent.error(
                    "Deepgram API Key is not configured. Please add DEEPGRAM_API_KEY to your environment or backend/.env file, or use the browser-native transcription mode."));
            return new NoOpSession();
        }

        try {
            String language = sessionConfig != null && sessionConfig.containsKey("language")
                    ? sessionConfig.get("language").toString()
                    : defaultLanguage;

            String model = sessionConfig != null && sessionConfig.containsKey("model")
                    ? sessionConfig.get("model").toString()
                    : defaultModel;

            StringBuilder urlBuilder = new StringBuilder("wss://api.deepgram.com/v1/listen?");
            urlBuilder.append("model=").append(URLEncoder.encode(model, StandardCharsets.UTF_8));
            urlBuilder.append("&encoding=linear16");
            urlBuilder.append("&sample_rate=16000");
            urlBuilder.append("&channels=1");
            urlBuilder.append("&interim_results=true");
            urlBuilder.append("&smart_format=").append(smartFormat);
            urlBuilder.append("&endpointing=").append(endpointing);

            if (detectLanguage) {
                urlBuilder.append("&detect_language=true");
            }
            if (language != null && !language.isBlank() && !"multi".equalsIgnoreCase(language)) {
                // If language like "hi-IN" or "hi", pass "hi" or full
                String langCode = language.split("-")[0];
                urlBuilder.append("&language=").append(URLEncoder.encode(langCode, StandardCharsets.UTF_8));
            }

            URI deepgramUri = URI.create(urlBuilder.toString());
            Map<String, String> httpHeaders = new HashMap<>();
            httpHeaders.put("Authorization", "Token " + apiKey.trim());

            DeepgramWebSocketSession session = new DeepgramWebSocketSession(deepgramUri, httpHeaders, listener, objectMapper);
            session.connect();
            return session;

        } catch (Exception e) {
            log.error("Failed to initialize Deepgram WebSocket session", e);
            listener.onError(e);
            return new NoOpSession();
        }
    }

    private static class DeepgramWebSocketSession extends WebSocketClient implements SpeechStreamSession {
        private final SpeechSessionListener listener;
        private final ObjectMapper objectMapper;
        private volatile boolean closed = false;

        public DeepgramWebSocketSession(URI serverUri, Map<String, String> httpHeaders,
                                       SpeechSessionListener listener, ObjectMapper objectMapper) {
            super(serverUri, httpHeaders);
            this.listener = listener;
            this.objectMapper = objectMapper;
        }

        @Override
        public void onOpen(ServerHandshake handshakedata) {
            log.info("Connected to Deepgram STT stream, status: {}", handshakedata.getHttpStatus());
            listener.onEvent(SpeechRecognitionEvent.status("Connected to Deepgram streaming engine"));
        }

        @Override
        public void onMessage(String message) {
            try {
                JsonNode root = objectMapper.readTree(message);
                if (root.has("type") && "Results".equalsIgnoreCase(root.get("type").asText())) {
                    boolean isFinal = root.path("is_final").asBoolean(false);
                    JsonNode channel = root.path("channel");
                    JsonNode alternatives = channel.path("alternatives");
                    if (alternatives.isArray() && !alternatives.isEmpty()) {
                        JsonNode first = alternatives.get(0);
                        String transcript = first.path("transcript").asText("");
                        Double confidence = first.has("confidence") ? first.path("confidence").asDouble() : 0.9;
                        String detectedLang = root.path("detected_language").asText("hi-IN,en-US");

                        if (!transcript.trim().isEmpty()) {
                            if (isFinal) {
                                listener.onEvent(SpeechRecognitionEvent.finalResult(transcript.trim(), detectedLang, confidence));
                            } else {
                                listener.onEvent(SpeechRecognitionEvent.partial(transcript.trim()));
                            }
                        }
                    }
                } else if (root.has("type") && "Metadata".equalsIgnoreCase(root.get("type").asText())) {
                    log.debug("Deepgram metadata received: {}", message);
                }
            } catch (Exception e) {
                log.warn("Error parsing Deepgram message: {}", message, e);
            }
        }

        @Override
        public void onClose(int code, String reason, boolean remote) {
            log.info("Deepgram connection closed. Code: {}, Reason: {}, Remote: {}", code, reason, remote);
            this.closed = true;
            listener.onClose(code, reason);
        }

        @Override
        public void onError(Exception ex) {
            log.error("Deepgram WebSocket error: {}", ex.getMessage(), ex);
            listener.onError(ex);
        }

        @Override
        public void sendAudio(byte[] audioChunk) {
            if (isOpen() && audioChunk != null && audioChunk.length > 0) {
                send(ByteBuffer.wrap(audioChunk));
            }
        }

        @Override
        public void finish() {
            if (isOpen()) {
                try {
                    // Send Deepgram close stream frame
                    send("{\"type\": \"CloseStream\"}");
                } catch (Exception ignored) {
                }
                close();
            }
        }

        @Override
        public void cancel() {
            close();
        }

        @Override
        public boolean isOpen() {
            return super.isOpen() && !closed;
        }
    }

    private static class NoOpSession implements SpeechStreamSession {
        @Override
        public void sendAudio(byte[] audioChunk) {}

        @Override
        public void finish() {}

        @Override
        public void cancel() {}

        @Override
        public boolean isOpen() {
            return false;
        }
    }
}
