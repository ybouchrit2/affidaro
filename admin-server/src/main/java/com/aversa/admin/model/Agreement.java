package com.aversa.admin.model;

import jakarta.persistence.*;
import jakarta.persistence.Index;
import java.math.BigDecimal;
import java.time.Instant;
import com.aversa.admin.model.ServiceItem;

@Entity
@Table(indexes = {
        @Index(name = "idx_contracts_client_id", columnList = "client_id"),
        @Index(name = "idx_agreements_service_id", columnList = "service_id"),
        @Index(name = "idx_agreements_created_at", columnList = "createdAt")
})
public class Agreement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private ServiceItem serviceItem;

    private Instant createdAt;
    private Instant signedAt;

    @Column(length = 128)
    private String service; // legacy label

    private BigDecimal agreedPrice;

    @Column(length = 8)
    private String currency; // EUR, etc.

    @Column(length = 64)
    private String status; // pending, signed, in_progress, completed, cancelled

    @Column(length = 2000)
    private String details;

    public Agreement() {
        this.createdAt = Instant.now();
        this.currency = "EUR";
    }

    public Agreement(Client client, String service, BigDecimal agreedPrice, String currency, String status, String details, Instant signedAt) {
        this.client = client;
        this.createdAt = Instant.now();
        this.service = service;
        this.agreedPrice = agreedPrice;
        this.currency = currency != null ? currency : "EUR";
        this.status = status;
        this.details = details;
        this.signedAt = signedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public ServiceItem getServiceItem() { return serviceItem; }
    public void setServiceItem(ServiceItem serviceItem) { this.serviceItem = serviceItem; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getSignedAt() { return signedAt; }
    public void setSignedAt(Instant signedAt) { this.signedAt = signedAt; }
    public String getService() { return service; }
    public void setService(String service) { this.service = service; }
    public BigDecimal getAgreedPrice() { return agreedPrice; }
    public void setAgreedPrice(BigDecimal agreedPrice) { this.agreedPrice = agreedPrice; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
}