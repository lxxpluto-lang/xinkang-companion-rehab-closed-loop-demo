export type DischargeHandbook = {
  handbookNo: string;
  patientId: string;
  generatedAt: string;
  status: "待医生确认" | "已发布给患者";
  confirmedBy?: string;
  summary: string;
  improvements: { label: string; baseline: string; current: string }[];
  exercisePlan: string[];
  medicationTips: string[];
  nutritionTips: string[];
  reviewPlan: string[];
  warningSigns: string[];
};

export type RehabReportStatus = "draft" | "doctor_confirmed" | "published";

export type RehabReport = {
  reportId: string;
  patientId: string;
  /** 康复周期/住院 episode 序号；同一患者可保留多份出院报告。 */
  episodeNo?: number;
  admissionDate?: string;
  dischargeDate?: string;
  generatedAt: string;
  status: RehabReportStatus;
  patientNarrative?: {
    greeting: string;
    admissionDate: string;
    dischargeDate: string;
    completedTrainingCount: number;
    celebrationMessage: string;
  };
  medicalSection: {
    diagnosis: string;
    treatmentCourse: string;
    procedure: string;
    medications: string;
    followUpRequirements: string;
    clinicalConclusion: string;
  };
  rehabSection: {
    assessmentSummary: string;
    trainingSummary: string;
    adherenceSummary: string;
    followUpSummary: string;
    improvementSummary: string;
  };
  recommendationDraft: string;
  sourceRefs: string[];
  missingFields?: string[];
  generationMode?: "template_ai_demo" | "manual";
  generatedByRole?: "DOCTOR" | "REHAB_EXECUTION";
  version?: number;
  confirmedBy?: string;
  confirmedAt?: string;
  publishedAt?: string;
};

export function shanghaiDate(value = new Date().toISOString()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function reportDischargeDate(report: RehabReport, eventAt = report.publishedAt ?? report.generatedAt) {
  return report.dischargeDate?.trim()
    || report.patientNarrative?.dischargeDate?.trim()
    || shanghaiDate(eventAt);
}

export const demoDischargeHandbook: DischargeHandbook = {
  handbookNo: "CRH-DH-20260802-0001",
  patientId: "P-DEMO-001",
  generatedAt: "2026-08-02T11:10:00+08:00",
  status: "已发布给患者",
  confirmedBy: "王医生",
  summary: "已完成冠心病Ⅱ期院内康复阶段训练，整体耐量改善。后续进入居家康复与定期随访阶段，运动强度以医生签署处方为准。",
  improvements: [
    { label: "6分钟步行", baseline: "438 m", current: "486 m" },
    { label: "峰值 VO₂", baseline: "16.1", current: "18.6 ml/kg/min" },
    { label: "训练完成", baseline: "0次", current: "10 / 32次" }
  ],
  exercisePlan: ["每周完成3次有氧训练，每次30分钟", "靶心率100–116次/分钟，目标功率48–62W", "每周2次低至中等强度抗阻训练", "训练前后各完成5分钟热身与放松"],
  medicationTips: ["继续按医嘱服用抗血小板、调脂及心率控制药物", "不可自行停用或调整剂量；漏服或出现不适时联系医生"],
  nutritionTips: ["低盐、低饱和脂肪饮食，增加蔬菜和全谷物", "避免训练前过饱，保持规律饮水"],
  reviewPlan: ["出院后1个月：症状、用药与运动执行随访", "出院后3个月：复查运动耐量并评估处方调整", "出院后6个月：完成阶段复评与长期康复计划"],
  warningSigns: ["持续胸痛或胸闷，休息后不缓解", "明显气促、头晕、晕厥或持续心悸", "运动中心率、血压明显超出医生设定范围"]
};
