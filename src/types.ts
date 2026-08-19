export type DoctorPageKey =
  | "dashboard"
  | "patients"
  | "prescriptions"
  | "treatments"
  | "alerts"
  | "appointments"
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

export type PlanReferenceStatus = "not_obtained" | "partial_reference" | "verified_reference";

export type TrainingProjectSource = "rehab_on_site" | "patient_material" | "his_reference";

export type TrainingExecutionRecord = {
  executionId: string;
  patientId: string;
  selectedExerciseIds: string[];
  source: TrainingProjectSource;
  planReferenceStatus: PlanReferenceStatus;
  selectedBy: string;
  selectedAt: string;
};

export type TrainingSessionRecord = {
  sessionId: string;
  executionId: string;
  patientId: string;
  actualSessionSequence: number;
  exerciseItems: string[];
  exerciseType?: string;
  prescriptionTaskId?: string;
  prescriptionVersion?: string;
  source?: "prescription" | "appointment" | "onsite_supplement";
  planReferenceStatus: PlanReferenceStatus;
  actualDurationMinutes: number;
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
  scope?: "manual_stage" | "prescription_cycle";
  prescriptionTaskId?: string;
  prescriptionVersion?: string;
  version?: number;
  selectedSessionIds: string[];
  periodStart: string;
  periodEnd: string;
  generatedSummary: string;
  conclusion?: string;
  patientAdvice?: string;
  status: "draft" | "pending_doctor_review" | "confirmed" | "sent";
  generatedBy?: string;
  generatedAt?: string;
  sentBy?: string;
  sentAt?: string;
  confirmedBy?: string;
  confirmedAt?: string;
};

export type StaffRole = "ADMIN" | "DOCTOR" | "REHAB_EXECUTION";
export type PatientStatus = "prescription_opened" | "rehabilitation" | "recovered";
export type AssessmentInputMode = "batch_ocr" | "single_ocr" | "manual";
export type RecordStatus = "draft" | "completed";
export type SharedContentStatus = "draft" | "sent";

export type ClinicalDataSource =
  | "DEVICE_CAPTURED"
  | "RULE_DERIVED"
  | "MANUAL_ENTRY"
  | "AI_SUGGESTED";

export type SourcedClinicalValue<T> = {
  value: T | null;
  source: ClinicalDataSource;
  sourceRecordId?: string;
  capturedAt?: string;
  confirmedBy?: string;
};

export type AiSuggestion = {
  suggestionId: string;
  patientId: string;
  type: "PRESCRIPTION" | "TREATMENT_ADVICE" | "STAGE_SUMMARY";
  sourceRecordIds: string[];
  missingFields: string[];
  content: string;
  status: "DRAFT" | "CONFIRMED" | "REJECTED";
  generatedAt: string;
  confirmedBy?: string;
};

export type TreatmentSignature = {
  mode: "uploaded" | "print_hand_sign";
  signerRole: "ADMIN" | "REHAB_EXECUTION";
  signerName: string;
  signatureImage?: string;
  treatmentAt: string;
  signedAt: string;
};

export type PatientImportRecord = {
  patientId: string;
  source: "ocr_single" | "ocr_batch" | "manual_supplement";
  sourceFileName?: string;
  confidence?: number;
  reviewStatus: "pending" | "confirmed" | "rejected";
  reviewedBy?: string;
};
