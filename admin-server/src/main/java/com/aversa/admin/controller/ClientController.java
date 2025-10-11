package com.aversa.admin.controller;

import com.aversa.admin.model.Client;
import com.aversa.admin.model.InteractionLog;
import com.aversa.admin.model.Agreement;
import com.aversa.admin.repository.ClientRepository;
import com.aversa.admin.repository.ContactMessageRepository;
import com.aversa.admin.repository.AgreementRepository;
import com.aversa.admin.repository.InteractionLogRepository;
import com.aversa.admin.repository.UserRepository;
import org.springframework.http.MediaType;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/clients")
@CrossOrigin(
        origins = {"http://localhost", "http://localhost:8001", "http://localhost:8089"},
        allowCredentials = "true",
        allowedHeaders = {"Content-Type", "X-Requested-With", "Origin", "Accept"},
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.OPTIONS}
)
public class ClientController {

    private final ClientRepository clientRepo;
    private final AgreementRepository agreementRepo;
    private final InteractionLogRepository interactionRepo;
    private final ContactMessageRepository contactRepo;
    private final UserRepository userRepo;

    public ClientController(ClientRepository clientRepo, AgreementRepository agreementRepo, ContactMessageRepository contactRepo, InteractionLogRepository interactionRepo, UserRepository userRepo) {
        this.clientRepo = clientRepo;
        this.agreementRepo = agreementRepo;
        this.contactRepo = contactRepo;
        this.interactionRepo = interactionRepo;
        this.userRepo = userRepo;
    }

    @GetMapping
    public List<Client> list(@RequestParam(value = "page", defaultValue = "0") int page,
                             @RequestParam(value = "size", defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(Math.max(page,0), Math.min(Math.max(size,1), 200), Sort.by("createdAt").descending());
        return clientRepo.findAll(pageable).getContent();
    }

    @GetMapping("/recent")
    public List<Client> recent(@RequestParam(value = "status", required = false) String status) {
        if (status != null && !status.isBlank()) {
            return clientRepo.findByStatusOrderByCreatedAtDesc(status);
        }
        return clientRepo.findTop50ByOrderByCreatedAtDesc();
    }

    static class ClientPayload {
        public String name;
        public String phone;
        public String email;
        public String source;
        public String status;
        public String notes;
        public String classification;
        public String pipelineStage;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> create(@RequestBody ClientPayload p) {
        Client c = new Client(
                safe(p.name), safe(p.phone), safe(p.email), safe(p.source), safe(p.status), safe(p.notes)
        );
        if (p.classification != null && !p.classification.isBlank()) c.setClassification(safe(p.classification));
        if (p.pipelineStage != null && !p.pipelineStage.isBlank()) c.setPipelineStage(safe(p.pipelineStage));
        clientRepo.save(c);
        return Map.of("status", "ok", "id", c.getId());
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> update(@PathVariable("id") Long id, @RequestBody ClientPayload p) {
        Optional<Client> oc = clientRepo.findById(id);
        if (oc.isEmpty()) {
            return Map.of("status", "not_found");
        }
        Client c = oc.get();
        if (p.name != null) c.setName(p.name);
        if (p.phone != null) c.setPhone(p.phone);
        if (p.email != null) c.setEmail(p.email);
        if (p.source != null) c.setSource(p.source);
        if (p.status != null) c.setStatus(p.status);
        if (p.notes != null) c.setNotes(p.notes);
        if (p.classification != null) c.setClassification(p.classification);
        if (p.pipelineStage != null) c.setPipelineStage(p.pipelineStage);
        clientRepo.save(c);
        return Map.of("status", "ok");
    }

    @GetMapping(value = "/{id}/agreements")
    public List<Agreement> agreements(@PathVariable("id") Long id) {
        return agreementRepo.findByClient_IdOrderBySignedAtDesc(id);
    }

    /**
     * Lookup client or contact message by email or phone to avoid re-entering data.
     * Returns status: found (client), prefill (contact_message), or not_found.
     */
    @GetMapping("/lookup")
    public Map<String, Object> lookup(@RequestParam(value = "email", required = false) String email,
                                      @RequestParam(value = "phone", required = false) String phone) {
        String e = email == null ? "" : email.trim();
        String p = phone == null ? "" : phone.replaceAll("[\\s-]", "").trim();
        if (e.isBlank() && p.isBlank()) {
            return Map.of("status", "bad_request", "message", "email or phone is required");
        }
        // Try find existing client
        Client client = null;
        if (!e.isBlank()) client = clientRepo.findByEmailIgnoreCase(e);
        if (client == null && !p.isBlank()) {
            var list = clientRepo.findByPhoneContaining(p);
            if (!list.isEmpty()) client = list.get(0);
        }
        if (client != null) {
            return Map.of(
                    "status", "found",
                    "type", "client",
                    "client", Map.of(
                            "id", client.getId(),
                            "name", client.getName(),
                            "email", client.getEmail(),
                            "phone", client.getPhone(),
                            "status", client.getStatus(),
                            "classification", client.getClassification()
                    )
            );
        }
        // Fallback: find latest contact message to prefill
        var cm = !e.isBlank() ? contactRepo.findTopByEmailIgnoreCaseOrderByTimestampDesc(e) : null;
        if (cm == null && !p.isBlank()) cm = contactRepo.findTopByPhoneOrderByTimestampDesc(p);
        if (cm == null && !e.isBlank() && !p.isBlank()) cm = contactRepo.findTopByEmailIgnoreCaseOrPhoneOrderByTimestampDesc(e, p);
        if (cm != null) {
            return Map.of(
                    "status", "prefill",
                    "type", "contact_message",
                    "contact", Map.of(
                            "id", cm.getId(),
                            "name", cm.getName(),
                            "email", cm.getEmail(),
                            "phone", cm.getPhone(),
                            "service", cm.getService(),
                            "details", cm.getDetails(),
                            "timestamp", cm.getTimestamp()
                    )
            );
        }
        return Map.of("status", "not_found");
    }

    @PostMapping("/fromContact/{contactId}")
    public Map<String, Object> createFromContact(@PathVariable("contactId") Long contactId) {
        var opt = contactRepo.findById(contactId);
        if(opt.isEmpty()) return Map.of("status", "contact_not_found");
        var msg = opt.get();
        // deduplicate via email first then phone
        Client existing = null;
        if(msg.getEmail() != null && !msg.getEmail().isBlank()) {
            existing = clientRepo.findByEmailIgnoreCase(msg.getEmail().trim());
        }
        if(existing == null && msg.getPhone() != null && !msg.getPhone().isBlank()) {
            var list = clientRepo.findByPhoneContaining(msg.getPhone().trim());
            if(!list.isEmpty()) existing = list.get(0);
        }
        if(existing != null){
            // update basic fields if empty
            if((existing.getName()==null || existing.getName().isBlank()) && msg.getName()!=null) existing.setName(msg.getName());
            if((existing.getPhone()==null || existing.getPhone().isBlank()) && msg.getPhone()!=null) existing.setPhone(msg.getPhone());
            if((existing.getEmail()==null || existing.getEmail().isBlank()) && msg.getEmail()!=null) existing.setEmail(msg.getEmail());
            if((existing.getSource()==null || existing.getSource().isBlank()) && msg.getSource()!=null) existing.setSource(msg.getSource());
            // append notes
            String notes = (existing.getNotes()==null?"":existing.getNotes());
            String add = (msg.getDetails()==null?"":msg.getDetails());
            if(!add.isBlank()) existing.setNotes((notes+"\n"+add).trim());
            // if no status, set lead
            if(existing.getStatus()==null || existing.getStatus().isBlank()) existing.setStatus("lead");
            clientRepo.save(existing);
            return Map.of("status","ok","id", existing.getId());
        } else {
            Client c = new Client(
                    safe(msg.getName()), safe(msg.getPhone()), safe(msg.getEmail()), safe(msg.getSource()), "lead", safe(msg.getDetails())
            );
            clientRepo.save(c);
            return Map.of("status","ok","id", c.getId());
        }
    }

    @GetMapping("/search")
    public List<Client> search(@RequestParam("q") String q){
        if(q == null || q.isBlank()) return clientRepo.findTop50ByOrderByCreatedAtDesc();
        String s = q.trim();
        if(s.contains("@")){
            Client c = clientRepo.findByEmailIgnoreCase(s);
            return c!=null ? List.of(c) : List.of();
        }
        if(s.matches("[+0-9\\s-]{5,}")){
            return clientRepo.findByPhoneContaining(s.replaceAll("\\s",""));
        }
        return clientRepo.findTop20ByNameContainingIgnoreCase(s);
    }

    /**
     * Mark a client as cancelled (we use status=\"rejected\"). Optionally append a reason to notes.
     */
    @PostMapping(value = "/{id}/cancel", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> cancel(@PathVariable("id") Long id, @RequestBody(required = false) Map<String, String> payload) {
        Optional<Client> oc = clientRepo.findById(id);
        if (oc.isEmpty()) {
            return Map.of("status", "not_found");
        }
        Client c = oc.get();
        c.setStatus("rejected");
        // append optional reason to notes
        String reason = payload == null ? null : payload.get("reason");
        if (reason != null && !reason.isBlank()) {
            String notes = (c.getNotes() == null ? "" : c.getNotes());
            c.setNotes((notes + (notes.isBlank()?"":"\n") + "Cancelled: " + reason).trim());
        }
        // touch updatedAt via explicit set (though @PreUpdate covers in save)
        c.setUpdatedAt(Instant.now());
        clientRepo.save(c);
        return Map.of("status", "ok", "id", c.getId());
    }

    /**
     * Return all cancelled clients (status=\"rejected\").
     */
    @GetMapping("/cancelled")
    public List<Client> cancelled(){
        return clientRepo.findByStatusOrderByCreatedAtDesc("rejected");
    }

    /**
     * Quick check if a client is cancelled.
     */
    @GetMapping("/{id}/isCancelled")
    public Map<String, Object> isCancelled(@PathVariable("id") Long id){
        Optional<Client> oc = clientRepo.findById(id);
        boolean cancelled = oc.isPresent() && "rejected".equalsIgnoreCase(oc.get().getStatus());
        return Map.of("id", id, "cancelled", cancelled);
    }

    private String safe(String s) { return s == null ? "" : s; }
    
    @DeleteMapping(value = "/{id}")
    public Map<String, Object> delete(@PathVariable("id") Long id){
        Optional<Client> oc = clientRepo.findById(id);
        if (oc.isEmpty()) return Map.of("status","not_found");
        agreementRepo.deleteByClient_Id(id);
        interactionRepo.deleteByClient_Id(id);
        contactRepo.deleteByClient_Id(id);
        clientRepo.deleteById(id);
        return Map.of("status","ok");
    }
    @GetMapping(value = "/{id}")
    public Object getOne(@PathVariable("id") Long id){
        return clientRepo.findById(id).orElse(Map.of("status","not_found"));
    }

    @PutMapping(value = "/{id}/classification", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> updateClassification(@PathVariable("id") Long id, @RequestBody Map<String, String> payload){
        Optional<Client> oc = clientRepo.findById(id);
        if (oc.isEmpty()) return Map.of("status","not_found");
        Client c = oc.get();
        String cls = payload.getOrDefault("classification", "");
        if(cls != null && !cls.isBlank()) c.setClassification(cls.trim());
        clientRepo.save(c);
        return Map.of("status","ok");
    }

    @PutMapping(value = "/{id}/stage", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> updateStage(@PathVariable("id") Long id, @RequestBody Map<String, String> payload){
        Optional<Client> oc = clientRepo.findById(id);
        if (oc.isEmpty()) return Map.of("status","not_found");
        Client c = oc.get();
        String stg = payload.getOrDefault("pipelineStage", "");
        if(stg != null && !stg.isBlank()) c.setPipelineStage(stg.trim());
        clientRepo.save(c);
        return Map.of("status","ok");
    }

    static class LogPayload {
        public String channel;
        public String userName;
        public Long userId;
        public String notes;
        public String outcome;
        public Integer rating;
        public Long timestampMs; // optional
    }

    @GetMapping(value = "/{id}/logs")
    public List<InteractionLog> logs(@PathVariable("id") Long id){
        return interactionRepo.findByClient_IdOrderByTimestampDesc(id);
    }

    @PostMapping(value = "/{id}/logs", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> addLog(@PathVariable("id") Long id, @RequestBody LogPayload p){
        Optional<Client> oc = clientRepo.findById(id);
        if (oc.isEmpty()) return Map.of("status","not_found");
        Client c = oc.get();
        Instant ts = p.timestampMs != null ? Instant.ofEpochMilli(p.timestampMs) : Instant.now();
        InteractionLog log = new InteractionLog(c, safe(p.channel), safe(p.userName), safe(p.notes), safe(p.outcome), ts);
        // optional link to user entity
        if (p.userId != null) {
            userRepo.findById(p.userId).ifPresent(log::setUser);
        }
        if (p.rating != null) log.setRating(p.rating);
        interactionRepo.save(log);
        // Optionally adjust client status based on outcome
        if ("succeeded".equalsIgnoreCase(safe(p.outcome))) {
            c.setStatus("active");
            c.setClassification("active");
            clientRepo.save(c);
        }
        return Map.of("status","ok","id", log.getId());
    }
}