import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function shanghaiNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`
  };
}

const asJson = (value: unknown) => value as Prisma.InputJsonValue;

async function main() {
  const now = shanghaiNow();
  const appointmentId = `APT-LXX-${now.date.replaceAll("-", "")}`;
  const encounterId = `ENC-${appointmentId}`;

  await Promise.all([
    prisma.user.upsert({ where: { id: "admin" }, update: {}, create: { id: "admin", username: "admin", displayName: "林管理员", role: "ADMIN", passwordHash: "demo-only:123456" } }),
    prisma.user.upsert({ where: { id: "doctor001" }, update: {}, create: { id: "doctor001", username: "doctor001", displayName: "王医生", role: "DOCTOR", passwordHash: "demo-only:123456" } }),
    prisma.user.upsert({ where: { id: "doctor002" }, update: {}, create: { id: "doctor002", username: "doctor002", displayName: "李医生", role: "DOCTOR", passwordHash: "demo-only:1234567" } }),
    prisma.user.upsert({ where: { id: "rehab001" }, update: {}, create: { id: "rehab001", username: "rehab001", displayName: "周康复师", role: "REHAB_EXECUTION", passwordHash: "demo-only:123456" } })
  ]);

  await prisma.patient.upsert({
    where: { id: "P-LXX-001" },
    update: { patientNo: "P-256572", loginCode: "256572", name: "鲁萱萱", riskLevel: "中危", rehabStage: "冠心病2期", assignedDoctor: "王医生" },
    create: {
      id: "P-LXX-001",
      patientNo: "P-256572",
      loginCode: "256572",
      name: "鲁萱萱",
      gender: "女",
      riskLevel: "中危",
      rehabStage: "冠心病2期",
      assignedDoctor: "王医生",
      profile: asJson({ diagnosis: "冠心病 PCI 术后康复期", source: "脱敏演示种子数据", therapist: "周康复师" })
    }
  });

  await prisma.prescription.upsert({
    where: { id: "RX-LXX-001" },
    update: {},
    create: {
      id: "RX-LXX-001",
      prescriptionNo: "RX-256572-0001",
      patientId: "P-LXX-001",
      version: "V1",
      status: "completed",
      assignedDoctor: "王医生",
      signedBy: "王医生",
      signedAt: new Date(),
      payload: asJson({ source: "SPPB与基础评估", plannedSessions: 12 })
    }
  });

  const items = [
    ["呼吸训练", "breathing", "腹式呼吸", "舒适节律", "10分钟"],
    ["有氧运动", "bike", "功率车", "目标心率100-116 bpm；48-62W", "30分钟"],
    ["抗阻训练", "dumbbell", "哑铃力量", "每个动作2组，每组10次", "15分钟"],
    ["柔韧性训练", "flexibility", "全身柔韧训练", "舒适范围", "10分钟"]
  ];
  for (const [index, item] of items.entries()) {
    await prisma.prescriptionItem.upsert({
      where: { id: `RX-LXX-001-ITEM-${index + 1}` },
      update: {},
      create: {
        id: `RX-LXX-001-ITEM-${index + 1}`,
        prescriptionId: "RX-LXX-001",
        order: index + 1,
        category: item[0],
        exerciseKey: item[1],
        exerciseName: item[2],
        intensity: item[3],
        duration: item[4],
        frequency: "按本次处方执行",
        rationale: "医生签署处方项目",
        payload: asJson({})
      }
    });
  }

  await prisma.appointment.upsert({
    where: { id: appointmentId },
    update: {},
    create: {
      id: appointmentId,
      patientId: "P-LXX-001",
      prescriptionId: "RX-LXX-001",
      scheduledAt: new Date(`${now.date}T${now.time}:00+08:00`),
      status: "arrived",
      station: "综合训练区01",
      project: "综合运动康复",
      doctorName: "王医生",
      therapistName: "周康复师",
      note: "当天动态演示预约",
      payload: asJson({ date: now.date, time: now.time, source: "seed" })
    }
  });

  await prisma.trainingEncounter.upsert({
    where: { id: encounterId },
    update: {},
    create: {
      id: encounterId,
      appointmentId,
      patientId: "P-LXX-001",
      prescriptionId: "RX-LXX-001",
      status: "pre_assessment",
      station: "综合训练区01",
      therapist: "周康复师",
      payload: asJson({ patientNo: "P-256572", prescriptionVersion: "V1", paperSignatureStatus: "not_required" })
    }
  });

  for (const [index, item] of items.entries()) {
    await prisma.trainingTask.upsert({
      where: { id: `${encounterId}-TASK-${index + 1}` },
      update: {},
      create: {
        id: `${encounterId}-TASK-${index + 1}`,
        encounterId,
        order: index + 1,
        category: item[0],
        exerciseKey: item[1],
        exerciseName: item[2],
        status: "pending",
        payload: asJson({})
      }
    });
  }
}

main()
  .finally(async () => prisma.$disconnect());
