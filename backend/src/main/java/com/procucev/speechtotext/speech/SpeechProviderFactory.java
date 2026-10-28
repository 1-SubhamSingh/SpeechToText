package com.procucev.speechtotext.speech;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class SpeechProviderFactory {

    private final Map<SpeechProviderType, SpeechRecognitionService> providers;

    @Value("${speech.provider:gemini}")
    private String defaultProviderName;

    public SpeechProviderFactory(List<SpeechRecognitionService> serviceList) {
        this.providers = serviceList.stream()
                .collect(Collectors.toMap(SpeechRecognitionService::getProviderType, Function.identity()));
    }

    public SpeechRecognitionService getProvider(String providerName) {
        String targetName = (providerName != null && !providerName.isBlank()) ? providerName : defaultProviderName;
        try {
            SpeechProviderType type = SpeechProviderType.valueOf(targetName.trim().toUpperCase());
            SpeechRecognitionService service = providers.get(type);
            if (service != null) {
                return service;
            }
        } catch (IllegalArgumentException ignored) {
        }
        // Fallback chain: GEMINI → MOCK
        SpeechRecognitionService gemini = providers.get(SpeechProviderType.GEMINI);
        if (gemini != null) return gemini;
        return providers.get(SpeechProviderType.MOCK);
    }

    public SpeechRecognitionService getDefaultProvider() {
        return getProvider(defaultProviderName);
    }
}
