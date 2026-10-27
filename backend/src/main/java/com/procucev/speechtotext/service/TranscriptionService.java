package com.procucev.speechtotext.service;

import com.procucev.speechtotext.dto.PagedResponse;
import com.procucev.speechtotext.dto.TranscriptionCreateRequest;
import com.procucev.speechtotext.dto.TranscriptionResponse;
import com.procucev.speechtotext.dto.TranscriptionUpdateRequest;

public interface TranscriptionService {

    TranscriptionResponse createTranscription(TranscriptionCreateRequest request);

    PagedResponse<TranscriptionResponse> getTranscriptions(String query, int page, int size, String sortDirection);

    TranscriptionResponse getTranscriptionById(Long id);

    TranscriptionResponse updateTranscription(Long id, TranscriptionUpdateRequest request);

    void deleteTranscription(Long id);
}
