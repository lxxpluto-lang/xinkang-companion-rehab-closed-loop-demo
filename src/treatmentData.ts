import type { ClinicalMetricSource } from "./types";

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
  specialMedications?: string;
  source: ClinicalMetricSource | "OCR";
  preAssessment: TreatmentVitalSnapshot & {
    chestPainRestVas: number | null;
    chestPainActivityVas: number | null;
    respiratorySymptoms: string;
    assistiveDevice: string;
  };
  interventions: TreatmentIntervention[];
  postAssessment: TreatmentVitalSnapshot & {
    borg: number | null;
    symptomChange: string;
  };
  treatmentSummary: string;
  adverseEvent: string;
  fieldAction: string;
  therapist: string;
  patientAcknowledged: boolean;
  status: "draft" | "therapist_confirmed" | "doctor_reviewed";
};

export const treatmentInterventionOptions: TreatmentIntervention[] = [
  { code: "breathing", label: "呼吸训练", selected: true },
  { code: "airway", label: "气道清理/排痰技术", selected: false },
  { code: "strength", label: "身体功能障碍训练", selected: false },
  { code: "balance", label: "肢体平衡功能训练", selected: false },
  { code: "coordination", label: "运动协调性训练", selected: false },
  { code: "transfer", label: "转移动作训练", selected: false },
  { code: "adl", label: "日常生活动作训练", selected: false },
  { code: "resistance", label: "器械/抗阻训练", selected: false },
  { code: "ecg", label: "遥测心电监测", selected: true },
  { code: "bike", label: "功率车训练", selected: true, durationMinutes: 30 }
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
    adverseEvent: "短暂胸闷，无持续性心律失常记录",
    fieldAction: "康复执行岗暂停观察2分钟，症状缓解后低阻力继续。",
    therapist: "周康复师",
    patientAcknowledged: true,
    status: "doctor_reviewed"
  }
];

export function treatmentStatusLabel(status: CardiopulmonaryTreatmentRecord["status"]) {
  return status === "doctor_reviewed" ? "医生已复核" : status === "therapist_confirmed" ? "康复师已确认" : "草稿";
}
