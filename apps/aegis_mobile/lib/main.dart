import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:audioplayers/audioplayers.dart';
import 'providers/audit_provider.dart';
import 'package:http/http.dart' as http;

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print("Data received via Google infrastructure: ${message.data}");
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  runApp(
    const ProviderScope(
      child: AegisMobileApp(),
    ),
  );
}

class AegisMobileApp extends StatelessWidget {
  const AegisMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AEGIS SOC MOBILE',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: Colors.black,
        fontFamily: 'Courier',
      ),
      home: const MobileTerminalDashboard(),
    );
  }
}

class MobileTerminalDashboard extends ConsumerStatefulWidget {
  const MobileTerminalDashboard({super.key});

  @override
  ConsumerState<MobileTerminalDashboard> createState() =>
      _MobileTerminalDashboardState();
}

class _MobileTerminalDashboardState
    extends ConsumerState<MobileTerminalDashboard> {
  String _fcmToken = "RETRIEVING_TOKEN...";
  final AudioPlayer _audioPlayer = AudioPlayer();

  @override
  void initState() {
    super.initState();
    setupFirebaseListeners();
  }

  void setupFirebaseListeners() async {
    final messaging = FirebaseMessaging.instance;
    NotificationSettings settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      criticalAlert: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      String? token = await messaging.getToken();
      setState(() {
        _fcmToken = token ?? "TOKEN_ERROR";
      });
      print(" Address: $_fcmToken");
      registerWithJavaBrain(_fcmToken);
    }

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print("⚡ [FOREGROUND ALERT] Catching cloud stream data.");
      if (message.data.isNotEmpty) {
        _triggerWarningTone();

        ref.read(auditLogProvider.notifier).triggerAlarm(
              message.data['targetIp'] ?? '0.0.0.0',
              int.tryParse(message.data['port']?.toString() ?? '0') ?? 0,
              message.data['service'] ?? 'UNKNOWN',
              message.data['insight'] ?? 'NO_INSIGHT',
            );
      }
    });
  }

  void _triggerWarningTone() async {
    try {
      await _audioPlayer.stop();
      await _audioPlayer.play(AssetSource('alarm.mp3'));
    } catch (e) {
      print("Exception: $e");
    }
  }

  void registerWithJavaBrain(String token) async {
    try {
      final url =
          Uri.parse('http://192.168.1.11:9090/api/findings/register-token');
      await http.post(
        url,
        headers: {"Content-Type": "application/json"},
        body: jsonEncode(token),
      );
    } catch (e) {
      print("Failed to register token: $e");
    }
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final findings = ref.watch(auditLogProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.black,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(2.0),
          child: Container(color: const Color(0xFF00FF00), height: 2.0),
        ),
        title: const Text(
          'AEGIS_CRITICAL_ALERT_HUB',
          style: TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.0),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_forever, color: Colors.redAccent),
            onPressed: () => ref.read(auditLogProvider.notifier).clearLog(),
          )
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            color: const Color(0xFF0A0A0A),
            width: double.infinity,
            child: Text(
              "FCM_NODE_ADDR: $_fcmToken",
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white30, fontSize: 9),
            ),
          ),
          Expanded(
            child: findings.isEmpty
                ? const Center(
                    child: Text(
                      'STATUS_OK: SYSTEM WATCHING VIA FCM...\nAWAITING CLOUD DISPATCH.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: Color(0xFF005500), height: 1.5, fontSize: 12),
                    ),
                  )
                : ListView.builder(
                    itemCount: findings.length,
                    itemBuilder: (context, index) {
                      final log = findings[index];
                      return Container(
                        margin: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A0505),
                          border: Border.all(color: Colors.red, width: 2),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // CustomPaint(
                            //   size: const Size(double.infinity, 12),
                            //   painter: HazardStripesPainter(),
                            // ),
                            Container(
                              color: Colors.red,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 6),
                              width: double.infinity,
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    ' CRITICAL SECURITY INTRUSION ',
                                    style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11),
                                  ),
                                  Text(
                                    '${log.timestamp.hour.toString().padLeft(2, '0')}:${log.timestamp.minute.toString().padLeft(2, '0')}:${log.timestamp.second.toString().padLeft(2, '0')}',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11),
                                  )
                                ],
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(10.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'HOST TARGET : ${log.targetIp}',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'OPEN PORT   : [ ${log.port} ]',
                                    style: const TextStyle(
                                        color: Colors.amberAccent,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13),
                                  ),
                                  Text(
                                    'SERVICE     : ${log.service}',
                                    style: const TextStyle(
                                        color: Colors.cyanAccent, fontSize: 12),
                                  ),
                                  const Divider(
                                      color: Colors.red,
                                      thickness: 1,
                                      height: 16),
                                  const Text(
                                    'THREAT LOG / VULNERABILITY INSIGHT:',
                                    style: TextStyle(
                                        color: Colors.white30,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    log.insight,
                                    style: const TextStyle(
                                        color: Color(0xFFFF6666),
                                        fontSize: 12,
                                        height: 1.3),
                                  ),
                                ],
                              ),
                            )
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class HazardStripesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFFFD700)
      ..style = PaintingStyle.fill;

    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), paint);

    paint.color = Colors.black;
    paint.strokeWidth = 6.0;

    double xPos = -size.height;
    while (xPos < size.width) {
      canvas.drawLine(
        Offset(xPos, 0),
        Offset(xPos + size.height, size.height),
        paint,
      );
      xPos += 14.0;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
