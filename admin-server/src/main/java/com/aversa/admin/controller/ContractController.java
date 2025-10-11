package com.aversa.admin.controller;

import com.aversa.admin.model.Agreement;
import com.aversa.admin.repository.AgreementRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;

@RestController
@RequestMapping("/api/contracts")
@CrossOrigin(
        origins = {"http://localhost", "http://localhost:8001", "http://localhost:8089"},
        allowCredentials = "true",
        allowedHeaders = {"Content-Type", "X-Requested-With", "Origin", "Accept"},
        methods = {RequestMethod.GET, RequestMethod.OPTIONS}
)
public class ContractController {

    private final AgreementRepository agreementRepo;

    public ContractController(AgreementRepository agreementRepo) {
        this.agreementRepo = agreementRepo;
    }

    @GetMapping
    public List<Agreement> list(@RequestParam(value = "page", defaultValue = "0") int page,
                                @RequestParam(value = "size", defaultValue = "50") int size){
        Pageable pageable = PageRequest.of(Math.max(page,0), Math.min(Math.max(size,1), 200), Sort.by("createdAt").descending());
        return agreementRepo.findAll(pageable).getContent();
    }
}