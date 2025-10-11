package com.aversa.admin.model;

import jakarta.persistence.*;
import jakarta.persistence.Index;
import com.aversa.admin.model.User;
import java.time.Instant;

@Entity
@Table(indexes = {
        @Index(name = "idx_communications_client_id", columnList = "client_id"),
        @Index(name = "idx_communications_user_id", columnList = "user_id")
})
public class InteractionLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;

    private Instant timestamp;

    @Column(length = 32)
    private String channel; // phone, whatsapp, email, meeting, other

    @Column(length = 64)
    private String userName; // admin/user who interacted

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // optional strong relation to admin user

    @Column(length = 2000)
    private String notes;

    @Column(length = 64)
    private String outcome; // succeeded, no_answer, scheduled, sent, etc.

    private Integer rating; // 1..5 optional

    public InteractionLog() {
        this.timestamp = Instant.now();
    }

    public InteractionLog(Client client, String channel, String userName, String notes, String outcome, Instant timestamp) {
        this.client = client;
        this.channel = channel;
        this.userName = userName;
        this.notes = notes;
        this.outcome = outcome;
        this.timestamp = timestamp != null ? timestamp : Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
}