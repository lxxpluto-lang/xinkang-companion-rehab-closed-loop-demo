import type { AiSuggestion, ClinicalMetricSource, SourcedClinicalValue, TreatmentSignature } from "./types";

export type TreatmentVitalSnapshot = {
  bloodPressure: string;
  heartRate: number | null;
  spo2: number | null;
  respiratoryRate: number | null;
  rhythm: string;
  measuredAt: string;
};

export type TreatmentIntervention = {
  code: string;
  label: string;
  selected: boolean;
  sets?: number;
  repetitions?: number;
  durationMinutes?: number;
  notes?: string;
};

export type CardiopulmonaryTreatmentRecord = {
  treatmentId: string;
  patientId: string;
  patientNo: string;
  sessionId?: string;
  prescriptionVersionId?: string;
  treatmentNo: string;
  treatmentAt: string;
  diagnosis: string;
  surgeryHistory?: string;
  surgeryMethod?: "正中胸骨切开" | "肋缘侧切" | "微创" | "其他";
  specialMedications?: string;
  source: ClinicalMetricSource | "OCR";
  preAssessment: TreatmentVitalSnapshot & {
    chestPainRestVas: number | null;
    chestPainActivityVas: number | null;
    edema: string;
    posturalPainChange: string;
    chestDrainage: string;
    lifeSupportDevice: string;
    respiratorySymptoms: string;
    assistiveDevice: string;
  };
  interventions: TreatmentIntervention[];
  postAssessment: TreatmentVitalSnapshot & {
    borg: number | null;
    symptomChange: string;
  };
  treatmentSummary: string;
  actualMetrics?: Record<string, SourcedClinicalValue<unknown>>;
  aiAdvice?: AiSuggestion;
  adverseEvent: string;
  fieldAction: string;
  therapist: string;
  patientAcknowledged: boolean;
  signature?: TreatmentSignature;
  correctionOf?: string;
  status: "draft" | "completed";
};

export const treatmentInterventionOptions: TreatmentIntervention[] = [
  { code: "pulmonary", label: "肺功能综合训练", selected: true, notes: "气道廓清、呼吸肌训练与呼吸控制" },
  { code: "strength", label: "身体功能障碍作业训练", selected: false },
  { code: "balance", label: "肢体平衡功能训练", selected: false },
  { code: "coordination", label: "运动协调性训练", selected: false },
  { code: "transfer", label: "转移动作训练", selected: false },
  { code: "adl", label: "日常生活动作训练", selected: false },
  { code: "resistance", label: "器械抗阻训练", selected: false },
  { code: "endurance", label: "耐力训练", selected: false },
  { code: "ecg", label: "遥测心电监测", selected: true },
  { code: "bike", label: "康复踏车训练", selected: true, durationMinutes: 30 },
  { code: "counterpulsation", label: "体外反搏治疗", selected: false, durationMinutes: 20 }
];

export const initialTreatmentRecords: CardiopulmonaryTreatmentRecord[] = [
  {
    treatmentId: "TREAT-20260725-001",
    patientId: "P-DEMO-001",
    patientNo: "000001",
    sessionId: "TR-20260725-012",
    prescriptionVersionId: "V4",
    treatmentNo: "CRH-TX-20260725-0001",
    treatmentAt: "2026-07-25T09:30:00+08:00",
    diagnosis: "冠心病 PCI 术后，Ⅱ期心脏康复",
    surgeryHistory: "PCI 术后 6 周",
    surgeryMethod: "微创",
    specialMedications: "阿司匹林、氯吡格雷、美托洛尔、阿托伐他汀",
    source: "人工录入",
    preAssessment: {
      bloodPressure: "126/78 mmHg",
      heartRate: 72,
      spo2: 98,
      respiratoryRate: 18,
      rhythm: "窦性心律",
      measuredAt: "09:18",
      chestPainRestVas: 0,
      chestPainActivityVas: 1,
      edema: "无",
      posturalPainChange: "无明显变化",
      chestDrainage: "无",
      lifeSupportDevice: "无",
      respiratorySymptoms: "无明显气促",
      assistiveDevice: "无"
    },
    interventions: treatmentInterventionOptions.map((item) => ({ ...item })),
    postAssessment: {
      bloodPressure: "124/76 mmHg",
      heartRate: 108,
      spo2: 97,
      respiratoryRate: 21,
      rhythm: "窦性心律",
      measuredAt: "10:03",
      borg: 12,
      symptomChange: "训练中短暂胸闷，暂停观察后缓解"
    },
    treatmentSummary: "完成热身、功率车主训练和放松，训练后生命体征回落。",
    actualMetrics: {
      averageHeartRate: { value: 104, source: "DEVICE_CAPTURED", sourceRecordId: "TR-20260725-012", capturedAt: "2026-07-25T09:30:00+08:00" },
      peakHeartRate: { value: 113, source: "DEVICE_CAPTURED", sourceRecordId: "TR-20260725-012", capturedAt: "2026-07-25T09:30:00+08:00" },
      activeMinutes: { value: 26, source: "RULE_DERIVED", sourceRecordId: "TR-20260725-012", capturedAt: "2026-07-25T10:03:00+08:00" }
    },
    adverseEvent: "短暂胸闷，无持续性心律失常记录",
    fieldAction: "康复执行岗暂停观察2分钟，症状缓解后低阻力继续。",
    therapist: "周康复师",
    patientAcknowledged: true,
    signature: { mode: "uploaded", signerRole: "REHAB_EXECUTION", signerName: "周康复师", treatmentAt: "2026-07-25T09:30:00+08:00", signedAt: "2026-07-25T10:08:00+08:00" },
    status: "completed"
  },
  createPendingTreatment("TREAT-20260805-002", "P-DEMO-001", "P-000001", "CRH-TX-20260805-0002", "2026-08-05T09:30:00+08:00", "冠心病 PCI 术后，Ⅱ期心脏康复", "周康复师"),
  createPendingTreatment("TREAT-20260805-003", "P-DEMO-002", "P-000002", "CRH-TX-20260805-0003", "2026-08-05T10:30:00+08:00", "冠心病稳定期康复", "周康复师")
];

function createPendingTreatment(treatmentId: string, patientId: string, patientNo: string, treatmentNo: string, treatmentAt: string, diagnosis: string, therapist: string): CardiopulmonaryTreatmentRecord {
  return {
    treatmentId,
    patientId,
    patientNo,
    treatmentNo,
    treatmentAt,
    diagnosis,
    specialMedications: "未提供",
    source: "人工录入",
    preAssessment: {
      bloodPressure: "",
      heartRate: null,
      spo2: null,
      respiratoryRate: null,
      rhythm: "",
      measuredAt: "",
      chestPainRestVas: null,
      chestPainActivityVas: null,
      edema: "",
      posturalPainChange: "",
      chestDrainage: "",
      lifeSupportDevice: "",
      respiratorySymptoms: "",
      assistiveDevice: ""
    },
    interventions: treatmentInterventionOptions.map((item) => ({ ...item, selected: false })),
    postAssessment: {
      bloodPressure: "",
      heartRate: null,
      spo2: null,
      respiratoryRate: null,
      rhythm: "",
      measuredAt: "",
      borg: null,
      symptomChange: ""
    },
    treatmentSummary: "",
    actualMetrics: {},
    adverseEvent: "",
    fieldAction: "",
    therapist,
    patientAcknowledged: false,
    status: "draft"
  };
}

export function treatmentStatusLabel(status: CardiopulmonaryTreatmentRecord["status"]) {
  return status === "completed" ? "已完成" : "草稿";
}
