package com.aegis.audit;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.io.FileInputStream;

@Service
public class NotificationService {

    @PostConstruct
    public void initializeFirebase() {
        try {
            FileInputStream serviceAccount = new FileInputStream("src/main/resources/service-account.json");

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                System.out.println(" [CLOUD] Connected to Google Firebase Cloud Gateway successfully.");
            }
        } catch (Exception e) {
            System.err.println("Firebase initialization crashed: " + e.getMessage());
        }
    }

   public void sendBroadcastAlert(String targetDeviceToken, Finding finding) {
        try {
            Message message = Message.builder()
                    .setToken(targetDeviceToken)
                    .setNotification(com.google.firebase.messaging.Notification.builder()
                            .setTitle("CRITICAL: POLICY_VIOLATION")
                            .setBody("Unauthorized port " + finding.getPort() + " open on " + finding.getTargetIp())
                            .build())
                    .putData("targetIp", finding.getTargetIp())
                    .putData("port", String.valueOf(finding.getPort()))
                    .putData("service", finding.getService())
                    .putData("insight", finding.getInsight())
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("[CLOUD DISPATCH] Successfully forced notification through Google. ID: " + response);
        } catch (Exception e) {
            System.err.println("Failed to push alert down to Google pipeline: " + e.getMessage());
        }
    }
}