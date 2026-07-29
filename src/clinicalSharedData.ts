import type { PrescriptionVersion } from "./patient/stageReportData";

export type ClinicalSnapshot = {
  patientId: string;
  name: string;
  age: number;
  sex: string;
  weightKg: number;
  bmi: number;
  riskLevel: string;
  medicalHistory: string;
  diagnosis: string;
  specialMedications: string[];
  patientFriendlySummary: string;
};

export type PrescriptionClinicalAdvice = {
  diagnosisAdvice: string;
  medicationAdvice: string;
  dietCautions: string;
  exerciseCautions: string;
  rehabContraindications: string;
  stopConditions: string;
  patientInstruction: string;
};

export type PrescriptionVersionDetail = {
  id: PrescriptionVersion["id"];
  version: string;
  issuedAt: string;
  physician: string;
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
  clinicalSnapshot: ClinicalSnapshot;
  advice: PrescriptionClinicalAdvice;
};

export type BpMeasurement = {
  phase: "训练前" | "训练中" | "训练后";
  time: string;
  value: string;
};

export type PhaseVitalRow = {
  metric: string;
  warmup: string;
  training: string;
  cooldown: string;
};

export type SingleTrainingReportDetail = {
  id: string;
  taskId: string;
  patientId: string;
  prescriptionVersionId: PrescriptionVersion["id"];
  dateTime: string;
  exercise: string;
  trainingType: string;
  totalMinutes: number;
  activeMinutes: number;
  invalidMinutes: number;
  targetZoneMinutes: number;
  targetZoneRate: number;
  status: string;
  safetySummary: string;
  clinicalSnapshot: ClinicalSnapshot;
  hrStats: {
    resting: number;
    average: number;
    peak: number;
    targetRange: [number, number];
    targetZoneMinutes: number;
    aboveTargetMinutes: number;
  };
  bpMeasurements: BpMeasurement[];
  phaseVitals: PhaseVitalRow[];
  ecgSummary: string;
  spo2Summary: string;
  executionSummary: string;
};

export const clinicalSnapshotChen: ClinicalSnapshot = {
  patientId: "P-DEMO-001",
  name: "陈女士",
  age: 59,
  sex: "女",
  weightKg: 63,
  bmi: 24,
  riskLevel: "中危",
  medicalHistory: "冠心病 PCI 术后 6 周，高血压病史 8 年；否认近期静息胸痛，训练中偶有轻微胸闷。",
  diagnosis: "冠心病 PCI 术后，Ⅱ期院内心脏康复；运动耐量较前改善，中危分层稳定。",
  specialMedications: ["阿司匹林", "氯吡格雷", "美托洛尔", "阿托伐他汀"],
  patientFriendlySummary: "您目前处于支架术后院内康复阶段，整体恢复稳定，但运动时仍需要控制心率并注意胸闷、头晕等信号。"
};

export const prescriptionVersionDetails: PrescriptionVersionDetail[] = [
  {
    id: "V1",
    version: "V1.0",
    issuedAt: "2026-06-16 09:10",
    physician: "王医生",
    exerciseProject: "功率车",
    trainingType: "连续训练",
    weeklyFrequency: 3,
    warmupMinutes: 5,
    trainingMinutes: 15,
    cooldownMinutes: 5,
    targetHr: [92, 104],
    targetPower: [35, 45],
    resistance: [2, 3],
    rpeTarget: [9, 11],
    clinicalSnapshot: clinicalSnapshotChen,
    advice: {
      diagnosisAdvice: "以建立运动耐受基线为主，先观察低强度有氧训练中的心率、血压和主诉变化。",
      medicationAdvice: "继续现有抗血小板、β受体阻滞剂和调脂治疗；训练前确认当日用药情况。",
      dietCautions: "训练前1小时避免大量进食，少油少盐，避免浓茶、咖啡和酒精。",
      exerciseCautions: "从低功率开始，保持能完整说话的运动强度，避免憋气和突然加速。",
      rehabContraindications: "胸痛未缓解、静息心率明显异常、血压过高或明显头晕时不进行训练。",
      stopConditions: "出现胸痛、持续胸闷、明显气促、头晕、心悸或冷汗时立即停止并呼叫医护。",
      patientInstruction: "这阶段主要是让身体重新适应运动，不追求速度和成绩，稳稳完成比用力更重要。"
    }
  },
  {
    id: "V2",
    version: "V2.0",
    issuedAt: "2026-06-27 10:20",
    physician: "王医生",
    exerciseProject: "功率车",
    trainingType: "连续训练",
    weeklyFrequency: 3,
    warmupMinutes: 5,
    trainingMinutes: 18,
    cooldownMinutes: 5,
    targetHr: [96, 108],
    targetPower: [40, 52],
    resistance: [3, 4],
    rpeTarget: [10, 12],
    clinicalSnapshot: clinicalSnapshotChen,
    advice: {
      diagnosisAdvice: "V1完成稳定，可轻度增加主训练时间和功率，继续关注气促与血氧变化。",
      medicationAdvice: "美托洛尔可能降低运动心率反应，处方调整时同时参考RPE和症状。",
      dietCautions: "训练日早餐保持清淡，避免空腹训练；如有低血糖感需先告知医护。",
      exerciseCautions: "训练中保持稳定踏频，若血氧下降或气促明显，应降低阻力并调整呼吸。",
      rehabContraindications: "发热、胸痛、血压控制不佳或前一晚明显不适时暂停训练。",
      stopConditions: "胸闷持续超过2分钟、心悸明显、血氧持续偏低或血压异常升高时停止训练。",
      patientInstruction: "这阶段会比前一版稍微多一点运动量，但仍然以舒服、可坚持为标准。"
    }
  },
  {
    id: "V3",
    version: "V3.0",
    issuedAt: "2026-07-08 09:40",
    physician: "王医生",
    exerciseProject: "功率车",
    trainingType: "连续训练",
    weeklyFrequency: 3,
    warmupMinutes: 5,
    trainingMinutes: 20,
    cooldownMinutes: 5,
    targetHr: [100, 116],
    targetPower: [48, 62],
    resistance: [4, 5],
    rpeTarget: [11, 13],
    clinicalSnapshot: clinicalSnapshotChen,
    advice: {
      diagnosisAdvice: "靶区达标改善，运动耐量提高，可进入中等强度下限，但需严密观察血压和胸闷。",
      medicationAdvice: "继续记录训练前后血压；如运动后血压持续升高，建议医生复核降压方案。",
      dietCautions: "避免高盐饮食和训练前过饱，训练后补水少量多次。",
      exerciseCautions: "不要追求排名或速度，功率上调后更要重视热身和放松。",
      rehabContraindications: "近期胸闷加重、运动后血压明显升高或心电异常未复核时暂不加量。",
      stopConditions: "胸痛、胸闷加重、血压明显升高、心率超过控制区间或医护提示异常时立即停止。",
      patientInstruction: "这版强度更接近正式训练，请跟着节奏走，不要为了完成目标硬撑。"
    }
  },
  {
    id: "V4",
    version: "V4.0",
    issuedAt: "2026-07-19 10:05",
    physician: "王医生",
    exerciseProject: "功率车",
    trainingType: "连续训练",
    weeklyFrequency: 3,
    warmupMinutes: 5,
    trainingMinutes: 20,
    cooldownMinutes: 5,
    targetHr: [100, 116],
    targetPower: [48, 62],
    resistance: [4, 5],
    rpeTarget: [11, 13],
    clinicalSnapshot: clinicalSnapshotChen,
    advice: {
      diagnosisAdvice: "V3出现一次运动后血压升高，当前不继续上调，维持强度并补齐训练后血压记录。",
      medicationAdvice: "训练前确认β受体阻滞剂服用情况；若血压波动持续，建议复诊评估用药。",
      dietCautions: "继续低盐低脂饮食，训练前避免过饱，训练后避免立刻大量饮水或洗热水澡。",
      exerciseCautions: "保持热身5分钟和放松5分钟，不跳过放松；主训练以心率和RPE双重控制。",
      rehabContraindications: "血压未测、设备未连接、胸闷未缓解或医护未确认时不进入主训练。",
      stopConditions: "胸痛、胸闷持续、明显气促、头晕、心悸、血压异常或心率报警时停止并呼叫医护。",
      patientInstruction: "这版先保持原强度，把训练做稳。重点是监测血压和身体感受，不急着加量。"
    }
  }
];

export const singleTrainingReportDetails: SingleTrainingReportDetail[] = [
  {
    id: "TR-20260725-012",
    taskId: "RX-TASK-001",
    patientId: "P-DEMO-001",
    prescriptionVersionId: "V4",
    dateTime: "2026-07-25 09:30",
    exercise: "功率车",
    trainingType: "连续训练",
    totalMinutes: 30,
    activeMinutes: 22,
    invalidMinutes: 8,
    targetZoneMinutes: 22,
    targetZoneRate: 84,
    status: "已审核",
    safetySummary: "胸闷1次 · 已复核",
    clinicalSnapshot: clinicalSnapshotChen,
    hrStats: { resting: 72, average: 106, peak: 113, targetRange: [100, 116], targetZoneMinutes: 22, aboveTargetMinutes: 0 },
    bpMeasurements: [
      { phase: "训练前", time: "09:18", value: "126/78 mmHg" },
      { phase: "训练中", time: "09:44", value: "136/82 mmHg" },
      { phase: "训练后", time: "10:03", value: "124/76 mmHg" }
    ],
    phaseVitals: [
      { metric: "心率", warmup: "88–96 bpm", training: "100–116 bpm", cooldown: "92–104 bpm" },
      { metric: "呼吸率", warmup: "18 次/分", training: "22 次/分", cooldown: "19 次/分" },
      { metric: "血氧饱和度", warmup: "98%", training: "97%", cooldown: "98%" },
      { metric: "血压", warmup: "126/78 09:18", training: "136/82 09:44", cooldown: "124/76 10:03" }
    ],
    ecgSummary: "全程窦性心律，未记录持续性心律失常；训练第18分钟有短暂胸闷主诉，休息后缓解。",
    spo2Summary: "平均血氧97%，最低96%，未见持续下降。",
    executionSummary: "按V4处方完成训练，实际心率主要位于目标区间，血压为间歇测量且训练后回落。"
  },
  {
    id: "TR-20260723-011",
    taskId: "RX-TASK-001",
    patientId: "P-DEMO-001",
    prescriptionVersionId: "V4",
    dateTime: "2026-07-23 09:20",
    exercise: "功率车",
    trainingType: "连续训练",
    totalMinutes: 30,
    activeMinutes: 23,
    invalidMinutes: 7,
    targetZoneMinutes: 21,
    targetZoneRate: 79,
    status: "已完成",
    safetySummary: "无异常",
    clinicalSnapshot: clinicalSnapshotChen,
    hrStats: { resting: 71, average: 104, peak: 112, targetRange: [100, 116], targetZoneMinutes: 21, aboveTargetMinutes: 0 },
    bpMeasurements: [
      { phase: "训练前", time: "09:10", value: "124/76 mmHg" },
      { phase: "训练中", time: "09:38", value: "132/80 mmHg" },
      { phase: "训练后", time: "09:55", value: "122/74 mmHg" }
    ],
    phaseVitals: [
      { metric: "心率", warmup: "86–94 bpm", training: "99–112 bpm", cooldown: "90–101 bpm" },
      { metric: "呼吸率", warmup: "17 次/分", training: "21 次/分", cooldown: "18 次/分" },
      { metric: "血氧饱和度", warmup: "98%", training: "97%", cooldown: "98%" },
      { metric: "血压", warmup: "124/76 09:10", training: "132/80 09:38", cooldown: "122/74 09:55" }
    ],
    ecgSummary: "窦性心律，未见明显异常事件。",
    spo2Summary: "平均血氧97%，最低96%。",
    executionSummary: "训练完成度良好，未提前终止，可纳入阶段汇总。"
  }
];

export function getPrescriptionVersionDetail(versionId?: string) {
  return prescriptionVersionDetails.find((item) => item.id === versionId) ?? prescriptionVersionDetails[prescriptionVersionDetails.length - 1];
}

export function getSingleTrainingReportDetail(reportId?: string) {
  return singleTrainingReportDetails.find((item) => item.id === reportId) ?? singleTrainingReportDetails[0];
}
