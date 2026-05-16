package com.aegis.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface FindingRepository extends JpaRepository<Finding, Long> {Optional<Finding> findByTargetIpAndPort(String targetIp, int port);
}