import { Prisma, PrismaClient } from "@prisma/client";
type DbClient = PrismaClient | Prisma.TransactionClient;

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

export async function readStateDocuments(prisma: DbClient) {
  const documents = await prisma.stateDocument.findMany();
  return Object.fromEntries(documents.map((document) => [document.key, {
    value: document.value,
    version: document.version,
    updatedAt: document.updatedAt.toISOString()
  }]));
}

export async function writeStateDocument(prisma: DbClient, key: ClinicalStateKey, value: unknown, expectedVersion?: number) {
  const current = await prisma.stateDocument.findUnique({ where: { key }, select: { version: true } });
  if (expectedVersion !== undefined && current && current.version !== expectedVersion) {
    const error = new Error("STATE_VERSION_CONFLICT");
    Object.assign(error, { statusCode: 409, currentVersion: current.version });
    throw error;
  }
  const protectedValue = await protectCanonicalState(prisma, key, value);
  const document = await prisma.stateDocument.upsert({
    where: { key },
    update: { value: asJson(protectedValue), version: { increment: 1 } },
    create: { key, value: asJson(protectedValue) }
  });
  synchronizationQueue = synchronizationQueue
    .then(() => synchronizeAllStateDocuments(prisma))
    .catch((error) => { console.error("Normalized clinical state synchronization failed", key, error); });
  await synchronizationQueue;
  return { key: document.key, value: document.value, version: document.version, updatedAt: document.updatedAt.toISOString() };
}

async function protectCanonicalState(prisma: DbClient, key: ClinicalStateKey, value: unknown) {
  if (!["xinkang-patients", "xinkang-prescription-tasks", "xinkang-appointments", "xinkang-training-encounters"].includes(key)) return value;
  const patients = await prisma.patient.findMany();
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const archivedById = new Map(patients.filter((patient) => patient.status === "archived").map((patient) => [patient.id, patient]));
  if (key === "xinkang-patients") {
    const records = asArray(value).map((record) => {
      const patient = archivedById.get(String(record.patient_demo_id ?? record.id ?? ""));
      return patient ? {
        ...record,
        record_status: "已归档",
        archive_status: "archived",
        archived_at: patient.archivedAt?.toISOString() ?? "",
        archived_by: patient.archivedBy ?? "",
        archive_reason: patient.archiveReason ?? ""
      } : record;
    });
    const existingIds = new Set(records.map((record) => String(record.patient_demo_id ?? record.id ?? "")));
    for (const patient of patients) {
      if (!existingIds.has(patient.id)) records.push({
        ...asObject(patient.profile),
        patient_demo_id: patient.id,
        patient_code: patient.patientNo,
        name: patient.name,
        record_status: patient.status === "archived" ? "已归档" : "有效",
        archive_status: patient.status,
        archived_at: patient.archivedAt?.toISOString() ?? "",
        archived_by: patient.archivedBy ?? "",
        archive_reason: patient.archiveReason ?? ""
      });
    }
    return records;
  }
  if (key === "xinkang-prescription-tasks") {
    const records = asArray(value).map((record) => archivedById.has(String(record.patientId ?? "")) ? { ...record, status: "archived", invalidatedReason: "患者档案已归档" } : record);
    const existingIds = new Set(records.map((record) => String(record.id ?? "")));
    const prescriptions = await prisma.prescription.findMany();
    for (const prescription of prescriptions) {
      if (existingIds.has(prescription.id)) continue;
      records.push({ ...asObject(prescription.payload), id: prescription.id, prescriptionNo: prescription.prescriptionNo, patientId: prescription.patientId, version: prescription.version, status: prescription.status, signedBy: prescription.signedBy, signedAt: prescription.signedAt?.toISOString() });
    }
    return records;
  }
  if (key === "xinkang-appointments") {
    const prescriptions = await prisma.prescription.findMany({ select: { id: true, patientId: true, status: true, signedAt: true } });
    const prescriptionById = new Map(prescriptions.map((item) => [item.id, item]));
    const protect = (record: Record<string, any>) => {
      const patient = patientById.get(String(record.patientId ?? ""));
      const prescription = prescriptionById.get(String(record.prescriptionTaskId ?? record.prescriptionId ?? ""));
      const activeStatus = ["pending", "rescheduled", "scheduled", "arrived", "in_training"].includes(String(record.status));
      const valid = patient?.status === "active" && prescription?.patientId === patient.id && prescription.status === "completed" && Boolean(prescription.signedAt);
      if (!activeStatus || valid) return patient?.status === "archived" ? { ...record, patientArchived: true } : record;
      return { ...record, status: "cancelled", cancellationReason: patient?.status === "archived" ? "患者档案已归档" : "患者或处方状态无效", patientArchived: patient?.status === "archived" };
    };
    const records = asArray(value).map(protect);
    const existingIds = new Set(records.map((record) => String(record.id ?? "")));
    const appointments = await prisma.appointment.findMany();
    for (const appointment of appointments) {
      if (existingIds.has(appointment.id)) continue;
      records.push(protect({ ...asObject(appointment.payload), id: appointment.id, patientId: appointment.patientId, prescriptionTaskId: appointment.prescriptionId, status: appointment.status, cancellationReason: appointment.cancelledReason }));
    }
    return records;
  }
  const protectEncounter = (record: Record<string, any>) => {
    if (!archivedById.has(String(record.patientId ?? ""))) return record;
    return ["completed", "cancelled", "no_show", "terminated"].includes(String(record.status))
      ? { ...record, patientArchived: true }
      : { ...record, status: "cancelled", patientArchived: true, cancellationReason: "患者档案已归档" };
  };
  const records = asArray(value).map(protectEncounter);
  const existingIds = new Set(records.map((record) => String(record.encounterId ?? record.id ?? "")));
  const encounters = await prisma.trainingEncounter.findMany();
  for (const encounter of encounters) {
    if (existingIds.has(encounter.id)) continue;
    records.push(protectEncounter({ ...asObject(encounter.payload), encounterId: encounter.id, appointmentId: encounter.appointmentId, patientId: encounter.patientId, prescriptionTaskId: encounter.prescriptionId, status: encounter.status }));
  }
  return records;
}

export async function synchronizeAllStateDocuments(prisma: DbClient) {
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

async function syncPatients(prisma: DbClient, value: unknown) {
  for (const patient of asArray(value)) {
    const id = String(patient.patient_demo_id ?? patient.id ?? "");
    if (!id) continue;
    const rawNo = String(patient.patient_code ?? patient.patient_no ?? patient.patientNo ?? id);
    const loginCode = rawNo.replace(/\D/g, "").slice(-6).padStart(6, "0");
    const incomingArchived = patient.record_status === "已归档" || patient.archive_status === "archived";
    const existing = await prisma.patient.findUnique({ where: { id }, select: { status: true, archivedAt: true, archivedBy: true, archiveReason: true } });
    const status = existing?.status === "archived" || incomingArchived ? "archived" : "active";
    await prisma.patient.upsert({
      where: { id },
      update: { patientNo: rawNo, loginCode, name: String(patient.name ?? "待核对患者"), gender: String(patient.gender ?? "") || null, riskLevel: String(patient.risk_level ?? "中危"), rehabStage: String(patient.rehab_stage ?? "冠心病2期"), assignedDoctor: String(patient.assigned_doctor ?? "") || null, status, archivedAt: existing?.archivedAt ?? (incomingArchived ? dateOrNow(patient.archived_at) : null), archivedBy: existing?.archivedBy ?? (String(patient.archived_by ?? "") || null), archiveReason: existing?.archiveReason ?? (String(patient.archive_reason ?? "") || null), profile: asJson(patient) },
      create: { id, patientNo: rawNo, loginCode, name: String(patient.name ?? "待核对患者"), gender: String(patient.gender ?? "") || null, riskLevel: String(patient.risk_level ?? "中危"), rehabStage: String(patient.rehab_stage ?? "冠心病2期"), assignedDoctor: String(patient.assigned_doctor ?? "") || null, status, archivedAt: incomingArchived ? dateOrNow(patient.archived_at) : null, archivedBy: String(patient.archived_by ?? "") || null, archiveReason: String(patient.archive_reason ?? "") || null, profile: asJson(patient) }
    });
  }
}

async function syncPrescriptions(prisma: DbClient, taskValue: unknown, contentValue: unknown) {
  const contents = asObject(contentValue);
  for (const task of asArray(taskValue)) {
    const id = String(task.id ?? "");
    const patientId = String(task.patientId ?? "");
    const patient = id && patientId ? await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, status: true } }) : null;
    if (!id || !patientId || !patient) continue;
    const status = patient.status === "archived" ? "archived" : String(task.status ?? "pending_generation");
    const payload = { ...task, content: contents[id] };
    await prisma.prescription.upsert({
      where: { id },
      update: { status, assignedDoctor: String(task.assignedDoctorName ?? "") || null, signedBy: String(task.signedBy ?? "") || null, signedAt: task.signedAt ? dateOrNow(task.signedAt) : null, payload: asJson(payload) },
      create: { id, prescriptionNo: String(task.prescriptionNo ?? id), patientId, version: String(task.version ?? "V1"), status, assignedDoctor: String(task.assignedDoctorName ?? "") || null, signedBy: String(task.signedBy ?? "") || null, signedAt: task.signedAt ? dateOrNow(task.signedAt) : null, payload: asJson(payload) }
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

async function syncAppointments(prisma: DbClient, value: unknown) {
  for (const appointment of asArray(value)) {
    const id = String(appointment.id ?? "");
    const patientId = String(appointment.patientId ?? "");
    const patient = id && patientId ? await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, status: true } }) : null;
    if (!id || !patientId || !patient) continue;
    const prescriptionId = String(appointment.prescriptionTaskId ?? "") || null;
    const prescription = prescriptionId ? await prisma.prescription.findUnique({ where: { id: prescriptionId }, select: { id: true, patientId: true, status: true, signedAt: true } }) : null;
    const validPrescriptionId = prescription && prescription.patientId === patientId ? prescription.id : null;
    const requestedStatus = String(appointment.status ?? "pending");
    const mayProceed = patient.status === "active" && prescription?.status === "completed" && Boolean(prescription.signedAt);
    const status = ["completed", "cancelled", "no_show"].includes(requestedStatus) ? requestedStatus : mayProceed ? requestedStatus : "cancelled";
    const cancelledReason = status === "cancelled" && requestedStatus !== "cancelled" ? (patient.status === "archived" ? "患者档案已归档" : "患者或处方状态无效") : String(appointment.cancellationReason ?? "") || null;
    const scheduledAt = dateOrNow(`${appointment.date ?? ""}T${appointment.time ?? "09:00"}:00+08:00`);
    await prisma.appointment.upsert({
      where: { id },
      update: { prescriptionId: validPrescriptionId, scheduledAt, status, cancelledReason, station: String(appointment.station ?? "") || null, project: String(appointment.project ?? "") || null, doctorName: String(appointment.doctorName ?? "") || null, therapistName: String(appointment.therapistName ?? "") || null, note: String(appointment.note ?? "") || null, payload: asJson(status === requestedStatus ? appointment : { ...appointment, status, cancellationReason: cancelledReason }) },
      create: { id, patientId, prescriptionId: validPrescriptionId, scheduledAt, status, cancelledReason, station: String(appointment.station ?? "") || null, project: String(appointment.project ?? "") || null, doctorName: String(appointment.doctorName ?? "") || null, therapistName: String(appointment.therapistName ?? "") || null, note: String(appointment.note ?? "") || null, payload: asJson(status === requestedStatus ? appointment : { ...appointment, status, cancellationReason: cancelledReason }) }
    });
  }
}

async function syncEncounters(prisma: DbClient, value: unknown) {
  for (const encounter of asArray(value)) {
    const id = String(encounter.encounterId ?? encounter.id ?? "");
    const appointmentId = String(encounter.appointmentId ?? "");
    const patientId = String(encounter.patientId ?? "");
    if (!id || !appointmentId || !patientId) continue;
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, patientId: true, prescriptionId: true, status: true } });
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { status: true } });
    if (!appointment || !patient || appointment.patientId !== patientId) continue;
    const prescriptionId = String(encounter.prescriptionTaskId ?? "") || null;
    const prescription = prescriptionId ? await prisma.prescription.findUnique({ where: { id: prescriptionId }, select: { id: true, patientId: true, status: true, signedAt: true } }) : null;
    const validPrescriptionId = prescription?.patientId === patientId ? prescription.id : null;
    const requestedStatus = String(encounter.status ?? "scheduled");
    const terminal = ["completed", "cancelled", "no_show", "terminated"].includes(requestedStatus);
    const validActiveEncounter = patient.status === "active" && prescription?.status === "completed" && Boolean(prescription.signedAt) && !["cancelled", "no_show"].includes(appointment.status);
    const status = terminal || validActiveEncounter ? requestedStatus : "cancelled";
    const payload = status === requestedStatus ? encounter : { ...encounter, status, cancellationReason: patient.status === "archived" ? "患者档案已归档" : "患者、预约或处方状态无效" };
    await prisma.trainingEncounter.upsert({
      where: { id },
      update: { prescriptionId: validPrescriptionId, status, activeTaskId: String(encounter.activeTrainingTaskId ?? "") || null, station: String(encounter.station ?? "") || null, therapist: String(encounter.therapist ?? "") || null, startedAt: encounter.trainingStartedAt ? dateOrNow(encounter.trainingStartedAt) : null, endedAt: encounter.trainingEndedAt ? dateOrNow(encounter.trainingEndedAt) : null, postAssessedAt: encounter.postAssessmentCompletedAt ? dateOrNow(encounter.postAssessmentCompletedAt) : null, signedAt: encounter.signedAt ? dateOrNow(encounter.signedAt) : null, payload: asJson(payload) },
      create: { id, appointmentId, patientId, prescriptionId: validPrescriptionId, status, activeTaskId: String(encounter.activeTrainingTaskId ?? "") || null, station: String(encounter.station ?? "") || null, therapist: String(encounter.therapist ?? "") || null, startedAt: encounter.trainingStartedAt ? dateOrNow(encounter.trainingStartedAt) : null, endedAt: encounter.trainingEndedAt ? dateOrNow(encounter.trainingEndedAt) : null, postAssessedAt: encounter.postAssessmentCompletedAt ? dateOrNow(encounter.postAssessmentCompletedAt) : null, signedAt: encounter.signedAt ? dateOrNow(encounter.signedAt) : null, payload: asJson(payload) }
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

async function syncAssessments(prisma: DbClient, value: unknown) {
  for (const record of asArray(value)) {
    const id = String(record.assessmentId ?? record.id ?? "");
    const patientId = String(record.patientId ?? "");
    if (!id || !patientId || !await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })) continue;
    await prisma.assessment.upsert({ where: { id }, update: { status: String(record.status ?? "draft"), assessedAt: dateOrNow(record.assessedAt), assessor: String(record.therapist ?? record.enteredBy ?? "") || null, payload: asJson(record) }, create: { id, patientId, type: "SPPB", status: String(record.status ?? "draft"), assessedAt: dateOrNow(record.assessedAt), assessor: String(record.therapist ?? record.enteredBy ?? "") || null, payload: asJson(record) } });
  }
}

async function syncAlerts(prisma: DbClient, value: unknown) {
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

async function syncTreatments(prisma: DbClient, value: unknown) {
  for (const record of asArray(value)) {
    const id = String(record.treatmentId ?? record.id ?? "");
    const encounterId = String(record.encounterId ?? "");
    if (!id || !encounterId || !await prisma.trainingEncounter.findUnique({ where: { id: encounterId }, select: { id: true } })) continue;
    const phase = record.status === "completed" ? "post" : "pre";
    await prisma.treatmentAssessment.upsert({ where: { encounterId_phase: { encounterId, phase } }, update: { status: String(record.status ?? "draft"), operator: String(record.therapist ?? record.enteredBy ?? "") || null, signedAt: record.signature?.signedAt ? dateOrNow(record.signature.signedAt) : null, payload: asJson(record) }, create: { id, encounterId, phase, status: String(record.status ?? "draft"), operator: String(record.therapist ?? record.enteredBy ?? "") || null, signedAt: record.signature?.signedAt ? dateOrNow(record.signature.signedAt) : null, payload: asJson(record) } });
  }
}

async function syncSingleReports(prisma: DbClient, value: unknown) {
  for (const record of asArray(value)) {
    const id = String(record.singleReportId ?? record.id ?? "");
    const encounterId = String(record.encounterId ?? "");
    if (!id || !encounterId || !await prisma.trainingEncounter.findUnique({ where: { id: encounterId }, select: { id: true } })) continue;
    await prisma.singleReport.upsert({ where: { id }, update: { status: String(record.reportStage ?? "instant"), generatedAt: dateOrNow(record.generatedAt ?? record.actualStartAt), payload: asJson(record) }, create: { id, encounterId, patientId: String(record.patientId ?? ""), status: String(record.reportStage ?? "instant"), generatedAt: dateOrNow(record.generatedAt ?? record.actualStartAt), payload: asJson(record) } });
  }
}

async function syncStageReports(prisma: DbClient, value: unknown) {
  for (const record of asArray(value)) {
    const id = String(record.reportId ?? record.id ?? "");
    const patientId = String(record.patientId ?? "");
    if (!id || !patientId || !await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })) continue;
    const prescriptionId = String(record.prescriptionTaskId ?? "") || null;
    const validPrescriptionId = prescriptionId && await prisma.prescription.findUnique({ where: { id: prescriptionId }, select: { id: true } }) ? prescriptionId : null;
    await prisma.stageReport.upsert({ where: { id }, update: { prescriptionId: validPrescriptionId, version: Number(record.version ?? 1), status: String(record.status ?? "draft"), generatedAt: dateOrNow(record.generatedAt), payload: asJson(record) }, create: { id, patientId, prescriptionId: validPrescriptionId, version: Number(record.version ?? 1), status: String(record.status ?? "draft"), generatedAt: dateOrNow(record.generatedAt), payload: asJson(record) } });
  }
}

async function syncFollowUps(prisma: DbClient, value: unknown) {
  for (const record of asArray(value)) {
    const id = String(record.id ?? "");
    const patientId = String(record.patientId ?? "");
    if (!id || !patientId || !await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })) continue;
    await prisma.followUp.upsert({ where: { id }, update: { dueAt: dateOrNow(record.currentDueDate ?? record.dueDate), status: String(record.status ?? "due"), assignee: String(record.assignedDoctor ?? "") || null, completedAt: record.completedAt ? dateOrNow(record.completedAt) : null, payload: asJson(record) }, create: { id, patientId, dueAt: dateOrNow(record.currentDueDate ?? record.dueDate), status: String(record.status ?? "due"), assignee: String(record.assignedDoctor ?? "") || null, completedAt: record.completedAt ? dateOrNow(record.completedAt) : null, payload: asJson(record) } });
  }
}
