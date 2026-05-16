

-- Example IP Range: 203.0.113.x
INSERT INTO audit_policies (target_ip, allowed_port, expected_service) VALUES ('203.0.113.%', 80, 'Web Server');
INSERT INTO audit_policies (target_ip, allowed_port, expected_service) VALUES ('203.0.113.%', 443, 'Web Server');

-- ZONE 2: Internal Data Center (EHR Databases, APIs)
-- Example IP Range: 10.0.5.x
INSERT INTO audit_policies (target_ip, allowed_port, expected_service) VALUES ('10.0.5.%', 5432, 'PostgreSQL');
INSERT INTO audit_policies (target_ip, allowed_port, expected_service) VALUES ('10.0.5.%', 3306, 'MySQL');

-- ZONE 3: User Workstations (Employee Wi-Fi)
-- Example IP Range: 192.168.1.x
--  we put NO rules here. By default, finding any open port on a workstation will throw a POLICY_VIOLATION.