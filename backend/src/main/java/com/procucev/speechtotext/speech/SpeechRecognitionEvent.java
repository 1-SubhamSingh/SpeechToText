package com.procucev.speechtotext.speech;

public class SpeechRecognitionEvent {

    public enum Type {
        PARTIAL,
        FINAL,
        STATUS,
        ERROR,
        CLOSED
    }

    private Type type;
    private String text;
    private boolean isFinal;
    private String language;
    private Double confidence;
    private String message;

    public SpeechRecognitionEvent() {
    }

    public static SpeechRecognitionEvent partial(String text) {
        SpeechRecognitionEvent event = new SpeechRecognitionEvent();
        event.type = Type.PARTIAL;
        event.text = text;
        event.isFinal = false;
        return event;
    }

    public static SpeechRecognitionEvent finalResult(String text, String language, Double confidence) {
        SpeechRecognitionEvent event = new SpeechRecognitionEvent();
        event.type = Type.FINAL;
        event.text = text;
        event.isFinal = true;
        event.language = language;
        event.confidence = confidence;
        return event;
    }

    public static SpeechRecognitionEvent status(String message) {
        SpeechRecognitionEvent event = new SpeechRecognitionEvent();
        event.type = Type.STATUS;
        event.message = message;
        return event;
    }

    public static SpeechRecognitionEvent error(String message) {
        SpeechRecognitionEvent event = new SpeechRecognitionEvent();
        event.type = Type.ERROR;
        event.message = message;
        return event;
    }

    public static SpeechRecognitionEvent closed(String reason) {
        SpeechRecognitionEvent event = new SpeechRecognitionEvent();
        event.type = Type.CLOSED;
        event.message = reason;
        return event;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public boolean isFinal() {
        return isFinal;
    }

    public void setFinal(boolean aFinal) {
        isFinal = aFinal;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
