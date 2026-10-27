package com.procucev.speechtotext.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.procucev.speechtotext.speech.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TranscriptionWebSocketHandler extends AbstractWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(TranscriptionWebSocketHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SpeechProviderFactory providerFactory;

    // Map WebSocket session ID to active SpeechStreamSession
    private final Map<String, SpeechStreamSession> activeSessions = new ConcurrentHashMap<>();

    public TranscriptionWebSocketHandler(SpeechProviderFactory providerFactory) {
        this.providerFactory = providerFactory;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("Client WebSocket connected: {}", session.getId());
        sendSafe(session, SpeechRecognitionEvent.status("WebSocket connected to Procucev STT gateway"));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        try {
            JsonNode json = objectMapper.readTree(payload);
            String action = json.path("action").asText("");

            if ("start".equalsIgnoreCase(action)) {
                handleStartAction(session, json);
            } else if ("stop".equalsIgnoreCase(action)) {
                handleStopAction(session);
            } else if ("ping".equalsIgnoreCase(action)) {
                sendSafe(session, SpeechRecognitionEvent.status("pong"));
            } else {
                log.warn("Unknown WebSocket control action: {}", action);
            }
        } catch (Exception e) {
            log.error("Failed to parse client message: {}", payload, e);
            sendSafe(session, SpeechRecognitionEvent.error("Malformed command JSON: " + e.getMessage()));
        }
    }

    private void handleStartAction(WebSocketSession session, JsonNode json) {
        // Close any existing active speech session for this client
        handleStopAction(session);

        String providerName = json.path("provider").asText("");
        String language = json.path("language").asText("hi");
        String model = json.path("model").asText("nova-2");

        Map<String, Object> config = new HashMap<>();
        config.put("language", language);
        config.put("model", model);

        SpeechRecognitionService provider = providerFactory.getProvider(providerName);
        log.info("Starting speech session for client {} using provider {}", session.getId(), provider.getProviderType());

        SpeechStreamSession speechSession = provider.startSession(new SpeechSessionListener() {
            @Override
            public void onEvent(SpeechRecognitionEvent event) {
                sendSafe(session, event);
            }

            @Override
            public void onError(Throwable throwable) {
                log.error("Speech stream error for session {}: {}", session.getId(), throwable.getMessage());
                sendSafe(session, SpeechRecognitionEvent.error("Transcription error: " + throwable.getMessage()));
            }

            @Override
            public void onClose(int code, String reason) {
                log.info("Speech provider closed for session {}. Code: {}, Reason: {}", session.getId(), code, reason);
                sendSafe(session, SpeechRecognitionEvent.closed(reason != null ? reason : "Session closed"));
            }
        }, config);

        activeSessions.put(session.getId(), speechSession);
    }

    private void handleStopAction(WebSocketSession session) {
        SpeechStreamSession active = activeSessions.remove(session.getId());
        if (active != null) {
            log.info("Stopping speech session for client {}", session.getId());
            active.finish();
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        SpeechStreamSession speechSession = activeSessions.get(session.getId());
        if (speechSession != null && speechSession.isOpen()) {
            ByteBuffer byteBuffer = message.getPayload();
            byte[] bytes = new byte[byteBuffer.remaining()];
            byteBuffer.get(bytes);
            speechSession.sendAudio(bytes);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("WebSocket transport error for session {}: {}", session.getId(), exception.getMessage());
        cleanupSession(session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.info("WebSocket connection closed for session {}: {}", session.getId(), status);
        cleanupSession(session.getId());
    }

    private void cleanupSession(String sessionId) {
        SpeechStreamSession active = activeSessions.remove(sessionId);
        if (active != null) {
            try {
                active.cancel();
            } catch (Exception ignored) {
            }
        }
    }

    private void sendSafe(WebSocketSession session, SpeechRecognitionEvent event) {
        if (session != null && session.isOpen()) {
            synchronized (session) {
                try {
                    String json = objectMapper.writeValueAsString(event);
                    session.sendMessage(new TextMessage(json));
                } catch (IOException e) {
                    log.error("Failed to send WebSocket message to session {}: {}", session.getId(), e.getMessage());
                }
            }
        }
    }
}
