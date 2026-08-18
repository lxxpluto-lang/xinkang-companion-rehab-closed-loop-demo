import type { ClinicalMetric, CpetStatus } from "./types";

export type PatientClinicalProfile = {
  patientId: string;
  patientNo: string;
  name: string;
  sex: string;
  age: number;
  birthDate: string;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  dischargeDate: string;
  previousFollowUpDate: string;
  nextFollowUpDate: string;
  currentPrescriptionVersion?: string;
  trainingStatus?: string;
  latestAbnormal?: string;
  idNumberMasked: string;
  contact: string;
  riskLevel: "低危" | "中危" | "高危";
  rehabStage: string;
  diagnosis: string;
  medicalHistory: string;
  specialMedications: string;
  cpet: string;
  cpetStatus: CpetStatus;
  sixMinuteWalk: string;
  restingVitals: string;
  updatedBy: string;
  updatedAt: string;
  auditSummary?: string;
  rehabAssessment: RehabAssessment;
};

export type RehabAssessment = {
  assessmentId: string;
  assessedAt: string;
  assessor: string;
  source: "结构化录入" | "设备采集";
  status: "待补充" | "待复核" | "已复核";
  sppb: {
    balanceScore: number;
    gaitScore: number;
    chairStandScore: number;
  };
  sixMinuteWalk: {
    distanceMeters: number | null;
    baselineMeters: number | null;
    startHeartRate: number | null;
    endHeartRate: number | null;
  };
  cpet: {
    peakVo2: number | null;
    anaerobicThreshold: number | null;
    peakHr: ClinicalMetric;
    anaerobicThresholdHr: ClinicalMetric;
    contraindication: string;
  };
  restingVitals: {
    heartRate: number | null;
    metric: ClinicalMetric;
    systolic: number | null;
    diastolic: number | null;
    spo2: number | null;
  };
};

export type ClinicalNarrativeContent = {
  chiefComplaint: string;
  symptoms: string[];
  medicationChange: string;
  medicationAdherence: string;
  trainingFeedback: string;
  lifestyle: string;
  newClinicalEvents: string;
  clinicalAssessment: string;
};

export type ClinicalNarrativeRecord = {
  narrativeId: string;
  patientId: string;
  taskId?: string;
  encounterAt: string;
  author: string;
  recordType: string;
  content: ClinicalNarrativeContent;
};

export type PrescriptionContent = {
  height: string;
  contact: string;
  rehabGoals: string[];
  breathingModes: string[];
  breathingIntensity: string;
  breathingFrequency: string;
  breathingTime: string;
  warmupModes: string[];
  warmupFrequency: string;
  warmupTime: string;
  aerobicModes: string[];
  aerobicIntensity: string;
  aerobicFrequency: string;
  aerobicTime: string;
  resistanceModes: string[];
  resistanceIntensity: string;
  resistanceFrequency: string;
  resistanceTime: string;
  flexibilityModes: string[];
  flexibilityIntensity: string;
  flexibilityFrequency: string;
  flexibilityTime: string;
  remark: string;
  diagnosisAdvice: string;
  medicationAdvice: string;
  dietCautions: string;
  exerciseCautions: string;
  rehabContraindications: string;
  stopConditions: string;
  patientInstruction: string;
  inheritedFields: string[];
};

const baseProfile = {
  birthDate: "1967-04-18",
  heightCm: 162,
  weightKg: 63,
  bmi: 24,
  dischargeDate: "2026-07-02",
  previousFollowUpDate: "2026-07-25",
  nextFollowUpDate: "2026-08-06",
  idNumberMasked: "3702********1531",
  contact: "138****6021",
  diagnosis: "冠心病 PCI 术后，Ⅱ期院内心脏康复",
  medicalHistory: "高血压病史；否认近期静息胸痛，训练中需持续观察症状变化。",
  specialMedications: "阿司匹林、氯吡格雷、美托洛尔、阿托伐他汀",
  cpet: "峰值 VO₂ 18.6 ml/kg/min",
  cpetStatus: "completed" as const,
  sixMinuteWalk: "486 m",
  restingVitals: "HR 72 bpm · BP 126/78 mmHg · SpO₂ 98%",
  updatedBy: "王医生",
  updatedAt: "2026-07-29T10:20:00+08:00",
  rehabAssessment: {
    assessmentId: "RA-20260729-0001",
    assessedAt: "2026-07-29T09:40:00+08:00",
    assessor: "王医生",
    source: "结构化录入" as const,
    status: "已复核" as const,
    sppb: { balanceScore: 3, gaitScore: 3, chairStandScore: 2 },
    sixMinuteWalk: { distanceMeters: 486, baselineMeters: 438, startHeartRate: 72, endHeartRate: 105 },
    cpet: {
      peakVo2: 18.6,
      anaerobicThreshold: 13.2,
      peakHr: { value: 142, unit: "bpm", measuredAt: "2026-07-20", source: "CPET" as const, status: "confirmed" as const, verifiedBy: "王医生", verifiedAt: "2026-07-20T10:20:00+08:00" },
      anaerobicThresholdHr: { value: 118, unit: "bpm", measuredAt: "2026-07-20", source: "CPET" as const, status: "confirmed" as const, verifiedBy: "王医生", verifiedAt: "2026-07-20T10:20:00+08:00" },
      contraindication: "未发现运动禁忌证"
    },
    restingVitals: {
      heartRate: 72,
      metric: { value: 72, unit: "bpm", measuredAt: "2026-07-20", source: "SPPB" as const, status: "confirmed" as const, verifiedBy: "王医生", verifiedAt: "2026-07-20T10:20:00+08:00" },
      systolic: 126,
      diastolic: 78,
      spo2: 98
    }
  }
};

export const initialPatientClinicalProfiles: PatientClinicalProfile[] = [
  { ...baseProfile, patientId: "P-DEMO-001", patientNo: "000001", name: "陈女士", sex: "女", age: 59, riskLevel: "中危", rehabStage: "Ⅱ期 · 第4周", medicalHistory: "冠心病 PCI 术后 6 周，高血压病史 8 年；训练中偶有轻微胸闷。" },
  { ...baseProfile, patientId: "P-DEMO-002", patientNo: "000002", name: "李先生", sex: "男", age: 58, riskLevel: "低危", rehabStage: "Ⅱ期 · 第2周", idNumberMasked: "3702********4826", contact: "136****1938", cpet: "峰值 VO₂ 20.1 ml/kg/min", sixMinuteWalk: "512 m" },
  { ...baseProfile, patientId: "P-DEMO-003", patientNo: "000003", name: "王先生", sex: "男", age: 66, riskLevel: "中危", rehabStage: "Ⅱ期 · 第3周", idNumberMasked: "3702********7714", contact: "159****2850" },
  { ...baseProfile, patientId: "P-DEMO-004", patientNo: "000004", name: "赵女士", sex: "女", age: 60, riskLevel: "高危", rehabStage: "首次评估", idNumberMasked: "3702********3409", contact: "137****8246", cpet: "待医生复核", cpetStatus: "pending_review", sixMinuteWalk: "待补充", rehabAssessment: { ...baseProfile.rehabAssessment, assessmentId: "RA-20260730-0004", status: "待复核", sppb: { balanceScore: 2, gaitScore: 2, chairStandScore: 1 }, sixMinuteWalk: { distanceMeters: null, baselineMeters: null, startHeartRate: null, endHeartRate: null }, cpet: { ...baseProfile.rehabAssessment.cpet, peakVo2: 12.8, anaerobicThreshold: null, peakHr: { ...baseProfile.rehabAssessment.cpet.peakHr, value: null, status: "pending_review" as const }, anaerobicThresholdHr: { ...baseProfile.rehabAssessment.cpet.anaerobicThresholdHr, value: null, status: "pending_review" as const }, contraindication: "需医生复核运动诱发缺血风险" } } },
  { ...baseProfile, patientId: "P-DEMO-005", patientNo: "000005", name: "周先生", sex: "男", age: 55, riskLevel: "低危", rehabStage: "Ⅱ期 · 第6周", idNumberMasked: "3702********2218", contact: "135****6016" },
  { ...baseProfile, patientId: "P-DEMO-006", patientNo: "000006", name: "孙女士", sex: "女", age: 64, riskLevel: "中危", rehabStage: "首次评估", idNumberMasked: "3702********3902", contact: "158****1705", cpet: "待补充", cpetStatus: "not_collected", sixMinuteWalk: "待补充", rehabAssessment: { ...baseProfile.rehabAssessment, assessmentId: "RA-20260730-0006", status: "待补充", sppb: { balanceScore: 0, gaitScore: 0, chairStandScore: 0 }, sixMinuteWalk: { distanceMeters: null, baselineMeters: null, startHeartRate: null, endHeartRate: null }, cpet: { ...baseProfile.rehabAssessment.cpet, peakVo2: null, anaerobicThreshold: null, peakHr: { ...baseProfile.rehabAssessment.cpet.peakHr, value: null, status: "not_collected" as const }, anaerobicThresholdHr: { ...baseProfile.rehabAssessment.cpet.anaerobicThresholdHr, value: null, status: "not_collected" as const }, contraindication: "待评估" }, restingVitals: { ...baseProfile.rehabAssessment.restingVitals, heartRate: null, metric: { ...baseProfile.rehabAssessment.restingVitals.metric, value: null, status: "not_collected" as const }, systolic: null, diastolic: null, spo2: null } } }
];

export const initialClinicalNarratives: ClinicalNarrativeRecord[] = [
  {
    narrativeId: "N-003", patientId: "P-DEMO-001", encounterAt: "2026-07-25T10:15:00+08:00", author: "周康复师", recordType: "训练后沟通",
    content: { chiefComplaint: "训练第18分钟出现短暂胸闷，暂停后缓解。", symptoms: ["胸闷"], medicationChange: "无调整", medicationAdherence: "按时服药", trainingFeedback: "训练依从性良好，能主动记录身体感受。", lifestyle: "近期睡眠约7小时，低盐饮食执行较好。", newClinicalEvents: "无新增就诊或住院", clinicalAssessment: "已上报医生复核，本阶段暂不继续上调。" }
  },
  {
    narrativeId: "N-002", patientId: "P-DEMO-001", encounterAt: "2026-07-12T09:55:00+08:00", author: "王医生", recordType: "医生随访",
    content: { chiefComplaint: "日常步行耐力改善，爬一层楼气促减轻。", symptoms: ["气促改善"], medicationChange: "无调整", medicationAdherence: "良好", trainingFeedback: "能够完成计划训练", lifestyle: "训练前偶有进食过饱。", newClinicalEvents: "无", clinicalAssessment: "继续说明训练前饮食和血压复测要求。" }
  },
  {
    narrativeId: "N-001", patientId: "P-DEMO-001", encounterAt: "2026-06-16T08:40:00+08:00", author: "周康复师", recordType: "首次访谈",
    content: { chiefComplaint: "PCI术后担心运动诱发胸闷，运动信心一般。", symptoms: ["担忧运动"], medicationChange: "无", medicationAdherence: "待观察", trainingFeedback: "既往运动较少", lifestyle: "久坐时间偏长。", newClinicalEvents: "PCI术后进入康复", clinicalAssessment: "愿意按每周3次计划参加康复。" }
  }
];

export const emptyNarrativeContent: ClinicalNarrativeContent = {
  chiefComplaint: "",
  symptoms: [],
  medicationChange: "无明显变化",
  medicationAdherence: "按医嘱服药",
  trainingFeedback: "",
  lifestyle: "",
  newClinicalEvents: "无新增就诊、住院或安全事件",
  clinicalAssessment: ""
};

export const defaultPrescriptionContent: PrescriptionContent = {
  height: "162",
  contact: "138****2688",
  rehabGoals: ["改善症状", "提高体能", "改善心功能", "预防支架内再狭窄"],
  breathingModes: ["腹式呼吸练习"],
  breathingIntensity: "吸气时鼓起腹部，呼气时收紧腹部，呼气/吸气时间比≥3:1",
  breathingFrequency: "每天2次",
  breathingTime: "每次10分钟",
  warmupModes: ["原地踏步", "肩部热身运动", "扩胸运动", "四肢伸展运动", "手腕踝关节"],
  warmupFrequency: "每次训练前",
  warmupTime: "5分钟",
  aerobicModes: ["骑自行车", "健身器械（踏车、椭圆机）"],
  aerobicIntensity: "靶心率100–116次/分钟；目标功率48–62W；运动时可正常交流",
  aerobicFrequency: "每周3次",
  aerobicTime: "30分钟/次",
  resistanceModes: ["哑铃", "弹力带"],
  resistanceIntensity: "每种动作2组，每组10个；呼气发力，避免憋气",
  resistanceFrequency: "每周2次",
  resistanceTime: "每次4种动作",
  flexibilityModes: ["颈部肌肉牵伸", "躯干肌肉牵伸", "上肢肌肉牵伸", "下肢肌肉牵伸"],
  flexibilityIntensity: "每组肌肉拉伸3次",
  flexibilityFrequency: "每次有氧或抗阻训练后",
  flexibilityTime: "每次拉伸15–30秒",
  remark: "根据训练反馈适时进阶；如出现胸痛、持续胸闷、明显气促、头晕或心悸，应立即停止并呼叫医护。",
  diagnosisAdvice: "当前以改善运动耐量和观察训练反应为主，暂不自动推断新的诊断。",
  medicationAdvice: "继续按医生确认的用药方案执行，训练前由医护核对当日用药情况。",
  dietCautions: "训练前避免过饱，控制盐分和高脂食物，运动后适量补水。",
  exerciseCautions: "按照热身、训练、放松顺序完成，不憋气，不在明显疲劳时加量。",
  rehabContraindications: "静息胸痛、发热、明显乏力或血压异常时，先联系医护再训练。",
  stopConditions: "出现持续胸痛、明显胸闷、气促、头晕、晕厥或心悸，立即停止运动并呼叫医护。",
  patientInstruction: "请按今日处方顺序完成训练；有疑问时先询问护士或康复师，不自行调整强度。",
  inheritedFields: []
};

export const initialPrescriptionContents: Record<string, PrescriptionContent> = Object.fromEntries(
  ["RX-TASK-001", "RX-TASK-002", "RX-TASK-003", "RX-TASK-004", "RX-TASK-005", "RX-TASK-006", "RX-LXX-001"].map((taskId) => [taskId, { ...defaultPrescriptionContent, rehabGoals: [...defaultPrescriptionContent.rehabGoals], breathingModes: [...defaultPrescriptionContent.breathingModes], warmupModes: [...defaultPrescriptionContent.warmupModes], aerobicModes: [...defaultPrescriptionContent.aerobicModes], resistanceModes: [...defaultPrescriptionContent.resistanceModes], flexibilityModes: [...defaultPrescriptionContent.flexibilityModes], inheritedFields: [] }])
);
