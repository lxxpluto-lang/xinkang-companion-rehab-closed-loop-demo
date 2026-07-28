export type DoctorPageKey =
  | "dashboard"
  | "prescriptions"
  | "report"
  | "patients"
  | "abnormal"
  | "operations";

export type NursePageKey = "overview" | "tasks" | "stations" | "events";

export type PatientPageKey = "task" | "prepare" | "training" | "result";

export type PageKey = DoctorPageKey | PatientPageKey;

export type TrainingState =
  | "ready"
  | "running"
  | "paused"
  | "stopping"
  | "stopped"
  | "completed"
  | "disconnected";

export type QualityStatus =
  | "valid"
  | "simulated"
  | "delayed"
  | "missing"
  | "disconnected";
