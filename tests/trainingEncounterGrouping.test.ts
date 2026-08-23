import { describe, expect, it } from "vitest";
import { partitionTrainingEncounters, type TrainingEncounter } from "../src/trainingEncounterData";

function encounter(id: string, status: TrainingEncounter["status"], updatedAt: string): TrainingEncounter {
  return {
    encounterId: id,
    appointmentId: `APT-${id}`,
    patientId: `PAT-${id}`,
    patientNo: `P-${id}`,
    patientName: `患者${id}`,
    prescriptionTaskId: `RX-${id}`,
    prescriptionVersion: "V1",
    treatmentId: `TREAT-${id}`,
    station: "训练区01",
    project: "综合训练",
    therapist: "周康复师",
    status,
    adjustments: [],
    paperSignatureStatus: "not_required",
    updatedAt,
  };
}

describe("inpatient training task grouping", () => {
  it("moves only post-assessed completed encounters into the completed group", () => {
    const groups = partitionTrainingEncounters([
      encounter("TRAINING", "in_training", "2026-08-19T10:00:00+08:00"),
      encounter("POST", "post_assessment", "2026-08-19T10:10:00+08:00"),
      encounter("DONE", "completed", "2026-08-19T10:20:00+08:00"),
      encounter("CANCELLED", "cancelled", "2026-08-19T10:30:00+08:00"),
    ]);

    expect(groups.active.map((item) => item.encounterId)).toEqual(["POST", "TRAINING"]);
    expect(groups.completed.map((item) => item.encounterId)).toEqual(["DONE"]);
  });
});
