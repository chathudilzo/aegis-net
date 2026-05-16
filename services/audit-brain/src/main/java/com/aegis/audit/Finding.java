package com.aegis.audit;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_findings")
public class Finding {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String targetIp;
    private int port;
    private String service;
    private String status; 
    private String insight;
    private String auditResult;
    private LocalDateTime discoveredAt = LocalDateTime.now();

    public Finding() {} 

    public Long getId() { return id; }
    public String getTargetIp() { return targetIp; }
    public void setTargetIp(String targetIp) { this.targetIp = targetIp; }
    public int getPort() { return port; }
    public void setPort(int port) { this.port = port; }
    public String getService() { return service; }
    public void setService(String service) { this.service = service; }
    public String getStatus() { return status; }
    public String getAuditResult() { return auditResult; }
public void setAuditResult(String auditResult) { this.auditResult = auditResult;}
    public void setStatus(String status) { this.status = status; }

public String getInsight() { return insight; }
    public void setInsight(String insight) { this.insight = insight; }

    public LocalDateTime getDiscoveredAt() { return discoveredAt; }
    public void setDiscoveredAt(LocalDateTime discoveredAt) { this.discoveredAt = discoveredAt; }
}