package com.aegis.audit;

import jakarta.persistence.*;

@Entity
@Table(name = "audit_policies")
public class Policy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String targetIp;    
    private int allowedPort;   
    private String expectedService; 

    public Policy() {}

    public Long getId() { return id; }
    public String getTargetIp() { return targetIp; }
    public void setTargetIp(String targetIp) { this.targetIp = targetIp; }
    public int getAllowedPort() { return allowedPort; }
    public void setAllowedPort(int allowedPort) { this.allowedPort = allowedPort; }
    public String getExpectedService() { return expectedService; }
    public void setExpectedService(String expectedService) { this.expectedService = expectedService; }
}