import { clinicalSnapshotChen, getPrescriptionVersionDetail, type PrescriptionVersionId } from "./clinicalSharedData";

export type PrescriptionExerciseStatus = "pending" | "in_progress" | "completed" | "skipped";

export type PrescriptionExerciseItem = {
  itemId: string;
  exerciseType: string;
  label: string;
  order: number;
  mode: string;
  warmupMinutes?: number;
  trainingMinutes: number;
  cooldownMinutes?: number;
  targetHeartRate?: [number, number];
  targetPower?: [number, number];
  targetRpe?: [number, number];
  weeklyFrequency: number;
  videoSubtype?: string;
  patientInstruction: string;
  status: PrescriptionExerciseStatus;
  skipReason?: string;
};

export type PrescriptionPlan = {
  prescriptionVersionId: PrescriptionVersionId;
  patientId: string;
  effectiveFrom: string;
  source: string;
  items: PrescriptionExerciseItem[];
};

const v4 = getPrescriptionVersionDetail("V4");

export const demoPrescriptionPlan: PrescriptionPlan = {
  prescriptionVersionId: "V4",
  patientId: clinicalSnapshotChen.patientId,
  effectiveFrom: "2026-07-22",
  source: "V4.0 医生已签署处方",
  items: [
    {
      itemId: "V4-BREATH-01",
      exerciseType: "呼吸训练",
      label: "腹式呼吸",
      order: 1,
      mode: "正念呼吸配合腹式呼吸",
      trainingMinutes: 10,
      weeklyFrequency: 7,
      videoSubtype: "腹式呼吸",
      patientInstruction: "保持坐姿，吸气时腹部鼓起，呼气时缓慢收紧。",
      status: "completed"
    },
    {
      itemId: "V4-BIKE-01",
      exerciseType: "有氧运动",
      label: "功率车",
      order: 2,
      mode: v4.trainingType,
      warmupMinutes: v4.warmupMinutes,
      trainingMinutes: v4.trainingMinutes,
      cooldownMinutes: v4.cooldownMinutes,
      targetHeartRate: v4.targetHr,
      targetPower: v4.targetPower,
      targetRpe: v4.rpeTarget,
      weeklyFrequency: v4.weeklyFrequency,
      patientInstruction: "按照热身、训练、放松顺序执行；出现持续胸闷、胸痛或头晕立即停止。",
      status: "in_progress"
    },
    {
      itemId: "V4-BADUANJIN-01",
      exerciseType: "中医运动",
      label: "八段锦",
      order: 3,
      mode: "视频跟练",
      trainingMinutes: 15,
      weeklyFrequency: 3,
      videoSubtype: "八段锦",
      targetRpe: [9, 11],
      patientInstruction: "动作幅度以舒适为准，保持自然呼吸，不要憋气。",
      status: "pending"
    }
  ]
};

export function getTodayPlan(patientId: string) {
  return patientId === demoPrescriptionPlan.patientId ? demoPrescriptionPlan : { ...demoPrescriptionPlan, patientId, items: [] };
}

export function planTotalMinutes(plan: PrescriptionPlan) {
  return plan.items.reduce((sum, item) => sum + (item.warmupMinutes ?? 0) + item.trainingMinutes + (item.cooldownMinutes ?? 0), 0);
}

