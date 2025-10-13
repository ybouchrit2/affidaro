package com.aversa.admin.controller;

import com.aversa.admin.model.InteractionLog;
import com.aversa.admin.repository.InteractionLogRepository;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/logs")
public class LogController {

    private final InteractionLogRepository logRepo;

    public LogController(InteractionLogRepository logRepo) {
        this.logRepo = logRepo;
    }

    @GetMapping("/recent")
    public List<InteractionLog> recent(@RequestParam(value = "days", defaultValue = "7") int days) {
        int d = Math.max(1, Math.min(days, 365));
        LocalDate startDate = LocalDate.now(ZoneId.systemDefault()).minusDays(d);
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = LocalDate.now(ZoneId.systemDefault()).plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        List<InteractionLog> list = logRepo.findByTimestampBetweenOrderByTimestampDesc(start, end);
        if (list.size() > 200) {
            return list.subList(0, 200);
        }
        return list;
    }
}