import { Prisma, PrismaClient } from "@prisma/client";

export const clinicalStateKeys = [
  "xinkang-patients",
  "xinkang-assessments",
  "xinkang-prescription-tasks",
  "xinkang-prescription-contents",
  "xinkang-appointments",
  "xinkang-training-encounters",
  "xinkang-treatments",
  "xinkang-training-sessions",
  "xinkang-single-reports",
  "xinkang-stage-reports",
  "xinkang-alert-events",
  "xinkang-alert-rules",
  "xinkang-rehab-reports",
  "xinkang-followup-tasks",
  "xinkang-followup-records",
  "xinkang-patient-clinical-profiles",
  "xinkang-clinical-narratives",
  "xinkang-training-videos"
] as const;

export type ClinicalStateKey = typeof clinicalStateKeys[number];
export const clinicalStateKeySet = new Set<string>(clinicalStateKeys);
const asJson = (value: unknown) => value as Prisma.InputJsonValue;
const asObject = (value: unknown) => value && typeof value === "object" ? value as Record<string, any> : {};
const asArray = (value: unknown) => Array.isArray(value) ? value as Record<string, any>[] : [];
const dateOrNow = (value: unknown) => {
  const date = typeof value === "string" ? new Date(value.includes("T") ? value : value.replace(" ", "T") + "+08:00") : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
let synchronizationQueue: Promise<void> = Promise.resolve();

export async function readStateDocuments(prisma: PrismaClient) {
  const documents = await prisma.stateDocument.findMany();
  return Object.fromEntries(documents.map((document) => [document.key, {
    value: document.value,
    version: document.version,
    updatedAt: document.updatedAt.toISOString()
  }]));
}

export async function writeStateDocument(prisma: PrismaClient, key: ClinicalStateKey, value: unknown) {
  const document = await prisma.stateDocument.upsert({
    where: { key },
    update: { value: asJson(value), version: { increment: 1 } },
    create: { key, value: asJson(value) }
  });
  synchronizationQueue = synchronizationQueue
    .then(() => synchronizeAllStateDocuments(prisma))
    .catch((error) => { console.error("Normalized clinical state synchronization failed", key, error); });
  await synchronizationQueue;
  return { key: document.key, value: document.value, version: document.version, updatedAt: document.updatedAt.toISOString() };
}

export async function synchronizeAllStateDocuments(prisma: PrismaClient) {
  const documents = await prisma.stateDocument.findMany();
  const values = new Map(documents.map((item) => [item.key, item.value]));
  await syncPatients(prisma, values.get("xinkang-patients"));
  await syncPrescriptions(prisma, values.get("xinkang-prescription-tasks"), values.get("xinkang-prescription-contents"));
  await syncAppointments(prisma, values.get("xinkang-appointments"));
  await syncEncounters(prisma, values.get("xinkang-training-encounters"));
  await syncAssessments(prisma, values.get("xinkang-assessments"));
  await syncAlerts(prisma, values.get("xinkang-alert-events"));
  await syncTreatments(prisma, values.get("xinkang-treatments"));
  await syncSingleReports(prisma, values.get("xinkang-single-reports"));
  await syncStageReports(prisma, values.get("xinkang-stage-reports"));
  await syncFollowUps(prisma, values.get("xinkang-followup-tasks"));
}

async function syncPatients(prisma: PrismaClient, value: unknown) {
  for (const patient of asArray(value)) {
    const id = String(patient.patient_demo_id ?? patient.id ?? "");
    if (!id) continue;
    const rawNo = String(patient.patient_code ?? patient.patient_no ?? patient.patientNo ?? id);
    const loginCode = rawNo.replace(/\D/g, "").slice(-6).padStart(6, "0");
    await prisma.patient.upsert({
      where: { id },
      update: { patientNo: rawNo, loginCode, name: String(patient.name ?? "待核对患者"), gender: String(patient.gender ?? "") || null, riskLevel: String(patient.risk_level ?? "中危"), rehabStage: String(patient.rehab_stage ?? "冠心病2期"), assignedDoctor: String(patient.assigned_doctor ?? "") || null, profile: asJson(patient) },
      create: { id, patientNo: rawNo, loginCode, name: String(patient.name ?? "待核对患者"), gender: String(patient.gender ?? "") || null, riskLevel: String(patient.risk_level ?? "中危"), rehabStage: String(patient.rehab_stage ?? "冠心病2期"), assignedDoctor: String(patient.assigned_doctor ?? "") || null, profile: asJson(patient) }
    });
  }
}

async function syncPrescriptions(prisma: PrismaClient, taskValue: unknown, contentValue: unknown) {
  const contents = asObject(contentValue);
  for (const task of asArray(taskValue)) {
    const id = String(task.id ?? "");
    const patientId = String(task.patientId ?? "");
    if (!id || !patientId || !await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })) continue;
    const payload = { ...task, content: contents[id] };
    await prisma.prescription.upsert({
      where: { id },
      update: { status: String(task.status ?? "pending_generation"), assignedDoctor: String(task.assignedDoctorName ?? "") || null, signedBy: String(task.signedBy ?? "") || null, signedAt: task.signedAt ? dateOrNow(task.signedAt) : null, payload: asJson(payload) },
      create: { id, prescriptionNo: String(task.prescriptionNo ?? id), patientId, version: String(task.version ?? "V1"), status: String(task.status ?? "pending_generation"), assignedDoctor: String(task.assignedDoctorName ?? "") || null, signedBy: String(task.signedBy ?? "") || null, signedAt: task.signedAt ? dateOrNow(task.signedAt) : null, payload: asJson(payload) }
    });
    const items = asArray(task.doctorFinal?.items ?? task.aiSuggestion?.items);
    for (const [index, item] of items.entries()) {
      await prisma.prescriptionItem.upsert({
        where: { id: `${id}-ITEM-${index + 1}` },
        update: { category: String(item.category ?? "其他"), exerciseKey: String(item.project ?? "item").toLowerCase(), exerciseName: String(item.project ?? "未命名项目"), intensity: String(item.intensity ?? "") || null, duration: String(item.duration ?? "") || null, frequency: String(item.frequency ?? "") || null, rationale: String(item.reason ?? "") || null, payload: asJson(item) },
        create: { id: `${id}-ITEM-${index + 1}`, prescriptionId: id, order: index + 1, category: String(item.category ?? "其他"), exerciseKey: String(item.project ?? "item").toLowerCase(), exerciseName: String(item.project ?? "未命名项目"), intensity: String(item.intensity ?? "") || null, duration: String(item.duration ?? "") || null, frequency: String(item.frequency ?? "") || null, rationale: String(item.reason ?? "") || null, payload: asJson(item) }
      });
    }
  }
}

async function syncAppointments(prisma: PrismaClient, value: unknown) {
  for (const appointment of asArray(value)) {
    const id = String(appointment.id ?? "");
    const patientId = String(appointment.patientId ?? "");
    if (!id || !patientId || !await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })) continue;
    const prescriptionId = String(appointment.prescriptionTaskId ?? "") || null;
    const validPrescriptionId = prescriptionId && await prisma.prescription.findUnique({ where: { id: prescriptionId }, select: { id: true } }) ? prescriptionId : null;
    const scheduledAt = dateOrNow(`${appointment.date ?? ""}T${appointment.time ?? "09:00"}:00+08:00`);
    await prisma.appointment.upsert({
      where: { id },
      update: { prescriptionId: validPrescriptionId, scheduledAt, status: String(appointment.status ?? "pending"), station: String(appointment.station ?? "") || null, project: String(appointment.project ?? "") || null, doctorName: String(appointment.doctorName ?? "") || null, therapistName: String(appointment.therapistName ?? "") || null, note: String(appointment.note ?? "") || null, payload: asJson(appointment) },
      create: { id, patientId, prescriptionId: validPrescriptionId, scheduledAt, status: String(appointment.status ?? "pending"), station: String(appointment.station ?? "") || null, project: String(appointment.project ?? "") || null, doctorName: String(appointment.doctorName ?? "") || null, therapistName: String(appointment.therapistName ?? "") || null, note: String(appointment.note ?? "") || null, payload: asJson(appointment) }
    });
  }
}

async function syncEncounters(prisma: PrismaClient, value: unknown) {
  for (const encounter of asArray(value)) {
    const id = String(encounter.encounterId ?? encounter.id ?? "");
    const appointmentId = String(encounter.appointmentId ?? "");
    const patientId = String(encounter.patientId ?? "");
    if (!id || !appointmentId || !patientId) continue;
    if (!await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true } })) continue;
    const prescriptionId = String(encounter.prescriptionTaskId ?? "") || null;
    const validPrescriptionId = prescriptionId && await prisma.prescription.findUnique({ where: { id: prescriptionId }, select: { id: true } }) ? prescriptionId : null;
    await prisma.trainingEncounter.upsert({
      where: { id },
      update: { prescriptionId: validPrescriptionId, status: String(encounter.status ?? "scheduled"), activeTaskId: String(encounter.activeTrainingTaskId ?? "") || null, station: String(encounter.station ?? "") || null, therapist: String(encounter.therapist ?? "") || null, startedAt: encounter.trainingStartedAt ? dateOrNow(encounter.trainingStartedAt) : null, endedAt: encounter.trainingEndedAt ? dateOrNow(encounter.trainingEndedAt) : null, postAssessedAt: encounter.postAssessmentCompletedAt ? dateOrNow(encounter.postAssessmentCompletedAt) : null, signedAt: encounter.signedAt ? dateOrNow(encounter.signedAt) : null, payload: asJson(encounter) },
      create: { id, appointmentId, patientId, prescriptionId: validPrescriptionId, status: String(encounter.status ?? "scheduled"), activeTaskId: String(encounter.activeTrainingTaskId ?? "") || null, station: String(encounter.station ?? "") || null, therapist: String(encounter.therapist ?? "") || null, startedAt: encounter.trainingStartedAt ? dateOrNow(encounter.trainingStartedAt) : null, endedAt: encounter.trainingEndedAt ? dateOrNow(encounter.trainingEndedAt) : null, postAssessedAt: encounter.postAssessmentCompletedAt ? dateOrNow(encounter.postAssessmentCompletedAt) : null, signedAt: encounter.signedAt ? dateOrNow(encounter.signedAt) : null, payload: asJson(encounter) }
    });
    for (const [index, task] of asArray(encounter.dailyTrainingTasks).entries()) {
      const taskId = String(task.taskId ?? `${id}-TASK-${index + 1}`);
      await prisma.trainingTask.upsert({
        where: { id: taskId },
        update: { order: Number(task.order ?? index + 1), category: String(task.category ?? "其他"), exerciseKey: String(task.exerciseKey ?? "item"), exerciseName: String(task.exerciseName ?? "未命名项目"), status: String(task.status ?? "pending"), startedAt: task.startedAt ? dateOrNow(task.startedAt) : null, completedAt: task.completedAt ? dateOrNow(task.completedAt) : null, payload: asJson(task) },
        create: { id: taskId, encounterId: id, order: Number(task.order ?? index + 1), category: String(task.category ?? "其他"), exerciseKey: String(task.exerciseKey ?? "item"), exerciseName: String(task.exerciseName ?? "未命名项目"), status: String(task.status ?? "pending"), startedAt: task.startedAt ? dateOrNow(task.startedAt) : null, completedAt: task.completedAt ? dateOrNow(task.completedAt) : null, payload: asJson(task) }
      });
    }
  }
}

async function syncAssessments(prisma: PrismaClient, value: unknown) {
  for (const record of asArray(value)) {
    const id = String(record.assessmentId ?? record.id ?? "");
    const patientId = String(record.patientId ?? "");
    if (!id || !patientId || !await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })) continue;
    await prisma.assessment.upsert({ where: { id }, update: { status: String(record.status ?? "draft"), assessedAt: dateOrNow(record.assessedAt), assessor: String(record.therapist ?? record.enteredBy ?? "") || null, payload: asJson(record) }, create: { id, patientId, type: "SPPB", status: String(record.status ?? "draft"), assessedAt: dateOrNow(record.assessedAt), assessor: String(record.therapist ?? record.enteredBy ?? "") || null, payload: asJson(record) } });
  }
}

async function syncAlerts(prisma: PrismaClient, value: unknown) {
  for (const record of asArray(value)) {
    const id = String(record.id ?? "");
    const patientId = String(record.patientId ?? "");
    if (!id || !patientId || !await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })) continue;
    const encounterId = String(record.encounterId ?? "") || null;
    const validEncounterId = encounterId && await prisma.trainingEncounter.findUnique({ where: { id: encounterId }, select: { id: true } }) ? encounterId : null;
    await prisma.alertEvent.upsert({ where: { id }, update: { encounterId: validEncounterId, severity: String(record.severity ?? "warning"), status: String(record.status ?? "pending"), occurredAt: dateOrNow(record.occurredAt), payload: asJson(record) }, create: { id, patientId, encounterId: validEncounterId, severity: String(record.severity ?? "warning"), status: String(record.status ?? "pending"), occurredAt: dateOrNow(record.occurredAt), payload: asJson(record) } });
    if (record.onSiteRecord) {
      await prisma.intervention.upsert({
        where: { id: `${id}-INITIAL` },
        update: { operator: String(record.assignedTherapist ?? "周康复师"), action: String(record.onSiteRecord), payload: asJson({ source: "alert.onSiteRecord" }) },
        create: { id: `${id}-INITIAL`, alertId: id, operator: String(record.assignedTherapist ?? "周康复师"), action: String(record.onSiteRecord), payload: asJson({ source: "alert.onSiteRecord" }) }
      });
    }
  }
}

async function syncTreatments(prisma: PrismaClient, value: unknown) {
  for (const record of asArray(value)) {
    const id = String(record.treatmentId ?? record.id ?? "");
    const encounterId = String(record.encounterId ?? "");
    if (!id || !encounterId || !await prisma.trainingEncounter.findUnique({ where: { id: encounterId }, select: { id: true } })) continue;
    const phase = record.status === "completed" ? "post" : "pre";
    await prisma.treatmentAssessment.upsert({ where: { encounterId_phase: { encounterId, phase } }, update: { status: String(record.status ?? "draft"), operator: String(record.therapist ?? record.enteredBy ?? "") || null, signedAt: record.signature?.signedAt ? dateOrNow(record.signature.signedAt) : null, payload: asJson(record) }, create: { id, encounterId, phase, status: String(record.status ?? "draft"), operator: String(record.therapist ?? record.enteredBy ?? "") || null, signedAt: record.signature?.signedAt ? dateOrNow(record.signature.signedAt) : null, payload: asJson(record) } });
  }
}

async function syncSingleReports(prisma: PrismaClient, value: unknown) {
  for (const record of asArray(value)) {
    const id = String(record.singleReportId ?? record.id ?? "");
    const encounterId = String(record.encounterId ?? "");
    if (!id || !encounterId || !await prisma.trainingEncounter.findUnique({ where: { id: encounterId }, select: { id: true } })) continue;
    await prisma.singleReport.upsert({ where: { id }, update: { status: String(record.reportStage ?? "instant"), generatedAt: dateOrNow(record.generatedAt ?? record.actualStartAt), payload: asJson(record) }, create: { id, encounterId, patientId: String(record.patientId ?? ""), status: String(record.reportStage ?? "instant"), generatedAt: dateOrNow(record.generatedAt ?? record.actualStartAt), payload: asJson(record) } });
  }
}

async function syncStageReports(prisma: PrismaClient, value: unknown) {
  for (const record of asArray(value)) {
    const id = String(record.reportId ?? record.id ?? "");
    const patientId = String(record.patientId ?? "");
    if (!id || !patientId || !await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })) continue;
    const prescriptionId = String(record.prescriptionTaskId ?? "") || null;
    const validPrescriptionId = prescriptionId && await prisma.prescription.findUnique({ where: { id: prescriptionId }, select: { id: true } }) ? prescriptionId : null;
    await prisma.stageReport.upsert({ where: { id }, update: { prescriptionId: validPrescriptionId, version: Number(record.version ?? 1), status: String(record.status ?? "draft"), generatedAt: dateOrNow(record.generatedAt), payload: asJson(record) }, create: { id, patientId, prescriptionId: validPrescriptionId, version: Number(record.version ?? 1), status: String(record.status ?? "draft"), generatedAt: dateOrNow(record.generatedAt), payload: asJson(record) } });
  }
}

async function syncFollowUps(prisma: PrismaClient, value: unknown) {
  for (const record of asArray(value)) {
    const id = String(record.id ?? "");
    const patientId = String(record.patientId ?? "");
    if (!id || !patientId || !await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })) continue;
    await prisma.followUp.upsert({ where: { id }, update: { dueAt: dateOrNow(record.currentDueDate ?? record.dueDate), status: String(record.status ?? "due"), assignee: String(record.assignedDoctor ?? "") || null, completedAt: record.completedAt ? dateOrNow(record.completedAt) : null, payload: asJson(record) }, create: { id, patientId, dueAt: dateOrNow(record.currentDueDate ?? record.dueDate), status: String(record.status ?? "due"), assignee: String(record.assignedDoctor ?? "") || null, completedAt: record.completedAt ? dateOrNow(record.completedAt) : null, payload: asJson(record) } });
  }
}
