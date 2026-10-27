package com.procucev.speechtotext.speech;

public interface SpeechSessionListener {

    void onEvent(SpeechRecognitionEvent event);

    void onError(Throwable throwable);

    void onClose(int code, String reason);
}
