package com.aegis.audit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/findings")
@CrossOrigin(origins = "*")
public class AuditController {

    @Autowired
    private FindingRepository findingRepository;

    @Autowired
    private PolicyRepository policyRepository; // NEW: To check your internal rules

    @Autowired
    private VulnerabilityService vulnerabilityService; // NEW: To check global hacks

    @PostMapping
    public Finding receiveScanResult(@RequestBody Finding incomingFinding) {
        System.out.println(">>> [BRAIN] Processing Scan Result for " + incomingFinding.getTargetIp() + ":" + incomingFinding.getPort());

       List<Policy> matchingPolicies = policyRepository.findMatchingPolicies(
                incomingFinding.getTargetIp(), 
                incomingFinding.getPort()
        );

   String auditResult;
        if (!matchingPolicies.isEmpty()) {
            Policy matchedPolicy = matchingPolicies.get(0); 
            
            if (incomingFinding.getService().toLowerCase().contains(matchedPolicy.getExpectedService().toLowerCase())) {
                auditResult = "AUTHORIZED";
            } else {
                auditResult = "SERVICE_MISMATCH"; 
            }
        } else {
            auditResult = "POLICY_VIOLATION";
        }
        
        incomingFinding.setAuditResult(auditResult);

        if (!incomingFinding.getService().equalsIgnoreCase("Unknown") && !incomingFinding.getService().equalsIgnoreCase("Offline")) {
            String intel = vulnerabilityService.getTopVulnerability(incomingFinding.getService());
            incomingFinding.setInsight(intel);
        }

        Optional<Finding> existingFinding = findingRepository.findByTargetIpAndPort(
                incomingFinding.getTargetIp(), 
                incomingFinding.getPort()
        );

        if (existingFinding.isPresent()) {
            Finding dbFinding = existingFinding.get();
            dbFinding.setDiscoveredAt(LocalDateTime.now());
            dbFinding.setService(incomingFinding.getService()); 
            dbFinding.setInsight(incomingFinding.getInsight()); 
            dbFinding.setAuditResult(incomingFinding.getAuditResult()); 
            
            return findingRepository.save(dbFinding);
        } else {
            return findingRepository.save(incomingFinding);
        }
    }

    @GetMapping
    public List<Finding> viewVault() {
        return findingRepository.findAll();
    }
}