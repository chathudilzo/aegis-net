package com.aegis.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PolicyRepository extends JpaRepository<Policy, Long> {
@Query("SELECT p FROM Policy p WHERE :scannedIp LIKE p.targetIp AND p.allowedPort = :port")
    List<Policy> findMatchingPolicies(@Param("scannedIp") String scannedIp, @Param("port") int port);}