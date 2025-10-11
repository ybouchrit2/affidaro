package com.aversa.admin.repository;

import com.aversa.admin.model.ContactMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {
    List<ContactMessage> findTop20ByOrderByTimestampDesc();
    List<ContactMessage> findByClient_IdOrderByTimestampDesc(Long clientId);
    void deleteByClient_Id(Long clientId);
    ContactMessage findTopByEmailIgnoreCaseOrderByTimestampDesc(String email);
    ContactMessage findTopByPhoneOrderByTimestampDesc(String phone);
    ContactMessage findTopByEmailIgnoreCaseOrPhoneOrderByTimestampDesc(String email, String phone);
}