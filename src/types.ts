export type DoctorPageKey =
  | "dashboard"
  | "patients"
  | "followups"
  | "assessment"
  | "report"
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

export type VitalSnapshot = {
  measuredAt: string;
  heartRate: number | null;
  bloodPressure: string | null;
  spo2: number | null;
  respiratoryRate: number | null;
  symptoms: string[];
};

export type DeviceMetricSummary = {
  averageHeartRate: number | null;
  peakHeartRate: number | null;
  minimumSpo2: number | null;
  averagePower: number | null;
  peakPower: number | null;
  distanceMeters: number | null;
  activeMinutes: number | null;
  dataCompleteness: number;
};

export type TrainingExecutionRecord = {
  executionId: string;
  patientId: string;
  selectedExerciseIds: string[];
  source: "paper_prescription" | "his_reference";
  plannedSessionCount: number | null;
  currentSessionNo: number | null;
  selectedBy: string;
  selectedAt: string;
};

export type TrainingSessionRecord = {
  sessionId: string;
  executionId: string;
  patientId: string;
  exerciseItems: string[];
  preAssessment: VitalSnapshot;
  deviceMetrics: DeviceMetricSummary;
  postAssessment: VitalSnapshot;
  rpe: number | null;
  safetyEvents: string[];
  dataCompleteness: number;
  status: "preparing" | "running" | "completed" | "terminated";
};

export type StageReport = {
  reportId: string;
  patientId: string;
  selectedSessionIds: string[];
  generatedSummary: string;
  status: "draft" | "pending_doctor_review" | "confirmed";
  confirmedBy?: string;
  confirmedAt?: string;
};

export type PatientImportRecord = {
  patientId: string;
  source: "ocr_single" | "ocr_batch" | "manual_supplement";
  sourceFileName?: string;
  confidence?: number;
  reviewStatus: "pending" | "confirmed" | "rejected";
  reviewedBy?: string;
};
