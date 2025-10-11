package com.aversa.admin.controller;

import com.aversa.admin.repository.VisitEntryRepository;
import com.aversa.admin.repository.ClientRepository;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(
        origins = {"http://localhost", "http://localhost:8001", "http://localhost:8089"},
        allowCredentials = "true",
        allowedHeaders = {"Content-Type", "X-Requested-With", "Origin", "Accept"},
        methods = {RequestMethod.GET, RequestMethod.OPTIONS}
)
public class AnalyticsController {

    private final VisitEntryRepository visitRepo;
    private final ClientRepository clientRepo;
    private final com.aversa.admin.repository.AgreementRepository agreementRepo;
    private final com.aversa.admin.service.AnalyticsService analyticsService;

    public AnalyticsController(VisitEntryRepository visitRepo, ClientRepository clientRepo, com.aversa.admin.repository.AgreementRepository agreementRepo, com.aversa.admin.service.AnalyticsService analyticsService) {
        this.visitRepo = visitRepo;
        this.clientRepo = clientRepo;
        this.agreementRepo = agreementRepo;
        this.analyticsService = analyticsService;
    }

    @GetMapping
    public Map<String, Object> summary(){
        return analyticsService.getSummary();
    }
}