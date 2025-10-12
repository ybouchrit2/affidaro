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
}