package com.aversa.admin.controller;

import com.aversa.admin.model.ServiceItem;
import com.aversa.admin.repository.ServiceItemRepository;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/services")
public class ServiceController {

    private final ServiceItemRepository repo;

    public ServiceController(ServiceItemRepository repo) { this.repo = repo; }

    static class ServicePayload { public String code; public String name; public String category; public String description; }

    @GetMapping
    public List<ServiceItem> list(){ return repo.findAll(); }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String,Object> create(@RequestBody ServicePayload p){
        ServiceItem s = new ServiceItem(p.code, p.name, p.category, p.description);
        repo.save(s);
        return Map.of("status","ok","id", s.getId());
    }
}