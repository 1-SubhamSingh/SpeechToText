package com.procucev.speechtotext.service.impl;

import com.procucev.speechtotext.dto.PagedResponse;
import com.procucev.speechtotext.dto.TranscriptionCreateRequest;
import com.procucev.speechtotext.dto.TranscriptionResponse;
import com.procucev.speechtotext.dto.TranscriptionUpdateRequest;
import com.procucev.speechtotext.entity.Transcription;
import com.procucev.speechtotext.exception.ResourceNotFoundException;
import com.procucev.speechtotext.repository.TranscriptionRepository;
import com.procucev.speechtotext.service.TranscriptionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TranscriptionServiceImpl implements TranscriptionService {

    private final TranscriptionRepository transcriptionRepository;

    public TranscriptionServiceImpl(TranscriptionRepository transcriptionRepository) {
        this.transcriptionRepository = transcriptionRepository;
    }

    @Override
    public TranscriptionResponse createTranscription(TranscriptionCreateRequest request) {
        Transcription transcription = new Transcription(
                request.getTitle().trim(),
                request.getContent().trim(),
                request.getLanguage() != null && !request.getLanguage().isBlank() ? request.getLanguage().trim() : "hi-IN,en-US",
                request.getDurationSeconds() != null ? request.getDurationSeconds() : 0
        );

        Transcription saved = transcriptionRepository.save(transcription);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<TranscriptionResponse> getTranscriptions(String query, int page, int size, String sortDirection) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(100, size));
        Sort sort = "asc".equalsIgnoreCase(sortDirection) ? Sort.by("createdAt").ascending() : Sort.by("createdAt").descending();
        Pageable pageable = PageRequest.of(safePage, safeSize, sort);

        Page<Transcription> resultPage;
        if (query != null && !query.trim().isEmpty()) {
            resultPage = transcriptionRepository.searchTranscriptions(query.trim(), pageable);
        } else {
            resultPage = transcriptionRepository.findAll(pageable);
        }

        List<TranscriptionResponse> content = resultPage.getContent().stream()
                .map(this::mapToResponse)
                .toList();

        return new PagedResponse<>(
                content,
                resultPage.getNumber(),
                resultPage.getSize(),
                resultPage.getTotalElements(),
                resultPage.getTotalPages(),
                resultPage.isLast(),
                resultPage.isFirst(),
                resultPage.isEmpty()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public TranscriptionResponse getTranscriptionById(Long id) {
        Transcription transcription = transcriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transcription", id));
        return mapToResponse(transcription);
    }

    @Override
    public TranscriptionResponse updateTranscription(Long id, TranscriptionUpdateRequest request) {
        Transcription transcription = transcriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transcription", id));

        transcription.setTitle(request.getTitle().trim());
        transcription.setContent(request.getContent().trim());
        if (request.getLanguage() != null && !request.getLanguage().isBlank()) {
            transcription.setLanguage(request.getLanguage().trim());
        }
        if (request.getDurationSeconds() != null) {
            transcription.setDurationSeconds(request.getDurationSeconds());
        }

        Transcription updated = transcriptionRepository.save(transcription);
        return mapToResponse(updated);
    }

    @Override
    public void deleteTranscription(Long id) {
        if (!transcriptionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Transcription", id);
        }
        transcriptionRepository.deleteById(id);
    }

    private TranscriptionResponse mapToResponse(Transcription entity) {
        return new TranscriptionResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getContent(),
                entity.getLanguage(),
                entity.getDurationSeconds(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
