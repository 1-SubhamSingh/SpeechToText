package com.procucev.speechtotext.repository;

import com.procucev.speechtotext.entity.Transcription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TranscriptionRepository extends JpaRepository<Transcription, Long> {

    @Query("SELECT t FROM Transcription t WHERE " +
           "(:query IS NULL OR :query = '' OR " +
           "LOWER(t.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(t.content) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Transcription> searchTranscriptions(@Param("query") String query, Pageable pageable);
}
