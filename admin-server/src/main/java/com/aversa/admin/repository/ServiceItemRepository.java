package com.aversa.admin.repository;

import com.aversa.admin.model.ServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ServiceItemRepository extends JpaRepository<ServiceItem, Long> {
    Optional<ServiceItem> findByCode(String code);
}