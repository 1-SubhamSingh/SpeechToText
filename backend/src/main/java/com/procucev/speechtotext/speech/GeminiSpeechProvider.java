package com.procucev.speechtotext.speech;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.nio.ByteBuffer;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Gemini Live API real-time speech-to-text provider.
 *
 * Uses the Gemini 2.0 Flash Live model via bidirectional WebSocket streaming.
 * Audio (16kHz, 16-bit PCM, mono) is streamed to Gemini as base64-encoded chunks.
 * Gemini returns incremental transcription text events in real time.
 *
 * Protocol:
 *   1. Connect to wss://generativelanguage.googleapis.com/ws/...BidiGenerateContent?key={API_KEY}
 *   2. Send a BidiGenerateContentSetup message with model and system instructions
 *   3. Send BidiGenerateContentRealtimeInput messages with base64 audio chunks
 *   4. Receive BidiGenerateContentServerContent with text parts (incremental transcription)
 *   5. Send BidiGenerateContentClientContent with turnComplete=true to signal end of turn
 */
@Component
public class GeminiSpeechProvider implements SpeechRecognitionService {

    private static final Logger log = LoggerFactory.getLogger(GeminiSpeechProvider.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    // Gemini Live API WebSocket endpoint
    private static final String GEMINI_LIVE_WS_URL =
            "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

    // Model to use for live streaming
    private static final String GEMINI_MODEL = "models/gemini-2.0-flash-live-001";

    @Value("${speech.gemini.api-key:}")
    private String apiKey;

    @Override
    public SpeechProviderType getProviderType() {
        return SpeechProviderType.GEMINI;
    }

    @Override
    public SpeechStreamSession startSession(SpeechSessionListener listener, Map<String, Object> sessionConfig) {
        if (apiKey == null || apiKey.isBlank()) {
            listener.onEvent(SpeechRecognitionEvent.error(
                    "Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file and restart the backend."));
            return new NoOpSession();
        }

        String language = sessionConfig != null && sessionConfig.containsKey("language")
                ? sessionConfig.get("language").toString()
                : "hi-IN";

        try {
            String wsUrl = GEMINI_LIVE_WS_URL + "?key=" + apiKey.trim();
            GeminiWebSocketSession session = new GeminiWebSocketSession(
                    URI.create(wsUrl), listener, language);
            session.connect();

            // Wait for connection + setup acknowledgement (up to 12 seconds)
            if (!session.awaitReady(12)) {
                listener.onEvent(SpeechRecognitionEvent.error(
                        "Gemini Live API connection timed out. Check your API key and network."));
                session.cancel();
                return new NoOpSession();
            }

            return session;

        } catch (Exception e) {
            log.error("Failed to initialise Gemini Live session", e);
            listener.onError(e);
            return new NoOpSession();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Inner WebSocket session class
    // ─────────────────────────────────────────────────────────────────────────

    private static class GeminiWebSocketSession extends WebSocketClient implements SpeechStreamSession {

        private final SpeechSessionListener listener;
        private final String language;
        private final AtomicBoolean closed = new AtomicBoolean(false);
        private final AtomicBoolean setupAcknowledged = new AtomicBoolean(false);
        private final CountDownLatch readyLatch = new CountDownLatch(1);

        // Buffer to accumulate partial transcription text within a server turn
        private final StringBuilder partialBuffer = new StringBuilder();

        GeminiWebSocketSession(URI serverUri, SpeechSessionListener listener, String language) {
            super(serverUri);
            this.listener = listener;
            this.language = language;
        }

        boolean awaitReady(int timeoutSeconds) throws InterruptedException {
            return readyLatch.await(timeoutSeconds, TimeUnit.SECONDS);
        }

        @Override
        public void onOpen(ServerHandshake handshakedata) {
            log.info("Gemini Live WebSocket connected, HTTP status: {}", handshakedata.getHttpStatus());
            listener.onEvent(SpeechRecognitionEvent.status("Connected to Gemini Live API — sending setup…"));
            sendSetupMessage();
        }

        /**
         * Build and send the BidiGenerateContentSetup message.
         * We instruct the model to act as a transcription engine.
         */
        private void sendSetupMessage() {
            try {
                ObjectNode root = MAPPER.createObjectNode();
                ObjectNode setup = root.putObject("setup");
                setup.put("model", GEMINI_MODEL);

                // Generation config — output as text only
                ObjectNode genConfig = setup.putObject("generationConfig");
                genConfig.put("responseModalities", "TEXT");

                // System instruction: pure transcription mode
                ObjectNode systemInstruction = setup.putObject("systemInstruction");
                ArrayNode parts = systemInstruction.putArray("parts");
                ObjectNode part = parts.addObject();
                part.put("text",
                        "You are a real-time speech-to-text transcription engine. " +
                        "The user is speaking in Hindi, English, or a mix (Hinglish / code-switching). " +
                        "Transcribe the audio faithfully, preserving the language used. " +
                        "Do NOT translate. Do NOT add explanations. Output ONLY the verbatim transcription text. " +
                        "If the audio is silent or unclear, output nothing.");

                send(MAPPER.writeValueAsString(root));
                log.debug("Gemini setup message sent");
            } catch (Exception e) {
                log.error("Failed to send Gemini setup message", e);
                listener.onError(e);
            }
        }

        @Override
        public void onMessage(String message) {
            try {
                JsonNode root = MAPPER.readTree(message);

                // ── Setup acknowledgement ─────────────────────────────────
                if (root.has("setupComplete")) {
                    log.info("Gemini Live setup acknowledged — ready to receive audio");
                    setupAcknowledged.set(true);
                    readyLatch.countDown();
                    listener.onEvent(SpeechRecognitionEvent.status(
                            "Gemini Live ready — speak now (Hindi / English / Hinglish)"));
                    return;
                }

                // ── Server content (transcription response) ───────────────
                if (root.has("serverContent")) {
                    JsonNode serverContent = root.get("serverContent");
                    boolean turnComplete = serverContent.path("turnComplete").asBoolean(false);
                    boolean interrupted = serverContent.path("interrupted").asBoolean(false);

                    JsonNode modelTurn = serverContent.path("modelTurn");
                    if (!modelTurn.isMissingNode()) {
                        JsonNode parts = modelTurn.path("parts");
                        if (parts.isArray()) {
                            for (JsonNode part : parts) {
                                String text = part.path("text").asText("").trim();
                                if (!text.isEmpty()) {
                                    partialBuffer.append(text).append(" ");
                                    // Emit partial update immediately so the UI shows live text
                                    listener.onEvent(SpeechRecognitionEvent.partial(
                                            partialBuffer.toString().trim()));
                                }
                            }
                        }
                    }

                    // When the server signals turn is complete → emit as final
                    if (turnComplete || interrupted) {
                        String accumulated = partialBuffer.toString().trim();
                        partialBuffer.setLength(0); // reset buffer
                        if (!accumulated.isEmpty()) {
                            listener.onEvent(SpeechRecognitionEvent.finalResult(
                                    accumulated, language, 1.0));
                        }
                    }
                    return;
                }

                // ── Tool-call or other control messages ───────────────────
                if (root.has("toolCall") || root.has("toolCallCancellation")) {
                    log.debug("Gemini tool message received (ignored): {}", message.substring(0, Math.min(200, message.length())));
                    return;
                }

                // ── Error messages ─────────────────────────────────────────
                if (root.has("error")) {
                    String errMsg = root.path("error").path("message").asText("Unknown Gemini error");
                    int errCode = root.path("error").path("code").asInt(0);
                    log.error("Gemini returned error {}: {}", errCode, errMsg);
                    listener.onEvent(SpeechRecognitionEvent.error("Gemini error " + errCode + ": " + errMsg));
                    return;
                }

                log.debug("Gemini unhandled message: {}", message.substring(0, Math.min(300, message.length())));

            } catch (Exception e) {
                log.warn("Error parsing Gemini message", e);
            }
        }

        @Override
        public void onClose(int code, String reason, boolean remote) {
            closed.set(true);
            readyLatch.countDown(); // unblock awaitReady in case closed before ack
            log.info("Gemini WebSocket closed. Code={}, Reason={}, Remote={}", code, reason, remote);

            // Flush any remaining partial text as a final result
            String remaining = partialBuffer.toString().trim();
            if (!remaining.isEmpty()) {
                listener.onEvent(SpeechRecognitionEvent.finalResult(remaining, language, 1.0));
                partialBuffer.setLength(0);
            }

            listener.onClose(code, reason != null ? reason : "Gemini session ended");
        }

        @Override
        public void onError(Exception ex) {
            log.error("Gemini WebSocket error: {}", ex.getMessage(), ex);
            listener.onError(ex);
        }

        // ── SpeechStreamSession implementation ───────────────────────────

        @Override
        public void sendAudio(byte[] audioChunk) {
            if (!isOpen() || audioChunk == null || audioChunk.length == 0) return;

            try {
                // Build BidiGenerateContentRealtimeInput with audio data
                ObjectNode root = MAPPER.createObjectNode();
                ObjectNode realtimeInput = root.putObject("realtimeInput");
                ObjectNode mediaChunk = realtimeInput.putObject("mediaChunks");
                mediaChunk.put("mimeType", "audio/pcm;rate=16000");
                mediaChunk.put("data", Base64.getEncoder().encodeToString(audioChunk));

                send(MAPPER.writeValueAsString(root));
            } catch (Exception e) {
                log.warn("Failed to send audio chunk to Gemini: {}", e.getMessage());
            }
        }

        @Override
        public void finish() {
            if (isOpen()) {
                try {
                    // Signal end of turn so Gemini finalises the transcription
                    ObjectNode root = MAPPER.createObjectNode();
                    ObjectNode clientContent = root.putObject("clientContent");
                    clientContent.put("turnComplete", true);
                    send(MAPPER.writeValueAsString(root));
                    log.debug("Sent turnComplete to Gemini");
                } catch (Exception ignored) {}

                // Flush remaining partial
                String remaining = partialBuffer.toString().trim();
                if (!remaining.isEmpty()) {
                    listener.onEvent(SpeechRecognitionEvent.finalResult(remaining, language, 1.0));
                    partialBuffer.setLength(0);
                }
                close();
            }
        }

        @Override
        public void cancel() {
            closed.set(true);
            readyLatch.countDown();
            try {
                close();
            } catch (Exception ignored) {}
        }

        @Override
        public boolean isOpen() {
            return super.isOpen() && !closed.get();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // No-op session (used on error / missing API key)
    // ─────────────────────────────────────────────────────────────────────────

    private static class NoOpSession implements SpeechStreamSession {
        @Override public void sendAudio(byte[] audioChunk) {}
        @Override public void finish() {}
        @Override public void cancel() {}
        @Override public boolean isOpen() { return false; }
    }
}
