package com.aversa.admin.repository;

import com.aversa.admin.model.VisitEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Repository
public interface VisitEntryRepository extends JpaRepository<VisitEntry, Long> {
    List<VisitEntry> findTop20ByOrderByTimestampDesc();
    long countByTimestampBetween(Instant start, Instant end);

    @Query("select coalesce(v.page, '/') as page, count(v) as cnt from VisitEntry v group by coalesce(v.page, '/')")
    List<Object[]> countByPage();

    @Query("select avg(v.durationMs) from VisitEntry v where v.durationMs is not null and v.durationMs > 0")
    Double averageDuration();
}