import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { Prisma, PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import { existsSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
import { clinicalStateKeySet, readStateDocuments, writeStateDocument, type ClinicalStateKey } from "./stateRepository.js";

const asJson = (value: unknown) => value as Prisma.InputJsonValue;
const asObject = (value: unknown) => value && typeof value === "object" ? value as Record<string, any> : {};
const normalizeLoginCode = (value: unknown) => String(value ?? "").replace(/\D/g, "").slice(-6).padStart(6, "0");
const safeDate = (value: unknown) => {
  const date = typeof value === "string" && value ? new Date(value.includes("T") ? value : value.replace(" ", "T") + "+08:00") : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export type AppContext = ReturnType<typeof createApp>;

export function createApp(prisma = new PrismaClient()) {
  const app = Fastify({ logger: true, bodyLimit: 5_000_000 });
  const io = new SocketIOServer(app.server, {
    cors: { origin: true, credentials: false },
    transports: ["websocket", "polling"]
  });

  app.register(cors, { origin: true });

  app.get("/api/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", database: "postgresql", realtime: "socket.io", time: new Date().toISOString() };
  });

  app.get("/api/bootstrap", async () => ({ documents: await readStateDocuments(prisma), serverTime: new Date().toISOString() }));

  app.put("/api/state/:key", async (request, reply) => {
    const key = String((request.params as { key: string }).key);
    if (!clinicalStateKeySet.has(key)) return reply.code(400).send({ message: "Unsupported clinical state key" });
    const body = z.object({ value: z.unknown() }).parse(request.body);
    const document = await writeStateDocument(prisma, key as ClinicalStateKey, body.value);
    io.emit("state:updated", document);
    return document;
  });

  app.get("/api/device-handoffs", async () => {
    const sessions = await prisma.deviceSession.findMany({ orderBy: { updatedAt: "desc" } });
    return sessions.map((session) => session.handoff);
  });

  app.post("/api/device-handoffs", async (request, reply) => {
    const handoff = asObject(request.body);
    const loginCode = normalizeLoginCode(handoff.loginCode);
    if (!/^\d{6}$/.test(loginCode) || !handoff.patient || !handoff.encounter || !handoff.prescriptionTask) {
      return reply.code(400).send({ message: "Invalid device handoff" });
    }
    const saved = await saveDeviceHandoff(prisma, { ...handoff, loginCode, updatedAt: new Date().toISOString() });
    io.to(`handoff:${loginCode}`).emit("handoff:updated", saved);
    io.emit("handoff:list-updated", { loginCode, updatedAt: saved.updatedAt });
    return saved;
  });

  app.get("/api/device-handoffs/:loginCode", async (request, reply) => {
    const loginCode = normalizeLoginCode((request.params as { loginCode: string }).loginCode);
    const session = await prisma.deviceSession.findUnique({ where: { loginCode } });
    if (!session) return reply.code(404).send({ message: "Device handoff not found" });
    return session.handoff;
  });

  app.patch("/api/device-handoffs/:loginCode", async (request, reply) => {
    const loginCode = normalizeLoginCode((request.params as { loginCode: string }).loginCode);
    const current = await prisma.deviceSession.findUnique({ where: { loginCode } });
    if (!current) return reply.code(404).send({ message: "Device handoff not found" });
    const patch = asObject(asObject(request.body).encounter);
    const handoff = asObject(current.handoff);
    const encounter: Record<string, any> = { ...asObject(handoff.encounter), ...patch, updatedAt: new Date().toISOString() };
    const saved = await saveDeviceHandoff(prisma, { ...handoff, loginCode, encounter, updatedAt: new Date().toISOString() });
    io.to(`handoff:${loginCode}`).emit("handoff:updated", saved);
    io.emit("encounter:updated", { encounterId: encounter.encounterId, loginCode, encounter });
    return saved;
  });

  app.get("/api/encounters/:encounterId", async (request, reply) => {
    const encounterId = String((request.params as { encounterId: string }).encounterId);
    const encounter = await prisma.trainingEncounter.findUnique({
      where: { id: encounterId },
      include: { tasks: { orderBy: { order: "asc" } }, metricSamples: { orderBy: { capturedAt: "desc" }, take: 1 }, alerts: { orderBy: { occurredAt: "desc" }, take: 10 } }
    });
    if (!encounter) return reply.code(404).send({ message: "Encounter not found" });
    return encounter;
  });

  app.get("/api/training-videos", async () => {
    const directory = process.env.TRAINING_VIDEO_DIR || resolve(process.cwd(), "training-videos");
    if (!existsSync(directory)) return [];
    const supported = new Set([".mp4", ".mov", ".webm", ".m4v"]);
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && supported.has(extname(entry.name).toLowerCase()))
      .map((entry) => ({ id: entry.name, title: entry.name.replace(/\.[^.]+$/, ""), url: `/training-videos/${encodeURIComponent(entry.name)}` }));
  });

  const distDirectory = resolve(process.cwd(), "dist");
  if (existsSync(distDirectory)) {
    app.register(fastifyStatic, { root: distDirectory, prefix: "/" });
  }
  const videoDirectory = process.env.TRAINING_VIDEO_DIR || resolve(process.cwd(), "training-videos");
  if (existsSync(videoDirectory)) {
    app.register(fastifyStatic, { root: videoDirectory, prefix: "/training-videos/", decorateReply: false });
  }

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/") || request.url.startsWith("/socket.io/")) return reply.code(404).send({ message: "Not found" });
    if (existsSync(join(distDirectory, "index.html"))) return reply.type("text/html").sendFile("index.html");
    return reply.code(404).send({ message: "Frontend build not found" });
  });

  io.on("connection", (socket) => {
    socket.on("handoff:join", (rawCode: unknown) => socket.join(`handoff:${normalizeLoginCode(rawCode)}`));
    socket.on("handoff:leave", (rawCode: unknown) => socket.leave(`handoff:${normalizeLoginCode(rawCode)}`));
  });

  app.addHook("onClose", async () => {
    io.close();
    await prisma.$disconnect();
  });

  return { app, io, prisma };
}

async function saveDeviceHandoff(prisma: PrismaClient, handoff: Record<string, any>) {
  const loginCode = normalizeLoginCode(handoff.loginCode);
  const patient = asObject(handoff.patient);
  const encounter = asObject(handoff.encounter);
  const prescription = asObject(handoff.prescriptionTask);
  const patientId = String(patient.patient_demo_id ?? encounter.patientId ?? `P-${loginCode}`);
  const patientNo = String(patient.patient_code ?? encounter.patientNo ?? `P-${loginCode}`);
  const prescriptionId = String(prescription.id ?? encounter.prescriptionTaskId ?? `RX-${loginCode}`);
  const appointmentId = String(encounter.appointmentId ?? `APT-${loginCode}`);
  const encounterId = String(encounter.encounterId ?? `ENC-${appointmentId}`);

  await prisma.patient.upsert({
    where: { id: patientId },
    update: { patientNo, loginCode, name: String(patient.name ?? encounter.patientName ?? "待核对患者"), riskLevel: String(patient.risk_level ?? prescription.risk ?? "中危"), rehabStage: String(patient.rehab_stage ?? prescription.rehabStage ?? "冠心病2期"), assignedDoctor: String(patient.assigned_doctor ?? prescription.assignedDoctorName ?? "") || null, profile: asJson(patient) },
    create: { id: patientId, patientNo, loginCode, name: String(patient.name ?? encounter.patientName ?? "待核对患者"), gender: String(patient.gender ?? "") || null, riskLevel: String(patient.risk_level ?? prescription.risk ?? "中危"), rehabStage: String(patient.rehab_stage ?? prescription.rehabStage ?? "冠心病2期"), assignedDoctor: String(patient.assigned_doctor ?? prescription.assignedDoctorName ?? "") || null, profile: asJson(patient) }
  });

  await prisma.prescription.upsert({
    where: { id: prescriptionId },
    update: { status: String(prescription.status ?? "completed"), assignedDoctor: String(prescription.assignedDoctorName ?? "") || null, signedBy: String(prescription.signedBy ?? "") || null, signedAt: prescription.signedAt ? safeDate(prescription.signedAt) : null, payload: asJson({ ...prescription, content: handoff.prescriptionContent }) },
    create: { id: prescriptionId, prescriptionNo: String(prescription.prescriptionNo ?? prescriptionId), patientId, version: String(prescription.version ?? encounter.prescriptionVersion ?? "V1"), status: String(prescription.status ?? "completed"), assignedDoctor: String(prescription.assignedDoctorName ?? "") || null, signedBy: String(prescription.signedBy ?? "") || null, signedAt: prescription.signedAt ? safeDate(prescription.signedAt) : null, payload: asJson({ ...prescription, content: handoff.prescriptionContent }) }
  });

  await prisma.appointment.upsert({
    where: { id: appointmentId },
    update: { prescriptionId, status: encounter.status === "completed" ? "completed" : "arrived", station: String(encounter.station ?? "") || null, project: String(encounter.project ?? "综合运动康复"), therapistName: String(encounter.therapist ?? "") || null, payload: asJson({ appointmentId, encounterId }) },
    create: { id: appointmentId, patientId, prescriptionId, scheduledAt: safeDate(encounter.checkedInAt), status: encounter.status === "completed" ? "completed" : "arrived", station: String(encounter.station ?? "") || null, project: String(encounter.project ?? "综合运动康复"), therapistName: String(encounter.therapist ?? "") || null, payload: asJson({ appointmentId, encounterId }) }
  });

  await prisma.trainingEncounter.upsert({
    where: { id: encounterId },
    update: { status: String(encounter.status ?? "ready_for_device"), activeTaskId: String(encounter.activeTrainingTaskId ?? "") || null, station: String(encounter.station ?? "") || null, therapist: String(encounter.therapist ?? "") || null, startedAt: encounter.trainingStartedAt ? safeDate(encounter.trainingStartedAt) : null, endedAt: encounter.trainingEndedAt ? safeDate(encounter.trainingEndedAt) : null, postAssessedAt: encounter.postAssessmentCompletedAt ? safeDate(encounter.postAssessmentCompletedAt) : null, signedAt: encounter.signedAt ? safeDate(encounter.signedAt) : null, payload: asJson(encounter) },
    create: { id: encounterId, appointmentId, patientId, prescriptionId, status: String(encounter.status ?? "ready_for_device"), activeTaskId: String(encounter.activeTrainingTaskId ?? "") || null, station: String(encounter.station ?? "") || null, therapist: String(encounter.therapist ?? "") || null, startedAt: encounter.trainingStartedAt ? safeDate(encounter.trainingStartedAt) : null, endedAt: encounter.trainingEndedAt ? safeDate(encounter.trainingEndedAt) : null, postAssessedAt: encounter.postAssessmentCompletedAt ? safeDate(encounter.postAssessmentCompletedAt) : null, signedAt: encounter.signedAt ? safeDate(encounter.signedAt) : null, payload: asJson(encounter) }
  });

  const tasks = Array.isArray(encounter.dailyTrainingTasks) ? encounter.dailyTrainingTasks : [];
  for (const [index, rawTask] of tasks.entries()) {
    const task = asObject(rawTask);
    const taskId = String(task.taskId ?? `${encounterId}-TASK-${index + 1}`);
    await prisma.trainingTask.upsert({
      where: { id: taskId },
      update: { status: String(task.status ?? "pending"), startedAt: task.startedAt ? safeDate(task.startedAt) : null, completedAt: task.completedAt ? safeDate(task.completedAt) : null, payload: asJson(task) },
      create: { id: taskId, encounterId, order: Number(task.order ?? index + 1), category: String(task.category ?? "其他"), exerciseKey: String(task.exerciseKey ?? "item"), exerciseName: String(task.exerciseName ?? "未命名项目"), status: String(task.status ?? "pending"), startedAt: task.startedAt ? safeDate(task.startedAt) : null, completedAt: task.completedAt ? safeDate(task.completedAt) : null, payload: asJson(task) }
    });
  }

  const metrics = asObject(encounter.liveMetrics);
  if (Object.keys(metrics).length && encounter.activeTrainingTaskId) {
    const capturedAt = safeDate(metrics.sampledAt);
    const latestMetric = await prisma.metricSample.findFirst({ where: { encounterId }, orderBy: { capturedAt: "desc" }, select: { capturedAt: true } });
    const terminalSample = ["awaiting_next_task", "post_assessment", "completed", "terminated"].includes(String(encounter.status));
    if (!latestMetric || capturedAt.getTime() - latestMetric.capturedAt.getTime() >= 5_000 || terminalSample) {
      const bloodPressure = String(metrics.bloodPressure ?? "").match(/(\d{2,3})\D+(\d{2,3})/);
      await prisma.metricSample.create({
        data: {
          encounterId,
          taskId: await prisma.trainingTask.findUnique({ where: { id: String(encounter.activeTrainingTaskId) }, select: { id: true } }) ? String(encounter.activeTrainingTaskId) : null,
          capturedAt,
          heartRate: Number.isFinite(Number(metrics.heartRate)) ? Number(metrics.heartRate) : null,
          spo2: Number.isFinite(Number(metrics.spo2)) ? Number(metrics.spo2) : null,
          systolic: bloodPressure ? Number(bloodPressure[1]) : null,
          diastolic: bloodPressure ? Number(bloodPressure[2]) : null,
          speedKmh: Number.isFinite(Number(metrics.speedKmh)) ? Number(metrics.speedKmh) : null,
          distanceKm: Number.isFinite(Number(metrics.distanceKm)) ? Number(metrics.distanceKm) : null,
          powerW: Number.isFinite(Number(metrics.powerW)) ? Number(metrics.powerW) : null,
          cadenceRpm: Number.isFinite(Number(metrics.cadenceRpm)) ? Number(metrics.cadenceRpm) : null,
          caloriesKcal: Number.isFinite(Number(metrics.caloriesKcal)) ? Number(metrics.caloriesKcal) : null,
          values: asJson(metrics)
        }
      });
    }
  }

  const liveAlert = asObject(encounter.liveAlert);
  if (Object.keys(liveAlert).length) {
    const alertType = String(liveAlert.type ?? "training_alert");
    const alertId = String(liveAlert.id ?? `ALERT-${encounterId}-${alertType.replace(/[^a-zA-Z0-9_-]+/g, "-")}`);
    const alertStatus = liveAlert.active === false || liveAlert.status === "closed" ? "closed" : String(liveAlert.status ?? "active");
    const operator = String(encounter.controlledBy ?? encounter.therapist ?? "system");
    await prisma.alertEvent.upsert({
      where: { id: alertId },
      update: {
        encounterId,
        severity: String(liveAlert.severity ?? "warning"),
        status: alertStatus,
        occurredAt: safeDate(liveAlert.detectedAt ?? liveAlert.updatedAt),
        payload: asJson(liveAlert)
      },
      create: {
        id: alertId,
        patientId,
        encounterId,
        severity: String(liveAlert.severity ?? "warning"),
        status: alertStatus,
        occurredAt: safeDate(liveAlert.detectedAt ?? liveAlert.updatedAt),
        payload: asJson(liveAlert)
      }
    });

    const interventionAction = encounter.status === "paused"
      ? "PAUSE_TRAINING"
      : alertStatus === "closed"
        ? "CLOSE_ALERT"
        : "";
    if (interventionAction) {
      const existingIntervention = await prisma.intervention.findFirst({ where: { alertId, action: interventionAction } });
      if (!existingIntervention) {
        await prisma.intervention.create({
          data: {
            alertId,
            operator,
            action: interventionAction,
            payload: asJson({ status: encounter.status, pauseOrigin: encounter.pauseOrigin, recordedAt: new Date().toISOString() })
          }
        });
      }
    }
  }

  const savedHandoff = { ...handoff, loginCode, encounter: { ...encounter, encounterId }, updatedAt: new Date().toISOString() };
  const session = await prisma.deviceSession.upsert({
    where: { loginCode },
    update: { encounterId, handoff: asJson(savedHandoff), lastSeenAt: new Date(), connectedAt: encounter.deviceLoggedInAt ? safeDate(encounter.deviceLoggedInAt) : null },
    create: { encounterId, loginCode, handoff: asJson(savedHandoff), connectedAt: encounter.deviceLoggedInAt ? safeDate(encounter.deviceLoggedInAt) : null }
  });
  await prisma.auditLog.create({ data: { entityType: "TrainingEncounter", entityId: encounterId, action: "DEVICE_HANDOFF_UPSERT", actor: String(encounter.therapist ?? "system"), source: "api", after: asJson(savedHandoff) } });
  return { ...savedHandoff, updatedAt: session.updatedAt.toISOString() };
}
