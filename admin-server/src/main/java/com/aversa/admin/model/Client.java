package com.aversa.admin.model;

import jakarta.persistence.*;
import jakarta.persistence.Index;
import java.time.Instant;

@Entity
@Table(indexes = {
        @Index(name = "idx_clients_email", columnList = "email"),
        @Index(name = "idx_clients_phone", columnList = "phone")
})
public class Client {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Instant createdAt;
    private Instant updatedAt;

    private String name;
    private String phone;
    private String email;
    private String source;

    @Column(length = 64)
    private String status; // lead, meeting, agreed, closed, rejected

    @Column(length = 2000)
    private String notes;

    @Column(length = 32)
    private String classification; // lead, active, former, vip

    @Column(length = 64)
    private String pipelineStage; // interested, first_contact, quote, negotiation, contracted, completed

    public Client() {
        this.createdAt = Instant.now();
        this.classification = "lead";
        this.pipelineStage = "interested";
    }

    public Client(String name, String phone, String email, String source, String status, String notes) {
        this.createdAt = Instant.now();
        this.name = name;
        this.phone = phone;
        this.email = email;
        this.source = source;
        this.status = status;
        this.notes = notes;
        this.classification = "lead";
        this.pipelineStage = "interested";
    }

    @PreUpdate
    public void preUpdate(){
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getClassification() { return classification; }
    public void setClassification(String classification) { this.classification = classification; }

    public String getPipelineStage() { return pipelineStage; }
    public void setPipelineStage(String pipelineStage) { this.pipelineStage = pipelineStage; }
}