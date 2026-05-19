import 'package:flutter_riverpod/flutter_riverpod.dart';

class MobileFinding {
  final String targetIp;
  final int port;
  final String service;
  final String auditResult;
  final String insight;
  final DateTime timestamp;

  MobileFinding({
    required this.targetIp,
    required this.port,
    required this.service,
    required this.auditResult,
    required this.insight,
    required this.timestamp,
  });
}

class AuditLogNotifier extends Notifier<List<MobileFinding>> {
  @override
  List<MobileFinding> build() {
    return [];
  }

  void triggerAlarm(String ip, int port, String service, String insight) {
    final newFinding = MobileFinding(
      targetIp: ip,
      port: port,
      service: service,
      auditResult: 'POLICY_VIOLATION',
      insight: insight,
      timestamp: DateTime.now(),
    );

    state = [newFinding, ...state];
  }

  void clearLog() {
    state = [];
  }
}

final auditLogProvider =
    NotifierProvider<AuditLogNotifier, List<MobileFinding>>(() {
  return AuditLogNotifier();
});
