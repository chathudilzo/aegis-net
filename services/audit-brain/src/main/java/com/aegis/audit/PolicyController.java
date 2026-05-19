package com.aegis.audit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/policies")
@CrossOrigin(origins = "*")
public class PolicyController {

    @Autowired
    private PolicyRepository policyRepository;

    @GetMapping
    public List<Policy> getAllPolicies() {
        return policyRepository.findAll();
    }

    @PostMapping
    public Policy addPolicy(@RequestBody Policy policy) {
        System.out.println("[BRAIN] New Authorization Policy Added: " + policy.getTargetIp() + ":" + policy.getAllowedPort());
        return policyRepository.save(policy);
    }

    @DeleteMapping("/{id}")
    public void deletePolicy(@PathVariable Long id) {
        System.out.println("[BRAIN] Authorization Policy Revoked (ID: " + id + ")");
        policyRepository.deleteById(id);
    }
}