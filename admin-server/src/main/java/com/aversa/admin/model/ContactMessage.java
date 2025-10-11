package com.aversa.admin.model;

import jakarta.persistence.*;
import jakarta.persistence.Index;
import com.aversa.admin.model.ServiceItem;
import java.time.Instant;
import com.aversa.admin.model.Client;

@Entity
@Table(indexes = {
        @Index(name = "idx_leads_client_id", columnList = "client_id"),
        @Index(name = "idx_leads_service_id", columnList = "service_id")
})
public class ContactMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Instant timestamp;

    private String name;
    private String email;
    private String phone;
    private String service;
    private String location;
    private String propertyType;
    private String priority;
    private String budget;
    private String contactTime;

    @Column(length = 2000)
    private String details;

    @Column(length = 1024)
    private String userAgent;
    private String ip;
    private String source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private ServiceItem serviceItem;

    public ContactMessage() {}

    public ContactMessage(Instant timestamp, String name, String email, String phone, String service,
                          String location, String propertyType, String priority, String budget, String contactTime,
                          String details, String userAgent, String ip, String source) {
        this.timestamp = timestamp;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.service = service;
        this.location = location;
        this.propertyType = propertyType;
        this.priority = priority;
        this.budget = budget;
        this.contactTime = contactTime;
        this.details = details;
        this.userAgent = userAgent;
        this.ip = ip;
        this.source = source;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getService() { return service; }
    public void setService(String service) { this.service = service; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getPropertyType() { return propertyType; }
    public void setPropertyType(String propertyType) { this.propertyType = propertyType; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public String getBudget() { return budget; }
    public void setBudget(String budget) { this.budget = budget; }
    public String getContactTime() { return contactTime; }
    public void setContactTime(String contactTime) { this.contactTime = contactTime; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public ServiceItem getServiceItem() { return serviceItem; }
    public void setServiceItem(ServiceItem serviceItem) { this.serviceItem = serviceItem; }
}