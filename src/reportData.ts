import {
  clinicalSnapshotChen,
  singleTrainingReportDetails,
  type ClinicalSnapshot,
  type SingleTrainingReportDetail
} from "./clinicalSharedData";
import { stageReportData } from "./patient/stageReportData";
import type { StageReport } from "./types";

export const TRAINING_SESSION_STORE = "xinkang-training-sessions";
export const SINGLE_REPORT_STORE = "xinkang-single-reports";
export const STAGE_REPORT_STORE = "xinkang-stage-reports";

export type ReportPatientSnapshot = {
  patientId: string;
  patientNo: string;
  name: string;
  gender?: string;
  birthDate?: string;
  age?: number;
  phone?: string;
  medicalHistory: string;
  diagnosis: string;
  procedureHistory: string;
  specialMedications: string;
  drugAllergies: string;
  exercisePrecautions: string;
  weightKg?: number | null;
  bmi?: number | null;
  riskLevel?: string;
};

export type StoredTrainingSession = {
  id: string;
  encounterId?: string;
  appointmentId?: string;
  treatmentId?: string;
  patientId: string;
  executionId: string;
  singleReportId?: string;
  actualSessionSequence: number;
  exerciseItems: string[];
  exerciseType: string;
  trainingMode: string;
  prescriptionTaskId?: string;
  prescriptionVersion?: string;
  source?: "prescription" | "appointment" | "onsite_supplement";
  date: string;
  actualStartAt: string;
  actualEndAt?: string;
  completed: boolean;
  totalMinutes: number;
  wearingMinutes: number;
  sensorValidMinutes: number;
  activeMinutes: number;
  targetZoneMinutes: number;
  avgHr: number | null;
  peakHr: number | null;
  avgPower: number | null;
  peakPower: number | null;
  distanceKm: number | null;
  caloriesKcal: number | null;
  rpe: number | null;
  symptom: string;
  pauses: number;
  terminatedEarly: boolean;
  dataCompleteness: number;
  preBp: string | null;
  postBp: string | null;
  preHr: number | null;
  postHr: number | null;
  preSpo2: number | null;
  postSpo2: number | null;
  avgSpo2: number | null;
  minSpo2: number | null;
  preRespRate: number | null;
  postRespRate: number | null;
  avgRespRate: number | null;
  safetyEvents: string[];
  fieldNote?: string;
  recordedBy?: string;
  recordedAt?: string;
};

export type StoredSingleReport = SingleTrainingReportDetail & {
  encounterId?: string;
  reportStage?: "instant" | "complete";
  sourceSessionId?: string;
  rpe?: number | null;
  dataCompleteness?: number;
  recordedBy?: string;
};

export type PatientStageConclusion = {
  headline: string;
  plainSummary: string;
  toleranceChange: { label: string; value: string; basis: string };
  vitalsStability: {
    bp: "稳定" | "需关注" | "需医生复核" | "未采集";
    spo2: "稳定" | "需关注" | "需医生复核" | "未采集";
    summary: string;
  };
  beforeAfterComparison: { metric: string; before: string; after: string; meaning: string }[];
  dietAdvice: string[];
  dailyCautions: string[];
  stopAndContactRules: string[];
};

export type StageClinicalConclusion = {
  summary: string;
  decision?: "continue" | "adjust_prescription" | "end_course";
  achievedGoals: string[];
  pendingGoals: string[];
  nextPrescription: string;
  reassessment: string;
  nextFollowUp: string;
};

export type StoredStageReport = StageReport & {
  reportNo: string;
  patientSnapshot: ReportPatientSnapshot;
  aggregate: {
    sessionCount: number;
    totalActiveMinutes: number;
    exerciseTypes: string[];
    averageHeartRate: number | null;
    averageRpe: number | null;
    abnormalCount: number;
    dataCompleteness: number | null;
  };
  patientStageConclusion: PatientStageConclusion;
  clinicalConclusion: StageClinicalConclusion;
  safetyEvents: { sessionId: string; text: string }[];
  updatedAt: string;
  missingFields: string[];
  dataQualityAcknowledgedBy?: string;
  dataQualityAcknowledgedAt?: string;
};

const toDateTime = (value: string) => {
  if (value.includes("T")) return value;
  const normalized = value.length === 5 ? `2026-${value}` : value;
  return `${normalized.replace(" ", "T")}:00+08:00`;
};

const numberOrNull = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : null;
const average = (values: (number | null | undefined)[]) => {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return valid.length ? Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1)) : null;
};

export const displayReportValue = (value: string | number | null | undefined) => value === null || value === undefined || String(value).trim() === "" ? "未提供" : String(value);
type NumericClinicalMetric = "心率" | "血氧饱和度" | "呼吸率";
type ClinicalMetric = NumericClinicalMetric | "血压";

const clinicalRanges: Record<NumericClinicalMetric, [number, number]> = {
  心率: [30, 220],
  血氧饱和度: [50, 100],
  呼吸率: [5, 60]
};

function finiteNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").trim();
  if (!text || ["null", "undefined", "—", "-"] .includes(text.toLowerCase())) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeClinicalNumber(value: unknown, metric: NumericClinicalMetric): number | null {
  const parsed = finiteNumber(value);
  if (parsed === null) return null;
  const [minimum, maximum] = clinicalRanges[metric];
  return parsed >= minimum && parsed <= maximum ? parsed : null;
}

export function normalizeRpe(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed >= 0 && parsed <= 20 ? parsed : null;
}

export function normalizeBloodPressure(value: unknown): string | null {
  const match = String(value ?? "").trim().match(/^(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmhg)?$/i);
  if (!match) return null;
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  if (systolic < 70 || systolic > 250 || diastolic < 30 || diastolic > 150 || systolic <= diastolic) return null;
  return `${systolic}/${diastolic}`;
}

export function displayClinicalMetric(metric: ClinicalMetric, value: unknown) {
  if (metric === "血压") return normalizeBloodPressure(value) ?? "未采集";
  return displayReportValue(normalizeClinicalNumber(value, metric));
}

export function sanitizeStoredTrainingSession(session: StoredTrainingSession): StoredTrainingSession {
  return {
    ...session,
    avgHr: normalizeClinicalNumber(session.avgHr, "心率"),
    peakHr: normalizeClinicalNumber(session.peakHr, "心率"),
    preBp: normalizeBloodPressure(session.preBp),
    postBp: normalizeBloodPressure(session.postBp),
    preHr: normalizeClinicalNumber(session.preHr, "心率"),
    postHr: normalizeClinicalNumber(session.postHr, "心率"),
    preSpo2: normalizeClinicalNumber(session.preSpo2, "血氧饱和度"),
    postSpo2: normalizeClinicalNumber(session.postSpo2, "血氧饱和度"),
    avgSpo2: normalizeClinicalNumber(session.avgSpo2, "血氧饱和度"),
    minSpo2: normalizeClinicalNumber(session.minSpo2, "血氧饱和度"),
    preRespRate: normalizeClinicalNumber(session.preRespRate, "呼吸率"),
    postRespRate: normalizeClinicalNumber(session.postRespRate, "呼吸率"),
    avgRespRate: normalizeClinicalNumber(session.avgRespRate, "呼吸率"),
    rpe: normalizeRpe(session.rpe)
  };
}

export function sanitizeStoredSingleReport(report: StoredSingleReport): StoredSingleReport {
  const normalizeText = (text: string, metric: NumericClinicalMetric) => text.replace(/(平均心率|最低心率|峰值心率)(\d+(?:\.\d+)?)\s*bpm/g, (_match, label: string, value: string) => `${label}${displayClinicalMetric(metric, value)} bpm`);
  const normalizeSpo2Text = (text: string) => text.replace(/(平均血氧|最低)(\d+(?:\.\d+)?)%/g, (_match, label: string, value: string) => `${label}${displayClinicalMetric("血氧饱和度", value)}%`);
  return {
    ...report,
    hrStats: {
      ...report.hrStats,
      resting: normalizeClinicalNumber(report.hrStats.resting, "心率") ?? 0,
      average: normalizeClinicalNumber(report.hrStats.average, "心率") ?? 0,
      peak: normalizeClinicalNumber(report.hrStats.peak, "心率") ?? 0
    },
    bpMeasurements: report.bpMeasurements.filter((measurement) => normalizeBloodPressure(measurement.value.replace(/\s*mmhg$/i, "")) !== null).map((measurement) => ({
      ...measurement,
      value: `${normalizeBloodPressure(measurement.value.replace(/\s*mmhg$/i, ""))} mmHg`
    })),
    phaseVitals: report.phaseVitals.map((row) => row.metric === "血压"
      ? { ...row, warmup: displayClinicalMetric("血压", row.warmup), training: displayClinicalMetric("血压", row.training), cooldown: displayClinicalMetric("血压", row.cooldown) }
      : row.metric === "心率" || row.metric === "血氧饱和度" || row.metric === "呼吸率"
        ? { ...row, warmup: displayClinicalMetric(row.metric, row.warmup), training: displayClinicalMetric(row.metric, row.training), cooldown: displayClinicalMetric(row.metric, row.cooldown) }
        : row),
    executionSummary: normalizeText(report.executionSummary, "心率"),
    spo2Summary: normalizeSpo2Text(report.spo2Summary)
  };
}

export function sanitizeStoredStageReport(report: StoredStageReport): StoredStageReport {
  const sanitizeRpeText = (value: string) => {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    return displayReportValue(normalizeRpe(match?.[0]));
  };
  return {
    ...report,
    patientStageConclusion: {
      ...report.patientStageConclusion,
      beforeAfterComparison: report.patientStageConclusion.beforeAfterComparison.map((item) => item.metric === "RPE"
        ? { ...item, before: sanitizeRpeText(item.before), after: sanitizeRpeText(item.after) }
        : item)
    }
  };
}
export const displayReportList = (items: string[] | undefined) => {
  const values = (items ?? []).map((item) => item.trim()).filter(Boolean);
  return values.length ? values : ["未提供"];
};

export function toReportPatientSnapshot(patient: {
  patient_demo_id: string;
  patient_no: string;
  name: string;
  gender?: string;
  birth_date?: string;
  age?: number;
  phone?: string;
  medical_history?: string;
  diagnosis_summary?: string;
  procedure_history?: string;
  current_medications?: string;
  drug_allergies?: string;
  exercise_precautions?: string;
  weight_kg?: number | string | null;
  bmi?: number | string | null;
  risk_level?: string;
}): ReportPatientSnapshot {
  return {
    patientId: patient.patient_demo_id,
    patientNo: patient.patient_no,
    name: patient.name,
    gender: patient.gender,
    birthDate: patient.birth_date,
    age: patient.age,
    phone: patient.phone,
    medicalHistory: patient.medical_history ?? "",
    diagnosis: patient.diagnosis_summary ?? "",
    procedureHistory: patient.procedure_history ?? "",
    specialMedications: patient.current_medications ?? "",
    drugAllergies: patient.drug_allergies ?? "",
    exercisePrecautions: patient.exercise_precautions ?? "",
    weightKg: patient.weight_kg === undefined || patient.weight_kg === "" ? undefined : Number(patient.weight_kg),
    bmi: patient.bmi === undefined || patient.bmi === "" ? undefined : Number(patient.bmi),
    riskLevel: patient.risk_level
  };
}

function toClinicalSnapshot(snapshot: ReportPatientSnapshot): ClinicalSnapshot {
  return {
    patientId: snapshot.patientId,
    name: snapshot.name,
    age: snapshot.age ?? clinicalSnapshotChen.age,
    sex: snapshot.gender ?? clinicalSnapshotChen.sex,
    weightKg: snapshot.weightKg ?? clinicalSnapshotChen.weightKg,
    bmi: snapshot.bmi ?? clinicalSnapshotChen.bmi,
    riskLevel: snapshot.riskLevel ?? clinicalSnapshotChen.riskLevel,
    medicalHistory: snapshot.medicalHistory,
    diagnosis: snapshot.diagnosis,
    specialMedications: snapshot.specialMedications.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean),
    patientFriendlySummary: snapshot.medicalHistory
  };
}

export function createSingleReportFromSession(session: StoredTrainingSession, patient: ReportPatientSnapshot): StoredSingleReport {
  session = sanitizeStoredTrainingSession(session);
  const start = toDateTime(session.actualStartAt);
  const end = session.actualEndAt ? toDateTime(session.actualEndAt) : new Date(new Date(start).getTime() + session.totalMinutes * 60_000).toISOString();
  const averageHr = session.avgHr ?? session.postHr ?? session.preHr ?? 0;
  const peakHr = session.peakHr ?? averageHr;
  const targetZoneRate = session.activeMinutes ? Math.round(session.targetZoneMinutes / session.activeMinutes * 100) : 0;
  const bpMeasurements = [
    session.preBp ? { phase: "训练前" as const, time: start.slice(11, 16), value: `${session.preBp} mmHg` } : null,
    session.postBp ? { phase: "训练后" as const, time: end.slice(11, 16), value: `${session.postBp} mmHg` } : null
  ].filter((item): item is { phase: "训练前" | "训练后"; time: string; value: string } => Boolean(item));
  const snapshot = toClinicalSnapshot(patient);
  return {
    id: session.id,
    encounterId: session.encounterId,
    reportStage: session.postBp || session.postHr || session.rpe ? "complete" : "instant",
    singleReportId: session.singleReportId ?? `SR-${session.id}`,
    singleReportNo: `CRH-SR-${start.slice(0, 10).replace(/-/g, "")}-${String(session.actualSessionSequence).padStart(4, "0")}`,
    trainingSessionId: session.id,
    trainingRecordNo: `CRH-TR-${start.slice(0, 10).replace(/-/g, "")}-${String(session.actualSessionSequence).padStart(4, "0")}`,
    taskId: session.prescriptionTaskId ?? "TRAINING-ONSITE",
    patientId: session.patientId,
    patientNo: patient.patientNo,
    prescriptionId: session.prescriptionTaskId ?? "未获取",
    prescriptionVersionId: (session.prescriptionVersion ?? "V4") as SingleTrainingReportDetail["prescriptionVersionId"],
    dataMode: "demo",
    dataSourceNote: "本报告来自现场执行记录；缺失测量点保留为未采集。",
    dateTime: start,
    actualStartAt: start,
    actualEndAt: end,
    deviceRecordedAt: end,
    uploadedAt: new Date().toISOString(),
    exercise: session.exerciseType,
    trainingType: session.trainingMode,
    totalMinutes: session.totalMinutes,
    activeMinutes: session.activeMinutes,
    invalidMinutes: Math.max(0, session.totalMinutes - session.activeMinutes),
    targetZoneMinutes: session.targetZoneMinutes,
    targetZoneRate,
    status: session.completed ? "已生成" : "未完成",
    safetySummary: session.safetyEvents.length ? session.safetyEvents.join("；") : "无异常",
    clinicalSnapshot: snapshot,
    hrStats: {
      resting: session.preHr ?? averageHr,
      average: averageHr,
      peak: peakHr,
      targetRange: [0, 0],
      targetZoneMinutes: session.targetZoneMinutes,
      aboveTargetMinutes: 0
    },
    bpMeasurements,
    phaseVitals: [
      { metric: "心率", warmup: displayClinicalMetric("心率", session.preHr), training: displayClinicalMetric("心率", session.avgHr), cooldown: displayClinicalMetric("心率", session.postHr) },
      { metric: "呼吸率", warmup: displayClinicalMetric("呼吸率", session.preRespRate), training: displayClinicalMetric("呼吸率", session.avgRespRate), cooldown: displayClinicalMetric("呼吸率", session.postRespRate) },
      { metric: "血氧饱和度", warmup: displayClinicalMetric("血氧饱和度", session.preSpo2), training: displayClinicalMetric("血氧饱和度", session.avgSpo2), cooldown: displayClinicalMetric("血氧饱和度", session.postSpo2) },
      { metric: "血压", warmup: displayClinicalMetric("血压", session.preBp), training: "未采集", cooldown: displayClinicalMetric("血压", session.postBp) }
    ],
    ecgEvents: session.safetyEvents.map((event, index) => ({ time: `事件${index + 1}`, event, action: session.fieldNote ?? "已记录现场处置", reviewed: false })),
    ecgSummary: session.safetyEvents.length ? session.safetyEvents.join("；") : "未记录异常事件。",
    spo2Summary: session.avgSpo2 === null && session.minSpo2 === null ? "未采集" : `平均血氧${displayClinicalMetric("血氧饱和度", session.avgSpo2)}%，最低${displayClinicalMetric("血氧饱和度", session.minSpo2)}%。`,
    executionSummary: `${session.exerciseType}实际训练${session.activeMinutes}分钟，平均心率${displayClinicalMetric("心率", session.avgHr)} bpm，数据完整率${session.dataCompleteness}%。`,
    sourceSessionId: session.id,
    rpe: session.rpe,
    dataCompleteness: session.dataCompleteness,
    recordedBy: session.recordedBy
  };
}

export function createStoredTrainingSession(input: {
  encounterId?: string;
  appointmentId?: string;
  treatmentId?: string;
  patientId: string;
  exerciseType: string;
  trainingMode: string;
  prescriptionTaskId?: string;
  prescriptionVersion?: string;
  actualSessionSequence: number;
  preVitals: { bp: string; hr: string; spo2: string; rr: string };
  postVitals: { bp: string; hr: string; spo2: string; rr: string; symptoms: string };
  rpe: number | null;
  pauses?: number;
  terminatedEarly?: boolean;
  fieldNote?: string;
  recordedBy: string;
  device: { hr: number; power: number; cadence?: number; durationMinutes: number; activeMinutes: number; completeness: number };
}): StoredTrainingSession {
  const now = new Date();
  const actualStartAt = new Date(now.getTime() - input.device.durationMinutes * 60_000).toISOString();
  const preHr = normalizeClinicalNumber(input.preVitals.hr, "心率");
  const preSpo2 = normalizeClinicalNumber(input.preVitals.spo2, "血氧饱和度");
  const preRespRate = normalizeClinicalNumber(input.preVitals.rr, "呼吸率");
  const postHr = normalizeClinicalNumber(input.postVitals.hr, "心率");
  const postSpo2 = normalizeClinicalNumber(input.postVitals.spo2, "血氧饱和度");
  const postRespRate = normalizeClinicalNumber(input.postVitals.rr, "呼吸率");
  const deviceHr = normalizeClinicalNumber(input.device.hr, "心率");
  const safetyEvents = input.postVitals.symptoms.trim() ? [input.postVitals.symptoms.trim()] : [];
  const pauses = Math.max(0, Math.round(input.pauses ?? (safetyEvents.length ? 1 : 0)));
  const terminatedEarly = Boolean(input.terminatedEarly);
  return {
    id: `SESSION-${now.getTime()}`,
    encounterId: input.encounterId,
    appointmentId: input.appointmentId,
    treatmentId: input.treatmentId,
    patientId: input.patientId,
    executionId: `EXEC-${now.getTime()}`,
    actualSessionSequence: input.actualSessionSequence,
    exerciseItems: [input.exerciseType],
    exerciseType: input.exerciseType,
    trainingMode: input.trainingMode,
    prescriptionTaskId: input.prescriptionTaskId,
    prescriptionVersion: input.prescriptionVersion,
    source: input.prescriptionTaskId ? "prescription" : "onsite_supplement",
    date: actualStartAt.slice(0, 10),
    actualStartAt,
    actualEndAt: now.toISOString(),
    completed: true,
    totalMinutes: input.device.durationMinutes,
    wearingMinutes: input.device.durationMinutes,
    sensorValidMinutes: Math.round(input.device.durationMinutes * input.device.completeness / 100),
    activeMinutes: input.device.activeMinutes,
    targetZoneMinutes: 0,
    avgHr: deviceHr,
    peakHr: deviceHr === null && postHr === null ? null : Math.max(deviceHr ?? 0, postHr ?? deviceHr ?? 0),
    avgPower: input.device.power,
    peakPower: input.device.power,
    distanceKm: null,
    caloriesKcal: null,
    rpe: input.rpe,
    symptom: input.postVitals.symptoms.trim() || "无明显不适",
    pauses,
    terminatedEarly,
    dataCompleteness: input.device.completeness,
    preBp: normalizeBloodPressure(input.preVitals.bp),
    postBp: normalizeBloodPressure(input.postVitals.bp),
    preHr,
    postHr,
    preSpo2,
    postSpo2,
    avgSpo2: postSpo2,
    minSpo2: postSpo2,
    preRespRate,
    postRespRate,
    avgRespRate: postRespRate,
    safetyEvents,
    fieldNote: input.fieldNote,
    recordedBy: input.recordedBy,
    recordedAt: now.toISOString()
  };
}

function blankConclusion(): PatientStageConclusion {
  return {
    headline: "",
    plainSummary: "",
    toleranceChange: { label: "", value: "", basis: "" },
    vitalsStability: { bp: "未采集", spo2: "未采集", summary: "" },
    beforeAfterComparison: [],
    dietAdvice: [],
    dailyCautions: [],
    stopAndContactRules: []
  };
}

function blankClinicalConclusion(): StageClinicalConclusion {
  return { summary: "", decision: "continue", achievedGoals: [], pendingGoals: [], nextPrescription: "", reassessment: "", nextFollowUp: "" };
}

export function createStoredStageReport(patient: ReportPatientSnapshot, sessions: StoredTrainingSession[], selectedSessionIds: string[], previousVersion = 0): StoredStageReport {
  const selected = sessions.filter((session) => selectedSessionIds.includes(session.id) && session.completed);
  const dates = selected.map((session) => session.date).sort();
  const now = new Date().toISOString();
  const abnormal = selected.filter((session) => session.symptom !== "无明显不适" || session.pauses > 0 || session.terminatedEarly);
  const projectSummary = Array.from(new Set(selected.map((session) => session.exerciseType))).map((exercise) => {
    const items = selected.filter((session) => session.exerciseType === exercise);
    return `${exercise}${items.length}次（平均心率${displayReportValue(average(items.map((item) => item.avgHr)))} bpm）`;
  }).join("；");
  const generatedSummary = selected.length ? `本报告纳入${selected.length}次实际训练：${projectSummary || "未提供运动项目"}。共记录${abnormal.length}次症状、暂停或中断；系统不自动生成医学改善结论。` : "未提供训练记录。";
  const firstSession = selected[0];
  const lastSession = selected.at(-1);
  const averageHeartRate = average(selected.map((session) => session.avgHr));
  const averageRpe = average(selected.map((session) => session.rpe));
  const missingPostBp = selected.filter((session) => !session.postBp).length;
  const missingSpo2 = selected.filter((session) => session.minSpo2 == null).length;
  const activeMinuteChange = firstSession && lastSession ? lastSession.activeMinutes - firstSession.activeMinutes : 0;
  const patientStageConclusion: PatientStageConclusion = {
    headline: selected.length ? `本周期已记录${selected.length}次院内训练` : "本周期暂无可用训练记录",
    plainSummary: selected.length ? `本周期累计实际运动${selected.reduce((sum, session) => sum + session.activeMinutes, 0)}分钟，平均心率${displayReportValue(averageHeartRate)} bpm，记录${abnormal.length}次症状、暂停或提前结束。以上为实际数据汇总，不代表诊断或处方调整。` : "暂无可解读的训练数据。",
    toleranceChange: {
      label: activeMinuteChange > 0 ? "实际运动时长增加" : activeMinuteChange < 0 ? "实际运动时长减少" : "实际运动时长基本持平",
      value: firstSession && lastSession ? `${firstSession.activeMinutes} → ${lastSession.activeMinutes}分钟` : "未提供",
      basis: "仅比较本报告首末两次实际运动时长"
    },
    vitalsStability: {
      bp: missingPostBp ? "需关注" : "稳定",
      spo2: missingSpo2 ? "需关注" : "稳定",
      summary: `${missingPostBp ? `${missingPostBp}次训练后血压未采集` : "训练前后血压记录完整"}；${missingSpo2 ? `${missingSpo2}次血氧未采集` : "血氧记录完整"}。`
    },
    beforeAfterComparison: firstSession && lastSession ? [
      { metric: "实际运动时长", before: `${firstSession.activeMinutes}分钟`, after: `${lastSession.activeMinutes}分钟`, meaning: "展示首末两次实际完成量" },
      { metric: "平均心率", before: `${displayReportValue(firstSession.avgHr)} bpm`, after: `${displayReportValue(lastSession.avgHr)} bpm`, meaning: "需结合项目、功率和症状共同理解" },
      { metric: "RPE", before: displayReportValue(firstSession.rpe), after: displayReportValue(lastSession.rpe), meaning: "患者主观用力程度" }
    ] : [],
    dietAdvice: ["训练前避免过饱或空腹，按医护要求补充水分。"],
    dailyCautions: ["训练后先休息并完成生命体征复测。"],
    stopAndContactRules: ["出现持续胸闷胸痛、明显气促、头晕或心悸时立即停止并呼叫医护。"]
  };
  const clinicalConclusion: StageClinicalConclusion = {
    summary: `系统已完成${selected.length}次训练事实汇总，异常与缺失项可追溯；是否调整处方由医生另行判断。`,
    decision: "continue",
    achievedGoals: [`累计记录${selected.length}次训练`, `累计实际运动${selected.reduce((sum, session) => sum + session.activeMinutes, 0)}分钟`],
    pendingGoals: [missingPostBp ? `补齐${missingPostBp}次训练后血压` : "保持训练后血压记录", missingSpo2 ? `补齐${missingSpo2}次血氧记录` : "保持血氧记录"],
    nextPrescription: "本报告不自动改变正式处方。",
    reassessment: "医生可结合原始记录决定是否复评。",
    nextFollowUp: "按现有院内康复计划执行。"
  };
  const reportId = `STAGE-${patient.patientId}-${Date.now()}`;
  return {
    reportId,
    reportNo: `CRH-ST-${(dates.at(-1) ?? now.slice(0, 10)).replace(/-/g, "")}-${String(previousVersion + 1).padStart(4, "0")}`,
    patientId: patient.patientId,
    selectedSessionIds: [...selectedSessionIds],
    periodStart: dates[0] ?? "",
    periodEnd: dates.at(-1) ?? "",
    generatedSummary,
    status: "draft",
    version: previousVersion + 1,
    generatedAt: now,
    generatedBy: "",
    patientSnapshot: patient,
    aggregate: {
      sessionCount: selected.length,
      totalActiveMinutes: selected.reduce((sum, session) => sum + session.activeMinutes, 0),
      exerciseTypes: Array.from(new Set(selected.map((session) => session.exerciseType))),
      averageHeartRate,
      averageRpe,
      abnormalCount: abnormal.length,
      dataCompleteness: average(selected.map((session) => session.dataCompleteness))
    },
    patientStageConclusion,
    clinicalConclusion,
    safetyEvents: abnormal.flatMap((session) => session.safetyEvents.map((text) => ({ sessionId: session.id, text }))),
    updatedAt: now,
    missingFields: [missingPostBp ? `训练后血压（${missingPostBp}次）` : null, missingSpo2 ? `血氧（${missingSpo2}次）` : null, selected.some((session) => session.rpe == null) ? "部分训练RPE" : null].filter((item): item is string => Boolean(item))
  };
}

function seedSession(session: (typeof stageReportData.sessions)[number], index: number): StoredTrainingSession {
  const actualStartAt = toDateTime(`2026-${session.date} 09:${String(10 + index).padStart(2, "0")}`);
  return {
    id: session.id,
    patientId: stageReportData.patientId,
    executionId: `EXEC-SEED-${session.id}`,
    actualSessionSequence: index + 1,
    exerciseItems: [session.exerciseType],
    exerciseType: session.exerciseType,
    trainingMode: session.trainingMode,
    prescriptionTaskId: "RX-TASK-001",
    prescriptionVersion: session.prescriptionVersionId,
    source: "prescription",
    date: actualStartAt.slice(0, 10),
    actualStartAt,
    actualEndAt: new Date(new Date(actualStartAt).getTime() + session.totalMinutes * 60_000).toISOString(),
    completed: session.completed,
    totalMinutes: session.totalMinutes,
    wearingMinutes: session.wearingMinutes,
    sensorValidMinutes: session.sensorValidMinutes,
    activeMinutes: session.activeMinutes,
    targetZoneMinutes: session.targetZoneMinutes,
    avgHr: session.avgHr,
    peakHr: session.peakHr,
    avgPower: session.avgPower,
    peakPower: session.peakPower,
    distanceKm: session.distanceKm,
    caloriesKcal: session.caloriesKcal,
    rpe: session.rpe,
    symptom: session.symptom,
    pauses: session.pauses,
    terminatedEarly: session.terminatedEarly,
    dataCompleteness: session.dataCompleteness,
    preBp: session.preBp,
    postBp: session.postBp,
    preHr: 72,
    postHr: 84,
    preSpo2: 98,
    postSpo2: session.avgSpo2,
    avgSpo2: session.avgSpo2,
    minSpo2: session.minSpo2,
    preRespRate: 18,
    postRespRate: session.avgRespRate,
    avgRespRate: session.avgRespRate,
    safetyEvents: session.symptom === "无明显不适" ? [] : [session.symptom],
    recordedBy: "Demo种子数据",
    recordedAt: actualStartAt
  };
}

export const initialTrainingSessions: StoredTrainingSession[] = stageReportData.sessions.map(seedSession);

const seedPatientSnapshot: ReportPatientSnapshot = {
  patientId: stageReportData.patientId,
  patientNo: "000001",
  name: clinicalSnapshotChen.name,
  gender: clinicalSnapshotChen.sex,
  age: clinicalSnapshotChen.age,
  medicalHistory: clinicalSnapshotChen.medicalHistory,
  diagnosis: clinicalSnapshotChen.diagnosis,
  procedureHistory: "PCI术后",
  specialMedications: clinicalSnapshotChen.specialMedications.join("、"),
  drugAllergies: "未提供",
  exercisePrecautions: "按医生处方训练，出现胸痛、明显气促或头晕时立即停止。",
  weightKg: clinicalSnapshotChen.weightKg,
  bmi: clinicalSnapshotChen.bmi,
  riskLevel: clinicalSnapshotChen.riskLevel
};

export const initialSingleReports: StoredSingleReport[] = singleTrainingReportDetails.map((report) => ({
  ...report,
  sourceSessionId: initialTrainingSessions.find((session) => session.date === report.actualStartAt.slice(0, 10))?.id,
  dataCompleteness: 96
}));

const seedStageReport = (reportNo: string, selectedSessionIds: string[], conclusion: PatientStageConclusion, clinicalConclusion: StageClinicalConclusion): StoredStageReport => {
  const report = createStoredStageReport(seedPatientSnapshot, initialTrainingSessions, selectedSessionIds, 0);
  return {
    ...report,
    reportId: reportNo,
    reportNo,
    status: "sent",
    generatedBy: "周康复师",
    generatedAt: "2026-07-26T10:30:00+08:00",
    confirmedBy: "王医生",
    confirmedAt: "2026-07-26T10:30:00+08:00",
    sentBy: "周康复师",
    sentAt: "2026-07-26T10:35:00+08:00",
    updatedAt: "2026-07-26T10:35:00+08:00",
    patientStageConclusion: conclusion,
    clinicalConclusion
  };
};

export const initialStageReports: StoredStageReport[] = [
  seedStageReport("CRH-ST-202607-0003", initialTrainingSessions.slice(-4).map((session) => session.id), stageReportData.patientStageConclusion, stageReportData.clinicalConclusion),
  seedStageReport("CRH-ST-202606-0002", initialTrainingSessions.slice(3, 11).map((session) => session.id), stageReportData.patientStageConclusion, stageReportData.clinicalConclusion),
  seedStageReport("CRH-ST-202605-0001", initialTrainingSessions.slice(0, 6).map((session) => session.id), stageReportData.patientStageConclusion, stageReportData.clinicalConclusion)
];

export function migrateLegacyStageReports(patientId: string, patient = seedPatientSnapshot, sessions = initialTrainingSessions): StoredStageReport[] {
  try {
    const raw = localStorage.getItem(`xinkang-stage-${patientId}`);
    if (!raw) return [];
    const legacy = JSON.parse(raw) as { selectedSessionIds?: string[]; sentBy?: string; sentAt?: string; status?: string; version?: number };
    const selected = legacy.selectedSessionIds ?? [];
    const report = createStoredStageReport(patient, sessions, selected, legacy.version ?? 0);
    return [{ ...report, status: legacy.status === "sent" ? "sent" : "draft", sentBy: legacy.sentBy, sentAt: legacy.sentAt }];
  } catch {
    return [];
  }
}
