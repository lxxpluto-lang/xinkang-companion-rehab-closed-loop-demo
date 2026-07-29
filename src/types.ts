export type DoctorPageKey =
  | "dashboard"
  | "patients"
  | "report"
  | "prescriptions"
  | "training"
  | "orgPermissions"
  | "videoConfig"
  | "documentConfig";

export type NursePageKey = "overview" | "tasks" | "stations" | "events";

export type PatientPageKey = "task" | "prepare" | "training" | "result";

export type PageKey = DoctorPageKey | PatientPageKey;

export type Role = "ADMIN" | "DOCTOR" | "REHAB_EXECUTION" | "PATIENT";

export type DataScope = "SELF_TASK" | "TEAM" | "CENTER" | "ALL";

export type PermissionAction =
  | "VIEW"
  | "CREATE"
  | "EDIT"
  | "REVIEW"
  | "SIGN"
  | "PUBLISH"
  | "UNPUBLISH"
  | "DELETE"
  | "RESTORE"
  | "PERMANENT_DELETE"
  | "PRINT"
  | "EXPORT"
  | "GRANT";

export type ContentStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "OFFLINE" | "RECYCLED";

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
