package com.procucev.speechtotext.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.procucev.speechtotext.dto.PagedResponse;
import com.procucev.speechtotext.dto.TranscriptionCreateRequest;
import com.procucev.speechtotext.dto.TranscriptionResponse;
import com.procucev.speechtotext.dto.TranscriptionUpdateRequest;
import com.procucev.speechtotext.exception.ResourceNotFoundException;
import com.procucev.speechtotext.service.TranscriptionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TranscriptionController.class)
class TranscriptionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TranscriptionService transcriptionService;

    @Test
    @DisplayName("POST /api/transcriptions should return 201 Created with valid payload")
    void createTranscription_Valid_Returns201() throws Exception {
        TranscriptionCreateRequest request = new TranscriptionCreateRequest(
                "Hindi-English Team Standup",
                "Hello everyone, आज हम अपने project का progress discuss करेंगे.",
                "hi-IN,en-US",
                30
        );

        TranscriptionResponse response = new TranscriptionResponse(
                1L,
                request.getTitle(),
                request.getContent(),
                request.getLanguage(),
                request.getDurationSeconds(),
                OffsetDateTime.now(ZoneOffset.UTC),
                OffsetDateTime.now(ZoneOffset.UTC)
        );

        when(transcriptionService.createTranscription(any(TranscriptionCreateRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/transcriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("Hindi-English Team Standup"))
                .andExpect(jsonPath("$.content").value("Hello everyone, आज हम अपने project का progress discuss करेंगे."))
                .andExpect(jsonPath("$.language").value("hi-IN,en-US"));
    }

    @Test
    @DisplayName("POST /api/transcriptions should return 400 Bad Request when title is blank")
    void createTranscription_BlankTitle_Returns400() throws Exception {
        TranscriptionCreateRequest request = new TranscriptionCreateRequest(
                "",
                "Some valid content",
                "en-US",
                10
        );

        mockMvc.perform(post("/api/transcriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }

    @Test
    @DisplayName("GET /api/transcriptions should return 200 OK with paged list")
    void getTranscriptions_Returns200() throws Exception {
        TranscriptionResponse item = new TranscriptionResponse(
                1L, "Meeting", "Content", "en-US", 15,
                OffsetDateTime.now(ZoneOffset.UTC), OffsetDateTime.now(ZoneOffset.UTC)
        );
        PagedResponse<TranscriptionResponse> pagedResponse = new PagedResponse<>(
                List.of(item), 0, 10, 1, 1, true, true, false
        );

        when(transcriptionService.getTranscriptions(any(), anyInt(), anyInt(), anyString()))
                .thenReturn(pagedResponse);

        mockMvc.perform(get("/api/transcriptions")
                        .param("query", "Meeting")
                        .param("page", "0")
                        .param("size", "10")
                        .param("sort", "desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /api/transcriptions/{id} should return 200 OK when found")
    void getTranscriptionById_Found_Returns200() throws Exception {
        TranscriptionResponse response = new TranscriptionResponse(
                1L, "Single", "Content", "en-US", 15,
                OffsetDateTime.now(ZoneOffset.UTC), OffsetDateTime.now(ZoneOffset.UTC)
        );

        when(transcriptionService.getTranscriptionById(1L)).thenReturn(response);

        mockMvc.perform(get("/api/transcriptions/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("Single"));
    }

    @Test
    @DisplayName("GET /api/transcriptions/{id} should return 404 when not found")
    void getTranscriptionById_NotFound_Returns404() throws Exception {
        when(transcriptionService.getTranscriptionById(999L))
                .thenThrow(new ResourceNotFoundException("Transcription", 999L));

        mockMvc.perform(get("/api/transcriptions/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("PUT /api/transcriptions/{id} should return 200 OK on update")
    void updateTranscription_Returns200() throws Exception {
        TranscriptionUpdateRequest updateRequest = new TranscriptionUpdateRequest(
                "Updated", "New Content", "hi-IN", 25
        );
        TranscriptionResponse response = new TranscriptionResponse(
                1L, "Updated", "New Content", "hi-IN", 25,
                OffsetDateTime.now(ZoneOffset.UTC), OffsetDateTime.now(ZoneOffset.UTC)
        );

        when(transcriptionService.updateTranscription(eq(1L), any(TranscriptionUpdateRequest.class)))
                .thenReturn(response);

        mockMvc.perform(put("/api/transcriptions/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated"));
    }

    @Test
    @DisplayName("DELETE /api/transcriptions/{id} should return 204 No Content")
    void deleteTranscription_Returns204() throws Exception {
        doNothing().when(transcriptionService).deleteTranscription(1L);

        mockMvc.perform(delete("/api/transcriptions/1"))
                .andExpect(status().isNoContent());

        verify(transcriptionService, times(1)).deleteTranscription(1L);
    }
}
