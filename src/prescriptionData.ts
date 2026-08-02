export type PrescriptionStatus = "pending_generation" | "pending_review" | "pending_signature" | "completed";
export type PrescriptionListStatusFilter = "all" | "unfinished" | PrescriptionStatus;
export type PrescriptionKind = "initial" | "adjustment";
export type PrescriptionSourceType = "baseline_assessment" | "single_report" | "stage_report";

export type AiPrescriptionDraft = {
  draftId: string;
  prescriptionId: string;
  generatedAt: string;
  evidenceSnapshot: string[];
  missingData: string[];
  proposedContent: {
    targetHeartRate: string;
    targetPower: string;
    frequency: string;
    duration: string;
    clinicalAdvice: string;
  };
  modelVersion: string;
  promptVersion: string;
  status: "generated" | "accepted" | "rejected" | "superseded";
};

export type PrescriptionTask = {
  id: string;
  taskNo: string;
  prescriptionId: string;
  prescriptionNo: string;
  patientId: string;
  patientNo: string;
  patientName: string;
  assignedDoctor: string;
  age: number;
  sex: string;
  stage: string;
  risk: "低危" | "中危" | "高危";
  kind: PrescriptionKind;
  sourceType: PrescriptionSourceType;
  sourceReportId?: string;
  sourceLabel: string;
  version: string;
  versionNo: string;
  previousVersionId?: string;
  previousPrescriptionId?: string;
  currentNarrativeId?: string;
  sourceReportIds: string[];
  sourceTrainingRecordIds: string[];
  draftState: "unsaved" | "saved" | "signed";
  lastDraftSavedAt?: string;
  aiDraftStatus: "not_required" | "not_generated" | "generated";
  aiDraft?: AiPrescriptionDraft;
  reviewStatus: "pending" | "confirmed";
  signatureStatus: "unsigned" | "signed";
  status: PrescriptionStatus;
  createdAt: string;
  draftedAt?: string;
  reviewedAt?: string;
  effectiveFrom?: string;
  updatedAt: string;
  confirmedBy?: string;
  confirmedAt?: string;
  signedBy?: string;
  signedAt?: string;
  expiresAt?: string;
  missingFields?: string[];
};

export type DoctorAppointment = {
  id: string;
  appointmentNo: string;
  patientId: string;
  patientNo: string;
  patientName: string;
  scheduledStartAt: string;
  checkInAt?: string;
  consultationStartedAt?: string;
  completedAt?: string;
  purpose: string;
  stage: string;
  risk: "低危" | "中危" | "高危";
  status: "pending" | "in_progress" | "completed";
  singleReportIds: string[];
  stageReportIds: string[];
  reportReviewStatus: "待复核" | "异常优先" | "已复核";
  linkedTaskId: string;
};

type PrescriptionTaskSeed = Omit<PrescriptionTask, "taskNo" | "prescriptionId" | "prescriptionNo" | "patientNo" | "versionNo" | "previousPrescriptionId" | "currentNarrativeId" | "sourceReportIds" | "sourceTrainingRecordIds" | "draftState" | "lastDraftSavedAt" | "createdAt" | "draftedAt" | "reviewedAt" | "effectiveFrom" | "aiDraft">;

const prescriptionTaskSeeds: PrescriptionTaskSeed[] = [
  {
    id: "RX-TASK-001",
    patientId: "P-DEMO-001",
    patientName: "陈女士",
    assignedDoctor: "王医生",
    age: 59,
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
    assignedDoctor: "王医生",
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
    updatedAt: "2026-07-29 09:48",
    expiresAt: "2026-08-02"
  },
  {
    id: "RX-TASK-003",
    patientId: "P-DEMO-003",
    patientName: "王先生",
    assignedDoctor: "赵医生",
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
    assignedDoctor: "王医生",
    age: 60,
    sex: "女",
    stage: "首次评估",
    risk: "高危",
    kind: "initial",
    sourceType: "baseline_assessment",
    sourceLabel: "基线评估 · 医生录入",
    version: "V1.0 草稿",
    aiDraftStatus: "not_generated",
    reviewStatus: "pending",
    signatureStatus: "unsigned",
    status: "pending_generation",
    updatedAt: "2026-07-29 08:55"
  },
  {
    id: "RX-TASK-005",
    patientId: "P-DEMO-005",
    patientName: "周先生",
    assignedDoctor: "赵医生",
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
    assignedDoctor: "王医生",
    age: 64,
    sex: "女",
    stage: "首次评估",
    risk: "中危",
    kind: "initial",
    sourceType: "baseline_assessment",
    sourceLabel: "基线评估 · 信息待补充",
    version: "V1.0 草稿",
    aiDraftStatus: "not_generated",
    reviewStatus: "pending",
    signatureStatus: "unsigned",
    status: "pending_generation",
    updatedAt: "2026-07-29 08:24",
    missingFields: ["CPET未完成", "6分钟步行未采集"]
  }
];

const patientNoById: Record<string, string> = {
  "P-DEMO-001": "000001",
  "P-DEMO-002": "000002",
  "P-DEMO-003": "000003",
  "P-DEMO-004": "000004",
  "P-DEMO-005": "000005",
  "P-DEMO-006": "000006"
};

function toIsoDateTime(value?: string) {
  if (!value || value.includes("T")) return value;
  if (value.length === 10) return `${value}T23:59:59+08:00`;
  return `${value.replace(" ", "T")}:00+08:00`;
}

function buildAiDraft(task: PrescriptionTaskSeed, prescriptionId: string, index: number): AiPrescriptionDraft | undefined {
  if (task.aiDraftStatus !== "generated") return undefined;
  return {
    draftId: `AI-RX-20260729-${String(index + 1).padStart(4, "0")}`,
    prescriptionId,
    generatedAt: toIsoDateTime(task.updatedAt) ?? "2026-07-29T09:00:00+08:00",
    evidenceSnapshot: [
      task.sourceLabel,
      task.previousVersionId ? `上一版处方 ${task.previousVersionId}` : "基线临床评估",
      "诊断、特殊用药与风险分层",
      ...(task.patientId === "P-DEMO-001" ? ["训练中胸闷安全事件（医生已复核）"] : [])
    ],
    missingData: task.missingFields ?? [],
    proposedContent: {
      targetHeartRate: task.patientId === "P-DEMO-001" ? "100–116 bpm" : "96–112 bpm",
      targetPower: task.patientId === "P-DEMO-001" ? "48–62 W" : "40–55 W",
      frequency: "每周 3 次",
      duration: "30 分钟/次",
      clinicalAdvice: task.patientId === "P-DEMO-001"
        ? "近期出现短暂胸闷，本次建议维持强度并补齐训练后血压。"
        : "结合当前风险分层与训练完成情况，建议医生复核后采用。"
    },
    modelVersion: "CardiacRx-Demo-1.0",
    promptVersion: "rx-draft-2026.07",
    status: "generated"
  };
}

export const initialPrescriptionTasks: PrescriptionTask[] = prescriptionTaskSeeds.map((task, index) => {
  const prescriptionId = `01J61RX${String(index + 1).padStart(18, "0")}`;
  const previousVersionNumber = Number(task.previousVersionId?.match(/V(\d+)/)?.[1] ?? 0);
  return {
    ...task,
    taskNo: `RX-TASK-${String(index + 1).padStart(4, "0")}`,
    prescriptionId,
    prescriptionNo: `CRH-RX-20260729-${String(index + 1).padStart(4, "0")}`,
    patientNo: patientNoById[task.patientId],
    versionNo: task.version.replace(" 草稿", ""),
    previousPrescriptionId: previousVersionNumber ? `01J60RX${String(previousVersionNumber).padStart(18, "0")}` : undefined,
    sourceReportIds: task.sourceReportId ? [task.sourceReportId] : [],
    sourceTrainingRecordIds: task.patientId === "P-DEMO-001" ? ["TR-20260725-012", "TR-20260723-011"] : task.sourceType === "single_report" && task.sourceReportId ? [task.sourceReportId] : [],
    draftState: task.status === "completed" ? "signed" : task.aiDraftStatus === "generated" ? "saved" : "unsaved",
    lastDraftSavedAt: task.aiDraftStatus === "generated" ? toIsoDateTime(task.updatedAt) : undefined,
    createdAt: toIsoDateTime(task.updatedAt) ?? "2026-07-29T09:00:00+08:00",
    draftedAt: task.aiDraftStatus === "generated" ? toIsoDateTime(task.updatedAt) : undefined,
    reviewedAt: task.reviewStatus === "confirmed" ? toIsoDateTime(task.confirmedAt ?? task.updatedAt) : undefined,
    effectiveFrom: task.status === "completed" ? toIsoDateTime(task.signedAt) : undefined,
    updatedAt: toIsoDateTime(task.updatedAt) ?? task.updatedAt,
    confirmedAt: toIsoDateTime(task.confirmedAt),
    signedAt: toIsoDateTime(task.signedAt),
    expiresAt: toIsoDateTime(task.expiresAt),
    aiDraft: buildAiDraft(task, prescriptionId, index)
  };
});

type DoctorAppointmentSeed = Omit<DoctorAppointment, "appointmentNo" | "patientNo" | "scheduledStartAt"> & { time: string };

const doctorAppointmentSeeds: DoctorAppointmentSeed[] = [
  {
    id: "APT-20260729-001",
    patientId: "P-DEMO-001",
    patientName: "陈女士",
    time: "09:30",
    purpose: "阶段复查后调整功率车处方",
    stage: "Ⅱ期 · 第4周",
    risk: "中危",
    status: "in_progress",
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
    status: "pending",
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
    status: "completed",
    singleReportIds: ["TR-20260725-012"],
    stageReportIds: ["STAGE-202607-003"],
    reportReviewStatus: "待复核",
    linkedTaskId: "RX-TASK-003"
  },
  {
    id: "APT-20260729-004",
    patientId: "P-DEMO-004",
    patientName: "赵女士",
    time: "14:00",
    purpose: "首次评估后制定初始运动处方",
    stage: "首次评估",
    risk: "高危",
    status: "pending",
    singleReportIds: [],
    stageReportIds: [],
    reportReviewStatus: "待复核",
    linkedTaskId: "RX-TASK-004"
  },
  {
    id: "APT-20260729-005",
    patientId: "P-DEMO-006",
    patientName: "孙女士",
    time: "15:30",
    purpose: "补充评估资料并复核初始处方",
    stage: "首次评估",
    risk: "中危",
    status: "completed",
    singleReportIds: [],
    stageReportIds: [],
    reportReviewStatus: "待复核",
    linkedTaskId: "RX-TASK-006"
  },
  {
    id: "APT-20260729-006",
    patientId: "P-DEMO-005",
    patientName: "周先生",
    time: "16:20",
    purpose: "阶段康复效果复查",
    stage: "Ⅱ期 · 第6周",
    risk: "低危",
    status: "completed",
    singleReportIds: ["TR-20260723-011"],
    stageReportIds: ["STAGE-202607-005"],
    reportReviewStatus: "已复核",
    linkedTaskId: "RX-TASK-005"
  }
];

export const doctorAppointments: DoctorAppointment[] = doctorAppointmentSeeds.map((appointment, index) => {
  const { time, ...rest } = appointment;
  return {
    ...rest,
    appointmentNo: `CRH-APT-20260729-${String(index + 1).padStart(4, "0")}`,
    patientNo: patientNoById[appointment.patientId],
    scheduledStartAt: `2026-07-29T${time}:00+08:00`,
    checkInAt: appointment.status === "in_progress" ? "2026-07-29T09:22:00+08:00" : undefined,
    consultationStartedAt: appointment.status === "in_progress" ? "2026-07-29T09:31:00+08:00" : undefined,
    completedAt: appointment.status === "completed" ? `2026-07-29T${time}:00+08:00` : undefined
  };
});

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
