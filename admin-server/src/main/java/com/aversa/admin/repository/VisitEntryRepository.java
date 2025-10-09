package com.aversa.admin.repository;

import com.aversa.admin.model.VisitEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface VisitEntryRepository extends JpaRepository<VisitEntry, Long> {
    List<VisitEntry> findTop20ByOrderByTimestampDesc();
    long countByTimestampBetween(Instant start, Instant end);
}