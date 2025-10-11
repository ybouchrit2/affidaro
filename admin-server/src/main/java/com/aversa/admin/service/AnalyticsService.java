package com.aversa.admin.service;

import com.aversa.admin.repository.VisitEntryRepository;
import com.aversa.admin.repository.ClientRepository;
import com.aversa.admin.repository.AgreementRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;

@Service
public class AnalyticsService {
    private final VisitEntryRepository visitRepo;
    private final ClientRepository clientRepo;
    private final AgreementRepository agreementRepo;

    private volatile Map<String, Object> cachedSummary;
    private volatile long lastComputedMs = 0L;
    private static final long TTL_MS = 30_000L; // 30 seconds

    public AnalyticsService(VisitEntryRepository visitRepo, ClientRepository clientRepo, AgreementRepository agreementRepo) {
        this.visitRepo = visitRepo;
        this.clientRepo = clientRepo;
        this.agreementRepo = agreementRepo;
    }

    public synchronized Map<String, Object> getSummary() {
        long now = System.currentTimeMillis();
        if (cachedSummary != null && (now - lastComputedMs) < TTL_MS) {
            return cachedSummary;
        }
        // compute fresh summary
        long totalVisits = visitRepo.count();
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        Instant start = today.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = today.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        long visitsToday = visitRepo.countByTimestampBetween(start, end);
        var all = visitRepo.findAll();
        long avgDurationMs = Math.round(all.stream()
                .map(v -> v.getDurationMs())
                .filter(d -> d != null && d > 0)
                .mapToLong(Long::longValue)
                .average()
                .orElse(0));
        long newClientsToday = clientRepo.countByCreatedAtBetween(start, end);
        long totalClients = clientRepo.count();
        long totalContracts = agreementRepo.count();
        long contractsToday = agreementRepo.countByCreatedAtBetween(start, end);
        cachedSummary = Map.of(
                "totalVisits", totalVisits,
                "visitsToday", visitsToday,
                "avgDurationMs", avgDurationMs,
                "newClientsToday", newClientsToday,
                "totalClients", totalClients,
                "totalContracts", totalContracts,
                "contractsToday", contractsToday
        );
        lastComputedMs = now;
        return cachedSummary;
    }
}