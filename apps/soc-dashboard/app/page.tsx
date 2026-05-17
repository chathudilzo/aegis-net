"use client";

import { useState, useEffect } from "react";

interface Finding {
  id?: number;
  targetIp: string;
  port: number;
  service: string;
  auditResult: string;
  insight: string;
  discoveredAt?: string;
}

export default function SocDashboard() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [brainStatus, setBrainStatus] = useState("WAIT...");
  const [lastUpdated, setLastUpdated] = useState("");
  const [customTarget, setCustomTarget] = useState("");

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
      const payload =
        customTarget.trim() !== ""
          ? { targetZones: [customTarget.trim()] }
          : {};

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

  return (
    <div className="min-h-screen bg-black text-[#00ff00] p-4 font-mono text-sm uppercase tracking-widest leading-relaxed">
      <header className="mb-6 flex justify-between items-end border-b-2 border-[#00ff00] pb-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            *** AEGIS_SOC_TERMINAL v1.0 ***
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
          onClick={purgeVault}
          className="px-4 py-1 bg-black text-red-500 border border-red-500 hover:bg-red-500 hover:text-black font-bold ml-auto transition-none cursor-pointer"
        >
          [ PURGE_DB ]
        </button>
      </section>

      <section>
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
            {findings.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-4 text-center text-gray-500 border border-[#00ff00]"
                >
                  EOF - NO DATA FOUND
                </td>
              </tr>
            ) : (
              findings.map((finding, index) => (
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
                    ) : (
                      <span className="text-[#00ff00] font-bold">
                        [ AUTHORIZED ]
                      </span>
                    )}
                  </td>
                  <td className="p-2 border border-[#00ff00]">
                    {finding.insight.startsWith("[OFFLINE") ? (
                      <span className="text-yellow-400">{finding.insight}</span>
                    ) : (
                      <span className="text-gray-300">{finding.insight}</span>
                    )}
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
