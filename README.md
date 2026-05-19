# Aegis SOC Architecture

A distributed Security Operations Center (SOC) and network reconnaissance engine. Aegis actively monitors network perimeters, fingerprints running services, evaluates them against a centralized policy engine, and dispatches real-time alerts to mobile devices when unauthorized infrastructure is detected.


https://github.com/user-attachments/assets/9a54181a-a0ab-462e-a424-3ef4d59c49d9


## Architecture

The system is decoupled into four primary nodes:

1. **Recon Engine (Go):** A high-concurrency port scanner. Fetches target configurations, executes network sweeps (autonomous or manual), grabs service banners, and forwards telemetry.
2. **Audit Brain (Java/Spring Boot):** The central decision engine. Cross-references incoming scan data against a PostgreSQL database of authorized policies. Violations trigger Firebase push notifications.
3. **Control Plane (Next.js):** A web dashboard for security analysts to view real-time dual-feed telemetry (Auto vs. Manual), manage target subnets, and update authorization policies on the fly.
4. **Incident App (Flutter):** A mobile application connected via Firebase Cloud Messaging (FCM) to receive critical intrusion alerts globally, regardless of the local network state.

##  Core Features

* **Dual-Mode Scanning:** Supports continuous background sweeps (cron-based) and manual, targeted overrides (surgical strikes).
* **Strict Service Matching:** Reads the HTTP/TCP banner to fingerprint the exact service. If an authorized Python server is replaced by an unauthorized database on the exact same port, the system flags it.
* **Dynamic Policy Engine:** Infrastructure can be whitelisted in real-time from the Next.js dashboard without requiring server restarts.
* **Global Alerting:** Violations bypass local network constraints and hit the mobile app instantly via FCM.

##  Tech Stack

* **Scanner:** Go (Goroutines, net/http)
* **Backend:** Java, Spring Boot, Spring Data JPA
* **Database:** PostgreSQL
* **Frontend:** Next.js, React, Tailwind CSS
* **Mobile:** Flutter, Dart, Firebase Cloud Messaging

---

##  Getting Started

### 1. Database Setup
Create a PostgreSQL database named `aegis_db`. The Spring Boot application will automatically generate the required tables (`audit_policies`, `findings`, etc.) on startup.

### 2. Audit Brain (Java/Spring Boot)
Ensure you have your Firebase `service-account.json` placed in `src/main/resources`.

Update `application.properties` with your database credentials:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/aegis_db
spring.datasource.username=your_user
spring.datasource.password=your_password
```


Run the server (defaults to port 9090):
```
Bash

./mvnw spring-boot:run
```
### 3. Recon Engine (Go)

Navigate to the Go project directory and boot the scanner (defaults to port 8081):
```Bash
go run main.go
```
### 4. Control Plane (Next.js)

Navigate to the frontend directory, install dependencies, and run the dashboard:
```Bash

npm install
npm run dev
```

Access the dashboard at http://localhost:3000.
5. Incident App (Flutter)

Ensure Firebase is configured by adding your google-services.json (Android) or GoogleService-Info.plist (iOS).

Note: If running on a physical device, ensure your Go and Java servers are bound to your local network IP (e.g., 192.168.x.x) instead of just localhost. Update the API endpoints in the Dart code accordingly.
Bash

flutter run

 Usage Flow & End-to-End Test Case

To simulate a full SOC incident lifecycle (Detection ➡️ Triage ➡️ Mitigation ➡️ Verification), run this local test:
Phase 1: Spawn a Rogue Server (The Breach)

Open a new terminal and start an unauthorized web server on port 8888:
```Bash

python -m http.server 8888
```
Phase 2: Detect the Threat

    Open the Next.js Dashboard.

    Run a manual sweep on 127.0.0.1 and port 8888.

    Result: The Go engine catches the open port, Java flags a POLICY_VIOLATION, and the Flutter app instantly sounds a Firebase alarm. The dashboard logs the threat in red.

    Note the exact service banner captured in the dashboard (e.g., SimpleHTTP/0.6 Python/3.10.6).

Phase 3: Mitigate & Whitelist

    Click [ OPEN_CONFIG_PLANE ] on the dashboard.

    Under Authorized Infrastructure Policies, add 127.0.0.1, port 8888, and paste the exact Python service banner.

    Click + WHITELIST to lock the rule into PostgreSQL.

Phase 4: Verify the Fix

    Run the exact same manual sweep from Phase 2.

    Result: Java matches the incoming scan against the new policy. The mobile app remains completely silent, and the dashboard marks the service in green as [ AUTHORIZED ].
