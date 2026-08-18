import type { PrescriptionTask } from "./clinicalWorkflowData";
import type { ManagedPatient } from "./pages/PatientArchivePage";
import type { PrescriptionContent } from "./prescriptionWorkspaceData";
import type { TrainingEncounter } from "./trainingEncounterData";

export type DeviceHandoff = {
  loginCode: string;
  patient: ManagedPatient;
  encounter: TrainingEncounter;
  prescriptionTask: PrescriptionTask;
  prescriptionContent?: PrescriptionContent;
  publishedAt: string;
  updatedAt: string;
};

const DEVICE_HANDOFF_STORAGE_KEY = "xinkang-device-handoffs";

function readStoredHandoffs() {
  if (typeof window === "undefined") return {} as Record<string, DeviceHandoff>;
  try {
    return JSON.parse(window.localStorage.getItem(DEVICE_HANDOFF_STORAGE_KEY) ?? "{}") as Record<string, DeviceHandoff>;
  } catch {
    return {} as Record<string, DeviceHandoff>;
  }
}

function storeHandoff(handoff: DeviceHandoff) {
  if (typeof window === "undefined") return handoff;
  const handoffs = readStoredHandoffs();
  handoffs[normalizeDeviceLoginCode(handoff.loginCode)] = handoff;
  window.localStorage.setItem(DEVICE_HANDOFF_STORAGE_KEY, JSON.stringify(handoffs));
  return handoff;
}

function storeHandoffs(handoffs: DeviceHandoff[]) {
  handoffs.forEach(storeHandoff);
  return handoffs;
}

export function normalizeDeviceLoginCode(value: string) {
  return value.replace(/\D/g, "").slice(-6).padStart(6, "0");
}

export async function publishDeviceHandoff(handoff: DeviceHandoff) {
  const fallbackHandoff = {
    ...handoff,
    loginCode: normalizeDeviceLoginCode(handoff.loginCode),
    updatedAt: new Date().toISOString()
  };
  try {
    const response = await fetch("/api/device-handoffs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fallbackHandoff)
    });
    if (!response.ok) return storeHandoff(fallbackHandoff);
    return storeHandoff(await response.json() as DeviceHandoff);
  } catch {
    return storeHandoff(fallbackHandoff);
  }
}

export async function listDeviceHandoffs() {
  try {
    const response = await fetch("/api/device-handoffs", { cache: "no-store" });
    if (!response.ok) return Object.values(readStoredHandoffs());
    return storeHandoffs(await response.json() as DeviceHandoff[]);
  } catch {
    return Object.values(readStoredHandoffs());
  }
}

export async function readDeviceHandoff(loginCode: string) {
  const normalizedCode = normalizeDeviceLoginCode(loginCode);
  try {
    const response = await fetch(`/api/device-handoffs/${encodeURIComponent(normalizedCode)}`, { cache: "no-store" });
    if (!response.ok) return readStoredHandoffs()[normalizedCode] ?? null;
    return storeHandoff(await response.json() as DeviceHandoff);
  } catch {
    return readStoredHandoffs()[normalizedCode] ?? null;
  }
}

export async function updateDeviceHandoff(loginCode: string, patch: Partial<TrainingEncounter>) {
  const normalizedCode = normalizeDeviceLoginCode(loginCode);
  const updateStoredHandoff = () => {
    const current = readStoredHandoffs()[normalizedCode];
    if (!current) throw new Error("设备交接状态同步失败");
    return storeHandoff({
      ...current,
      encounter: { ...current.encounter, ...patch },
      updatedAt: new Date().toISOString()
    });
  };

  try {
    const response = await fetch(`/api/device-handoffs/${encodeURIComponent(normalizedCode)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encounter: patch })
    });
    if (!response.ok) return updateStoredHandoff();
    return storeHandoff(await response.json() as DeviceHandoff);
  } catch {
    return updateStoredHandoff();
  }
}
