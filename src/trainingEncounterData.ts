export const TRAINING_ENCOUNTER_STORE = "xinkang-training-encounters";

export type TrainingEncounterStatus =
  | "scheduled"
  | "pre_assessment"
  | "ready_for_device"
  | "device_ready"
  | "in_training"
  | "paused"
  | "awaiting_next_task"
  | "post_assessment"
  | "pending_signature"
  | "completed"
  | "cancelled"
  | "no_show"
  | "terminated";

export type ExecutionAdjustment = {
  field: "targetHeartRate" | "targetPower" | "durationMinutes" | "trainingMode";
  label: string;
  prescribedValue: string;
  executionValue: string;
  reason: "患者当日状态" | "设备适配" | "现场反应" | "康复师评估" | "其他";
  changedBy: string;
  changedAt: string;
};

export type ImmediateTrainingSummary = {
  outcome: "completed" | "partially_completed" | "terminated";
  activeMinutes: number;
  averageHeartRate: number | null;
  peakHeartRate: number | null;
  minimumSpo2: number | null;
  averagePower: number | null;
  pauses: number;
  safetySummary: string;
  generatedAt: string;
};

export type LiveTrainingMetrics = {
  heartRate: number;
  speedKmh: number;
  distanceKm: number;
  powerW: number;
  cadenceRpm: number;
  resistanceLevel: number;
  spo2: number;
  bloodPressure: string;
  caloriesKcal: number;
  elapsedSeconds: number;
  phase: "warmup" | "training" | "cooldown";
  paused: boolean;
  sampledAt: string;
};

export type DailyTrainingTaskStatus = "pending" | "in_progress" | "completed" | "partially_completed" | "interrupted" | "skipped";

export type DailyTrainingTask = {
  taskId: string;
  category: string;
  exerciseName: string;
  exerciseKey: string;
  order: number;
  status: DailyTrainingTaskStatus;
  startedAt?: string;
  completedAt?: string;
  recordedMetrics?: {
    lastHeartRate: number;
    lastSpo2: number;
    recordedSeconds: number;
    recordedAt: string;
  };
};

export type LiveTrainingAlert = {
  type: "heart_rate";
  severity: "warning" | "critical";
  active: boolean;
  message: string;
  value: string;
  updatedAt: string;
};

export type PaperSignatureStatus = "not_required" | "pending_print" | "pending_patient_signature" | "archived";

export type TrainingEncounter = {
  encounterId: string;
  appointmentId: string;
  patientId: string;
  patientNo: string;
  patientName: string;
  prescriptionTaskId: string;
  prescriptionVersion: string;
  treatmentId: string;
  sessionId?: string;
  singleReportId?: string;
  station: string;
  project: string;
  therapist: string;
  status: TrainingEncounterStatus;
  adjustments: ExecutionAdjustment[];
  immediateSummary?: ImmediateTrainingSummary;
  liveMetrics?: LiveTrainingMetrics;
  liveAlert?: LiveTrainingAlert;
  dailyTrainingTasks?: DailyTrainingTask[];
  activeTrainingTaskId?: string;
  dayEndedAt?: string;
  dayEndedBy?: string;
  dayEndReason?: string;
  paperSignatureStatus: PaperSignatureStatus;
  checkedInAt?: string;
  preAssessmentCompletedAt?: string;
  deviceLoggedInAt?: string;
  wearableConnectedAt?: string;
  trainingDeviceConnectedAt?: string;
  trainingStartedAt?: string;
  trainingEndedAt?: string;
  postAssessmentCompletedAt?: string;
  signedAt?: string;
  paperArchivedAt?: string;
  updatedAt: string;
};

export const initialTrainingEncounters: TrainingEncounter[] = [
  {
    encounterId: "ENC-APT-001",
    appointmentId: "APT-001",
    patientId: "P-DEMO-001",
    patientNo: "000001",
    patientName: "陈女士",
    prescriptionTaskId: "RX-TASK-005",
    prescriptionVersion: "V1",
    treatmentId: "TREAT-20260805-002",
    station: "功率车01",
    project: "功率车",
    therapist: "周康复师",
    status: "pre_assessment",
    adjustments: [],
    paperSignatureStatus: "not_required",
    checkedInAt: "2026-08-05T10:08:00+08:00",
    updatedAt: "2026-08-05T10:08:00+08:00"
  }
];

export const encounterStatusLabel: Record<TrainingEncounterStatus, string> = {
  scheduled: "已预约",
  pre_assessment: "待训练前评估",
  ready_for_device: "待设备登录",
  device_ready: "设备已就绪",
  in_training: "训练中",
  paused: "异常暂停",
  awaiting_next_task: "等待下一项目",
  post_assessment: "待训练后评估",
  pending_signature: "待康复师签署",
  completed: "训练已完成",
  cancelled: "已取消",
  no_show: "爽约",
  terminated: "训练已终止"
};
