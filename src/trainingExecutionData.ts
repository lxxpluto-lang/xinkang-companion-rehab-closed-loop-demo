import type { PatientImportRecord, StageReport, TrainingExecutionRecord, TrainingSessionRecord } from "./types";

export const initialExecutionRecords: TrainingExecutionRecord[] = [
  {
    executionId: "EXEC-20260725-001",
    patientId: "P-DEMO-001",
    selectedExerciseIds: ["功率车"],
    source: "paper_prescription",
    plannedSessionCount: 4,
    currentSessionNo: 3,
    selectedBy: "周康复师",
    selectedAt: "2026-07-25T09:12:00+08:00"
  }
];

export const initialSessionRecords: TrainingSessionRecord[] = [
  {
    sessionId: "S-20260725-004",
    executionId: "EXEC-20260725-001",
    patientId: "P-DEMO-001",
    exerciseItems: ["功率车"],
    preAssessment: { measuredAt: "2026-07-25T09:20:00+08:00", heartRate: 73, bloodPressure: "126/78", spo2: 98, respiratoryRate: 17, symptoms: [] },
    deviceMetrics: { averageHeartRate: 105, peakHeartRate: 116, minimumSpo2: 96, averagePower: 58, peakPower: 72, distanceMeters: 7200, activeMinutes: 26, dataCompleteness: 96 },
    postAssessment: { measuredAt: "2026-07-25T09:55:00+08:00", heartRate: 84, bloodPressure: "132/80", spo2: 98, respiratoryRate: 19, symptoms: ["短暂胸闷，休息后缓解"] },
    rpe: 12,
    safetyEvents: ["主训练阶段短暂胸闷，已暂停并复测"],
    dataCompleteness: 96,
    status: "completed"
  }
];

export const initialStageReport: StageReport = {
  reportId: "STAGE-202607-DRAFT",
  patientId: "P-DEMO-001",
  selectedSessionIds: ["S-20260704-001", "S-20260710-002", "S-20260717-003", "S-20260725-004"],
  generatedSummary: "四次训练总体完成，工作量逐步增加，心率与血氧总体平稳；一次短暂胸闷事件已完成现场处置，结论等待医生核对原始记录。",
  status: "pending_doctor_review"
};

export const initialPatientImports: PatientImportRecord[] = [
  { patientId: "P-DEMO-001", source: "ocr_batch", sourceFileName: "脱敏历史资料-01.pdf", confidence: 94, reviewStatus: "confirmed", reviewedBy: "周康复师" },
  { patientId: "P-DEMO-002", source: "ocr_single", sourceFileName: "SPPB记录表-02.jpg", confidence: 87, reviewStatus: "pending" }
];
