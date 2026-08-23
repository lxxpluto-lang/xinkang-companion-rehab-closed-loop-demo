import { describe, expect, it } from "vitest";
import { createDemoFixture } from "../prisma/demoFixture";
import { buildDailyTrainingTasks } from "../src/patient/PatientApp";
import type { PrescriptionTask } from "../src/clinicalWorkflowData";
import type { TrainingEncounter } from "../src/trainingEncounterData";

describe("patient prescription permissions", () => {
  it("keeps all four signed prescription items for Wang Haifeng", () => {
    const fixture = createDemoFixture();
    const prescription = fixture.prescriptions.find((item) => item.patientNo === "P-260005") as unknown as PrescriptionTask;
    const encounter = fixture.encounters.find((item) => item.patientNo === "P-260005") as unknown as TrainingEncounter;

    const tasks = buildDailyTrainingTasks(encounter, prescription);

    expect(tasks).toHaveLength(4);
    expect(tasks.map((item) => item.exerciseKey)).toEqual(["diaphragmatic", "bike", "dumbbell", "flexibilityFull"]);
    expect(encounter.dailyTrainingTasks?.map((item) => item.status)).toEqual(["pending", "in_progress", "pending", "pending"]);
  });

  it("uses the prescription exercise key when a project label is not in the text mapper", () => {
    const fixture = createDemoFixture();
    const source = fixture.prescriptions.find((item) => item.patientNo === "P-260005") as any;
    const encounter = fixture.encounters.find((item) => item.patientNo === "P-260005") as unknown as TrainingEncounter;
    const prescription = {
      ...source,
      doctorFinal: {
        ...source.doctorFinal,
        items: source.doctorFinal.items.map((item: any) => item.project === "哑铃力量" ? { ...item, project: "上肢训练" } : item)
      }
    } as PrescriptionTask;

    const tasks = buildDailyTrainingTasks(encounter, prescription);

    expect(tasks).toHaveLength(4);
    expect(tasks[2]).toMatchObject({ exerciseKey: "dumbbell", exerciseName: "哑铃力量" });
  });
});
