import { Prisma, PrismaClient } from "@prisma/client";

const asJson = (value: unknown) => value as Prisma.InputJsonValue;
const asObject = (value: unknown) => value && typeof value === "object" ? value as Record<string, any> : {};
const asArray = (value: unknown) => Array.isArray(value) ? value as Record<string, any>[] : [];

type Operator = { actor: string; role: string; reason: string; source?: string };

export async function validateAppointment(prisma: PrismaClient, patientId: string, prescriptionId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, status: true, name: true } });
  if (!patient) return { valid: false as const, statusCode: 404, message: "患者档案不存在" };
  if (patient.status !== "active") return { valid: false as const, statusCode: 410, message: "患者档案已归档，不能预约" };
  const prescription = await prisma.prescription.findUnique({ where: { id: prescriptionId }, select: { patientId: true, status: true, signedAt: true } });
  if (!prescription) return { valid: false as const, statusCode: 404, message: "处方不存在" };
  if (prescription.patientId !== patientId) return { valid: false as const, statusCode: 409, message: "处方不属于当前患者" };
  if (prescription.status !== "completed" || !prescription.signedAt) return { valid: false as const, statusCode: 409, message: "处方未签署或已失效" };
  return { valid: true as const, patient };
}

export async function archivePatient(prisma: PrismaClient, patientId: string, operator: Operator) {
  if (operator.role !== "ADMIN") return { ok: false as const, statusCode: 403, message: "仅管理员可以归档患者档案" };
  if (!operator.reason.trim()) return { ok: false as const, statusCode: 400, message: "请填写归档原因" };

  const blockedStatuses = ["pre_assessment", "ready_for_device", "device_ready", "in_training", "paused", "awaiting_next_task", "post_assessment", "pending_signature"];
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return { ok: false as const, statusCode: 404, message: "患者档案不存在" };
  if (patient.status === "archived") return { ok: false as const, statusCode: 409, message: "患者档案已经归档" };
  const blockingEncounter = await prisma.trainingEncounter.findFirst({ where: { patientId, status: { in: blockedStatuses } }, select: { id: true, status: true } });
  if (blockingEncounter) return { ok: false as const, statusCode: 409, message: `患者存在未结束场次 ${blockingEncounter.id}（${blockingEncounter.status}），请先结束或取消当前场次` };
  const blockingAppointment = await prisma.appointment.findFirst({ where: { patientId, status: { in: ["arrived", "in_training"] } }, select: { id: true, status: true } });
  if (blockingAppointment) return { ok: false as const, statusCode: 409, message: `患者存在未结束到诊记录 ${blockingAppointment.id}（${blockingAppointment.status}），请先结束或取消` };

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const activePrescriptionCount = await tx.prescription.count({ where: { patientId, status: { in: ["completed", "review", "signature", "pending_generation"] } } });
    const futureAppointmentCount = await tx.appointment.count({ where: { patientId, status: { in: ["pending", "rescheduled", "scheduled"] } } });
    const followUpCount = await tx.followUp.count({ where: { patientId, status: { notIn: ["completed", "closed", "cancelled"] } } });
    const deviceSessionCount = await tx.deviceSession.count({ where: { encounter: { patientId }, status: "active" } });

    await tx.patient.update({ where: { id: patientId }, data: { status: "archived", archivedAt: now, archivedBy: operator.actor, archiveReason: operator.reason } });
    await tx.prescription.updateMany({ where: { patientId, status: { in: ["completed", "review", "signature", "pending_generation"] } }, data: { status: "archived" } });
    await tx.appointment.updateMany({ where: { patientId, status: { in: ["pending", "rescheduled", "scheduled"] } }, data: { status: "cancelled", cancelledReason: "患者档案已归档" } });
    const openFollowUps = await tx.followUp.findMany({ where: { patientId, status: { notIn: ["completed", "closed", "cancelled"] } } });
    for (const followUp of openFollowUps) {
      await tx.followUp.update({ where: { id: followUp.id }, data: { status: "closed", payload: asJson({ ...asObject(followUp.payload), closedReason: "患者档案已归档", closedAt: now.toISOString(), closedBy: operator.actor }) } });
    }
    await tx.deviceSession.updateMany({ where: { encounter: { patientId }, status: "active" }, data: { status: "revoked", revokedAt: now, revokedBy: operator.actor, revokeReason: "患者档案已归档" } });

    const documents = await updateArchiveProjections(tx, patientId, {
      archivedAt: now.toISOString(), archivedBy: operator.actor, archiveReason: operator.reason
    });
    const impact = { prescriptions: activePrescriptionCount, appointments: futureAppointmentCount, followUps: followUpCount, deviceSessions: deviceSessionCount };
    await tx.auditLog.create({ data: { entityType: "Patient", entityId: patientId, action: "ARCHIVE", actor: operator.actor, source: operator.source ?? "api", before: asJson({ status: patient.status }), after: asJson({ status: "archived", reason: operator.reason, impact }) } });
    return { documents, impact };
  });
  return { ok: true as const, patientId, ...result };
}

export async function restorePatient(prisma: PrismaClient, patientId: string, operator: Operator) {
  if (operator.role !== "ADMIN") return { ok: false as const, statusCode: 403, message: "仅管理员可以恢复患者档案" };
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return { ok: false as const, statusCode: 404, message: "患者档案不存在" };
  if (patient.status !== "archived") return { ok: false as const, statusCode: 409, message: "患者档案当前不是归档状态" };

  const result = await prisma.$transaction(async (tx) => {
    await tx.patient.update({ where: { id: patientId }, data: { status: "active", archivedAt: null, archivedBy: null, archiveReason: null } });
    const documents = await updateRestoreProjection(tx, patientId, operator.actor);
    await tx.auditLog.create({ data: { entityType: "Patient", entityId: patientId, action: "RESTORE", actor: operator.actor, source: operator.source ?? "api", before: asJson({ status: "archived", reason: patient.archiveReason }), after: asJson({ status: "active", oldPrescriptionsRestored: false, oldAppointmentsRestored: false, oldSessionsRestored: false }) } });
    return { documents };
  });
  return { ok: true as const, patientId, ...result };
}

type Tx = Prisma.TransactionClient;
async function updateDocument(tx: Tx, key: string, mapper: (records: Record<string, any>[]) => Record<string, any>[]) {
  const current = await tx.stateDocument.findUnique({ where: { key } });
  if (!current) return null;
  const value = mapper(asArray(current.value));
  const updated = await tx.stateDocument.update({ where: { key }, data: { value: asJson(value), version: { increment: 1 } } });
  return { key, value: updated.value, version: updated.version, updatedAt: updated.updatedAt.toISOString() };
}

async function updateArchiveProjections(tx: Tx, patientId: string, archive: { archivedAt: string; archivedBy: string; archiveReason: string }) {
  const documents = await Promise.all([
    updateDocument(tx, "xinkang-patients", (records) => records.map((record) => String(record.patient_demo_id ?? record.id) === patientId ? { ...record, record_status: "已归档", archive_status: "archived", archived_at: archive.archivedAt, archived_by: archive.archivedBy, archive_reason: archive.archiveReason } : record)),
    updateDocument(tx, "xinkang-prescription-tasks", (records) => records.map((record) => record.patientId === patientId && !["withdrawn", "archived"].includes(String(record.status)) ? { ...record, status: "archived", invalidatedReason: "患者档案已归档", invalidatedAt: archive.archivedAt } : record)),
    updateDocument(tx, "xinkang-appointments", (records) => records.map((record) => record.patientId === patientId ? (["pending", "rescheduled", "scheduled"].includes(String(record.status)) ? { ...record, status: "cancelled", cancellationReason: "患者档案已归档", patientArchived: true } : { ...record, patientArchived: true }) : record)),
    updateDocument(tx, "xinkang-followup-tasks", (records) => records.map((record) => record.patientId === patientId && !["completed", "closed", "cancelled"].includes(String(record.status)) ? { ...record, status: "closed", closedReason: "患者档案已归档", patientArchived: true } : record)),
    updateDocument(tx, "xinkang-training-encounters", (records) => records.map((record) => record.patientId === patientId ? { ...record, patientArchived: true } : record))
  ]);
  return documents.filter(Boolean);
}

async function updateRestoreProjection(tx: Tx, patientId: string, actor: string) {
  const documents = await Promise.all([
    updateDocument(tx, "xinkang-patients", (records) => records.map((record) => String(record.patient_demo_id ?? record.id) === patientId ? { ...record, record_status: "有效", archive_status: "active", archived_at: "", archived_by: "", archive_reason: "", restored_by: actor, restored_at: new Date().toISOString() } : record)),
    updateDocument(tx, "xinkang-appointments", (records) => records.map((record) => record.patientId === patientId ? { ...record, patientArchived: false } : record)),
    updateDocument(tx, "xinkang-training-encounters", (records) => records.map((record) => record.patientId === patientId ? { ...record, patientArchived: false } : record))
  ]);
  return documents.filter(Boolean);
}
