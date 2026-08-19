import { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function runDataCheck(prisma: DbClient) {
  const errors: string[] = [];
  const patients = await prisma.patient.findMany({ select: { id: true, patientNo: true, loginCode: true, status: true } });
  const duplicate = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);
  duplicate(patients.map((item) => item.patientNo)).forEach((value) => errors.push(`重复患者号: ${value}`));
  duplicate(patients.map((item) => item.loginCode)).forEach((value) => errors.push(`重复登录号: ${value}`));

  const prescriptions = await prisma.prescription.findMany({ select: { id: true, patientId: true, status: true, signedAt: true } });
  const prescriptionMap = new Map(prescriptions.map((item) => [item.id, item]));
  const patientMap = new Map(patients.map((item) => [item.id, item]));
  prescriptions.forEach((item) => {
    if (!patientMap.has(item.patientId)) errors.push(`孤儿处方: ${item.id}`);
    if (patientMap.get(item.patientId)?.status === "archived" && !["archived", "withdrawn"].includes(item.status)) errors.push(`归档患者仍有有效处方: ${item.id}`);
  });

  const appointments = await prisma.appointment.findMany();
  appointments.forEach((item) => {
    const patient = patientMap.get(item.patientId);
    const prescription = item.prescriptionId ? prescriptionMap.get(item.prescriptionId) : undefined;
    if (!patient) errors.push(`孤儿预约: ${item.id}`);
    if (prescription && prescription.patientId !== item.patientId) errors.push(`预约跨患者处方: ${item.id}`);
    if (["pending", "rescheduled", "scheduled", "arrived", "in_training"].includes(item.status)) {
      if (patient?.status !== "active") errors.push(`归档患者仍有活动预约: ${item.id}`);
      if (!prescription || prescription.status !== "completed" || !prescription.signedAt) errors.push(`预约引用未签署或失效处方: ${item.id}`);
    }
  });

  const encounters = await prisma.trainingEncounter.findMany({ include: { appointment: true, tasks: true, metricSamples: true, alerts: true, singleReports: true } });
  encounters.forEach((item) => {
    if (item.appointment.patientId !== item.patientId) errors.push(`场次与预约患者不一致: ${item.id}`);
    if (item.prescriptionId && prescriptionMap.get(item.prescriptionId)?.patientId !== item.patientId) errors.push(`场次跨患者处方: ${item.id}`);
    if (patientMap.get(item.patientId)?.status === "archived" && !["completed", "cancelled", "no_show", "terminated"].includes(item.status)) errors.push(`归档患者仍有活动场次: ${item.id}`);
    const taskIds = new Set(item.tasks.map((task) => task.id));
    item.metricSamples.forEach((sample) => { if (sample.taskId && !taskIds.has(sample.taskId)) errors.push(`指标引用其他场次任务: ${sample.id.toString()}`); });
    item.alerts.forEach((alert) => { if (alert.patientId !== item.patientId) errors.push(`异常事件跨患者: ${alert.id}`); });
    item.singleReports.forEach((report) => { if (report.patientId !== item.patientId) errors.push(`单次报告跨患者: ${report.id}`); });
  });

  const sessions = await prisma.deviceSession.findMany({ include: { encounter: { include: { patient: true } } } });
  duplicate(sessions.filter((session) => session.status === "active").map((session) => session.loginCode)).forEach((value) => errors.push(`重复有效登录会话: ${value}`));
  sessions.forEach((session) => {
    if (session.status === "active" && session.encounter.patient.status !== "active") errors.push(`归档患者仍有有效设备会话: ${session.id}`);
  });
  const stageReports = await prisma.stageReport.findMany();
  stageReports.forEach((report) => {
    if (report.prescriptionId && prescriptionMap.get(report.prescriptionId)?.patientId !== report.patientId) errors.push(`阶段报告跨患者处方: ${report.id}`);
  });
  const followUps = await prisma.followUp.findMany();
  followUps.forEach((followUp) => {
    if (!patientMap.has(followUp.patientId)) errors.push(`孤儿随访: ${followUp.id}`);
    if (patientMap.get(followUp.patientId)?.status === "archived" && !["completed", "closed", "cancelled"].includes(followUp.status)) errors.push(`归档患者仍有开放随访: ${followUp.id}`);
  });

  const marker = await prisma.demoSeed.findUnique({ where: { id: "closed-loop-demo" } });
  if (marker) {
    ["P-LXX-001", "P-SEED-002", "P-SEED-003", "P-SEED-004", "P-SEED-005", "P-SEED-006"]
      .filter((id) => !patientMap.has(id)).forEach((id) => errors.push(`缺少种子场景患者: ${id}`));
  }
  return { errors, counts: { patients: patients.length, prescriptions: prescriptions.length, appointments: appointments.length, encounters: encounters.length, deviceSessions: sessions.length } };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await runDataCheck(prisma);
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("dataCheck.ts") || process.argv[1]?.endsWith("dataCheck.js")) void main();
