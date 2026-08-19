import { Prisma, PrismaClient } from "@prisma/client";
import { createDemoFixture } from "./demoFixture.js";
import { synchronizeAllStateDocuments } from "../server/stateRepository.js";
import { runDataCheck } from "../scripts/dataCheck.js";

const prisma = new PrismaClient();
const asJson = (value: unknown) => value as Prisma.InputJsonValue;
const seedId = "closed-loop-demo";
const seedVersion = "2026-08-19-six-scenarios-v1";

async function seed(reset: boolean) {
  if (!reset) {
    const [marker, patientCount] = await Promise.all([
      prisma.demoSeed.findUnique({ where: { id: seedId } }),
      prisma.patient.count()
    ]);
    if (marker || patientCount > 0) {
      console.log(`seed:init skipped; database already contains ${patientCount} patient(s).`);
      return;
    }
  }

  if (reset && process.env.CONFIRM_DEMO_RESET !== "YES") {
    throw new Error("Demo reset refused. Set CONFIRM_DEMO_RESET=YES after creating a backup.");
  }

  const fixture = createDemoFixture();
  await prisma.$transaction(async (tx) => {
    if (reset) {
      await tx.$executeRawUnsafe(`TRUNCATE TABLE
        "Intervention", "MetricSample", "DeviceSession", "TrainingTask", "TreatmentAssessment", "SingleReport",
        "TrainingEncounter", "Appointment", "PrescriptionItem", "Prescription", "Assessment", "AlertEvent",
        "StageReport", "FollowUp", "AuditLog", "StateDocument", "Patient", "User", "DemoSeed"
        RESTART IDENTITY CASCADE`);
    }

    await Promise.all([
      tx.user.upsert({ where: { id: "admin" }, update: {}, create: { id: "admin", username: "admin", displayName: "林管理员", role: "ADMIN", passwordHash: "demo-only:123456" } }),
      tx.user.upsert({ where: { id: "doctor001" }, update: {}, create: { id: "doctor001", username: "doctor001", displayName: "王医生", role: "DOCTOR", passwordHash: "demo-only:123456" } }),
      tx.user.upsert({ where: { id: "doctor002" }, update: {}, create: { id: "doctor002", username: "doctor002", displayName: "李医生", role: "DOCTOR", passwordHash: "demo-only:1234567" } }),
      tx.user.upsert({ where: { id: "rehab001" }, update: {}, create: { id: "rehab001", username: "rehab001", displayName: "周康复师", role: "REHAB_EXECUTION", passwordHash: "demo-only:123456" } })
    ]);
    for (const [key, value] of Object.entries(fixture.documents)) {
      await tx.stateDocument.create({ data: { key, value: asJson(value) } });
    }
    await synchronizeAllStateDocuments(tx);

    const trainingPatient = fixture.patients[4];
    const trainingPrescription = fixture.prescriptions[2];
    const trainingEncounter = fixture.encounters[1];
    await tx.deviceSession.create({
      data: {
        id: "DEVICE-SEED-005", encounterId: trainingEncounter.encounterId, loginCode: trainingPatient.patient_no.replace(/\D/g, "").slice(-6), status: "active",
        connectedAt: new Date(), lastSeenAt: new Date(),
        handoff: asJson({ loginCode: trainingPatient.patient_no.replace(/\D/g, "").slice(-6), patient: trainingPatient, prescriptionTask: trainingPrescription,
          prescriptionContent: (fixture.documents["xinkang-prescription-contents"] as Record<string, unknown>)[trainingPrescription.id], encounter: trainingEncounter, updatedAt: new Date().toISOString() })
      }
    });
    await tx.metricSample.create({ data: { encounterId: trainingEncounter.encounterId, taskId: trainingEncounter.activeTrainingTaskId,
      capturedAt: new Date(), heartRate: 106, spo2: 97, systolic: 126, diastolic: 78, speedKmh: 18.2, distanceKm: 1.4,
      powerW: 52, cadenceRpm: 62, caloriesKcal: 26, values: asJson(trainingEncounter.liveMetrics ?? {}) } });
    await tx.auditLog.create({ data: { entityType: "DemoSeed", entityId: seedId, action: reset ? "RESET" : "INITIALIZE", actor: "system-seed", source: "seed",
      after: asJson({ version: seedVersion, date: fixture.date, scenarios: 6 }) } });
    await tx.demoSeed.create({ data: { id: seedId, version: seedVersion } });
    const check = await runDataCheck(tx);
    if (check.errors.length) throw new Error(`Seed data integrity failed:\n${check.errors.join("\n")}`);
  }, { timeout: 60_000 });
  console.log(`Seeded six closed-loop demo scenarios for Asia/Shanghai date ${fixture.date}.`);
}

const reset = process.argv.includes("--reset");
seed(reset)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
