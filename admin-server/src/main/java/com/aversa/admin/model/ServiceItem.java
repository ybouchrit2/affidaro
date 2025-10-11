package com.aversa.admin.model;

import jakarta.persistence.*;

@Entity
public class ServiceItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 64, unique = true)
    private String code;

    @Column(length = 128)
    private String name;

    @Column(length = 64)
    private String category;

    @Column(length = 1000)
    private String description;

    public ServiceItem() {}

    public ServiceItem(String code, String name, String category, String description) {
        this.code = code;
        this.name = name;
        this.category = category;
        this.description = description;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}