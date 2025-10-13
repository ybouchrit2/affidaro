package com.aversa.admin.repository;

import com.aversa.admin.model.InteractionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.Instant;

@Repository
public interface InteractionLogRepository extends JpaRepository<InteractionLog, Long> {
    List<InteractionLog> findByClient_IdOrderByTimestampDesc(Long clientId);
    void deleteByClient_Id(Long clientId);

    // Global queries for Logs page
    List<InteractionLog> findTop200ByOrderByTimestampDesc();
    List<InteractionLog> findByTimestampBetweenOrderByTimestampDesc(Instant start, Instant end);
}