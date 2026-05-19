const BASE_URL = "http://localhost:9090/api/config";

export interface ScanConfig {
  zones: string[];
  ports: number[];
}

export async function fetchMasterConfig(): Promise<ScanConfig> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error("Failed to fetch control plane configuration.");
  return res.json();
}

export async function updateMasterConfig(
  config: ScanConfig,
): Promise<ScanConfig> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to commit configuration updates.");
  return res.json();
}
