import { describe, expect, it } from "vitest";
import { createSingleReportFromSession, createStoredTrainingSession, displayClinicalMetric } from "../src/reportData";

const patient = {
  patientId: "P-TEST",
  patientNo: "TEST-001",
  name: "测试患者",
  medicalHistory: "",
  diagnosis: "冠心病康复",
  procedureHistory: "",
  specialMedications: "",
  drugAllergies: "",
  exercisePrecautions: ""
};

describe("clinical report data validation", () => {
  it("rejects placeholder vital signs but preserves a valid Borg score", () => {
    const session = createStoredTrainingSession({
      patientId: patient.patientId,
      exerciseType: "功率车",
      trainingMode: "连续训练",
      actualSessionSequence: 1,
      preVitals: { bp: "11", hr: "11", spo2: "11", rr: "11" },
      postVitals: { bp: "222/333", hr: "222", spo2: "11", rr: "333", symptoms: "" },
      rpe: 11,
      recordedBy: "测试康复师",
      device: { hr: 11, power: 40, durationMinutes: 20, activeMinutes: 18, completeness: 90 }
    });

    expect(session.preBp).toBeNull();
    expect(session.postBp).toBeNull();
    expect(session.preHr).toBeNull();
    expect(session.avgHr).toBeNull();
    expect(session.preSpo2).toBeNull();
    expect(session.postRespRate).toBeNull();
    expect(session.rpe).toBe(11);

    const report = createSingleReportFromSession(session, patient);
    expect(report.phaseVitals.find((row) => row.metric === "心率")?.training).toBe("未提供");
    expect(report.phaseVitals.find((row) => row.metric === "血压")?.warmup).toBe("未采集");
  });

  it("keeps valid clinical values visible and labels invalid values as uncollected", () => {
    expect(displayClinicalMetric("心率", 72)).toBe("72");
    expect(displayClinicalMetric("血氧饱和度", 98)).toBe("98");
    expect(displayClinicalMetric("呼吸率", 18)).toBe("18");
    expect(displayClinicalMetric("血压", "126/78")).toBe("126/78");
    expect(displayClinicalMetric("心率", 11)).toBe("未提供");
    expect(displayClinicalMetric("血压", "11")).toBe("未采集");
  });
});
