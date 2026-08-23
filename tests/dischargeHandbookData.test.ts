import { describe, expect, it } from "vitest";
import { reportDischargeDate, shanghaiDate, type RehabReport } from "../src/dischargeHandbookData";

function report(patch: Partial<RehabReport> = {}): RehabReport {
  return {
    reportId: "RR-TEST-001",
    patientId: "P-TEST-001",
    generatedAt: "2026-08-20T15:00:00+08:00",
    status: "published",
    medicalSection: {
      diagnosis: "测试诊断",
      treatmentCourse: "测试治疗经过",
      procedure: "无",
      medications: "无",
      followUpRequirements: "按时随访",
      clinicalConclusion: "完成本阶段康复",
    },
    rehabSection: {
      assessmentSummary: "已完成评估",
      trainingSummary: "已完成训练",
      adherenceSummary: "依从性良好",
      followUpSummary: "待随访",
      improvementSummary: "耐量改善",
    },
    recommendationDraft: "继续按处方训练",
    sourceRefs: [],
    ...patch,
  };
}

describe("discharge report date", () => {
  it("uses the date explicitly recorded in the discharge report", () => {
    expect(reportDischargeDate(report({ dischargeDate: "2026-08-18" }))).toBe("2026-08-18");
  });

  it("falls back to the publication date in Asia/Shanghai", () => {
    const publishedAt = "2026-08-20T16:30:00.000Z";
    expect(shanghaiDate(publishedAt)).toBe("2026-08-21");
    expect(reportDischargeDate(report({ publishedAt }), publishedAt)).toBe("2026-08-21");
  });
});
