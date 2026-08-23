import { localTrainingVideoDefinitions, localTrainingVideoUrl } from "../trainingVideoCatalog.js";

const shanghaiParts = () => Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
}).formatToParts(new Date()).map((part) => [part.type, part.value]));

const addDays = (date: string, days: number) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const exerciseItems = [
  { category: "呼吸训练", project: "腹式呼吸", exerciseKey: "breathing", intensity: "舒适节律", duration: "10分钟", frequency: "1次/日", reason: "改善呼吸控制，作为训练准备" },
  { category: "有氧运动", project: "功率车", exerciseKey: "bike", intensity: "目标心率100-116 bpm；48-62W", duration: "30分钟", frequency: "3次/周", reason: "结合运动耐量和风险分层设置" },
  { category: "抗阻训练", project: "哑铃力量", exerciseKey: "dumbbell", intensity: "每个动作2组，每组10次", duration: "15分钟", frequency: "2次/周", reason: "维持上肢与核心肌力" },
  { category: "柔韧性训练", project: "全身柔韧训练", exerciseKey: "flexibility", intensity: "无痛舒适范围", duration: "10分钟", frequency: "每次训练后", reason: "促进放松并维持关节活动度" }
];

const legacyTrainingVideoFixtures = [
  { id: "VIDEO-BIKE-LOCAL-001", title: "云逛魔都 4K HDR｜沉浸式滨江骑行", category: "有氧运动", subtype: "功率车", source: "local", url: "/training-videos/%E4%BA%91%E9%80%9B%E9%AD%94%E9%83%BD%204K%20HDR%20%EF%BD%9C%20%E6%B2%89%E6%B5%B8%E5%BC%8F%E4%BD%93%E9%AA%8C%E9%99%86%E5%AE%B6%E5%98%B4%E6%B1%80%E6%BB%A8%E6%B1%9F%E9%AA%91%E8%A1%8C%EF%BC%9A%E5%8D%97%E6%B5%A6%E5%A4%A7%E6%A1%A5%E5%88%B0%E6%9D%A8%E6%B5%A6%E5%A4%A7%E6%A1%A5%20%5BBV1HKgX6LEe1%5D.mp4", status: "PUBLISHED", fileSize: "870 MB", updatedBy: "本地视频目录" },
  { id: "VIDEO-BIKE-LOCAL-002", title: "前滩夏日傍晚骑行", category: "有氧运动", subtype: "功率车", source: "local", url: "/training-videos/%E4%BA%91%E9%80%9B%E9%AD%94%E9%83%BD%204K%20HDR%20%EF%BD%9C%20%E5%89%8D%E6%BB%A9%E5%A4%8F%E6%97%A5%E7%9A%84%E5%82%8D%E6%99%9A%EF%BC%9A%E4%BB%8E%E7%B9%81%E5%8D%8E%E7%9A%84%E5%A4%AA%E5%8F%A4%E9%87%8C%E5%88%B0%E9%9D%99%E8%AC%90%E6%B1%9F%E6%BB%A8%E7%BB%BF%E9%81%93%20%5BBV1HKKt6eEdh%5D.mp4", status: "PUBLISHED", fileSize: "983 MB", updatedBy: "本地视频目录" },
  { id: "VIDEO-BREATH-LOCAL-001", title: "腹式呼吸指导", category: "呼吸训练", subtype: "腹式呼吸", source: "local", url: "/training-videos/%E8%85%B9%E5%BC%8F%E5%91%BC%E5%90%B8_BV1Av4y1p7SL.mp4", status: "PUBLISHED", fileSize: "21 MB", updatedBy: "本地视频目录" },
  { id: "VIDEO-BADUANJIN-LOCAL-001", title: "八段锦康复跟练", category: "中医运动", subtype: "八段锦", source: "local", url: "/training-videos/%E5%85%AB%E6%AE%B5%E9%94%A6_BV1gT4y1m7ec.mp4", status: "PUBLISHED", fileSize: "75 MB", updatedBy: "本地视频目录" }
];

const trainingVideoFixtures = localTrainingVideoDefinitions.map((video) => ({
  ...video,
  source: "local",
  url: localTrainingVideoUrl(video.fileName),
  status: "PUBLISHED"
}));

function patient(id: string, patientNo: string, name: string, age: number, risk: string, workflow: string) {
  const now = new Date().toISOString();
  return {
    patient_demo_id: id, patient_code: patientNo, patient_no: patientNo, hospital_patient_no: patientNo,
    institution_id: "ORG-DEMO-001", institution_name: "心康伴侣演示中心", environment: "测试环境",
    record_source: "手工补录基础资料", source_file_name: "", ocr_confidence: null, review_status: "已确认",
    reviewed_by: "周康复师", reviewed_at: now, record_status: "有效", archive_status: "active", workflow_status: workflow,
    field_status: {}, name, id_number: "", id_type: "身份证", phone: "138****0000", birth_date: "", age,
    gender: age % 2 ? "男" : "女", emergency_contact: "", emergency_relation: "", emergency_phone: "",
    assigned_doctor: "王医生", diagnosis_summary: "冠心病 PCI 术后康复期", medical_history: "脱敏演示数据",
    procedure_history: "PCI术后", current_medications: "按当日医嘱核对", drug_allergies: "未提供",
    exercise_precautions: "出现胸痛、明显气促、头晕时立即停止", referral_source: "院内转介", discharge_date: "",
    planned_rehab_date: "", risk_level: risk, rehab_group: "运动康复组", rehab_stage: "冠心病2期",
    consent_status: "已签署", consent_time: now, consent_method: "纸质", height_cm: "168", weight_kg: "65",
    record_note: "脱敏演示种子数据", clinical_confirmed: true, clinical_confirmed_by: "王医生",
    clinical_confirmed_role: "DOCTOR", clinical_confirmed_at: now, created_by: "周康复师", created_at: now,
    updated_by: "system-seed", updated_at: now, audit_log: [`${now} 创建脱敏演示场景`],
    assessment: { cpet: "未提供", six_mwt: "未提供", resting_hr: 72 }, prescription_version: "",
    training_status: "", latest_abnormal: "", report_status: "", last_followup: "", patient_status: workflow
  };
}

function prescription(id: string, no: string, source: string, target: ReturnType<typeof patient>) {
  const now = new Date().toISOString();
  const draft = { summary: "AI依据患者基础资料与体能评估生成草稿，已由医生逐项复核。", items: exerciseItems };
  return {
    id, prescriptionNo: no, patientId: target.patient_demo_id, patientNo: target.patient_no, patientName: target.name,
    age: target.age, risk: target.risk_level, rehabStage: target.rehab_stage, diagnosis: target.diagnosis_summary,
    specialMedication: target.current_medications, assignedDoctorId: "doctor001", assignedDoctorName: "王医生",
    version: "V1", kind: "initial", sourceLabel: source, generatedAt: now, status: "completed", updatedAt: now,
    aiSuggestion: draft, doctorFinal: draft, plannedSessions: 12, cycleEndDate: addDays(now.slice(0, 10), 60), signedBy: "王医生", signedAt: now
  };
}

function content() {
  return {
    height: "168", contact: "138****0000", rehabGoals: ["安全完成院内运动康复"],
    breathingModes: ["腹式呼吸"], breathingIntensity: "舒适节律", breathingFrequency: "1次/日", breathingTime: "10分钟",
    warmupModes: ["关节活动"], warmupIntensity: "低强度", warmupFrequency: "每次", warmupTime: "5分钟",
    aerobicModes: ["功率车"], aerobicIntensity: "目标心率100-116 bpm；48-62W", aerobicFrequency: "3次/周", aerobicTime: "30分钟",
    resistanceModes: ["哑铃力量"], resistanceIntensity: "2组×10次", resistanceFrequency: "2次/周", resistanceTime: "15分钟",
    flexibilityModes: ["全身柔韧训练"], flexibilityIntensity: "无痛舒适范围", flexibilityFrequency: "每次", flexibilityTime: "10分钟",
    notes: "训练前后评估并记录异常处置", inheritedFields: ["患者基础档案", "SPPB评估"]
  };
}

function appointment(id: string, date: string, time: string, target: ReturnType<typeof patient>, rx: ReturnType<typeof prescription>, status: string) {
  return {
    id, date, time, patientId: target.patient_demo_id, patientNo: target.patient_no, patientName: target.name,
    risk: target.risk_level, status, project: "综合运动康复", station: "综合训练区01", doctorId: "doctor001",
    doctorName: "王医生", therapistId: "rehab001", therapistName: "周康复师", note: exerciseItems.map((item) => item.project).join("、"),
    source: "local", prescriptionTaskId: rx.id, prescriptionVersion: rx.version, plannedSessions: 12,
    createdBy: "system-seed", createdAt: `${date}T${time}:00+08:00`, updatedBy: "system-seed", updatedAt: new Date().toISOString()
  };
}

function encounter(id: string, apt: ReturnType<typeof appointment>, rx: ReturnType<typeof prescription>, status: string, taskStatuses: string[]) {
  const now = new Date().toISOString();
  const tasks = exerciseItems.map((item, index) => ({
    taskId: `${id}-TASK-${index + 1}`, category: item.category, exerciseName: item.project, exerciseKey: item.exerciseKey,
    order: index + 1, status: taskStatuses[index] ?? "pending", startedAt: taskStatuses[index] === "in_progress" || taskStatuses[index] === "completed" ? now : undefined,
    completedAt: taskStatuses[index] === "completed" ? now : undefined
  }));
  return {
    encounterId: id, appointmentId: apt.id, patientId: apt.patientId, patientNo: apt.patientNo, patientName: apt.patientName,
    prescriptionTaskId: rx.id, prescriptionVersion: rx.version, treatmentId: `TREAT-${id}`, station: apt.station, project: apt.project,
    therapist: "周康复师", status, adjustments: [], paperSignatureStatus: status === "completed" ? "archived" : "not_required",
    checkedInAt: now, trainingStartedAt: ["in_training", "completed"].includes(status) ? now : undefined,
    trainingEndedAt: status === "completed" ? now : undefined, postAssessmentCompletedAt: status === "completed" ? now : undefined,
    signedAt: status === "completed" ? now : undefined, dailyTrainingTasks: tasks,
    activeTrainingTaskId: tasks.find((task) => task.status === "in_progress")?.taskId, updatedAt: now,
    liveMetrics: status === "in_training" ? { heartRate: 106, speedKmh: 18.2, distanceKm: 1.4, powerW: 52, cadenceRpm: 62, resistanceLevel: 4, spo2: 97, bloodPressure: "126/78", caloriesKcal: 26, elapsedSeconds: 480, phase: "training", paused: false, sampledAt: now } : undefined
  };
}

function assessment(id: string, target: ReturnType<typeof patient>) {
  const now = new Date().toISOString();
  return {
    assessmentId: id, patientId: target.patient_demo_id, status: "completed", assessedAt: now, completedAt: now,
    enteredBy: "周康复师", therapist: "周康复师", weightKg: 65,
    preVitals: { bloodPressure: "126/78", pulse: 72, spo2: 98 }, postVitals: { bloodPressure: "132/80", pulse: 86, spo2: 97 },
    sppb: { totalScore: 10, balance: { score: 4 }, walk4m: { score: 3 }, chairStand: { score: 3 } },
    muscleStrength: { upperLimb: "4级", lowerLimb: "4级" }, notes: "SPPB已完成，待医生评估。"
  };
}

function treatment(enc: ReturnType<typeof encounter>, completed: boolean) {
  const blankVitals = { bloodPressure: completed ? "128/78" : "", heartRate: completed ? 76 : null, spo2: completed ? 98 : null, respiratoryRate: completed ? 18 : null, rhythm: completed ? "窦性心律" : "", measuredAt: completed ? "09:00" : "" };
  return {
    treatmentId: enc.treatmentId, encounterId: enc.encounterId, appointmentId: enc.appointmentId, patientId: enc.patientId,
    patientNo: enc.patientNo, treatmentNo: `CRH-${enc.encounterId}`, treatmentAt: new Date().toISOString(), diagnosis: "冠心病 PCI 术后康复期",
    source: "人工录入", preAssessment: { ...blankVitals, chestPainRestVas: completed ? 0 : null, chestPainActivityVas: completed ? 0 : null, edema: completed ? "无" : "", posturalPainChange: "", chestDrainage: "", lifeSupportDevice: "", respiratorySymptoms: "", assistiveDevice: "" },
    interventions: exerciseItems.map((item) => ({ code: item.exerciseKey, label: item.project, selected: completed })),
    postAssessment: { ...blankVitals, heartRate: completed ? 102 : null, borg: completed ? 11 : null, symptomChange: completed ? "训练后状态稳定" : "" },
    treatmentSummary: completed ? "完成处方训练并完成训练后评估。" : "", actualMetrics: {}, adverseEvent: completed ? "训练中一过性心率偏高，处置后恢复。" : "",
    fieldAction: completed ? "暂停训练、复测并降低负荷后完成。" : "", therapist: "周康复师", patientAcknowledged: completed,
    paperSignatureStatus: completed ? "archived" : "not_required", status: completed ? "completed" : "draft",
    signature: completed ? { mode: "manual", signerRole: "REHAB_EXECUTION", signerName: "周康复师", treatmentAt: new Date().toISOString(), signedAt: new Date().toISOString() } : undefined
  };
}

export function createDemoFixture() {
  const parts = shanghaiParts();
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  const patients = [
    patient("P-LXX-001", "P-256572", "鲁萱萱", 54, "中危", "prescription_opened"),
    patient("P-SEED-002", "P-260002", "林晓梅", 61, "低危", "confirmed"),
    patient("P-SEED-003", "P-260003", "赵明远", 58, "中危", "confirmed"),
    patient("P-SEED-004", "P-260004", "陈静", 63, "中危", "rehabilitation"),
    patient("P-SEED-005", "P-260005", "王海峰", 56, "中危", "rehabilitation"),
    patient("P-SEED-006", "P-260006", "周安", 67, "高危", "recovered")
  ];
  const [lu, , assessed, arrived, training, completed] = patients;
  const prescriptions = [
    prescription("RX-LXX-001", "RX-256572-0001", "体能评估/SPPB", lu),
    prescription("RX-SEED-004", "RX-260004-0001", "SPPB与医生评估", arrived),
    prescription("RX-SEED-005", "RX-260005-0001", "SPPB与医生评估", training),
    prescription("RX-SEED-006", "RX-260006-0001", "SPPB与阶段评估", completed)
  ];
  const [rxLu, rxArrived, rxTraining, rxCompleted] = prescriptions;
  const appointments = [
    appointment(`APT-${date.replaceAll("-", "")}-001`, date, time, lu, rxLu, "pending"),
    appointment(`APT-${date.replaceAll("-", "")}-004`, date, time, arrived, rxArrived, "arrived"),
    appointment(`APT-${date.replaceAll("-", "")}-005`, date, time, training, rxTraining, "in_training"),
    appointment(`APT-${date.replaceAll("-", "")}-006`, date, time, completed, rxCompleted, "completed")
  ];
  const encounters = [
    encounter("ENC-SEED-004", appointments[1], rxArrived, "pre_assessment", ["pending", "pending", "pending", "pending"]),
    encounter("ENC-SEED-005", appointments[2], rxTraining, "in_training", ["pending", "in_progress", "pending", "pending"]),
    encounter("ENC-SEED-006", appointments[3], rxCompleted, "completed", ["completed", "completed", "completed", "completed"])
  ];
  appointments.slice(1).forEach((apt, index) => Object.assign(apt, { encounterId: encounters[index].encounterId }));
  const assessments = [assessment("SPPB-SEED-003", assessed), assessment("SPPB-SEED-004", arrived), assessment("SPPB-SEED-005", training), assessment("SPPB-SEED-006", completed)];
  const treatments = [treatment(encounters[0], false), treatment(encounters[1], false), treatment(encounters[2], true)];
  const now = new Date().toISOString();
  const trainingSession = {
    id: "SESSION-SEED-006", encounterId: "ENC-SEED-006", appointmentId: appointments[3].id, treatmentId: encounters[2].treatmentId,
    patientId: completed.patient_demo_id, executionId: "EXEC-SEED-006", singleReportId: "SINGLE-SEED-006", actualSessionSequence: 6,
    exerciseItems: exerciseItems.map((item) => item.project), exerciseType: "综合运动康复", trainingMode: "连续训练", prescriptionTaskId: rxCompleted.id,
    prescriptionVersion: "V1", source: "prescription", date, actualStartAt: now, actualEndAt: now, completed: true, totalMinutes: 55,
    wearingMinutes: 55, sensorValidMinutes: 53, activeMinutes: 48, targetZoneMinutes: 35, avgHr: 106, peakHr: 142, avgPower: 50,
    peakPower: 62, distanceKm: 7.8, caloriesKcal: 190, rpe: 11, symptom: "无持续不适", pauses: 1, terminatedEarly: false,
    dataCompleteness: 96, preBp: "128/78", postBp: "132/80", preHr: 72, postHr: 92, preSpo2: 98, postSpo2: 97,
    avgSpo2: 97, minSpo2: 95, preRespRate: 18, postRespRate: 20, avgRespRate: 19, safetyEvents: ["一过性心率偏高"],
    fieldNote: "暂停复测后降低负荷继续", recordedBy: "周康复师", recordedAt: now
  };
  const singleReport = {
    id: "SINGLE-SEED-006", singleReportId: "SINGLE-SEED-006", singleReportNo: "SR-260006-006", encounterId: "ENC-SEED-006",
    patientId: completed.patient_demo_id, patientNo: completed.patient_no, prescriptionVersionId: "V1", actualStartAt: now,
    exercise: "综合运动康复", trainingType: "连续训练", totalMinutes: 55, activeMinutes: 48, invalidMinutes: 7, targetZoneMinutes: 35,
    targetZoneRate: 73, status: "已完成", safetySummary: "一过性心率偏高，处置后恢复", dataMode: "demo", dataSourceNote: "脱敏演示种子数据",
    clinicalSnapshot: { patientId: completed.patient_demo_id, name: completed.name, age: completed.age, sex: completed.gender, weightKg: 65, bmi: 23,
      riskLevel: completed.risk_level, medicalHistory: completed.medical_history, diagnosis: completed.diagnosis_summary,
      specialMedications: ["按当日医嘱核对"], patientFriendlySummary: "本次训练整体完成，异常经现场处置后恢复。" },
    hrStats: { resting: 72, average: 106, peak: 142, targetRange: [100, 116], targetZoneMinutes: 35, aboveTargetMinutes: 2 },
    bpMeasurements: [{ phase: "训练前", value: "128/78", measuredAt: now }, { phase: "训练后", value: "132/80", measuredAt: now }],
    phaseVitals: [{ metric: "心率", warmup: "88", training: "106", cooldown: "92" }, { metric: "SpO2", warmup: "98%", training: "97%", cooldown: "97%" }],
    ecgSummary: "未见持续性异常节律", spo2Summary: "最低95%", executionSummary: "完成4项训练任务", sampleSeries: [], reportStage: "complete",
    sourceSessionId: trainingSession.id, rpe: 11, dataCompleteness: 96, recordedBy: "周康复师"
  };
  const stageReport = {
    reportId: "STAGE-SEED-006", id: "STAGE-SEED-006", reportNo: "STG-260006-001", patientId: completed.patient_demo_id,
    prescriptionTaskId: rxCompleted.id, version: 1, status: "sent", generatedAt: now, generatedBy: "系统", periodStart: addDays(date, -30), periodEnd: date,
    selectedSessionIds: [trainingSession.id], patientSnapshot: { patientId: completed.patient_demo_id, patientNo: completed.patient_no, name: completed.name,
      age: completed.age, medicalHistory: completed.medical_history, diagnosis: completed.diagnosis_summary, procedureHistory: completed.procedure_history,
      specialMedications: completed.current_medications, drugAllergies: completed.drug_allergies, exercisePrecautions: completed.exercise_precautions, riskLevel: completed.risk_level },
    aggregate: { sessionCount: 1, totalActiveMinutes: 48, exerciseTypes: ["综合运动康复"], averageHeartRate: 106, averageRpe: 11, abnormalCount: 1, dataCompleteness: 96 },
    patientStageConclusion: { headline: "已完成本阶段训练", plainSummary: "整体耐受稳定，继续遵医嘱训练。", toleranceChange: { label: "运动耐量", value: "稳定", basis: "本阶段训练记录" },
      vitalsStability: { bp: "稳定", spo2: "稳定", summary: "训练后恢复良好" }, beforeAfterComparison: [], dietAdvice: ["少盐少油"], dailyCautions: ["按时服药"], stopAndContactRules: ["胸痛或明显气促立即停止并联系医护"] },
    clinicalConclusion: { summary: "阶段训练完成", achievedGoals: ["完成处方任务"], pendingGoals: ["持续提高耐量"], nextPrescription: "医生复核后调整", reassessment: "按计划复评SPPB", nextFollowUp: "7日内电话随访" },
    safetyEvents: [{ sessionId: trainingSession.id, text: "一过性心率偏高" }], updatedAt: now, missingFields: [], confirmedBy: "王医生", confirmedAt: now, sentBy: "王医生", sentAt: now
  };
  const alert = { id: "ALERT-SEED-006", patientId: completed.patient_demo_id, patientName: completed.name, encounterId: "ENC-SEED-006", sessionId: trainingSession.id,
    type: "心率偏高", severity: "warning", value: "142 bpm", threshold: ">140 bpm", status: "closed", occurredAt: now,
    snapshot: "功率车训练阶段；HR 142 bpm；SpO2 96%", onSiteRecord: "暂停训练、复测并降低负荷后继续", assignedTherapist: "周康复师" };
  const followUp = { id: "FOLLOWUP-SEED-006", patientId: completed.patient_demo_id, assignedDoctor: "王医生", milestoneMonth: 1,
    originalPlannedDate: addDays(date, 7), currentDueDate: addDays(date, 7), reminderDate: addDays(date, 6), status: "due", rescheduleHistory: [] };
  const profiles = patients.map((item) => ({ patientId: item.patient_demo_id, heightCm: 168, weightKg: 65, bmi: 23, rehabAssessment: { status: assessments.some((a) => a.patientId === item.patient_demo_id) ? "已复核" : "待补充" }, updatedBy: "system-seed", updatedAt: now }));
  const documents: Record<string, unknown> = {
    "xinkang-patients": patients,
    "xinkang-assessments": assessments,
    "xinkang-prescription-tasks": prescriptions,
    "xinkang-prescription-contents": Object.fromEntries(prescriptions.map((rx) => [rx.id, content()])),
    "xinkang-appointments": appointments,
    "xinkang-training-encounters": encounters,
    "xinkang-treatments": treatments,
    "xinkang-training-sessions": [trainingSession],
    "xinkang-single-reports": [singleReport],
    "xinkang-stage-reports": [stageReport],
    "xinkang-alert-events": [alert],
    "xinkang-alert-rules": [],
    "xinkang-rehab-reports": [],
    "xinkang-followup-tasks": [followUp],
    "xinkang-followup-records": [],
    "xinkang-patient-clinical-profiles": profiles,
    "xinkang-clinical-narratives": [],
    "xinkang-training-videos": trainingVideoFixtures
  };
  return { date, time, patients, prescriptions, appointments, encounters, alert, followUp, documents };
}
