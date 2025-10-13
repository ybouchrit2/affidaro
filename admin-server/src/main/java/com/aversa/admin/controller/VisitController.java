package com.aversa.admin.controller;

import com.aversa.admin.model.Stats;
import com.aversa.admin.model.VisitEntry;
import com.aversa.admin.repository.VisitEntryRepository;
import com.aversa.admin.repository.ClientRepository;
import com.aversa.admin.model.Client;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class VisitController {

    private final VisitEntryRepository visitRepo;
    private final ClientRepository clientRepo;

    public VisitController(VisitEntryRepository visitRepo, ClientRepository clientRepo) {
        this.visitRepo = visitRepo;
        this.clientRepo = clientRepo;
    }

    static class VisitPayload { public String page; public String referrer; public Long durationMs; public Long clientId; }

    @PostMapping(value = "/visits", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> addVisit(@RequestBody VisitPayload payload,
                                        @RequestHeader(value = "User-Agent", required = false) String ua,
                                        @RequestHeader(value = "X-Forwarded-For", required = false) String xff,
                                        @RequestHeader(value = "Referer", required = false) String refererHeader,
                                        @RequestHeader Map<String, String> headers) {
        String ip = Optional.ofNullable(xff).orElse(headers.getOrDefault("Host", ""));
        String ref = Optional.ofNullable(payload.referrer).filter(s -> !s.isBlank())
                .orElse(Optional.ofNullable(refererHeader).orElse(""));

        VisitEntry entry = new VisitEntry(Instant.now(), payload.page, ref, ip, ua, payload.durationMs);
        if (payload.clientId != null) {
            clientRepo.findById(payload.clientId).ifPresent(entry::setClient);
        }
        visitRepo.save(entry);
        return Map.of("status", "ok");
    }

    @GetMapping("/visits/stats")
    public Stats stats() {
        LocalDate todayDate = LocalDate.now(ZoneId.systemDefault());
        int total = (int) visitRepo.count();
        Instant start = todayDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = todayDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        int today = (int) visitRepo.countByTimestampBetween(start, end);

        Map<String, Integer> byPage = visitRepo.countByPage().stream()
                .collect(Collectors.toMap(
                        arr -> (String) arr[0],
                        arr -> ((Number) arr[1]).intValue()
                ));
        List<VisitEntry> recent = visitRepo.findTop20ByOrderByTimestampDesc();
        Double avg = visitRepo.averageDuration();
        long avgDurationMs = avg != null ? Math.round(avg) : 0;
        return new Stats(total, today, byPage, recent, avgDurationMs);
    }

    private String safe(String s) { return s == null ? "" : s; }

    @GetMapping("/visits/byClient/{id}/recent")
    public Map<String, Object> recentByClient(@PathVariable("id") Long id) {
        VisitEntry v = visitRepo.findTop1ByClient_IdOrderByTimestampDesc(id);
        if (v == null) return Map.of("status", "not_found");
        return Map.of(
                "status", "ok",
                "timestamp", v.getTimestamp(),
                "page", v.getPage(),
                "referrer", v.getReferrer(),
                "durationMs", v.getDurationMs()
        );
    }
}