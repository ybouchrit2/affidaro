package com.aversa.admin.repository;

import com.aversa.admin.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {
    List<Client> findTop50ByOrderByCreatedAtDesc();
    List<Client> findByStatusOrderByCreatedAtDesc(String status);
    List<Client> findTop20ByNameContainingIgnoreCase(String name);
    // استخدم البصمات بدل الحقول المشفّرة للمطابقة الدقيقة
    Client findByEmailDigest(String emailDigest);
    Client findByPhoneDigest(String phoneDigest);
    long countByCreatedAtBetween(java.time.Instant start, java.time.Instant end);
}