import React, { useState, useEffect } from "react";

interface ScanConfig {
  zones: string[];
  ports: number[];
}

interface Policy {
  id?: number;
  targetIp: string;
  allowedPort: number;
  expectedService: string;
}

export default function ConfigPanel() {
  const [zones, setZones] = useState<string[]>([]);
  const [ports, setPorts] = useState<number[]>([]);

  const [policies, setPolicies] = useState<Policy[]>([]);

  const [newZoneInput, setNewZoneInput] = useState<string>("");
  const [newPortInput, setNewPortInput] = useState<string>("");

  const [polIp, setPolIp] = useState<string>("");
  const [polPort, setPolPort] = useState<string>("");
  const [polService, setPolService] = useState<string>("Web Server (HTTP)");

  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>("STATUS: IDLE");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const configRes = await fetch("http://localhost:9090/api/config");
      const policyRes = await fetch("http://localhost:9090/api/policies");

      if (configRes.ok) {
        const configData = await configRes.json();
        setZones(configData.zones || []);
        setPorts(configData.ports || []);
      }
      if (policyRes.ok) {
        const policyData = await policyRes.json();
        setPolicies(policyData);
      }
      setStatusMessage("STATUS: VAULT_SYNCED");
    } catch (err) {
      console.error(err);
      setStatusMessage("STATUS: ERROR_FETCHING_FROM_BRAIN");
    } finally {
      setLoading(false);
    }
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanZone = newZoneInput.trim();
    if (cleanZone && !zones.includes(cleanZone))
      setZones([...zones, cleanZone]);
    setNewZoneInput("");
  };

  const handleAddPort = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPort = parseInt(newPortInput.trim(), 10);
    if (!isNaN(cleanPort) && !ports.includes(cleanPort))
      setPorts([...ports, cleanPort]);
    setNewPortInput("");
  };

  const handleCommitMasterConfig = async () => {
    setStatusMessage("STATUS: COMMITTING_SWEEP_CONFIG...");
    try {
      await fetch("http://localhost:9090/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zones, ports }),
      });
      setStatusMessage("STATUS: SUCCESS_SWEEP_CONFIG_UPDATED");
    } catch (err) {
      setStatusMessage("STATUS: REJECTION_ERROR_COMMIT_FAILED");
    }
  };

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!polIp || !polPort || !polService) return;

    setStatusMessage("STATUS: PUSHING_POLICY...");
    const newPolicy = {
      targetIp: polIp.trim(),
      allowedPort: parseInt(polPort.trim(), 10),
      expectedService: polService.trim(),
    };

    try {
      const res = await fetch("http://localhost:9090/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPolicy),
      });
      if (res.ok) {
        const savedPolicy = await res.json();
        setPolicies([...policies, savedPolicy]);
        setStatusMessage("STATUS: POLICY_AUTHORIZED");
        setPolIp("");
        setPolPort("");
      }
    } catch (err) {
      setStatusMessage("STATUS: POLICY_PUSH_FAILED");
    }
  };

  const handleRemovePolicy = async (id: number) => {
    try {
      await fetch(`http://localhost:9090/api/policies/${id}`, {
        method: "DELETE",
      });
      setPolicies(policies.filter((p) => p.id !== id));
      setStatusMessage("STATUS: POLICY_REVOKED");
    } catch (err) {
      setStatusMessage("STATUS: POLICY_REVOKE_FAILED");
    }
  };

  if (loading) {
    return (
      <div className="font-mono text-green-500 p-4">
        CONTACTING AUDIT BRAIN CONTROL PLANE...
      </div>
    );
  }

  return (
    <div className="bg-black border-2 border-yellow-600 p-6 font-mono text-green-500 w-full mx-auto my-6">
      <div className="border-b border-yellow-600 pb-2 mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-lg font-bold text-yellow-500">
            CONTROL PLANE & POLICY ENGINE
          </h2>
          <p className="text-xs text-yellow-700">
            Manage autonomous sweep targets and whitelist expected
            infrastructure.
          </p>
        </div>
        <span className="text-[10px] bg-zinc-900 border border-yellow-800 px-2 py-1 text-yellow-400">
          {statusMessage}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-bold text-white mb-3 border-b border-zinc-800 pb-1">
            SWEEP CONFIGURATION
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-green-700 block mb-1">
                TARGET SUBNETS
              </label>
              <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
                {zones.map((zone) => (
                  <div
                    key={zone}
                    className="flex justify-between items-center bg-zinc-900 p-1 text-xs"
                  >
                    <span className="text-green-300">{zone}</span>
                    <button
                      onClick={() => setZones(zones.filter((z) => z !== zone))}
                      className="text-red-500 hover:text-red-400 font-bold px-1"
                    >
                      [X]
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddZone} className="flex gap-1">
                <input
                  type="text"
                  className="w-full bg-black border border-green-800 p-1 text-green-400 text-xs"
                  value={newZoneInput}
                  onChange={(e) => setNewZoneInput(e.target.value)}
                  placeholder="IP/CIDR"
                />
                <button
                  type="submit"
                  className="bg-green-900 text-white px-2 text-xs"
                >
                  +
                </button>
              </form>
            </div>

            <div>
              <label className="text-xs text-green-700 block mb-1">
                TARGET PORTS
              </label>
              <div className="flex flex-wrap gap-1 mb-2 max-h-32 overflow-y-auto">
                {ports.map((port) => (
                  <div
                    key={port}
                    className="flex items-center bg-zinc-900 rounded-sm text-xs"
                  >
                    <span className="text-amber-400 px-1">{port}</span>
                    <button
                      onClick={() => setPorts(ports.filter((p) => p !== port))}
                      className="text-red-500 px-1 border-l border-zinc-700"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddPort} className="flex gap-1">
                <input
                  type="number"
                  className="w-full bg-black border border-green-800 p-1 text-green-400 text-xs"
                  value={newPortInput}
                  onChange={(e) => setNewPortInput(e.target.value)}
                  placeholder="Port"
                />
                <button
                  type="submit"
                  className="bg-green-900 text-white px-2 text-xs"
                >
                  +
                </button>
              </form>
            </div>
          </div>

          <button
            onClick={handleCommitMasterConfig}
            className="w-full bg-green-900 text-white px-4 py-2 hover:bg-green-800 font-bold text-sm"
          >
            &gt; UPDATE SWEEP PARAMETERS
          </button>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white mb-3 border-b border-zinc-800 pb-1">
            AUTHORIZED INFRASTRUCTURE POLICIES
          </h3>

          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">
            {policies.length === 0 && (
              <p className="text-xs text-zinc-600 italic">
                No whitelisted policies.
              </p>
            )}
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="flex justify-between items-center bg-zinc-900 border-l-2 border-blue-500 p-2"
              >
                <div className="text-xs">
                  <span className="text-blue-400 font-bold">
                    {policy.targetIp}
                  </span>
                  <span className="text-zinc-500 mx-2">on Port</span>
                  <span className="text-amber-400">{policy.allowedPort}</span>
                  <span className="text-zinc-500 mx-2">as</span>
                  <span className="text-green-300">
                    {policy.expectedService}
                  </span>
                </div>
                <button
                  onClick={() => policy.id && handleRemovePolicy(policy.id)}
                  className="text-red-500 hover:text-red-400 text-xs font-bold ml-4"
                >
                  [REVOKE]
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddPolicy}
            className="flex gap-2 items-end bg-zinc-900/50 p-3 border border-zinc-800"
          >
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500 block mb-1">
                TARGET IP / PATTERN
              </label>
              <input
                type="text"
                className="w-full bg-black border border-zinc-700 p-1 text-blue-400 text-xs focus:border-blue-500 focus:outline-none"
                value={polIp}
                onChange={(e) => setPolIp(e.target.value)}
                placeholder="e.g. 127.0.0.1 or 10.0.%"
                required
              />
            </div>
            <div className="w-20">
              <label className="text-[10px] text-zinc-500 block mb-1">
                PORT
              </label>
              <input
                type="number"
                className="w-full bg-black border border-zinc-700 p-1 text-amber-400 text-xs focus:border-amber-500 focus:outline-none"
                value={polPort}
                onChange={(e) => setPolPort(e.target.value)}
                placeholder="80"
                required
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500 block mb-1">
                EXPECTED SERVICE
              </label>
              <input
                type="text"
                className="w-full bg-black border border-zinc-700 p-1 text-green-300 text-xs focus:border-green-500 focus:outline-none"
                value={polService}
                onChange={(e) => setPolService(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-900 text-white px-3 py-1 text-xs font-bold hover:bg-blue-800 border border-blue-700 h-8"
            >
              + WHITELIST
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
