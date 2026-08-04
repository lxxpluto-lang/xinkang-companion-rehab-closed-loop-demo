import type { ManagedPatient } from "./pages/PatientArchivePage";

export type AssessmentStatus = "draft" | "therapist_confirmed" | "doctor_reviewed";
export type AssessmentSource = "manual" | "device";

export type SPPBAssessment = {
  balance: {
    sideBySideSec: number | null;
    semiTandemSec: number | null;
    tandemSec: number | null;
    score: number;
  };
  walk4m: {
    trial1Sec: number | null;
    trial2Sec: number | null;
    fastestSec: number | null;
    score: number;
  };
  chairStand: {
    trial1Sec: number | null;
    trial2Sec: number | null;
    fastestSec: number | null;
    score: number;
  };
  totalScore: number;
  grip: { leftTrial1Kg: number | null; leftTrial2Kg: number | null; rightTrial1Kg: number | null; rightTrial2Kg: number | null };
  canWalk100m: "yes" | "no" | "unknown";
  unableWalkReason: string;
  muscleStrength: { upper: string; lower: string };
};

type SPPBCore = Pick<SPPBAssessment, "balance" | "walk4m" | "chairStand"> & { totalScore: number };

export type AssessmentRecord = {
  assessmentId: string;
  patientId: string;
  assessmentType: "SPPB";
  attemptNo: number;
  assessedAt: string;
  source: AssessmentSource;
  status: AssessmentStatus;
  sourceNote: string;
  patientSnapshot: { name: string; gender: string; age: number; hospitalPatientNo: string; diagnosis: string };
  weightKg: number | null;
  preVitals: { bloodPressure: string; pulse: number | null };
  postVitals: { bloodPressure: string; pulse: number | null };
  sppb: SPPBAssessment;
  notes: string;
  therapist?: string;
  doctor?: string;
  enteredBy: string;
  confirmedAt?: string;
  reviewedAt?: string;
  ruleVersion: string;
};

export const sppbRuleVersion = "CRH-SPPB-2026.08";

function scoreBalance(value: number | null, type: "side" | "semi" | "tandem") {
  if (value === null) return 0;
  if (type === "side") return value >= 10 ? 1 : 0;
  if (type === "semi") return value >= 10 ? 1 : 0;
  if (value >= 10) return 2;
  if (value >= 3) return 1;
  return 0;
}

function scoreWalk(seconds: number | null) {
  if (seconds === null) return 0;
  if (seconds < 4.82) return 4;
  if (seconds <= 6.2) return 3;
  if (seconds <= 8.7) return 2;
  return 1;
}

function scoreChair(seconds: number | null) {
  if (seconds === null) return 0;
  if (seconds < 11.19) return 4;
  if (seconds <= 13.69) return 3;
  if (seconds <= 16.69) return 2;
  if (seconds <= 60) return 1;
  return 0;
}

export function calculateSppb(input: Pick<SPPBAssessment, "balance" | "walk4m" | "chairStand">): SPPBCore {
  const balance = { ...input.balance, score: scoreBalance(input.balance.sideBySideSec, "side") + scoreBalance(input.balance.semiTandemSec, "semi") + scoreBalance(input.balance.tandemSec, "tandem") };
  const fastestWalk = [input.walk4m.trial1Sec, input.walk4m.trial2Sec].filter((value): value is number => value !== null).sort((a, b) => a - b)[0] ?? null;
  const fastestChair = [input.chairStand.trial1Sec, input.chairStand.trial2Sec].filter((value): value is number => value !== null).sort((a, b) => a - b)[0] ?? null;
  const walk4m = { ...input.walk4m, fastestSec: fastestWalk, score: scoreWalk(fastestWalk) };
  const chairStand = { ...input.chairStand, fastestSec: fastestChair, score: scoreChair(fastestChair) };
  return { ...input, balance, walk4m, chairStand, totalScore: balance.score + walk4m.score + chairStand.score };
}

export function createBlankSppb(patient: ManagedPatient, attemptNo: number, actor: string): AssessmentRecord {
  const now = new Date().toISOString();
  const sppb = calculateSppb({
    balance: { sideBySideSec: null, semiTandemSec: null, tandemSec: null, score: 0 },
    walk4m: { trial1Sec: null, trial2Sec: null, fastestSec: null, score: 0 },
    chairStand: { trial1Sec: null, trial2Sec: null, fastestSec: null, score: 0 }
  });
  return {
    assessmentId: `ASMT-${patient.patient_demo_id}-${Date.now()}`,
    patientId: patient.patient_demo_id,
    assessmentType: "SPPB",
    attemptNo,
    assessedAt: now,
    source: "manual",
    status: "draft",
    sourceNote: "新建评估记录，待填写",
    patientSnapshot: { name: patient.name, gender: patient.gender, age: patient.age, hospitalPatientNo: patient.hospital_patient_no, diagnosis: patient.diagnosis_summary },
    weightKg: Number(patient.weight_kg) || null,
    preVitals: { bloodPressure: "", pulse: null },
    postVitals: { bloodPressure: "", pulse: null },
    sppb: { ...sppb, grip: { leftTrial1Kg: null, leftTrial2Kg: null, rightTrial1Kg: null, rightTrial2Kg: null }, canWalk100m: "unknown", unableWalkReason: "", muscleStrength: { upper: "", lower: "" } },
    notes: "",
    enteredBy: actor,
    ruleVersion: sppbRuleVersion
  };
}

export function createDemoAssessmentRecords(patients: ManagedPatient[]): AssessmentRecord[] {
  const patient = patients.find((item) => item.patient_demo_id === "P-DEMO-001");
  if (!patient) return [] as AssessmentRecord[];
  const record = createBlankSppb(patient, 1, "周康复师");
  const sppb = calculateSppb({
    balance: { sideBySideSec: 10, semiTandemSec: 10, tandemSec: 8.2, score: 0 },
    walk4m: { trial1Sec: 6.4, trial2Sec: 6.1, fastestSec: null, score: 0 },
    chairStand: { trial1Sec: 14.2, trial2Sec: 13.8, fastestSec: null, score: 0 }
  });
  return [{ ...record, assessedAt: "2026-07-20T09:30:00+08:00", source: "manual", status: "doctor_reviewed", sourceNote: "康复师现场人工采集并确认", weightKg: 62.4, preVitals: { bloodPressure: "128/78", pulse: 72 }, postVitals: { bloodPressure: "136/82", pulse: 88 }, sppb: { ...sppb, grip: { leftTrial1Kg: null, leftTrial2Kg: null, rightTrial1Kg: null, rightTrial2Kg: null }, canWalk100m: "yes", unableWalkReason: "", muscleStrength: { upper: "4级", lower: "4级" } }, notes: "演示数据，需以医院复核结果为准", therapist: "周康复师", doctor: "王医生", confirmedAt: "2026-07-20T10:00:00+08:00", reviewedAt: "2026-07-20T10:20:00+08:00" }];
}
