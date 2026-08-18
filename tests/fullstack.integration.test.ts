import type { AddressInfo } from "node:net";
import { io as createSocket, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";

const TEST_PATIENT_ID = "P-INTEGRATION-001";
const TEST_PRESCRIPTION_ID = "RX-INTEGRATION-001";
const TEST_APPOINTMENT_ID = "APT-INTEGRATION-001";
const TEST_ENCOUNTER_ID = "ENC-INTEGRATION-001";
const TEST_LOGIN_CODE = "991001";

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
    await context.prisma.stateDocument.deleteMany({ where: { key: "xinkang-training-videos" } });
    await context.app.close();
  });

  it("reports PostgreSQL and realtime health", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", database: "postgresql", realtime: "socket.io" });
  });

  it("persists a clinical state document", async () => {
    const payload = [{ id: "VIDEO-INTEGRATION", title: "测试视频", status: "PUBLISHED" }];
    const response = await fetch(`${baseUrl}/api/state/xinkang-training-videos`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: payload })
    });
    expect(response.status).toBe(200);
    const bootstrap = await fetch(`${baseUrl}/api/bootstrap`).then((item) => item.json()) as any;
    expect(bootstrap.documents["xinkang-training-videos"].value).toEqual(payload);
  });

  it("keeps task completion isolated and broadcasts live metrics", async () => {
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
    const response = await fetch(`${baseUrl}/api/device-handoffs/${TEST_LOGIN_CODE}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ encounter: { status: "awaiting_next_task", activeTrainingTaskId: `${TEST_ENCOUNTER_ID}-TASK-2`, dailyTrainingTasks: completedTasks, liveMetrics: { heartRate: 106, spo2: 98, speedKmh: 12.4, distanceKm: 0.8, powerW: 52, cadenceRpm: 61, caloriesKcal: 18, sampledAt: new Date().toISOString() } } })
    });
    expect(response.status).toBe(200);
    const update = await realtimeUpdate;
    expect(update.encounter.liveMetrics.heartRate).toBe(106);
    expect(update.encounter.dailyTrainingTasks.find((task: any) => task.exerciseKey === "bike").status).toBe("completed");
    expect(update.encounter.dailyTrainingTasks.find((task: any) => task.exerciseKey === "breathing").status).toBe("pending");

    const storedTasks = await context.prisma.trainingTask.findMany({ where: { encounterId: TEST_ENCOUNTER_ID }, orderBy: { order: "asc" } });
    expect(storedTasks.map((task) => task.status)).toEqual(["pending", "completed"]);
    expect(await context.prisma.metricSample.count({ where: { encounterId: TEST_ENCOUNTER_ID } })).toBe(1);
  });
});
