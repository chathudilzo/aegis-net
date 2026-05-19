package com.aegis.audit;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "scan_config")
public class ScanConfig {

    @Id
    private Long id = 1L; 

    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> zones;

    @ElementCollection(fetch = FetchType.EAGER)
    private List<Integer> ports;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public List<String> getZones() { return zones; }
    public void setZones(List<String> zones) { this.zones = zones; }

    public List<Integer> getPorts() { return ports; }
    public void setPorts(List<Integer> ports) { this.ports = ports; }
}