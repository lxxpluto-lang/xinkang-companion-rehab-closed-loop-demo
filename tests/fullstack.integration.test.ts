import type { AddressInfo } from "node:net";
import { io as createSocket, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";

const TEST_PATIENT_ID = "P-INTEGRATION-001";
const TEST_PRESCRIPTION_ID = "RX-INTEGRATION-001";
const TEST_APPOINTMENT_ID = "APT-INTEGRATION-001";
const TEST_ENCOUNTER_ID = "ENC-INTEGRATION-001";
const TEST_LOGIN_CODE = "991001";
const ARCHIVE_PATIENT_ID = "P-INTEGRATION-ARCHIVE";
const ARCHIVE_PRESCRIPTION_ID = "RX-INTEGRATION-ARCHIVE";
const ARCHIVE_HISTORY_APPOINTMENT_ID = "APT-INTEGRATION-ARCHIVE-HISTORY";
const ARCHIVE_FUTURE_APPOINTMENT_ID = "APT-INTEGRATION-ARCHIVE-FUTURE";
const ARCHIVE_ENCOUNTER_ID = "ENC-INTEGRATION-ARCHIVE";
const ARCHIVE_LOGIN_CODE = "991099";

describe("full-stack rehabilitation workflow", () => {
  const context = createApp();
  let baseUrl = "";
  let socket: Socket | undefined;

  beforeAll(async () => {
    await context.app.listen({ host: "127.0.0.1", port: 0 });
    const address = context.app.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    socket?.close();
    await context.prisma.deviceSession.deleteMany({ where: { loginCode: TEST_LOGIN_CODE } });
    await context.prisma.metricSample.deleteMany({ where: { encounterId: TEST_ENCOUNTER_ID } });
    await context.prisma.auditLog.deleteMany({ where: { entityId: TEST_ENCOUNTER_ID } });
    await context.prisma.trainingTask.deleteMany({ where: { encounterId: TEST_ENCOUNTER_ID } });
    await context.prisma.trainingEncounter.deleteMany({ where: { id: TEST_ENCOUNTER_ID } });
    await context.prisma.appointment.deleteMany({ where: { id: TEST_APPOINTMENT_ID } });
    await context.prisma.prescriptionItem.deleteMany({ where: { prescriptionId: TEST_PRESCRIPTION_ID } });
    await context.prisma.prescription.deleteMany({ where: { id: TEST_PRESCRIPTION_ID } });
    await context.prisma.patient.deleteMany({ where: { id: TEST_PATIENT_ID } });
    await context.prisma.auditLog.deleteMany({ where: { entityId: { in: [ARCHIVE_PATIENT_ID, ARCHIVE_ENCOUNTER_ID] } } });
    await context.prisma.deviceSession.deleteMany({ where: { loginCode: ARCHIVE_LOGIN_CODE } });
    await context.prisma.followUp.deleteMany({ where: { patientId: ARCHIVE_PATIENT_ID } });
    await context.prisma.trainingEncounter.deleteMany({ where: { id: ARCHIVE_ENCOUNTER_ID } });
    await context.prisma.appointment.deleteMany({ where: { patientId: ARCHIVE_PATIENT_ID } });
    await context.prisma.prescription.deleteMany({ where: { id: ARCHIVE_PRESCRIPTION_ID } });
    await context.prisma.patient.deleteMany({ where: { id: ARCHIVE_PATIENT_ID } });
    await context.prisma.stateDocument.upsert({ where: { key: "xinkang-training-videos" }, update: { value: [] }, create: { key: "xinkang-training-videos", value: [] } });
    await context.app.close();
  });

  it("reports PostgreSQL and realtime health", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", database: "postgresql", realtime: "socket.io" });
  });

  it("persists a clinical state document", async () => {
    const payload = [{ id: "VIDEO-INTEGRATION", title: "测试视频", status: "PUBLISHED" }];
    const bootstrapBefore = await fetch(`${baseUrl}/api/bootstrap`).then((item) => item.json()) as any;
    const version = bootstrapBefore.documents["xinkang-training-videos"].version;
    const response = await fetch(`${baseUrl}/api/state/xinkang-training-videos`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: payload, expectedVersion: version })
    });
    expect(response.status).toBe(200);
    const bootstrap = await fetch(`${baseUrl}/api/bootstrap`).then((item) => item.json()) as any;
    expect(bootstrap.documents["xinkang-training-videos"].value).toEqual(payload);

    const staleResponse = await fetch(`${baseUrl}/api/state/xinkang-training-videos`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: [{ id: "STALE-BROWSER" }] })
    });
    expect(staleResponse.status).toBe(409);
    expect((await fetch(`${baseUrl}/api/bootstrap`).then((item) => item.json()) as any).documents["xinkang-training-videos"].value).toEqual(payload);
  });

  it("keeps task completion isolated and broadcasts live metrics", async () => {
    await context.prisma.patient.create({ data: { id: TEST_PATIENT_ID, patientNo: `P-${TEST_LOGIN_CODE}`, loginCode: TEST_LOGIN_CODE, name: "联动测试患者", riskLevel: "中危", rehabStage: "冠心病2期", profile: {} } });
    await context.prisma.prescription.create({ data: { id: TEST_PRESCRIPTION_ID, prescriptionNo: "RX-INTEGRATION", patientId: TEST_PATIENT_ID, version: "V1", status: "completed", signedBy: "王医生", signedAt: new Date(), payload: {} } });
    const tasks = [
      { taskId: `${TEST_ENCOUNTER_ID}-TASK-1`, category: "呼吸训练", exerciseKey: "breathing", exerciseName: "腹式呼吸", order: 1, status: "pending" },
      { taskId: `${TEST_ENCOUNTER_ID}-TASK-2`, category: "有氧运动", exerciseKey: "bike", exerciseName: "功率车", order: 2, status: "pending" }
    ];
    const handoff = {
      loginCode: TEST_LOGIN_CODE,
      patient: { patient_demo_id: TEST_PATIENT_ID, patient_code: `P-${TEST_LOGIN_CODE}`, patient_no: TEST_LOGIN_CODE, name: "联动测试患者", risk_level: "中危", rehab_stage: "冠心病2期" },
      prescriptionTask: { id: TEST_PRESCRIPTION_ID, prescriptionNo: "RX-INTEGRATION", patientId: TEST_PATIENT_ID, version: "V1", status: "completed" },
      encounter: { encounterId: TEST_ENCOUNTER_ID, appointmentId: TEST_APPOINTMENT_ID, patientId: TEST_PATIENT_ID, patientNo: `P-${TEST_LOGIN_CODE}`, patientName: "联动测试患者", prescriptionTaskId: TEST_PRESCRIPTION_ID, prescriptionVersion: "V1", status: "ready_for_device", dailyTrainingTasks: tasks },
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    expect((await fetch(`${baseUrl}/api/device-handoffs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(handoff) })).status).toBe(200);

    socket = createSocket(baseUrl, { transports: ["websocket"] });
    await new Promise<void>((resolve) => socket?.once("connect", () => resolve()));
    socket.emit("handoff:join", TEST_LOGIN_CODE);
    const realtimeUpdate = new Promise<any>((resolve) => socket?.once("handoff:updated", resolve));

    const completedTasks = tasks.map((task) => task.exerciseKey === "bike" ? { ...task, status: "completed", completedAt: new Date().toISOString() } : task);
    const liveAlert = { type: "heart_rate_high", severity: "high", active: true, message: "心率异常", detectedAt: new Date().toISOString() };
    const response = await fetch(`${baseUrl}/api/device-handoffs/${TEST_LOGIN_CODE}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ encounter: { status: "awaiting_next_task", activeTrainingTaskId: `${TEST_ENCOUNTER_ID}-TASK-2`, dailyTrainingTasks: completedTasks, liveMetrics: { heartRate: 158, spo2: 94, speedKmh: 12.4, distanceKm: 0.8, powerW: 52, cadenceRpm: 61, caloriesKcal: 18, sampledAt: new Date().toISOString() }, liveAlert } })
    });
    expect(response.status).toBe(200);
    const update = await realtimeUpdate;
    expect(update.encounter.liveMetrics.heartRate).toBe(158);
    expect(update.encounter.dailyTrainingTasks.find((task: any) => task.exerciseKey === "bike").status).toBe("completed");
    expect(update.encounter.dailyTrainingTasks.find((task: any) => task.exerciseKey === "breathing").status).toBe("pending");

    const storedTasks = await context.prisma.trainingTask.findMany({ where: { encounterId: TEST_ENCOUNTER_ID }, orderBy: { order: "asc" } });
    expect(storedTasks.map((task) => task.status)).toEqual(["pending", "completed"]);
    expect(await context.prisma.metricSample.count({ where: { encounterId: TEST_ENCOUNTER_ID } })).toBe(1);
    expect(await context.prisma.alertEvent.count({ where: { encounterId: TEST_ENCOUNTER_ID, status: "active", severity: "high" } })).toBe(1);

    expect((await fetch(`${baseUrl}/api/device-handoffs/${TEST_LOGIN_CODE}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ encounter: { status: "paused", pauseOrigin: "doctor", liveAlert } })
    })).status).toBe(200);
    expect(await context.prisma.intervention.count({ where: { alert: { encounterId: TEST_ENCOUNTER_ID }, action: "PAUSE_TRAINING" } })).toBe(1);
  });

  it("archives all active patient business and does not restore old links", async () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await context.prisma.patient.create({ data: { id: ARCHIVE_PATIENT_ID, patientNo: `P-${ARCHIVE_LOGIN_CODE}`, loginCode: ARCHIVE_LOGIN_CODE, name: "归档测试患者", riskLevel: "中危", rehabStage: "冠心病2期", status: "active", profile: {} } });
    await context.prisma.prescription.create({ data: { id: ARCHIVE_PRESCRIPTION_ID, prescriptionNo: "RX-ARCHIVE-001", patientId: ARCHIVE_PATIENT_ID, version: "V1", status: "completed", signedBy: "王医生", signedAt: now, payload: {} } });
    await context.prisma.appointment.createMany({ data: [
      { id: ARCHIVE_HISTORY_APPOINTMENT_ID, patientId: ARCHIVE_PATIENT_ID, prescriptionId: ARCHIVE_PRESCRIPTION_ID, scheduledAt: now, status: "completed", payload: {} },
      { id: ARCHIVE_FUTURE_APPOINTMENT_ID, patientId: ARCHIVE_PATIENT_ID, prescriptionId: ARCHIVE_PRESCRIPTION_ID, scheduledAt: tomorrow, status: "pending", payload: {} }
    ] });
    await context.prisma.trainingEncounter.create({ data: { id: ARCHIVE_ENCOUNTER_ID, appointmentId: ARCHIVE_HISTORY_APPOINTMENT_ID, patientId: ARCHIVE_PATIENT_ID, prescriptionId: ARCHIVE_PRESCRIPTION_ID, status: "completed", payload: {} } });
    await context.prisma.deviceSession.create({ data: { encounterId: ARCHIVE_ENCOUNTER_ID, loginCode: ARCHIVE_LOGIN_CODE, status: "active", handoff: { loginCode: ARCHIVE_LOGIN_CODE } } });
    await context.prisma.followUp.create({ data: { id: "FOLLOWUP-INTEGRATION-ARCHIVE", patientId: ARCHIVE_PATIENT_ID, dueAt: tomorrow, status: "due", payload: {} } });

    const archiveResponse = await fetch(`${baseUrl}/api/patients/${ARCHIVE_PATIENT_ID}/archive`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ actor: "林管理员", role: "ADMIN", reason: "集成测试归档", source: "test" })
    });
    expect(archiveResponse.status).toBe(200);
    expect(await context.prisma.patient.findUnique({ where: { id: ARCHIVE_PATIENT_ID } })).toMatchObject({ status: "archived", archivedBy: "林管理员" });
    expect(await context.prisma.prescription.findUnique({ where: { id: ARCHIVE_PRESCRIPTION_ID } })).toMatchObject({ status: "archived" });
    expect(await context.prisma.appointment.findUnique({ where: { id: ARCHIVE_FUTURE_APPOINTMENT_ID } })).toMatchObject({ status: "cancelled", cancelledReason: "患者档案已归档" });
    expect(await context.prisma.appointment.findUnique({ where: { id: ARCHIVE_HISTORY_APPOINTMENT_ID } })).toMatchObject({ status: "completed" });
    expect(await context.prisma.deviceSession.findFirst({ where: { loginCode: ARCHIVE_LOGIN_CODE } })).toMatchObject({ status: "revoked" });
    expect(await context.prisma.followUp.findUnique({ where: { id: "FOLLOWUP-INTEGRATION-ARCHIVE" } })).toMatchObject({ status: "closed" });
    expect((await fetch(`${baseUrl}/api/device-handoffs/${ARCHIVE_LOGIN_CODE}`)).status).toBe(410);
    expect((await fetch(`${baseUrl}/api/appointments/validate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ patientId: ARCHIVE_PATIENT_ID, prescriptionId: ARCHIVE_PRESCRIPTION_ID }) })).status).toBe(410);

    const restoreResponse = await fetch(`${baseUrl}/api/patients/${ARCHIVE_PATIENT_ID}/restore`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ actor: "林管理员", role: "ADMIN", reason: "集成测试恢复", source: "test" })
    });
    expect(restoreResponse.status).toBe(200);
    expect(await context.prisma.patient.findUnique({ where: { id: ARCHIVE_PATIENT_ID } })).toMatchObject({ status: "active", archivedAt: null });
    expect(await context.prisma.prescription.findUnique({ where: { id: ARCHIVE_PRESCRIPTION_ID } })).toMatchObject({ status: "archived" });
    expect(await context.prisma.appointment.findUnique({ where: { id: ARCHIVE_FUTURE_APPOINTMENT_ID } })).toMatchObject({ status: "cancelled" });
    expect(await context.prisma.deviceSession.findFirst({ where: { loginCode: ARCHIVE_LOGIN_CODE } })).toMatchObject({ status: "revoked" });
    expect((await fetch(`${baseUrl}/api/appointments/validate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ patientId: ARCHIVE_PATIENT_ID, prescriptionId: ARCHIVE_PRESCRIPTION_ID }) })).status).toBe(409);
  });
});
