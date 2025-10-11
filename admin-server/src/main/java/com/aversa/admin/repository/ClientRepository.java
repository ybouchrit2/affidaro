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
    List<Client> findByPhoneContaining(String phone);
    Client findByEmailIgnoreCase(String email);
    long countByCreatedAtBetween(java.time.Instant start, java.time.Instant end);
}