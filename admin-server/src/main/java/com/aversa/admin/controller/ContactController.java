package com.aversa.admin.controller;

import com.aversa.admin.model.ContactMessage;
import com.aversa.admin.repository.ContactMessageRepository;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(
        origins = {"http://localhost", "http://localhost:8001", "http://localhost:8089"},
        allowCredentials = "true",
        allowedHeaders = {"Content-Type", "X-Requested-With", "Origin", "Accept"},
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS}
)
public class ContactController {

    private final ContactMessageRepository repo;

    public ContactController(ContactMessageRepository repo) {
        this.repo = repo;
    }

    static class ContactPayload {
        public String name;
        public String email;
        public String phone;
        public String service;
        public String location;
        public String propertyType;
        public String priority;
        public String budget;
        public String contactTime;
        public String details;
        public String source;
    }

    @PostMapping(value = "/contact", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> add(@RequestBody ContactPayload p,
                                   @RequestHeader(value = "User-Agent", required = false) String ua,
                                   @RequestHeader(value = "X-Forwarded-For", required = false) String xff,
                                   @RequestHeader Map<String, String> headers) {
        String ip = Optional.ofNullable(xff).orElse(headers.getOrDefault("Host", ""));
        ContactMessage m = new ContactMessage(
                Instant.now(),
                safe(p.name), safe(p.email), safe(p.phone), safe(p.service),
                safe(p.location), safe(p.propertyType), safe(p.priority), safe(p.budget), safe(p.contactTime),
                safe(p.details), safe(ua), safe(ip), safe(p.source)
        );
        repo.save(m);
        return Map.of("status", "ok");
    }

    @GetMapping("/contact/recent")
    public List<ContactMessage> recent() {
        return repo.findTop20ByOrderByTimestampDesc();
    }

    private String safe(String s) { return s == null ? "" : s; }
}