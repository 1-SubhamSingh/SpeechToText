package com.procucev.speechtotext.speech;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

class SpeechProviderTest {

    @Test
    @DisplayName("Mock provider should emit status, partials and final result")
    void mockProvider_EmitsExpectedEvents() {
        MockSpeechRecognitionProvider provider = new MockSpeechRecognitionProvider();
        List<SpeechRecognitionEvent> events = new ArrayList<>();
        AtomicBoolean closed = new AtomicBoolean(false);

        SpeechStreamSession session = provider.startSession(new SpeechSessionListener() {
            @Override
            public void onEvent(SpeechRecognitionEvent event) {
                events.add(event);
            }

            @Override
            public void onError(Throwable throwable) {
            }

            @Override
            public void onClose(int code, String reason) {
                closed.set(true);
            }
        }, Map.of("language", "hi"));

        assertThat(session.isOpen()).isTrue();
        assertThat(events).isNotEmpty();
        assertThat(events.get(0).getType()).isEqualTo(SpeechRecognitionEvent.Type.STATUS);

        // Send 10 chunks to trigger partials
        byte[] dummyChunk = new byte[320];
        for (int i = 0; i < 10; i++) {
            session.sendAudio(dummyChunk);
        }

        // Verify partial events were received
        boolean hasPartial = events.stream().anyMatch(e -> e.getType() == SpeechRecognitionEvent.Type.PARTIAL);
        assertThat(hasPartial).isTrue();

        // Finish session and check final event
        session.finish();
        boolean hasFinal = events.stream().anyMatch(e -> e.getType() == SpeechRecognitionEvent.Type.FINAL);
        assertThat(hasFinal).isTrue();
        assertThat(closed.get()).isTrue();
    }

    @Test
    @DisplayName("SpeechProviderFactory should resolve configured providers")
    void providerFactory_ResolvesCorrectly() {
        MockSpeechRecognitionProvider mockProvider = new MockSpeechRecognitionProvider();
        DeepgramSpeechProvider deepgramProvider = new DeepgramSpeechProvider("test-key");

        SpeechProviderFactory factory = new SpeechProviderFactory(List.of(mockProvider, deepgramProvider));

        SpeechRecognitionService resolvedMock = factory.getProvider("mock");
        assertThat(resolvedMock.getProviderType()).isEqualTo(SpeechProviderType.MOCK);

        SpeechRecognitionService resolvedDeepgram = factory.getProvider("deepgram");
        assertThat(resolvedDeepgram.getProviderType()).isEqualTo(SpeechProviderType.DEEPGRAM);

        // Unknown fallback
        SpeechRecognitionService resolvedDefault = factory.getProvider("unknown-provider");
        assertThat(resolvedDefault).isNotNull();
    }

    @Test
    @DisplayName("Deepgram provider should emit error event when API key is missing")
    void deepgramProvider_MissingKey_EmitsError() {
        DeepgramSpeechProvider deepgramProvider = new DeepgramSpeechProvider("");
        List<SpeechRecognitionEvent> events = new ArrayList<>();

        SpeechStreamSession session = deepgramProvider.startSession(new SpeechSessionListener() {
            @Override
            public void onEvent(SpeechRecognitionEvent event) {
                events.add(event);
            }

            @Override
            public void onError(Throwable throwable) {}

            @Override
            public void onClose(int code, String reason) {}
        }, Map.of());

        assertThat(events).hasSize(1);
        assertThat(events.get(0).getType()).isEqualTo(SpeechRecognitionEvent.Type.ERROR);
        assertThat(events.get(0).getMessage()).contains("Deepgram API Key is not configured");
        assertThat(session.isOpen()).isFalse();
    }
}
