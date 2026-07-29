import { clinicalSnapshotChen, prescriptionVersionDetails, type PrescriptionVersionId } from "../clinicalSharedData";

export type PrescriptionDirection = "起始" | "上调" | "维持" | "下调";

export type PrescriptionVersion = {
  id: PrescriptionVersionId;
  effectiveDate: string;
  physician: string;
  direction: PrescriptionDirection;
  adjustmentReason: string;
  exerciseProject: string;
  trainingType: string;
  weeklyFrequency: number;
  warmupMinutes: number;
  trainingMinutes: number;
  cooldownMinutes: number;
  targetHr: [number, number];
  targetPower: [number, number];
  resistance: [number, number];
  rpeTarget: [number, number];
  plannedSessions: number;
};

export type TrainingSession = {
  id: string;
  prescriptionVersionId: PrescriptionVersion["id"];
  date: string;
  completed: boolean;
  totalMinutes: number;
  wearingMinutes: number;
  sensorValidMinutes: number;
  activeMinutes: number;
  targetZoneMinutes: number;
  avgHr: number;
  peakHr: number;
  avgPower: number;
  peakPower: number;
  distanceKm: number;
  caloriesKcal: number;
  rpe: number;
  symptom: string;
  pauses: number;
  terminatedEarly: boolean;
  dataCompleteness: number;
  preBp: string | null;
  postBp: string | null;
  avgSpo2: number | null;
  minSpo2: number | null;
  avgRespRate: number | null;
};

export type SafetyEvent = {
  id: string;
  prescriptionVersionId: PrescriptionVersion["id"];
  sessionId: string;
  type: string;
  severity: "提示" | "关注" | "高风险";
  occurredAt: string;
  value: string;
  action: string;
  terminated: boolean;
  review: string;
};

export type FunctionalAssessment = {
  metric: string;
  unit: string;
  baseline: number | null;
  latest: number | null;
  assessedAt: string | null;
};

export type PatientReportedOutcome = {
  prescriptionVersionId: PrescriptionVersion["id"];
  avgRpe: number;
  confidence: number;
  readiness: number;
  adherence: number;
};

export type PatientStageConclusion = {
  headline: string;
  plainSummary: string;
  toleranceChange: {
    label: string;
    value: string;
    basis: string;
  };
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

export type StageReportData = {
  reportPeriod: { start: string; end: string; generatedAt: string };
  patientSnapshot: {
    name: string;
    age: number;
    weightKg: number;
    bmi: number;
    riskAtStart: string;
    currentRisk: string;
  };
  prescriptionVersions: PrescriptionVersion[];
  sessions: TrainingSession[];
  safetyEvents: SafetyEvent[];
  functionalAssessments: FunctionalAssessment[];
  patientReportedOutcomes: PatientReportedOutcome[];
  patientStageConclusion: PatientStageConclusion;
  clinicalConclusion: {
    summary: string;
    achievedGoals: string[];
    pendingGoals: string[];
    nextPrescription: string;
    reassessment: string;
    confirmedBy: string;
    confirmedAt: string;
    nextFollowUp: string;
  };
};

const prescriptionStageMeta: Record<PrescriptionVersionId, { direction: PrescriptionDirection; adjustmentReason: string; plannedSessions: number }> = {
  V1: { direction: "起始", adjustmentReason: "建立基线，观察低强度运动耐受", plannedSessions: 3 },
  V2: { direction: "上调", adjustmentReason: "V1完成稳定，延长主训练并提高功率", plannedSessions: 3 },
  V3: { direction: "上调", adjustmentReason: "靶区达标改善，增加主训练剂量", plannedSessions: 3 },
  V4: { direction: "维持", adjustmentReason: "V3出现一次血压关注事件，暂维持强度", plannedSessions: 3 }
};

const stagePrescriptionVersions: PrescriptionVersion[] = prescriptionVersionDetails.map((version) => ({
  id: version.id,
  effectiveDate: version.issuedAt.slice(5, 10),
  physician: version.physician,
  direction: prescriptionStageMeta[version.id].direction,
  adjustmentReason: prescriptionStageMeta[version.id].adjustmentReason,
  exerciseProject: version.exerciseProject,
  trainingType: version.trainingType,
  weeklyFrequency: version.weeklyFrequency,
  warmupMinutes: version.warmupMinutes,
  trainingMinutes: version.trainingMinutes,
  cooldownMinutes: version.cooldownMinutes,
  targetHr: version.targetHr,
  targetPower: version.targetPower,
  resistance: version.resistance,
  rpeTarget: version.rpeTarget,
  plannedSessions: prescriptionStageMeta[version.id].plannedSessions
}));

const session = (
  id: string,
  prescriptionVersionId: TrainingSession["prescriptionVersionId"],
  date: string,
  values: Partial<TrainingSession>
): TrainingSession => ({
  id,
  prescriptionVersionId,
  date,
  completed: true,
  totalMinutes: 30,
  wearingMinutes: 30,
  sensorValidMinutes: 29,
  activeMinutes: 24,
  targetZoneMinutes: 18,
  avgHr: 104,
  peakHr: 116,
  avgPower: 52,
  peakPower: 68,
  distanceKm: 7.8,
  caloriesKcal: 112,
  rpe: 12,
  symptom: "无明显不适",
  pauses: 0,
  terminatedEarly: false,
  dataCompleteness: 96,
  preBp: "126/78",
  postBp: "124/76",
  avgSpo2: 97,
  minSpo2: 96,
  avgRespRate: 20,
  ...values
});

export const stageReportData: StageReportData = {
  reportPeriod: {
    start: "2026-06-16",
    end: "2026-07-25",
    generatedAt: "2026-07-26 10:30"
  },
  patientSnapshot: {
    name: clinicalSnapshotChen.name,
    age: clinicalSnapshotChen.age,
    weightKg: clinicalSnapshotChen.weightKg,
    bmi: clinicalSnapshotChen.bmi,
    riskAtStart: clinicalSnapshotChen.riskLevel,
    currentRisk: `${clinicalSnapshotChen.riskLevel}（状态稳定）`
  },
  prescriptionVersions: stagePrescriptionVersions,
  sessions: [
    session("S-V1-01", "V1", "06-16", { totalMinutes: 25, activeMinutes: 18, targetZoneMinutes: 10, avgHr: 98, peakHr: 106, avgPower: 39, peakPower: 47, distanceKm: 5.4, caloriesKcal: 78, rpe: 11 }),
    session("S-V1-02", "V1", "06-19", { totalMinutes: 25, activeMinutes: 19, targetZoneMinutes: 12, avgHr: 97, peakHr: 105, avgPower: 40, peakPower: 48, distanceKm: 5.8, caloriesKcal: 82, rpe: 10 }),
    session("S-V1-03", "V1", "06-23", { totalMinutes: 25, activeMinutes: 20, targetZoneMinutes: 13, avgHr: 96, peakHr: 104, avgPower: 41, peakPower: 49, distanceKm: 6, caloriesKcal: 84, rpe: 10 }),
    session("S-V2-01", "V2", "06-27", { totalMinutes: 28, activeMinutes: 21, targetZoneMinutes: 14, avgHr: 102, peakHr: 111, avgPower: 46, peakPower: 56, distanceKm: 6.5, caloriesKcal: 92, rpe: 12 }),
    session("S-V2-02", "V2", "07-01", { totalMinutes: 28, activeMinutes: 22, targetZoneMinutes: 16, avgHr: 101, peakHr: 110, avgPower: 47, peakPower: 57, distanceKm: 6.8, caloriesKcal: 96, rpe: 11, minSpo2: 93, symptom: "短暂气促", pauses: 1 }),
    session("S-V2-03", "V2", "07-04", { totalMinutes: 28, activeMinutes: 23, targetZoneMinutes: 17, avgHr: 100, peakHr: 109, avgPower: 48, peakPower: 58, distanceKm: 7, caloriesKcal: 98, rpe: 11 }),
    session("S-V3-01", "V3", "07-08", { activeMinutes: 24, targetZoneMinutes: 18, avgHr: 106, peakHr: 117, avgPower: 54, peakPower: 66, distanceKm: 7.8, caloriesKcal: 111, rpe: 13 }),
    session("S-V3-02", "V3", "07-12", { activeMinutes: 22, targetZoneMinutes: 15, avgHr: 108, peakHr: 121, avgPower: 55, peakPower: 69, distanceKm: 7.3, caloriesKcal: 108, rpe: 13, symptom: "轻微胸闷", pauses: 1, postBp: "158/92", dataCompleteness: 92 }),
    session("S-V3-03", "V3", "07-16", { activeMinutes: 25, targetZoneMinutes: 20, avgHr: 104, peakHr: 115, avgPower: 56, peakPower: 68, distanceKm: 8.2, caloriesKcal: 118, rpe: 12 }),
    session("S-V4-01", "V4", "07-22", { activeMinutes: 25, targetZoneMinutes: 21, avgHr: 103, peakHr: 114, avgPower: 58, peakPower: 70, distanceKm: 8.5, caloriesKcal: 123, rpe: 11, postBp: null, dataCompleteness: 88 }),
    session("S-V4-02", "V4", "07-25", { activeMinutes: 26, targetZoneMinutes: 22, avgHr: 102, peakHr: 113, avgPower: 59, peakPower: 71, distanceKm: 8.8, caloriesKcal: 126, rpe: 11 })
  ],
  safetyEvents: [
    {
      id: "E-01",
      prescriptionVersionId: "V2",
      sessionId: "S-V2-02",
      type: "SpO₂下降",
      severity: "提示",
      occurredAt: "训练第14分钟",
      value: "最低93%",
      action: "降低阻力并指导呼吸，2分钟后恢复",
      terminated: false,
      review: "医护已复核"
    },
    {
      id: "E-02",
      prescriptionVersionId: "V3",
      sessionId: "S-V3-02",
      type: "运动后血压升高",
      severity: "关注",
      occurredAt: "放松期结束",
      value: "158/92 mmHg",
      action: "延长放松、坐位休息并复测",
      terminated: false,
      review: "医生建议V4维持强度"
    },
    {
      id: "E-03",
      prescriptionVersionId: "V3",
      sessionId: "S-V3-02",
      type: "室性早搏",
      severity: "关注",
      occurredAt: "训练第18分钟",
      value: "孤立2次，无持续发作",
      action: "暂停1分钟并观察症状",
      terminated: false,
      review: "心电已复核"
    }
  ],
  functionalAssessments: [
    { metric: "静息心率", unit: "bpm", baseline: 72, latest: 68, assessedAt: "2026-07-25" },
    { metric: "体重", unit: "kg", baseline: 64.2, latest: 63, assessedAt: "2026-07-25" },
    { metric: "BMI", unit: "kg/m²", baseline: 24.5, latest: 24, assessedAt: "2026-07-25" },
    { metric: "6分钟步行", unit: "m", baseline: 420, latest: 475, assessedAt: "2026-07-24" },
    { metric: "VO₂peak", unit: "mL/kg/min", baseline: 18.6, latest: null, assessedAt: null },
    { metric: "AT功率", unit: "W", baseline: 70, latest: 86, assessedAt: "2026-07-24" }
  ],
  patientReportedOutcomes: [
    { prescriptionVersionId: "V1", avgRpe: 10.3, confidence: 68, readiness: 74, adherence: 100 },
    { prescriptionVersionId: "V2", avgRpe: 11.3, confidence: 76, readiness: 80, adherence: 100 },
    { prescriptionVersionId: "V3", avgRpe: 12.7, confidence: 81, readiness: 82, adherence: 100 },
    { prescriptionVersionId: "V4", avgRpe: 11, confidence: 88, readiness: 90, adherence: 67 }
  ],
  patientStageConclusion: {
    headline: "这段时间您的运动能力在变好，下一阶段先稳住当前强度。",
    plainSummary: "这 4 次处方周期里，您大多数训练能按计划完成。和刚开始相比，现在能在相近心率和主观疲劳感下完成更高功率，说明身体对运动的耐受在提高。血氧总体稳定，血压有过一次运动后偏高，医生已复核，所以暂时不急着继续加量。",
    toleranceChange: {
      label: "运动耐量约提升 18%",
      value: "约 +18%",
      basis: "按 V1 到 V4 的平均功率变化估算；同时参考平均心率接近、RPE未升高。若后续接入真实采样，会用设备时序重新计算。"
    },
    vitalsStability: {
      bp: "需关注",
      spo2: "稳定",
      summary: "血氧多数时间在 96%–98%；血压曾出现一次训练后升高，最近一次训练后血压未采集，因此下一阶段要补齐训练后血压记录。"
    },
    beforeAfterComparison: [
      { metric: "平均功率", before: "约40 W", after: "约59 W", meaning: "同样能承受的运动量变大了" },
      { metric: "6分钟步行", before: "420 m", after: "475 m", meaning: "日常步行耐力有改善" },
      { metric: "静息心率", before: "72 bpm", after: "68 bpm", meaning: "安静状态下心脏负担略有下降" },
      { metric: "血氧", before: "最低约96%", after: "最低约96%", meaning: "训练中供氧总体稳定" }
    ],
    dietAdvice: [
      "继续低盐低脂饮食，少吃腌制、高油和重口味食物。",
      "训练前1小时避免吃太饱，也不要空腹训练。",
      "训练后先坐位休息，少量多次饮水，避免立刻洗热水澡。"
    ],
    dailyCautions: [
      "按医生给的靶心率训练，不为了完成目标硬撑。",
      "热身和放松都要做完整，尤其不要跳过放松阶段。",
      "训练日记录胸闷、心悸、气促、头晕等感受，复诊时告诉医生。"
    ],
    stopAndContactRules: [
      "出现胸痛、持续胸闷、明显气促、头晕或冷汗时立即停止。",
      "心率报警、血氧持续偏低或医护提示异常时不要继续加量。",
      "离院后不适持续不缓解，应及时联系康复中心或就医。"
    ]
  },
  clinicalConclusion: {
    summary: "运动耐量提高，较高工作量下平均心率与RPE下降；生命体征总体平稳，建议维持V4强度并补齐训练后血压。",
    achievedGoals: ["完成11/12次计划训练", "靶区达标率持续提高", "6分钟步行距离增加55米"],
    pendingGoals: ["V4仍有1次计划训练未完成", "1次训练后血压未采集", "阶段末VO₂peak尚未复测"],
    nextPrescription: "维持功率48–62W、靶心率100–116 bpm、主训练20分钟，每周3次；连续稳定3次后再评估上调。",
    reassessment: "建议完成剩余训练并补测运动后血压；下次随访评估是否复查CPET。",
    confirmedBy: "王医生",
    confirmedAt: "2026-07-26 10:30",
    nextFollowUp: "2026-08-06 14:30"
  }
};

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export type VersionSummary = {
  versionId: PrescriptionVersion["id"];
  completedSessions: number;
  completionRate: number;
  avgDuration: number;
  sensorValidRate: number;
  avgActiveMinutes: number;
  avgTargetZoneMinutes: number;
  targetZoneRate: number;
  avgHr: number;
  peakHr: number;
  avgPower: number;
  peakPower: number;
  totalDistance: number;
  totalCalories: number;
  avgRpe: number;
  symptoms: string[];
  pauses: number;
  earlyTerminations: number;
  dataCompleteness: number;
  missingFields: string[];
};

export function summarizeVersion(data: StageReportData, version: PrescriptionVersion): VersionSummary {
  const sessions = data.sessions.filter((item) => item.prescriptionVersionId === version.id && item.completed);
  const activeMinutes = sum(sessions.map((item) => item.activeMinutes));
  const wearingMinutes = sum(sessions.map((item) => item.wearingMinutes));
  const missingFields = [
    sessions.some((item) => item.postBp === null) ? "训练后血压" : null,
    sessions.some((item) => item.avgSpo2 === null) ? "血氧" : null,
    sessions.some((item) => item.avgRespRate === null) ? "呼吸率" : null
  ].filter((item): item is string => Boolean(item));
  return {
    versionId: version.id,
    completedSessions: sessions.length,
    completionRate: version.plannedSessions ? sessions.length / version.plannedSessions * 100 : 0,
    avgDuration: average(sessions.map((item) => item.totalMinutes)),
    sensorValidRate: wearingMinutes ? sum(sessions.map((item) => item.sensorValidMinutes)) / wearingMinutes * 100 : 0,
    avgActiveMinutes: average(sessions.map((item) => item.activeMinutes)),
    avgTargetZoneMinutes: average(sessions.map((item) => item.targetZoneMinutes)),
    targetZoneRate: activeMinutes ? sum(sessions.map((item) => item.targetZoneMinutes)) / activeMinutes * 100 : 0,
    avgHr: average(sessions.map((item) => item.avgHr)),
    peakHr: sessions.length ? Math.max(...sessions.map((item) => item.peakHr)) : 0,
    avgPower: average(sessions.map((item) => item.avgPower)),
    peakPower: sessions.length ? Math.max(...sessions.map((item) => item.peakPower)) : 0,
    totalDistance: sum(sessions.map((item) => item.distanceKm)),
    totalCalories: sum(sessions.map((item) => item.caloriesKcal)),
    avgRpe: average(sessions.map((item) => item.rpe)),
    symptoms: [...new Set(sessions.map((item) => item.symptom).filter((item) => item !== "无明显不适"))],
    pauses: sum(sessions.map((item) => item.pauses)),
    earlyTerminations: sessions.filter((item) => item.terminatedEarly).length,
    dataCompleteness: average(sessions.map((item) => item.dataCompleteness)),
    missingFields
  };
}
