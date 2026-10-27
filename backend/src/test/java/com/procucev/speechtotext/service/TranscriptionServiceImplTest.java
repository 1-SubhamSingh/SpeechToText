package com.procucev.speechtotext.service;

import com.procucev.speechtotext.dto.PagedResponse;
import com.procucev.speechtotext.dto.TranscriptionCreateRequest;
import com.procucev.speechtotext.dto.TranscriptionResponse;
import com.procucev.speechtotext.dto.TranscriptionUpdateRequest;
import com.procucev.speechtotext.entity.Transcription;
import com.procucev.speechtotext.exception.ResourceNotFoundException;
import com.procucev.speechtotext.repository.TranscriptionRepository;
import com.procucev.speechtotext.service.impl.TranscriptionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TranscriptionServiceImplTest {

    @Mock
    private TranscriptionRepository transcriptionRepository;

    @InjectMocks
    private TranscriptionServiceImpl transcriptionService;

    private Transcription sampleEntity;

    @BeforeEach
    void setUp() {
        sampleEntity = new Transcription(
                "Sprint Planning Notes",
                "Hello everyone, आज हम अपने project का progress discuss करेंगे.",
                "hi-IN,en-US",
                45
        );
        sampleEntity.setId(1L);
        sampleEntity.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        sampleEntity.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    }

    @Test
    @DisplayName("Should create and return a new transcription successfully")
    void createTranscription_Success() {
        TranscriptionCreateRequest request = new TranscriptionCreateRequest(
                "Sprint Planning Notes",
                "Hello everyone, आज हम अपने project का progress discuss करेंगे.",
                "hi-IN,en-US",
                45
        );

        when(transcriptionRepository.save(any(Transcription.class))).thenReturn(sampleEntity);

        TranscriptionResponse response = transcriptionService.createTranscription(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getTitle()).isEqualTo("Sprint Planning Notes");
        assertThat(response.getContent()).contains("Hello everyone");
        assertThat(response.getLanguage()).isEqualTo("hi-IN,en-US");
        assertThat(response.getWordCount()).isGreaterThan(0);
        verify(transcriptionRepository, times(1)).save(any(Transcription.class));
    }

    @Test
    @DisplayName("Should retrieve paged transcriptions without search query")
    void getTranscriptions_WithoutQuery() {
        Page<Transcription> page = new PageImpl<>(List.of(sampleEntity));
        when(transcriptionRepository.findAll(any(Pageable.class))).thenReturn(page);

        PagedResponse<TranscriptionResponse> result = transcriptionService.getTranscriptions(null, 0, 10, "desc");

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTitle()).isEqualTo("Sprint Planning Notes");
        verify(transcriptionRepository, times(1)).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("Should search transcriptions when query is provided")
    void getTranscriptions_WithSearchQuery() {
        Page<Transcription> page = new PageImpl<>(List.of(sampleEntity));
        when(transcriptionRepository.searchTranscriptions(eq("project"), any(Pageable.class))).thenReturn(page);

        PagedResponse<TranscriptionResponse> result = transcriptionService.getTranscriptions("project", 0, 10, "desc");

        assertThat(result.getContent()).hasSize(1);
        verify(transcriptionRepository, times(1)).searchTranscriptions(eq("project"), any(Pageable.class));
    }

    @Test
    @DisplayName("Should retrieve a single transcription by ID")
    void getTranscriptionById_Success() {
        when(transcriptionRepository.findById(1L)).thenReturn(Optional.of(sampleEntity));

        TranscriptionResponse response = transcriptionService.getTranscriptionById(1L);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getTitle()).isEqualTo("Sprint Planning Notes");
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when ID does not exist")
    void getTranscriptionById_NotFound() {
        when(transcriptionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transcriptionService.getTranscriptionById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    @DisplayName("Should update existing transcription successfully")
    void updateTranscription_Success() {
        TranscriptionUpdateRequest updateRequest = new TranscriptionUpdateRequest(
                "Updated Title",
                "Updated transcript content",
                "en-US",
                60
        );

        when(transcriptionRepository.findById(1L)).thenReturn(Optional.of(sampleEntity));
        when(transcriptionRepository.save(any(Transcription.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TranscriptionResponse updated = transcriptionService.updateTranscription(1L, updateRequest);

        assertThat(updated.getTitle()).isEqualTo("Updated Title");
        assertThat(updated.getContent()).isEqualTo("Updated transcript content");
        assertThat(updated.getLanguage()).isEqualTo("en-US");
        verify(transcriptionRepository, times(1)).save(sampleEntity);
    }

    @Test
    @DisplayName("Should delete transcription when exists")
    void deleteTranscription_Success() {
        when(transcriptionRepository.existsById(1L)).thenReturn(true);
        doNothing().when(transcriptionRepository).deleteById(1L);

        transcriptionService.deleteTranscription(1L);

        verify(transcriptionRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent ID")
    void deleteTranscription_NotFound() {
        when(transcriptionRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> transcriptionService.deleteTranscription(999L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(transcriptionRepository, never()).deleteById(anyLong());
    }
}
