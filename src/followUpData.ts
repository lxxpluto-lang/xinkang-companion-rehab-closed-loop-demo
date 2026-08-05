import type { ManagedPatient } from "./pages/PatientArchivePage";

export type FollowUpStatus = "upcoming" | "due" | "overdue" | "rescheduled" | "review_required" | "completed";
export type FollowUpMilestone = 1 | 3 | 6;
export type ContactResult = "reached" | "no_answer" | "refused" | "invalid_number";
export type FollowUpDisposition = "continue_plan" | "early_visit" | "prescription_review" | "urgent_care";

export type FollowUpAiDraft = {
  draftId: string;
  generatedAt: string;
  summary: string;
  modelVersion: string;
  status: "generated" | "accepted" | "edited";
  acceptedBy?: string;
  acceptedAt?: string;
};

export type FollowUpReschedule = {
  fromDate: string;
  toDate: string;
  reason: string;
  changedBy: string;
  changedAt: string;
};

export type FollowUpTask = {
  id: string;
  patientId: string;
  assignedDoctor: string;
  milestoneMonth: FollowUpMilestone;
  originalPlannedDate: string;
  currentDueDate: string;
  reminderDate: string;
  status: FollowUpStatus;
  lastContactResult?: ContactResult;
  lastContactAt?: string;
  completedAt?: string;
  completedBy?: string;
  recordId?: string;
  reviewRequiredAt?: string;
  reviewRequiredBy?: string;
  /** 出院报告发布后写入的提醒来源，便于医生知道该任务由报告触发。 */
  reportPublishedAt?: string;
  rescheduleHistory: FollowUpReschedule[];
};

export type FollowUpRecord = {
  recordId: string;
  taskId: string;
  patientId: string;
  milestoneMonth: FollowUpMilestone;
  contactResult: ContactResult;
  communicationMethod: "sms" | "online_message" | "phone" | "outpatient" | "other";
  contactedAt: string;
  symptoms: string[];
  medicationAdherence: string;
  exerciseAdherence: string;
  trainingFrequency: string;
  trainingDuration: string;
  recentEmergencyOrHospitalization: boolean;
  vitalSigns: string;
  patientDifficulty: string;
  therapistAdvice: string;
  clinicalAssessment: string;
  disposition?: FollowUpDisposition;
  notes: string;
  nextContactDate?: string;
  operator: string;
  createdAt: string;
  sourceText?: string;
  aiDraft?: FollowUpAiDraft;
};

export const followUpStatusLabels: Record<FollowUpStatus, string> = {
  upcoming: "待随访",
  due: "今日到期",
  overdue: "已逾期",
  rescheduled: "未接通/待重拨",
  review_required: "需线下联系",
  completed: "已完成"
};

export const contactResultLabels: Record<ContactResult, string> = {
  reached: "已接通",
  no_answer: "无人接听",
  refused: "拒绝沟通",
  invalid_number: "号码异常"
};

export const dispositionLabels: Record<FollowUpDisposition, string> = {
  continue_plan: "继续原计划",
  early_visit: "建议提前复诊",
  prescription_review: "进入处方调整评估",
  urgent_care: "建议紧急就医"
};

/** 首期随访字段配置：后续访谈确认后可直接调整选项和必填规则。 */
export const followUpFieldConfig = {
  symptoms: ["无明显不适", "胸闷", "持续胸痛", "气促", "心悸", "头晕", "晕厥", "下肢水肿"],
  medicationAdherence: ["良好", "偶有漏服", "较差", "无法判断"],
  exerciseAdherence: ["基本按计划完成", "部分完成", "未执行", "无法判断"],
  requiredForReached: ["contactedAt", "disposition", "clinicalAssessment"],
  highRiskSymptoms: ["持续胸痛", "晕厥"],
  highRiskEvents: ["急诊", "再住院"]
} as const;

function toDateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function addCalendarMonths(value: string, months: number) {
  const { year, month, day } = toDateParts(value);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalizedMonthIndex + 1, 0).getDate();
  return `${targetYear}-${pad(normalizedMonthIndex + 1)}-${pad(Math.min(day, lastDay))}`;
}

export function addDays(value: string, days: number) {
  const { year, month, day } = toDateParts(value);
  const date = new Date(year, month - 1, day + days, 12);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayDate() {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysUntil(value: string, referenceDate = todayDate()) {
  const target = toDateParts(value);
  const reference = toDateParts(referenceDate);
  const targetTime = new Date(target.year, target.month - 1, target.day, 12).getTime();
  const referenceTime = new Date(reference.year, reference.month - 1, reference.day, 12).getTime();
  return Math.round((targetTime - referenceTime) / 86400000);
}

export function effectiveFollowUpStatus(task: FollowUpTask, referenceDate = todayDate()): FollowUpStatus {
  if (task.status === "completed") return "completed";
  if (task.status === "review_required") return "review_required";
  const distance = daysUntil(task.currentDueDate, referenceDate);
  if (distance < 0) return "overdue";
  if (distance === 0) return "due";
  if (task.status === "rescheduled") return "rescheduled";
  return "upcoming";
}

export function isFollowUpVisibleInPending(task: FollowUpTask, referenceDate = todayDate()) {
  if (task.status === "completed") return false;
  return daysUntil(task.currentDueDate, referenceDate) <= 7;
}

function createTask(patient: ManagedPatient, milestoneMonth: FollowUpMilestone): FollowUpTask {
  const plannedDate = addCalendarMonths(patient.discharge_date, milestoneMonth);
  const task: FollowUpTask = {
    id: `FU-${patient.patient_demo_id}-M${milestoneMonth}`,
    patientId: patient.patient_demo_id,
    assignedDoctor: patient.assigned_doctor,
    milestoneMonth,
    originalPlannedDate: plannedDate,
    currentDueDate: plannedDate,
    reminderDate: addDays(plannedDate, -7),
    status: "upcoming",
    rescheduleHistory: []
  };
  return { ...task, status: effectiveFollowUpStatus(task) };
}

export function createInitialFollowUpData(patients: ManagedPatient[]) {
  const tasks = patients.flatMap((patient) => patient.discharge_date
    ? ([1, 3, 6] as FollowUpMilestone[]).map((milestone) => createTask(patient, milestone))
    : []);
  const completedTask = tasks.find((task) => task.patientId === "P-DEMO-003" && task.milestoneMonth === 1);
  const records: FollowUpRecord[] = [];
  if (completedTask) {
    completedTask.status = "completed";
    completedTask.completedAt = "2026-06-02T10:20:00+08:00";
    completedTask.completedBy = "赵医生";
    completedTask.recordId = "FU-REC-0001";
    completedTask.lastContactResult = "reached";
    completedTask.lastContactAt = completedTask.completedAt;
    records.push({
      recordId: "FU-REC-0001",
      taskId: completedTask.id,
      patientId: completedTask.patientId,
      milestoneMonth: 1,
      contactResult: "reached",
      communicationMethod: "phone",
      contactedAt: completedTask.completedAt,
      symptoms: ["无明显不适"],
      medicationAdherence: "良好",
      exerciseAdherence: "基本按计划完成",
      trainingFrequency: "每周 3 次",
      trainingDuration: "每次 30 分钟",
      recentEmergencyOrHospitalization: false,
      vitalSigns: "家庭血压 126/78 mmHg",
      patientDifficulty: "暂无明显困难",
      therapistAdvice: "继续按当前处方训练，注意训练前后监测心率。",
      clinicalAssessment: "恢复稳定，继续现阶段康复计划。",
      disposition: "continue_plan",
      notes: "已提醒按计划复诊。",
      operator: "赵医生",
      createdAt: completedTask.completedAt
    });
  }
  return { tasks, records };
}

export function reconcilePatientFollowUps(
  tasks: FollowUpTask[],
  patient: ManagedPatient,
  previousDischargeDate: string,
  reason: string,
  actor: string
) {
  const existingPatientTasks = tasks.filter((task) => task.patientId === patient.patient_demo_id);
  const otherTasks = tasks.filter((task) => task.patientId !== patient.patient_demo_id);
  if (!patient.discharge_date) return [...otherTasks, ...existingPatientTasks.filter((task) => task.status === "completed")];
  const changedAt = new Date().toISOString();
  const reconciled = ([1, 3, 6] as FollowUpMilestone[]).map((milestone) => {
    const existing = existingPatientTasks.find((task) => task.milestoneMonth === milestone);
    if (existing?.status === "completed") return existing;
    const nextDate = addCalendarMonths(patient.discharge_date, milestone);
    if (!existing) return createTask(patient, milestone);
    if (previousDischargeDate === patient.discharge_date || existing.currentDueDate === nextDate) return existing;
    const updated: FollowUpTask = {
      ...existing,
      assignedDoctor: patient.assigned_doctor,
      currentDueDate: nextDate,
      reminderDate: addDays(nextDate, -7),
      status: "rescheduled",
      rescheduleHistory: [...existing.rescheduleHistory, {
        fromDate: existing.currentDueDate,
        toDate: nextDate,
        reason,
        changedBy: actor,
        changedAt
      }]
    };
    return updated;
  });
  return [...otherTasks, ...reconciled];
}

export function markDischargeReportPublished(tasks: FollowUpTask[], patientId: string, publishedAt: string) {
  const target = tasks
    .filter((task) => task.patientId === patientId && task.status !== "completed")
    .sort((left, right) => left.milestoneMonth - right.milestoneMonth)[0];
  if (!target) return tasks;
  const reminderDate = publishedAt.slice(0, 10);
  return tasks.map((task) => task.id === target.id ? { ...task, reportPublishedAt: publishedAt, reminderDate } : task);
}
