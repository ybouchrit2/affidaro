package com.aversa.admin.controller;

import com.aversa.admin.model.ContactMessage;
import com.aversa.admin.model.Client;
import com.aversa.admin.repository.ContactMessageRepository;
import com.aversa.admin.repository.ClientRepository;
import com.aversa.admin.repository.ServiceItemRepository;
import com.aversa.admin.model.ServiceItem;
import com.aversa.admin.web.BadRequestException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;

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
    private final ClientRepository clientRepo;
    private final ServiceItemRepository serviceRepo;

    public ContactController(ContactMessageRepository repo, ClientRepository clientRepo, ServiceItemRepository serviceRepo) {
        this.repo = repo;
        this.clientRepo = clientRepo;
        this.serviceRepo = serviceRepo;
    }

    static class ContactPayload {
        @Size(max = 100, message = "name too long")
        public String name;
        @Email(message = "invalid email format")
        public String email;
        @Pattern(regexp = "^[0-9+\\-\\s]{6,20}$", message = "invalid phone format")
        public String phone;
        @Size(max = 100, message = "service too long")
        public String service;
        public Long serviceId;
        @Size(max = 200, message = "location too long")
        public String location;
        public String propertyType;
        public String priority;
        public String budget;
        public String contactTime;
        @Size(max = 3000, message = "details too long")
        public String details;
        public String source;

        @AssertTrue(message = "email or phone is required")
        public boolean hasContact(){
            boolean hasEmail = email != null && !email.trim().isEmpty();
            boolean hasPhone = phone != null && !phone.replaceAll("[\\s-]", "").trim().isEmpty();
            return hasEmail || hasPhone;
        }
    }

    @PostMapping(value = "/contact", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> add(@Valid @RequestBody ContactPayload p,
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
        // Link to existing client or create new one to satisfy Client→Lead rule
        Client client = null;
        String email = safe(p.email).trim();
        String phone = safe(p.phone).replaceAll("\\s", "").trim();
        if(!email.isEmpty()){
            client = clientRepo.findByEmailIgnoreCase(email);
        }
        if(client == null && !phone.isEmpty()){
            var list = clientRepo.findByPhoneContaining(phone);
            if(!list.isEmpty()) client = list.get(0);
        }
        if(client == null){
            client = new Client();
            client.setName(safe(p.name));
            client.setEmail(email);
            client.setPhone(phone);
            client.setSource(safe(p.source));
            client.setStatus("interested");
            client.setClassification("lead");
            client.setPipelineStage("interested");
            clientRepo.save(client);
        }
        m.setClient(client);
        if (p.serviceId != null) {
            Optional<ServiceItem> os = serviceRepo.findById(p.serviceId);
            os.ifPresent(m::setServiceItem);
        }
        repo.save(m);
        return Map.of("status", "ok");
    }

    @GetMapping("/contact/recent")
    public List<ContactMessage> recent() {
        return repo.findTop20ByOrderByTimestampDesc();
    }

    private String safe(String s) { return s == null ? "" : s; }
}