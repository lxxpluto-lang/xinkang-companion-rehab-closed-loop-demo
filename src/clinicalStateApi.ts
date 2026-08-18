import { io, type Socket } from "socket.io-client";

export const clinicalStateKeys = {
  patients: "xinkang-patients",
  assessments: "xinkang-assessments",
  prescriptionTasks: "xinkang-prescription-tasks",
  prescriptionContents: "xinkang-prescription-contents",
  appointments: "xinkang-appointments",
  trainingEncounters: "xinkang-training-encounters",
  treatments: "xinkang-treatments",
  trainingSessions: "xinkang-training-sessions",
  singleReports: "xinkang-single-reports",
  stageReports: "xinkang-stage-reports",
  alertEvents: "xinkang-alert-events",
  alertRules: "xinkang-alert-rules",
  rehabReports: "xinkang-rehab-reports",
  followUpTasks: "xinkang-followup-tasks",
  followUpRecords: "xinkang-followup-records",
  patientClinicalProfiles: "xinkang-patient-clinical-profiles",
  clinicalNarratives: "xinkang-clinical-narratives",
  trainingVideos: "xinkang-training-videos"
} as const;

export type ClinicalStateKey = typeof clinicalStateKeys[keyof typeof clinicalStateKeys];
export type ClinicalStateDocument = { key: ClinicalStateKey; value: unknown; version: number; updatedAt: string };
type BootstrapResponse = { documents: Partial<Record<ClinicalStateKey, Omit<ClinicalStateDocument, "key"> >>; serverTime: string };

const configuredBaseUrl = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL)?.replace(/\/$/, "") ?? "";
const apiUrl = (path: string) => `${configuredBaseUrl}${path}`;

export async function fetchClinicalBootstrap() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(apiUrl("/api/bootstrap"), { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error("Clinical database is unavailable");
    return await response.json() as BootstrapResponse;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function persistClinicalState(key: ClinicalStateKey, value: unknown) {
  const response = await fetch(apiUrl(`/api/state/${encodeURIComponent(key)}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value })
  });
  if (!response.ok) throw new Error(`Failed to persist ${key}`);
  return await response.json() as ClinicalStateDocument;
}

export function subscribeClinicalState(onDocument: (document: ClinicalStateDocument) => void) {
  const socket: Socket = io(configuredBaseUrl || window.location.origin, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelayMax: 3000
  });
  socket.on("state:updated", onDocument);
  return () => { socket.close(); };
}

export function subscribeDeviceHandoff(loginCode: string, onHandoff: (handoff: unknown) => void) {
  const socket: Socket = io(configuredBaseUrl || window.location.origin, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    reconnection: true
  });
  socket.on("connect", () => socket.emit("handoff:join", loginCode));
  socket.on("handoff:updated", onHandoff);
  return () => {
    socket.emit("handoff:leave", loginCode);
    socket.close();
  };
}
