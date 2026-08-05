export type PrescriptionStatus = "pending_generation" | "pending_review" | "pending_signature" | "completed";

export type PrescriptionItem = {
  category: "呼吸训练" | "热身运动" | "有氧运动" | "抗阻训练" | "柔韧性训练";
  project: string;
  intensity: string;
  duration: string;
  frequency: string;
  reason: string;
};

export type PrescriptionDraft = {
  summary: string;
  items: PrescriptionItem[];
  dietAdvice: string;
  exerciseAdvice: string;
  stopConditions: string;
};

export type PrescriptionTask = {
  id: string;
  prescriptionNo: string;
  patientId: string;
  patientNo: string;
  patientName: string;
  age: number;
  risk: string;
  rehabStage: string;
  diagnosis: string;
  specialMedication: string;
  assignedDoctorId: "doctor001" | "doctor002";
  assignedDoctorName: string;
  version: string;
  status: PrescriptionStatus;
  updatedAt: string;
  previous?: PrescriptionDraft;
  aiSuggestion?: PrescriptionDraft;
  doctorFinal?: PrescriptionDraft;
};

export type AlertSeverity = "notice" | "warning" | "critical";
export type AlertStatus = "pending" | "processing" | "pending_doctor_review" | "closed";
export type AlertEvent = {
  id: string;
  patientId: string;
  patientName: string;
  sessionId: string;
  type: string;
  severity: AlertSeverity;
  value: string;
  threshold: string;
  status: AlertStatus;
  occurredAt: string;
  snapshot: string;
  onSiteRecord?: string;
  doctorConclusion?: string;
};

export type AlertRule = {
  id: string;
  metric: "心率" | "血氧" | "收缩压";
  name: string;
  condition: string;
  code: string;
  severity: AlertSeverity;
  explanation: string;
  enabled: boolean;
};

export type AppointmentStatus = "pending" | "completed" | "cancelled";
export type Appointment = {
  id: string;
  date: string;
  time: string;
  patientId: string;
  patientName: string;
  risk: string;
  status: AppointmentStatus;
  project: string;
  station: string;
  doctorId: "doctor001" | "doctor002";
  doctorName: string;
  note: string;
};

const baseDraft: PrescriptionDraft = {
  summary: "生命体征总体平稳，结合当前康复阶段安排低至中等强度综合训练。",
  items: [
    { category: "呼吸训练", project: "腹式呼吸", intensity: "舒适节律", duration: "5–10分钟", frequency: "每日", reason: "帮助放松并改善呼吸配合。" },
    { category: "热身运动", project: "关节活动", intensity: "低强度", duration: "3–5分钟", frequency: "每次训练前", reason: "逐步提升循环负荷。" },
    { category: "有氧运动", project: "功率车", intensity: "低强度，RPE≤11", duration: "15分钟", frequency: "每周2–3次", reason: "在监护下逐步提高运动耐量。" },
    { category: "抗阻训练", project: "暂不安排", intensity: "—", duration: "—", frequency: "—", reason: "本阶段避免增加心脏负荷。" },
    { category: "柔韧性训练", project: "上下肢拉伸", intensity: "舒适范围", duration: "5分钟", frequency: "每次训练后", reason: "缓解肌肉紧张。" }
  ],
  dietAdvice: "少盐、清淡饮食，避免空腹或饱餐后立即训练。",
  exerciseAdvice: "训练前核对用药与生命体征，在康复师指导下逐步增加负荷。",
  stopConditions: "出现持续胸痛、明显气促、晕厥或心悸时立即停止并联系医护。"
};

export const initialPrescriptionTasks: PrescriptionTask[] = [
  { id: "RX-TASK-001", prescriptionNo: "RX-10001-0020", patientId: "P-DEMO-001", patientNo: "P-000001", patientName: "陈女士", age: 62, risk: "中危", rehabStage: "Ⅱ期", diagnosis: "冠心病术后康复期", specialMedication: "β受体阻滞剂（外部资料）", assignedDoctorId: "doctor001", assignedDoctorName: "王医生", version: "V2", status: "pending_review", updatedAt: "2026-08-05 09:20", previous: baseDraft, aiSuggestion: { ...baseDraft, summary: "基于最近训练与阶段报告形成的AI辅助草稿，需王医生逐项复核。" } },
  { id: "RX-TASK-002", prescriptionNo: "RX-10002-0011", patientId: "P-DEMO-002", patientNo: "P-000002", patientName: "李先生", age: 58, risk: "低危", rehabStage: "Ⅱ期", diagnosis: "冠心病稳定期", specialMedication: "未提供", assignedDoctorId: "doctor001", assignedDoctorName: "王医生", version: "V1", status: "pending_generation", updatedAt: "2026-08-05 08:45" },
  { id: "RX-TASK-003", prescriptionNo: "RX-10003-0008", patientId: "P-DEMO-003", patientNo: "P-000003", patientName: "赵女士", age: 66, risk: "中危", rehabStage: "Ⅰ期", diagnosis: "心脏术后早期康复", specialMedication: "抗血小板药物（外部资料）", assignedDoctorId: "doctor002", assignedDoctorName: "李医生", version: "V1", status: "pending_signature", updatedAt: "2026-08-04 16:30", aiSuggestion: baseDraft, doctorFinal: baseDraft },
  { id: "RX-TASK-004", prescriptionNo: "RX-10004-0014", patientId: "P-DEMO-004", patientNo: "P-000004", patientName: "周先生", age: 55, risk: "低危", rehabStage: "Ⅱ期", diagnosis: "冠心病康复期", specialMedication: "未提供", assignedDoctorId: "doctor002", assignedDoctorName: "李医生", version: "V2", status: "completed", updatedAt: "2026-08-03 11:10", previous: baseDraft, aiSuggestion: baseDraft, doctorFinal: baseDraft }
];

export const initialAlertEvents: AlertEvent[] = [
  { id: "ALT-001", patientId: "P-DEMO-001", patientName: "陈女士", sessionId: "SESSION-012", type: "心率偏高", severity: "warning", value: "160 bpm", threshold: ">150 bpm", status: "pending", occurredAt: "2026-08-05 09:16", snapshot: "功率车训练阶段；心率160 bpm；SpO₂ 96%；功率42 W" },
  { id: "ALT-002", patientId: "P-DEMO-003", patientName: "赵女士", sessionId: "SESSION-009", type: "血氧偏低", severity: "warning", value: "88%", threshold: "<90%", status: "processing", occurredAt: "2026-08-05 08:50", snapshot: "训练暂停；SpO₂ 88%；心率112 bpm", onSiteRecord: "已暂停训练并指导呼吸，3分钟后血氧回升至94%。" },
  { id: "ALT-003", patientId: "P-DEMO-002", patientName: "李先生", sessionId: "SESSION-007", type: "患者主诉胸闷", severity: "critical", value: "主诉", threshold: "任意出现", status: "pending_doctor_review", occurredAt: "2026-08-04 15:42", snapshot: "放松阶段主诉胸闷，无胸痛；血压138/82 mmHg", onSiteRecord: "终止本次训练，现场休息后症状缓解。" }
];

export const initialAlertRules: AlertRule[] = [
  { id: "RULE-HR-1", metric: "心率", name: "心率严重过高", condition: ">180 bpm", code: "high_hr_critical", severity: "critical", explanation: "Demo阈值：提示立即暂停运动并由医护评估。", enabled: true },
  { id: "RULE-HR-2", metric: "心率", name: "心率偏高", condition: ">150 bpm", code: "high_hr_warning", severity: "warning", explanation: "Demo阈值：提示降低运动强度并复测。", enabled: true },
  { id: "RULE-O2-1", metric: "血氧", name: "血氧饱和度严重偏低", condition: "<85%", code: "low_spo2_critical", severity: "critical", explanation: "Demo阈值：提示停止运动并联系医护。", enabled: true },
  { id: "RULE-O2-2", metric: "血氧", name: "血氧偏低", condition: "<90%", code: "low_spo2_warning", severity: "warning", explanation: "Demo阈值：提示暂停并复测。", enabled: true },
  { id: "RULE-BP-1", metric: "收缩压", name: "收缩压偏高", condition: ">200 mmHg", code: "high_sbp", severity: "warning", explanation: "Demo阈值：血压为间歇测量，不作为连续曲线。", enabled: true }
];

export const initialAppointments: Appointment[] = [
  { id: "APT-001", date: "2026-08-05", time: "10:15", patientId: "P-DEMO-001", patientName: "陈女士", risk: "中危", status: "pending", project: "功率车", station: "功率车01", doctorId: "doctor001", doctorName: "王医生", note: "阶段训练" },
  { id: "APT-002", date: "2026-08-05", time: "11:00", patientId: "P-DEMO-002", patientName: "李先生", risk: "低危", status: "pending", project: "八段锦", station: "训练区02", doctorId: "doctor001", doctorName: "王医生", note: "首次到诊" },
  { id: "APT-003", date: "2026-08-05", time: "14:30", patientId: "P-DEMO-003", patientName: "赵女士", risk: "中危", status: "pending", project: "功率车", station: "功率车02", doctorId: "doctor002", doctorName: "李医生", note: "需关注血氧" },
  { id: "APT-004", date: "2026-08-05", time: "15:45", patientId: "P-DEMO-004", patientName: "周先生", risk: "低危", status: "completed", project: "呼吸训练", station: "训练区01", doctorId: "doctor002", doctorName: "李医生", note: "已完成" }
];

export function createAiDraft(task: PrescriptionTask): PrescriptionDraft {
  return { ...baseDraft, summary: `基于${task.patientName}的康复阶段、危险分组及最近报告生成辅助草稿，必须由${task.assignedDoctorName}复核。` };
}
