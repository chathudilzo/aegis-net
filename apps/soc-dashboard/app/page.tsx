"use client";

import { useState, useEffect } from "react";
import ConfigPanel from "./components/ConfigPanel";

interface Finding {
  id?: number;
  targetIp: string;
  port: number;
  service: string;
  auditResult: string;
  insight: string;
  discoveredAt?: string;
  scanType?: string;
}

export default function SocDashboard() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [brainStatus, setBrainStatus] = useState("WAIT...");
  const [lastUpdated, setLastUpdated] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [customPorts, setCustomPorts] = useState("");
  const [showConfigPlane, setShowConfigPlane] = useState(false);

  const refreshIntel = async () => {
    try {
      const res = await fetch("http://localhost:9090/api/findings");
      if (res.ok) {
        const data = await res.json();
        setFindings(data);
        setBrainStatus("OK");
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        setBrainStatus("ERR");
      }
    } catch (error) {
      console.error("Failed to fetch from Brain:", error);
      setBrainStatus("OFFLINE");
    }
  };

  useEffect(() => {
    refreshIntel();
  }, []);

  const launchScan = async () => {
    setIsScanning(true);
    try {
      const payload: any = {};

      if (customTarget.trim() !== "") {
        payload.targetZones = [customTarget.trim()];
      }

      if (customPorts.trim() !== "") {
        const parsedPorts = customPorts
          .split(",")
          .map((p) => parseInt(p.trim(), 10))
          .filter((p) => !isNaN(p));

        if (parsedPorts.length > 0) {
          payload.targetPorts = parsedPorts;
        }
      }

      const res = await fetch("http://localhost:8081/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setTimeout(() => {
          refreshIntel();
          setIsScanning(false);
        }, 5000);
      }
    } catch (error) {
      console.error("Failed to reach Recon Engine:", error);
      setIsScanning(false);
      alert("FATAL: Cannot reach Go Engine (8081).");
    }
  };

  const purgeVault = async () => {
    const confirmDelete = window.confirm("WARNING: WIPE ALL DB RECORDS? [Y/N]");
    if (!confirmDelete) return;

    try {
      const res = await fetch("http://localhost:9090/api/findings", {
        method: "DELETE",
      });
      if (res.ok) {
        setFindings([]);
      }
    } catch (error) {
      console.error("Failed to purge vault:", error);
      alert("FATAL: Cannot reach Brain (9090) to purge.");
    }
  };

  const autoFindings = findings.filter(
    (f) => f.scanType === "AUTO" || !f.scanType,
  );
  const manualFindings = findings.filter((f) => f.scanType === "MANUAL");

  return (
    <div className="min-h-screen bg-black text-[#00ff00] p-4 font-mono text-sm uppercase tracking-widest leading-relaxed">
      <header className="mb-6 flex justify-between items-end border-b-2 border-[#00ff00] pb-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            AEGIS_SOC_TERMINAL
          </h1>
          <p className="text-gray-400">&gt; SECURE INFRASTRUCTURE AUDIT LOG</p>
        </div>
        <div className="text-right text-gray-300">
          <div>
            BRAIN_LINK: [{" "}
            <span
              className={
                brainStatus === "OK"
                  ? "text-[#00ff00] font-bold"
                  : "text-red-500 font-bold"
              }
            >
              {brainStatus}
            </span>{" "}
            ]
          </div>
          <div>LAST_SYNC: [ {lastUpdated || "NULL"} ]</div>
        </div>
      </header>

      <section className="mb-6 flex flex-wrap gap-4 items-center">
        <label className="text-white">&gt; TARGET_IP:</label>
        <input
          type="text"
          placeholder="DEFAULT_ZONES"
          value={customTarget}
          onChange={(e) => setCustomTarget(e.target.value)}
          className="bg-black border border-[#00ff00] text-white px-2 py-1 w-64 focus:outline-none focus:bg-[#002200] transition-none"
          disabled={isScanning}
        />
        <label className="text-white">&gt; PORTS:</label>
        <input
          type="text"
          placeholder="DEFAULT_PORTS"
          value={customPorts}
          onChange={(e) => setCustomPorts(e.target.value)}
          className="bg-black border border-[#00ff00] text-white px-2 py-1 w-32 focus:outline-none focus:bg-[#002200] transition-none"
          disabled={isScanning}
        />
        <button
          onClick={launchScan}
          disabled={isScanning}
          className={`px-4 py-1 font-bold border transition-none ${
            isScanning
              ? "bg-gray-800 text-gray-500 border-gray-500 cursor-wait"
              : "bg-black text-[#00ff00] border-[#00ff00] hover:bg-[#00ff00] hover:text-black cursor-pointer"
          }`}
        >
          {isScanning ? "[ EXECUTING... ]" : "[ RUN_SWEEP ]"}
        </button>

        <button
          onClick={refreshIntel}
          className="px-4 py-1 bg-black text-white border border-white hover:bg-white hover:text-black font-bold transition-none cursor-pointer"
        >
          [ REFRESH ]
        </button>

        <button
          onClick={() => setShowConfigPlane(!showConfigPlane)}
          className={`px-4 py-1 bg-black font-bold transition-none cursor-pointer border ${
            showConfigPlane
              ? "text-black bg-yellow-500 border-yellow-500 hover:bg-black hover:text-yellow-500"
              : "text-yellow-500 border-yellow-500 hover:bg-yellow-500 hover:text-black"
          }`}
        >
          {showConfigPlane ? "[ CLOSE_CONFIG_PLANE ]" : "[ OPEN_CONFIG_PLANE ]"}
        </button>

        <button
          onClick={purgeVault}
          className="px-4 py-1 bg-black text-red-500 border border-red-500 hover:bg-red-500 hover:text-black font-bold ml-auto transition-none cursor-pointer"
        >
          [ PURGE_DB ]
        </button>
      </section>

      {showConfigPlane && (
        <section className="mb-8 border-b-2 border-dashed border-[#004400] pb-8">
          <ConfigPanel />
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-cyan-400 font-bold mb-2">
          [ MANUAL_OVERRIDE_STRIKES ]
        </h2>
        <table className="w-full text-left border-collapse border-2 border-cyan-700">
          <thead>
            <tr className="bg-cyan-900 text-cyan-100">
              <th className="p-2 border border-cyan-700 w-40">TARGET_IP</th>
              <th className="p-2 border border-cyan-700 w-20">PORT</th>
              <th className="p-2 border border-cyan-700 w-48">SERVICE</th>
              <th className="p-2 border border-cyan-700 w-40">STATUS</th>
              <th className="p-2 border border-cyan-700">INTEL_INSIGHT</th>
            </tr>
          </thead>
          <tbody>
            {manualFindings.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-4 text-center text-cyan-800 border border-cyan-900"
                >
                  AWAITING MANUAL OVERRIDE COMMANDS...
                </td>
              </tr>
            ) : (
              manualFindings.map((finding, index) => (
                <tr key={index} className="hover:bg-cyan-950">
                  <td className="p-2 border border-cyan-800 text-white">
                    {finding.targetIp}
                  </td>
                  <td className="p-2 border border-cyan-800 text-cyan-400">
                    {finding.port}
                  </td>
                  <td className="p-2 border border-cyan-800 text-gray-300">
                    {finding.service}
                  </td>
                  <td className="p-2 border border-cyan-800">
                    {finding.auditResult === "POLICY_VIOLATION" ? (
                      <span className="bg-red-600 text-white px-2 font-bold animate-pulse">
                        !! VIOLATION !!
                      </span>
                    ) : finding.auditResult === "SERVICE_MISMATCH" ? (
                      <span className="bg-amber-600 text-white px-2 font-bold">
                        ! MISMATCH !
                      </span>
                    ) : (
                      <span className="text-cyan-400 font-bold">
                        [ AUTHORIZED ]
                      </span>
                    )}
                  </td>
                  <td className="p-2 border border-cyan-800">
                    <span
                      className={
                        finding.insight.startsWith("[OFFLINE")
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }
                    >
                      {finding.insight}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-[#00ff00] font-bold mb-2">
          [ AUTONOMOUS_BACKGROUND_SWEEP ]
        </h2>
        <table className="w-full text-left border-collapse border-2 border-[#00ff00]">
          <thead>
            <tr className="bg-[#00ff00] text-black">
              <th className="p-2 border border-[#00ff00] w-40">TARGET_IP</th>
              <th className="p-2 border border-[#00ff00] w-20">PORT</th>
              <th className="p-2 border border-[#00ff00] w-48">SERVICE</th>
              <th className="p-2 border border-[#00ff00] w-40">STATUS</th>
              <th className="p-2 border border-[#00ff00]">INTEL_INSIGHT</th>
            </tr>
          </thead>
          <tbody>
            {autoFindings.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-4 text-center text-gray-500 border border-[#00ff00]"
                >
                  EOF - NO BACKGROUND DATA
                </td>
              </tr>
            ) : (
              autoFindings.map((finding, index) => (
                <tr key={index} className="hover:bg-[#002200]">
                  <td className="p-2 border border-[#00ff00] text-white">
                    {finding.targetIp}
                  </td>
                  <td className="p-2 border border-[#00ff00] text-cyan-400">
                    {finding.port}
                  </td>
                  <td className="p-2 border border-[#00ff00] text-gray-300">
                    {finding.service}
                  </td>
                  <td className="p-2 border border-[#00ff00]">
                    {finding.auditResult === "POLICY_VIOLATION" ? (
                      <span className="bg-red-600 text-white px-2 font-bold animate-pulse">
                        !! VIOLATION !!
                      </span>
                    ) : finding.auditResult === "SERVICE_MISMATCH" ? (
                      <span className="bg-amber-600 text-white px-2 font-bold">
                        ! MISMATCH !
                      </span>
                    ) : (
                      <span className="text-[#00ff00] font-bold">
                        [ AUTHORIZED ]
                      </span>
                    )}
                  </td>
                  <td className="p-2 border border-[#00ff00]">
                    <span
                      className={
                        finding.insight.startsWith("[OFFLINE")
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }
                    >
                      {finding.insight}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
