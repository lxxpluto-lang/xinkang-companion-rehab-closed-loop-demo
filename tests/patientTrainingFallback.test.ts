import { describe, expect, it } from "vitest";
import { resolvePatientTrainingVideo } from "../src/patient/PatientApp";

describe("patient training video fallback", () => {
  it("keeps the training screen renderable when no video has been published", () => {
    const video = resolvePatientTrainingVideo([], "diaphragmatic");

    expect(video.subtype).toBe("腹式呼吸");
    expect(video.url).toBe("");
    expect(video.title).toContain("现场指导");
  });

  it("uses a matching published video when one exists", () => {
    const published = {
      id: "VIDEO-TEST",
      title: "腹式呼吸示范",
      category: "呼吸训练" as const,
      subtype: "腹式呼吸",
      source: "upload" as const,
      url: "/videos/breathing.mp4"
    };

    expect(resolvePatientTrainingVideo([published], "diaphragmatic")).toEqual(published);
  });
});
