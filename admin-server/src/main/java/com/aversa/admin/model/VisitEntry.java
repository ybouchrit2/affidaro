package com.aversa.admin.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class VisitEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Instant timestamp;
    private String page;
    private String referrer;
    private String ip;
    @Column(length = 1024)
    private String userAgent;
    private Long durationMs;

    public VisitEntry() {}

    public VisitEntry(Instant timestamp, String page, String referrer, String ip, String userAgent) {
        this.timestamp = timestamp;
        this.page = page;
        this.referrer = referrer;
        this.ip = ip;
        this.userAgent = userAgent;
    }

    public VisitEntry(Instant timestamp, String page, String referrer, String ip, String userAgent, Long durationMs) {
        this.timestamp = timestamp;
        this.page = page;
        this.referrer = referrer;
        this.ip = ip;
        this.userAgent = userAgent;
        this.durationMs = durationMs;
    }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPage() { return page; }
    public void setPage(String page) { this.page = page; }
    public String getReferrer() { return referrer; }
    public void setReferrer(String referrer) { this.referrer = referrer; }
    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    public Long getDurationMs() { return durationMs; }
    public void setDurationMs(Long durationMs) { this.durationMs = durationMs; }
}