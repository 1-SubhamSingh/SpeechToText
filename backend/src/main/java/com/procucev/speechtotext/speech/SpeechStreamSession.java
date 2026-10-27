package com.procucev.speechtotext.speech;

public interface SpeechStreamSession {

    void sendAudio(byte[] audioChunk);

    void finish();

    void cancel();

    boolean isOpen();
}
