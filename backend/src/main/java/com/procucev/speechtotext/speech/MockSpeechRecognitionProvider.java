package com.procucev.speechtotext.speech;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class MockSpeechRecognitionProvider implements SpeechRecognitionService {

    private static final Logger log = LoggerFactory.getLogger(MockSpeechRecognitionProvider.class);

    private static final String[] PARTIAL_PHRASES = {
            "Hello everyone",
            "Hello everyone, आज हम अपने",
            "Hello everyone, आज हम अपने project का",
            "Hello everyone, आज हम अपने project का progress discuss करेंगे."
    };

    @Override
    public SpeechProviderType getProviderType() {
        return SpeechProviderType.MOCK;
    }

    @Override
    public SpeechStreamSession startSession(SpeechSessionListener listener, Map<String, Object> sessionConfig) {
        log.info("Starting MockSpeechRecognitionSession");
        listener.onEvent(SpeechRecognitionEvent.status("Connected to Procucev Mock STT Engine (Hinglish Code-Switching)"));
        return new MockSession(listener);
    }

    public static class MockSession implements SpeechStreamSession {
        private final SpeechSessionListener listener;
        private final AtomicInteger chunkCounter = new AtomicInteger(0);
        private final AtomicBoolean open = new AtomicBoolean(true);

        public MockSession(SpeechSessionListener listener) {
            this.listener = listener;
        }

        @Override
        public void sendAudio(byte[] audioChunk) {
            if (!open.get()) {
                return;
            }
            int count = chunkCounter.incrementAndGet();
            // Emit simulated partial transcriptions as chunks stream in
            if (count % 3 == 0) {
                int index = Math.min((count / 3) - 1, PARTIAL_PHRASES.length - 1);
                String phrase = PARTIAL_PHRASES[index];
                if (index == PARTIAL_PHRASES.length - 1) {
                    listener.onEvent(SpeechRecognitionEvent.finalResult(phrase, "hi-IN,en-US", 0.96));
                } else {
                    listener.onEvent(SpeechRecognitionEvent.partial(phrase));
                }
            }
        }

        @Override
        public void finish() {
            if (open.compareAndSet(true, false)) {
                // Emit final segment upon finish if not already emitted
                listener.onEvent(SpeechRecognitionEvent.finalResult(
                        "Hello everyone, आज हम अपने project का progress discuss करेंगे.",
                        "hi-IN,en-US",
                        0.98
                ));
                listener.onClose(1000, "Stream finished successfully");
            }
        }

        @Override
        public void cancel() {
            if (open.compareAndSet(true, false)) {
                listener.onClose(1001, "Stream cancelled");
            }
        }

        @Override
        public boolean isOpen() {
            return open.get();
        }
    }
}
