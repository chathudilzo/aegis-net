package com.aegis.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ScanConfigRepository extends JpaRepository<ScanConfig, Long> {
}