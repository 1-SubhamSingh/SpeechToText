package com.procucev.speechtotext.speech;

import java.util.Map;

public interface SpeechRecognitionService {

    SpeechStreamSession startSession(SpeechSessionListener listener, Map<String, Object> sessionConfig);

    SpeechProviderType getProviderType();
}
