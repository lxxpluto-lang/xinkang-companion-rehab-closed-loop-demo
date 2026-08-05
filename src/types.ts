export type DoctorPageKey =
  | "dashboard"
  | "patients"
  | "followups"
  | "assessment"
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

export type PatientRecordStatus = "draft" | "saved" | "incomplete" | "pending_review" | "confirmed" | "archived";

export type FieldCollectionStatus = "not_collected" | "saved" | "pending_review" | "confirmed" | "completed";

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

export type ClinicalMetricSource = "CPET" | "SPPB" | "治疗记录" | "设备" | "人工录入";

export type ClinicalMetric = {
  value: number | null;
  unit: string;
  measuredAt: string;
  source: ClinicalMetricSource;
  status: "not_collected" | "pending_review" | "confirmed";
  verifiedBy?: string;
  verifiedAt?: string;
};

export type CpetStatus = "not_collected" | "not_completed" | "completed" | "not_applicable" | "pending_review";

export type PatientClinicalOverview = {
  patientNo: string;
  name: string;
  sex: string;
  birthDate: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  rehabStage: string;
  riskLevel: string;
  dischargeDate: string;
  previousFollowUpDate: string;
  nextFollowUpDate: string;
  cpetStatus: CpetStatus;
  anaerobicThresholdHr: ClinicalMetric;
  peakHr: ClinicalMetric;
  restingHr: ClinicalMetric;
  currentPrescriptionVersion?: string;
  trainingStatus?: string;
  latestAbnormal?: string;
};
