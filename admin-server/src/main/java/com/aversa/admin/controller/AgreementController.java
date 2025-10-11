package com.aversa.admin.controller;

import com.aversa.admin.model.Agreement;
import com.aversa.admin.model.Client;
import com.aversa.admin.repository.AgreementRepository;
import com.aversa.admin.repository.ClientRepository;
import com.aversa.admin.repository.ServiceItemRepository;
import com.aversa.admin.repository.InteractionLogRepository;
import com.aversa.admin.model.ServiceItem;
import com.aversa.admin.model.InteractionLog;
import org.springframework.http.MediaType;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/agreements")
@CrossOrigin(
        origins = {"http://localhost", "http://localhost:8001", "http://localhost:8089"},
        allowCredentials = "true",
        allowedHeaders = {"Content-Type", "X-Requested-With", "Origin", "Accept"},
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.OPTIONS}
)
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

    static class AgreementPayload {
        public Long clientId;
        public String service; // legacy label
        public Long serviceId; // strong relation
        public String price; // string to be parsed as BigDecimal
        public String currency;
        public String status;
        public String details;
        public Long signedAtMs; // optional epoch millis
    }

    @GetMapping("/recent")
    public List<Agreement> recent(@RequestParam(value = "page", defaultValue = "0") int page,
                                  @RequestParam(value = "size", defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(Math.max(page,0), Math.min(Math.max(size,1), 200), Sort.by("createdAt").descending());
        return agreementRepo.findAll(pageable).getContent();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> create(@RequestBody AgreementPayload p) {
        Optional<Client> oc = clientRepo.findById(p.clientId);
        if (oc.isEmpty()) {
            return Map.of("status", "client_not_found");
        }
        Client client = oc.get();
        BigDecimal price = safeDecimal(p.price);
        Instant signedAt = p.signedAtMs != null ? Instant.ofEpochMilli(p.signedAtMs) : null;
        Agreement a = new Agreement(client, safe(p.service), price, safeCurrency(p.currency), safe(p.status), safe(p.details), signedAt);
        if (p.serviceId != null) {
            Optional<ServiceItem> os = serviceRepo.findById(p.serviceId);
            if (os.isEmpty()) return Map.of("status","service_not_found");
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
    public Map<String, Object> update(@PathVariable("id") Long id, @RequestBody AgreementPayload p) {
        Optional<Agreement> oa = agreementRepo.findById(id);
        if (oa.isEmpty()) {
            return Map.of("status", "not_found");
        }
        Agreement a = oa.get();
        if (p.service != null) a.setService(p.service);
        if (p.serviceId != null){
            Optional<ServiceItem> os = serviceRepo.findById(p.serviceId);
            os.ifPresent(a::setServiceItem);
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