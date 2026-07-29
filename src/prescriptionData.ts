export type PrescriptionStatus = "pending_generation" | "pending_review" | "pending_signature" | "completed";
export type PrescriptionKind = "initial" | "adjustment";
export type PrescriptionSourceType = "baseline_assessment" | "single_report" | "stage_report";

export type PrescriptionTask = {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  sex: string;
  stage: string;
  risk: "低危" | "中危" | "高危";
  kind: PrescriptionKind;
  sourceType: PrescriptionSourceType;
  sourceReportId?: string;
  sourceLabel: string;
  version: string;
  previousVersionId?: string;
  aiDraftStatus: "not_required" | "not_generated" | "generated";
  reviewStatus: "pending" | "confirmed";
  signatureStatus: "unsigned" | "signed";
  status: PrescriptionStatus;
  updatedAt: string;
  confirmedBy?: string;
  confirmedAt?: string;
  signedBy?: string;
  signedAt?: string;
  missingFields?: string[];
};

export type DoctorAppointment = {
  id: string;
  patientId: string;
  patientName: string;
  time: string;
  purpose: string;
  stage: string;
  risk: "低危" | "中危" | "高危";
  singleReportIds: string[];
  stageReportIds: string[];
  reportReviewStatus: "待复核" | "异常优先" | "已复核";
  linkedTaskId: string;
};

export const initialPrescriptionTasks: PrescriptionTask[] = [
  {
    id: "RX-TASK-001",
    patientId: "P-DEMO-001",
    patientName: "陈女士",
    age: 62,
    sex: "女",
    stage: "Ⅱ期 · 第4周",
    risk: "中危",
    kind: "adjustment",
    sourceType: "stage_report",
    sourceReportId: "STAGE-202607",
    sourceLabel: "阶段性报告 · V1–V4",
    version: "V5.0 草稿",
    previousVersionId: "V4.0",
    aiDraftStatus: "generated",
    reviewStatus: "pending",
    signatureStatus: "unsigned",
    status: "pending_review",
    updatedAt: "2026-07-29 10:32"
  },
  {
    id: "RX-TASK-002",
    patientId: "P-DEMO-002",
    patientName: "李先生",
    age: 58,
    sex: "男",
    stage: "Ⅱ期 · 第2周",
    risk: "低危",
    kind: "adjustment",
    sourceType: "single_report",
    sourceReportId: "TR-20260728-018",
    sourceLabel: "单次报告 · 07-28功率车",
    version: "V2.1 草稿",
    previousVersionId: "V2.0",
    aiDraftStatus: "not_generated",
    reviewStatus: "pending",
    signatureStatus: "unsigned",
    status: "pending_generation",
    updatedAt: "2026-07-29 09:48"
  },
  {
    id: "RX-TASK-003",
    patientId: "P-DEMO-003",
    patientName: "王先生",
    age: 66,
    sex: "男",
    stage: "Ⅱ期 · 第3周",
    risk: "中危",
    kind: "adjustment",
    sourceType: "stage_report",
    sourceReportId: "STAGE-202607-003",
    sourceLabel: "阶段性报告 · 本阶段",
    version: "V3.0",
    previousVersionId: "V2.2",
    aiDraftStatus: "generated",
    reviewStatus: "confirmed",
    signatureStatus: "unsigned",
    status: "pending_signature",
    updatedAt: "2026-07-29 09:16"
  },
  {
    id: "RX-TASK-004",
    patientId: "P-DEMO-004",
    patientName: "赵女士",
    age: 60,
    sex: "女",
    stage: "首次评估",
    risk: "高危",
    kind: "initial",
    sourceType: "baseline_assessment",
    sourceLabel: "基线评估 · 医生录入",
    version: "V1.0 草稿",
    aiDraftStatus: "not_required",
    reviewStatus: "pending",
    signatureStatus: "unsigned",
    status: "pending_review",
    updatedAt: "2026-07-29 08:55"
  },
  {
    id: "RX-TASK-005",
    patientId: "P-DEMO-005",
    patientName: "周先生",
    age: 55,
    sex: "男",
    stage: "Ⅱ期 · 第6周",
    risk: "低危",
    kind: "adjustment",
    sourceType: "stage_report",
    sourceReportId: "STAGE-202607-005",
    sourceLabel: "阶段性报告 · 本阶段",
    version: "V4.0",
    previousVersionId: "V3.1",
    aiDraftStatus: "generated",
    reviewStatus: "confirmed",
    signatureStatus: "signed",
    status: "completed",
    updatedAt: "2026-07-29 08:42",
    confirmedBy: "王医生",
    confirmedAt: "2026-07-29 08:38",
    signedBy: "王医生",
    signedAt: "2026-07-29 08:42"
  },
  {
    id: "RX-TASK-006",
    patientId: "P-DEMO-006",
    patientName: "孙女士",
    age: 64,
    sex: "女",
    stage: "首次评估",
    risk: "中危",
    kind: "initial",
    sourceType: "baseline_assessment",
    sourceLabel: "基线评估 · 信息待补充",
    version: "V1.0 草稿",
    aiDraftStatus: "not_required",
    reviewStatus: "pending",
    signatureStatus: "unsigned",
    status: "pending_review",
    updatedAt: "2026-07-29 08:24",
    missingFields: ["CPET未完成", "6分钟步行未采集"]
  }
];

export const doctorAppointments: DoctorAppointment[] = [
  {
    id: "APT-20260729-001",
    patientId: "P-DEMO-001",
    patientName: "陈女士",
    time: "09:30",
    purpose: "阶段复查后调整功率车处方",
    stage: "Ⅱ期 · 第4周",
    risk: "中危",
    singleReportIds: ["TR-20260725-012", "TR-20260723-011"],
    stageReportIds: ["STAGE-202607"],
    reportReviewStatus: "异常优先",
    linkedTaskId: "RX-TASK-001"
  },
  {
    id: "APT-20260729-002",
    patientId: "P-DEMO-002",
    patientName: "李先生",
    time: "10:10",
    purpose: "单次训练后复核靶心率",
    stage: "Ⅱ期 · 第2周",
    risk: "低危",
    singleReportIds: ["TR-20260723-011"],
    stageReportIds: [],
    reportReviewStatus: "待复核",
    linkedTaskId: "RX-TASK-002"
  },
  {
    id: "APT-20260729-003",
    patientId: "P-DEMO-003",
    patientName: "王先生",
    time: "11:00",
    purpose: "阶段报告确认与数字签名",
    stage: "Ⅱ期 · 第3周",
    risk: "中危",
    singleReportIds: ["TR-20260725-012"],
    stageReportIds: ["STAGE-202607-003"],
    reportReviewStatus: "待复核",
    linkedTaskId: "RX-TASK-003"
  }
];

export const prescriptionStatusLabels: Record<PrescriptionStatus, string> = {
  pending_generation: "待生成",
  pending_review: "待复核",
  pending_signature: "待签名",
  completed: "已完成"
};

export const sourceTypeLabels: Record<PrescriptionSourceType, string> = {
  baseline_assessment: "基线评估",
  single_report: "单次报告",
  stage_report: "阶段性报告"
};
