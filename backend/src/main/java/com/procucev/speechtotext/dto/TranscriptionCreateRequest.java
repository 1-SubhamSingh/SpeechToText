package com.procucev.speechtotext.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public class TranscriptionCreateRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title cannot exceed 255 characters")
    private String title;

    @NotBlank(message = "Content is required")
    @Size(max = 100000, message = "Content cannot exceed 100,000 characters")
    private String content;

    @Size(max = 50, message = "Language tag cannot exceed 50 characters")
    private String language;

    @PositiveOrZero(message = "Duration must be greater than or equal to 0")
    private Integer durationSeconds;

    public TranscriptionCreateRequest() {
    }

    public TranscriptionCreateRequest(String title, String content, String language, Integer durationSeconds) {
        this.title = title;
        this.content = content;
        this.language = language;
        this.durationSeconds = durationSeconds;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }
}
