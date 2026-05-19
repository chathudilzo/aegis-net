package com.aegis.audit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Arrays;
import java.util.Optional;

@RestController
@RequestMapping("/api/config")
@CrossOrigin(origins = "*")
public class ConfigController {

    @Autowired
    private ScanConfigRepository configRepository;

    @GetMapping
    public ScanConfig getMasterConfig() {
        Optional<ScanConfig> existingConfig = configRepository.findById(1L);

        if (existingConfig.isPresent()) {
            System.out.println("[BRAIN] Master config retrieved from PostgreSQL Vault.");
            return existingConfig.get();
        } else {
            System.out.println("[BRAIN] No config found in DB! Initializing default fallback config...");
            
            ScanConfig defaultConfig = new ScanConfig();
            defaultConfig.setId(1L);
           defaultConfig.setZones(Arrays.asList("10.99.99.0/24"));
            defaultConfig.setPorts(Arrays.asList(22, 8080, 31337));
            
            return configRepository.save(defaultConfig);
        }
    }

    @PostMapping
    public ScanConfig updateMasterConfig(@RequestBody ScanConfig newConfig) {
        newConfig.setId(1L); 
        System.out.println("[BRAIN] Master Scan Configuration Updated via API.");
        return configRepository.save(newConfig);
    }
}