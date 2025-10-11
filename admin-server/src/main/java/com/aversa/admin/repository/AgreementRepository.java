package com.aversa.admin.repository;

import com.aversa.admin.model.Agreement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgreementRepository extends JpaRepository<Agreement, Long> {
    List<Agreement> findTop50ByOrderByCreatedAtDesc();
    List<Agreement> findByClient_IdOrderBySignedAtDesc(Long clientId);
    long countByCreatedAtBetween(java.time.Instant start, java.time.Instant end);
    void deleteByClient_Id(Long clientId);
}