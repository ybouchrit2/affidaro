package com.aversa.admin.controller;

import com.aversa.admin.model.Agreement;
import com.aversa.admin.model.Client;
import com.aversa.admin.repository.AgreementRepository;
import com.aversa.admin.repository.ClientRepository;
import com.aversa.admin.repository.ServiceItemRepository;
import com.aversa.admin.repository.InteractionLogRepository;
import com.aversa.admin.model.ServiceItem;
import com.aversa.admin.model.InteractionLog;
import com.aversa.admin.web.BadRequestException;
import com.aversa.admin.web.ResourceNotFoundException;
import org.springframework.http.MediaType;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/agreements")
public class AgreementController {

    private final AgreementRepository agreementRepo;
    private final ClientRepository clientRepo;
    private final ServiceItemRepository serviceRepo;
    private final InteractionLogRepository interactionRepo;

    public AgreementController(AgreementRepository agreementRepo, ClientRepository clientRepo, ServiceItemRepository serviceRepo, InteractionLogRepository interactionRepo) {
        this.agreementRepo = agreementRepo;
        this.clientRepo = clientRepo;
        this.serviceRepo = serviceRepo;
        this.interactionRepo = interactionRepo;
    }

    private static final Set<String> ALLOWED_STATUS = Set.of("draft", "signed", "cancelled", "pending");

    static class AgreementCreatePayload {
        @NotNull(message = "clientId is required")
        public Long clientId;
        @Size(max = 100, message = "service too long")
        public String service; // legacy label
        public Long serviceId; // strong relation
        @Pattern(regexp = "^\\d+(?:[.,]\\d{1,2})?$", message = "invalid price format")
        public String price; // string to be parsed as BigDecimal
        @Pattern(regexp = "^[A-Z]{3}$", message = "invalid currency code")
        public String currency;
        @Pattern(regexp = "^(draft|signed|cancelled|pending)$", message = "invalid status value")
        public String status;
        @Size(max = 2000, message = "details too long")
        public String details;
        @Positive(message = "signedAtMs must be positive")
        public Long signedAtMs; // optional epoch millis

        @AssertTrue(message = "signedAtMs requires status=\"signed\"")
        public boolean isSignedConsistency(){
            return signedAtMs == null || (status != null && status.equalsIgnoreCase("signed"));
        }
    }

    static class AgreementUpdatePayload {
        public String service; // legacy label
        public Long serviceId; // strong relation
        @Pattern(regexp = "^\\d+(?:[.,]\\d{1,2})?$", message = "invalid price format")
        public String price; // string to be parsed as BigDecimal
        @Pattern(regexp = "^[A-Z]{3}$", message = "invalid currency code")
        public String currency;
        @Pattern(regexp = "^(draft|signed|cancelled|pending)$", message = "invalid status value")
        public String status;
        @Size(max = 2000, message = "details too long")
        public String details;
        @Positive(message = "signedAtMs must be positive")
        public Long signedAtMs; // optional epoch millis

        @AssertTrue(message = "signedAtMs requires status=\"signed\"")
        public boolean isSignedConsistency(){
            return signedAtMs == null || (status != null && status.equalsIgnoreCase("signed"));
        }
    }

    @GetMapping("/recent")
    public List<Agreement> recent(@RequestParam(value = "page", defaultValue = "0") int page,
                                  @RequestParam(value = "size", defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(Math.max(page,0), Math.min(Math.max(size,1), 200), Sort.by("createdAt").descending());
        return agreementRepo.findAll(pageable).getContent();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> create(@Valid @RequestBody AgreementCreatePayload p) {
        Optional<Client> oc = clientRepo.findById(p.clientId);
        if (oc.isEmpty()) {
            throw new ResourceNotFoundException("Client not found: " + p.clientId);
        }
        Client client = oc.get();
        BigDecimal price = safeDecimal(p.price);
        Instant signedAt = p.signedAtMs != null ? Instant.ofEpochMilli(p.signedAtMs) : null;
        Agreement a = new Agreement(client, safe(p.service), price, safeCurrency(p.currency), safe(p.status), safe(p.details), signedAt);
        if (p.serviceId != null) {
            Optional<ServiceItem> os = serviceRepo.findById(p.serviceId);
            if (os.isEmpty()) throw new ResourceNotFoundException("Service not found: " + p.serviceId);
            a.setServiceItem(os.get());
        }
        agreementRepo.save(a);
        // Auto actions on status
        if ("signed".equalsIgnoreCase(a.getStatus()) || (a.getSignedAt() != null)) {
            // Log signed communication and activate client
            InteractionLog log = new InteractionLog(client, "contract", "system", "Contract signed", "signed", Instant.now());
            interactionRepo.save(log);
            client.setStatus("active");
            client.setClassification("active");
            client.setPipelineStage("contracted");
            clientRepo.save(client);
        } else if ("cancelled".equalsIgnoreCase(safe(a.getStatus()))) {
            // Log cancellation communication
            InteractionLog log = new InteractionLog(client, "contract", "system", "Contract cancelled", "cancelled", Instant.now());
            interactionRepo.save(log);
        }
        return Map.of("status", "ok", "id", a.getId());
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> update(@PathVariable("id") Long id, @Valid @RequestBody AgreementUpdatePayload p) {
        Optional<Agreement> oa = agreementRepo.findById(id);
        if (oa.isEmpty()) {
            throw new ResourceNotFoundException("Agreement not found: " + id);
        }
        Agreement a = oa.get();
        if (p.service != null) a.setService(p.service);
        if (p.serviceId != null){
            Optional<ServiceItem> os = serviceRepo.findById(p.serviceId);
            if (os.isEmpty()) throw new ResourceNotFoundException("Service not found: " + p.serviceId);
            a.setServiceItem(os.get());
        }
        if (p.price != null) a.setAgreedPrice(safeDecimal(p.price));
        if (p.currency != null) a.setCurrency(safeCurrency(p.currency));
        if (p.status != null) a.setStatus(p.status);
        if (p.details != null) a.setDetails(p.details);
        if (p.signedAtMs != null) a.setSignedAt(Instant.ofEpochMilli(p.signedAtMs));
        agreementRepo.save(a);
        // Auto actions on status update
        if ("signed".equalsIgnoreCase(a.getStatus()) || (a.getSignedAt() != null)) {
            InteractionLog log = new InteractionLog(a.getClient(), "contract", "system", "Contract signed", "signed", Instant.now());
            interactionRepo.save(log);
            Client client = a.getClient();
            client.setStatus("active");
            client.setClassification("active");
            client.setPipelineStage("contracted");
            clientRepo.save(client);
        } else if ("cancelled".equalsIgnoreCase(safe(a.getStatus()))) {
            InteractionLog log = new InteractionLog(a.getClient(), "contract", "system", "Contract cancelled", "cancelled", Instant.now());
            interactionRepo.save(log);
        }
        return Map.of("status", "ok");
    }

    private String safe(String s) { return s == null ? "" : s; }
    private String safeCurrency(String s) { return (s == null || s.isBlank()) ? "EUR" : s; }
    private BigDecimal safeDecimal(String s) {
        try { return (s == null || s.isBlank()) ? null : new BigDecimal(s.replace(",", ".")); }
        catch (Exception e) { return null; }
    }
}