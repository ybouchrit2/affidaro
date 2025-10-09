package com.aversa.admin.controller;

import com.aversa.admin.model.Stats;
import com.aversa.admin.model.VisitEntry;
import com.aversa.admin.repository.VisitEntryRepository;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(
        origins = {"http://localhost", "http://localhost:8001", "http://localhost:8089"},
        allowCredentials = "true",
        allowedHeaders = {"Content-Type", "X-Requested-With", "Origin", "Accept"},
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS}
)
public class VisitController {

    private final VisitEntryRepository visitRepo;

    public VisitController(VisitEntryRepository visitRepo) {
        this.visitRepo = visitRepo;
    }

    static class VisitPayload { public String page; public String referrer; public Long durationMs; }

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
        visitRepo.save(entry);
        return Map.of("status", "ok");
    }

    @GetMapping("/visits/stats")
    public Stats stats() {
        List<VisitEntry> all = visitRepo.findAll();
        int total = all.size();
        LocalDate todayDate = LocalDate.now(ZoneId.systemDefault());
        int today = (int) all.stream().filter(v -> LocalDate.ofInstant(v.getTimestamp(), ZoneId.systemDefault()).equals(todayDate)).count();
        Map<String, Integer> byPage = all.stream().collect(Collectors.toMap(
                v -> Optional.ofNullable(v.getPage()).orElse("/"),
                v -> 1,
                Integer::sum
        ));
        List<VisitEntry> recent = visitRepo.findTop20ByOrderByTimestampDesc();
        long avgDurationMs = (long) all.stream()
                .map(VisitEntry::getDurationMs)
                .filter(Objects::nonNull)
                .filter(d -> d > 0)
                .mapToLong(Long::longValue)
                .average()
                .orElse(0);
        return new Stats(total, today, byPage, recent, avgDurationMs);
    }

    private String safe(String s) { return s == null ? "" : s; }
}