package com.procucev.speechtotext.controller;

import com.procucev.speechtotext.dto.PagedResponse;
import com.procucev.speechtotext.dto.TranscriptionCreateRequest;
import com.procucev.speechtotext.dto.TranscriptionResponse;
import com.procucev.speechtotext.dto.TranscriptionUpdateRequest;
import com.procucev.speechtotext.service.TranscriptionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transcriptions")
public class TranscriptionController {

    private final TranscriptionService transcriptionService;

    public TranscriptionController(TranscriptionService transcriptionService) {
        this.transcriptionService = transcriptionService;
    }

    @PostMapping
    public ResponseEntity<TranscriptionResponse> createTranscription(
            @Valid @RequestBody TranscriptionCreateRequest request) {
        TranscriptionResponse created = transcriptionService.createTranscription(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<PagedResponse<TranscriptionResponse>> getTranscriptions(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "desc") String sort) {
        PagedResponse<TranscriptionResponse> response = transcriptionService.getTranscriptions(query, page, size, sort);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TranscriptionResponse> getTranscriptionById(@PathVariable Long id) {
        TranscriptionResponse response = transcriptionService.getTranscriptionById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TranscriptionResponse> updateTranscription(
            @PathVariable Long id,
            @Valid @RequestBody TranscriptionUpdateRequest request) {
        TranscriptionResponse updated = transcriptionService.updateTranscription(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTranscription(@PathVariable Long id) {
        transcriptionService.deleteTranscription(id);
        return ResponseEntity.noContent().build();
    }
}
