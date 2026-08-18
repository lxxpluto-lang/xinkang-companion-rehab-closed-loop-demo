import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  ArrowLeft,
  ArrowRight,
  Bike,
  Bluetooth,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleStop,
  Clock3,
  Dumbbell,
  FileText,
  Gauge,
  HeartPulse,
  House,
  IdCard,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Stethoscope,
  Tablet,
  ThermometerSun,
  TrendingUp,
  UserRound,
  Volume2,
  Waves,
  Wifi,
  X
} from "lucide-react";
import type { TrainingState } from "../types";
import type { FollowUpTask } from "../followUpData";
import type { RehabReport } from "../dischargeHandbookData";
import type { PublishedTrainingVideo } from "../pages/VideoLibraryPage";
import {
  announceHeartRateAlert,
  announcePhase,
  announceRecovery,
  phaseAnnouncements,
  stopAudioGuidance
} from "../utils/audioGuidance";
import { stageReportData, summarizeVersion } from "./stageReportData";
import type { PrescriptionVersion, VersionSummary } from "./stageReportData";
import { clinicalSnapshotChen, getPrescriptionVersionDetail, getSingleTrainingReportDetail, patientMasterChen, singleTrainingReportDetails } from "../clinicalSharedData";
import { getTodayPlan, planTotalMinutes, type PrescriptionExerciseStatus, type PrescriptionPlan } from "../prescriptionPlanData";
import { formatDateTime } from "../utils/dateTime";
import { demoDischargeHandbook } from "../dischargeHandbookData";
import type { PrescriptionContent } from "../prescriptionWorkspaceData";
import { createStoredTrainingSession, displayReportList, displayReportValue, type StoredSingleReport, type StoredStageReport, type StoredTrainingSession } from "../reportData";
import type { PrescriptionTask } from "../clinicalWorkflowData";
import type { DailyTrainingTask, DailyTrainingTaskStatus, LiveTrainingAlert, LiveTrainingMetrics, TrainingEncounter } from "../trainingEncounterData";
import type { ManagedPatient } from "../pages/PatientArchivePage";
import { normalizeDeviceLoginCode, readDeviceHandoff, updateDeviceHandoff, type DeviceHandoff } from "../deviceHandoffData";

type PatientAppProps = {
  onExit: () => void;
  trainingState: TrainingState;
  setTrainingState: (state: TrainingState) => void;
  anomaly: boolean;
  setAnomaly: (value: boolean) => void;
  publishedTrainingVideos: PublishedTrainingVideo[];
  followUpTasks: FollowUpTask[];
  rehabReports?: RehabReport[];
  singleReports?: StoredSingleReport[];
  stageReports?: StoredStageReport[];
  trainingSessions?: StoredTrainingSession[];
  patients: ManagedPatient[];
  trainingEncounters: TrainingEncounter[];
  prescriptionTasks: PrescriptionTask[];
  prescriptionContents: Record<string, PrescriptionContent>;
  onUpdateEncounter: (encounterId: string, patch: Partial<TrainingEncounter>) => void;
  onSaveTrainingSession: (session: StoredTrainingSession) => void;
};

type PatientTrainingMetrics = {
  completedCount: number;
  currentMonthCount: number;
  totalActiveMinutes: number;
  latestDate: string;
};

type View =
  | "login"
  | "home"
  | "calendar"
  | "report"
  | "profile"
  | "prescription"
  | "devices"
  | "bp"
  | "training"
  | "videoTraining"
  | "result";

type Exercise =
  | "diaphragmatic"
  | "mindfulness"
  | "bike"
  | "elliptical"
  | "dumbbell"
  | "resistanceBand"
  | "flexibilityUpper"
  | "flexibilityLower"
  | "flexibilityFull"
  | "baduanjin"
  | "taichi";
type TrainingType = "continuous" | "interval";
type BpMode = "twice" | "multiple" | "none";
type Phase = "warmup" | "training" | "cooldown";
type LocalBikeVideo = {
  id: string;
  title: string;
  url: string;
  source?: "local" | "link";
};

const localBikeVideoFile = "云逛魔都 4K HDR ｜ 沉浸式体验陆家嘴滨江骑行：南浦大桥到杨浦大桥 [BV1HKgX6LEe1].mp4";
const localBikeVideoFallback: LocalBikeVideo = {
  id: "VIDEO-BIKE-LOCAL-BV1HKgX6LEe1",
  title: "云逛魔都 4K HDR ｜沉浸式滨江骑行",
  source: "local",
  url: `/local-training-videos/${encodeURIComponent(localBikeVideoFile)}`
};

const exerciseVideoSubtypes: Partial<Record<Exercise, string>> = {
  diaphragmatic: "腹式呼吸",
  mindfulness: "正念呼吸",
  elliptical: "椭圆机",
  dumbbell: "哑铃",
  resistanceBand: "弹力带",
  flexibilityUpper: "上肢拉伸",
  flexibilityLower: "下肢拉伸",
  flexibilityFull: "全身柔韧",
  baduanjin: "八段锦",
  taichi: "太极拳"
};

const patient = {
  name: patientMasterChen.name,
  code: patientMasterChen.patientNo,
  sex: patientMasterChen.sex,
  age: patientMasterChen.age,
  group: patientMasterChen.rehabGroup,
  stage: patientMasterChen.rehabStage,
  risk: patientMasterChen.clinicalSnapshot.riskLevel,
  sessions: patientMasterChen.planSessions,
  completed: patientMasterChen.completedSessions
};

type PatientIdentity = typeof patient;

type DevicePrescription = {
  version: string;
  prescriptionNo: string;
  physician: string;
  trainingType: TrainingType;
  targetHr: [number, number];
  targetPower: [number, number];
  warmupMinutes: number;
  trainingMinutes: number;
  cooldownMinutes: number;
  exerciseCautions: string;
  stopConditions: string;
};

const activePrescription = getPrescriptionVersionDetail("V4");
const todayPrescriptionPlan = getTodayPlan(patientMasterChen.patientId);
const planExerciseMap: Record<string, Exercise> = {
  "腹式呼吸": "diaphragmatic",
  "正念呼吸": "mindfulness",
  "功率车": "bike",
  "慢走": "elliptical",
  "椭圆机": "elliptical",
  "哑铃": "dumbbell",
  "弹力带": "resistanceBand",
  "八段锦": "baduanjin",
  "太极拳": "taichi"
};
const prescribedTrainingType: TrainingType = activePrescription.trainingType === "间歇训练" ? "interval" : "continuous";
const prescribedTargetHr = Math.round((activePrescription.targetHr[0] + activePrescription.targetHr[1]) / 2);

const flow = [
  ["prescription", "核对本次训练"],
  ["devices", "连接设备"],
  ["bp", "血压模式"],
  ["training", "开始训练"]
] as const;

export function PatientApp({
  onExit,
  trainingState,
  setTrainingState,
  anomaly,
  setAnomaly,
  publishedTrainingVideos
  ,followUpTasks
  ,rehabReports = []
  ,singleReports = []
  ,stageReports = []
  ,trainingSessions = []
  ,patients
  ,trainingEncounters
  ,prescriptionTasks
  ,prescriptionContents
  ,onUpdateEncounter
  ,onSaveTrainingSession
}: PatientAppProps) {
  const [view, setView] = useState<View>("login");
  const [authenticatedPatientId, setAuthenticatedPatientId] = useState<string | null>(null);
  const [authenticatedEncounterId, setAuthenticatedEncounterId] = useState<string | null>(null);
  const [remoteHandoff, setRemoteHandoff] = useState<DeviceHandoff | null>(null);
  const [exercise, setExercise] = useState<Exercise>("bike");
  const [trainingType, setTrainingType] = useState<TrainingType>(prescribedTrainingType);
  const [targetHr, setTargetHr] = useState(prescribedTargetHr);
  const [targetPowerMin, setTargetPowerMin] = useState(activePrescription.targetPower[0]);
  const [targetPowerMax, setTargetPowerMax] = useState(activePrescription.targetPower[1]);
  const [warmup, setWarmup] = useState(activePrescription.warmupMinutes);
  const [mainMinutes, setMainMinutes] = useState(activePrescription.trainingMinutes);
  const [cooldown, setCooldown] = useState(activePrescription.cooldownMinutes);
  const [repeats] = useState(1);
  const [backpack, setBackpack] = useState(false);
  const [bikeConnected, setBikeConnected] = useState(false);
  const [bpMode, setBpMode] = useState<BpMode | null>(null);
  const [phase, setPhase] = useState<Phase>("warmup");
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [measuredBp, setMeasuredBp] = useState("126 / 78");
  const [measuredBpTime, setMeasuredBpTime] = useState("09:18");
  const [reportToOpen, setReportToOpen] = useState<string | null>(null);
  const [lastGeneratedSessionId, setLastGeneratedSessionId] = useState<string | null>(null);
  const [bikeTrainingVideos, setBikeTrainingVideos] = useState<LocalBikeVideo[]>([localBikeVideoFallback]);
  const [selectedBikeVideo, setSelectedBikeVideo] = useState<LocalBikeVideo | null>(localBikeVideoFallback);
  const [planItemStatuses, setPlanItemStatuses] = useState<Record<string, PrescriptionExerciseStatus>>(() => Object.fromEntries(todayPrescriptionPlan.items.map((item) => [item.itemId, item.status])));
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [sessionOutcome, setSessionOutcome] = useState<"completed" | "partially_completed" | "interrupted">("completed");
  const [subjectiveFeeling, setSubjectiveFeeling] = useState<number | null>(null);
  const lastRemoteUpdateRef = useRef("");
  const latestLiveMetricsRef = useRef<LiveTrainingMetrics | null>(null);
  const activeTaskIdRef = useRef<string | null>(null);
  const authenticatedEncounter = trainingEncounters.find((item) => item.encounterId === authenticatedEncounterId)
    ?? (remoteHandoff && remoteHandoff.encounter.encounterId === authenticatedEncounterId ? remoteHandoff.encounter : undefined);
  const authenticatedPatient = patients.find((item) => item.patient_demo_id === authenticatedPatientId)
    ?? (remoteHandoff && remoteHandoff.patient.patient_demo_id === authenticatedPatientId ? remoteHandoff.patient : undefined);
  const authenticatedPrescriptionTask = prescriptionTasks.find((item) => item.id === authenticatedEncounter?.prescriptionTaskId)
    ?? (remoteHandoff && remoteHandoff.prescriptionTask.id === authenticatedEncounter?.prescriptionTaskId ? remoteHandoff.prescriptionTask : undefined);
  const authenticatedPrescriptionContent = authenticatedPrescriptionTask
    ? prescriptionContents[authenticatedPrescriptionTask.id] ?? (remoteHandoff?.prescriptionTask.id === authenticatedPrescriptionTask.id ? remoteHandoff.prescriptionContent : undefined)
    : undefined;
  const devicePrescription = getDevicePrescription(authenticatedPrescriptionTask, authenticatedPrescriptionContent);
  const patientIdentity: PatientIdentity = authenticatedPatient ? {
    name: authenticatedPatient.name,
    code: authenticatedPatient.patient_no,
    sex: authenticatedPatient.gender || "未提供",
    age: authenticatedPatient.age,
    group: authenticatedPatient.rehab_group || authenticatedPrescriptionTask?.risk || "未分组",
    stage: authenticatedPatient.rehab_stage || authenticatedPrescriptionTask?.rehabStage || "未提供",
    risk: authenticatedPatient.risk_level || authenticatedPrescriptionTask?.risk || "未分层",
    sessions: authenticatedPrescriptionTask?.plannedSessions ?? patient.sessions,
    completed: trainingSessions.filter((item) => item.patientId === authenticatedPatient.patient_demo_id && item.completed).length
  } : patient;
  const selectedTrainingVideo = publishedTrainingVideos.find((video) => video.subtype === exerciseVideoSubtypes[exercise]) ?? publishedTrainingVideos[0] ?? null;
  const completedPatientSessions = trainingSessions.filter((item) => item.completed && (!authenticatedPatientId || item.patientId === authenticatedPatientId)).sort((a, b) => a.actualStartAt.localeCompare(b.actualStartAt));
  const currentMonth = new Date().toISOString().slice(0, 7);
  const latestSessionDate = completedPatientSessions.at(-1)?.date ?? completedPatientSessions.at(-1)?.actualStartAt.slice(0, 10) ?? "";
  const patientTrainingMetrics: PatientTrainingMetrics = {
    completedCount: completedPatientSessions.length || patientIdentity.completed,
    currentMonthCount: completedPatientSessions.filter((item) => (item.date || item.actualStartAt).startsWith(currentMonth)).length,
    totalActiveMinutes: completedPatientSessions.reduce((sum, item) => sum + item.activeMinutes, 0),
    latestDate: latestSessionDate ? formatPatientDate(latestSessionDate) : "未记录"
  };
  const patientSingleReports = singleReports.filter((item) => !authenticatedPatientId || item.patientId === authenticatedPatientId);
  const patientStageReports = stageReports.filter((item) => !authenticatedPatientId || item.patientId === authenticatedPatientId);
  const patientTrainingSessions = trainingSessions.filter((item) => !authenticatedPatientId || item.patientId === authenticatedPatientId);
  const patientRehabReports = rehabReports.filter((report) => (!authenticatedPatientId || report.patientId === authenticatedPatientId) && report.status === "published");
  const activeTodayPlan = getTodayPlan(authenticatedPatientId ?? patientMasterChen.patientId);
  const dailyTrainingTasks = authenticatedEncounter?.dailyTrainingTasks ?? [];

  const totalMinutes = warmup + mainMinutes * repeats + cooldown;
  useEffect(() => {
    if (view !== "training" || paused || trainingState !== "running") return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [view, paused, trainingState]);

  useEffect(() => () => stopAudioGuidance(), []);

  useEffect(() => {
    if (authenticatedEncounter?.status === "paused") {
      setPaused(true);
      setTrainingState("paused");
    } else if (authenticatedEncounter?.status === "in_training") {
      setPaused(false);
      setTrainingState("running");
    }
  }, [authenticatedEncounter?.status]);

  useEffect(() => {
    let active = true;
    fetch("/api/training-videos", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`视频目录读取失败：${response.status}`);
        return response.json() as Promise<LocalBikeVideo[]>;
      })
      .then((videos) => {
        if (active) {
          const localVideos = videos.map((video) => ({ ...video, source: "local" as const }));
          setBikeTrainingVideos(localVideos.length ? localVideos : [localBikeVideoFallback]);
        }
      })
      .catch(() => {
        if (active) {
          setBikeTrainingVideos([localBikeVideoFallback]);
          setSelectedBikeVideo(localBikeVideoFallback);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authenticatedEncounterId || !authenticatedEncounter?.patientNo) return;
    const timer = window.setInterval(() => {
      void readDeviceHandoff(authenticatedEncounter.patientNo).then((handoff) => {
        if (!handoff || handoff.encounter.encounterId !== authenticatedEncounterId) return;
        const remoteUpdateChanged = handoff.updatedAt !== lastRemoteUpdateRef.current;
        lastRemoteUpdateRef.current = handoff.updatedAt;
        const remote = handoff.encounter;
        setRemoteHandoff(handoff);
        const localTaskKey = authenticatedEncounter.dailyTrainingTasks?.map((item) => `${item.taskId}:${item.status}`).join("|") ?? "";
        const remoteTaskKey = remote.dailyTrainingTasks?.map((item) => `${item.taskId}:${item.status}`).join("|") ?? "";
        const controlChanged = remote.status !== authenticatedEncounter.status
          || remote.activeTrainingTaskId !== authenticatedEncounter.activeTrainingTaskId
          || remoteTaskKey !== localTaskKey
          || remote.dayEndedAt !== authenticatedEncounter.dayEndedAt
          || remote.wearableConnectedAt !== authenticatedEncounter.wearableConnectedAt
          || remote.trainingDeviceConnectedAt !== authenticatedEncounter.trainingDeviceConnectedAt
          || remote.liveAlert?.updatedAt !== authenticatedEncounter.liveAlert?.updatedAt;
        if (controlChanged) onUpdateEncounter(authenticatedEncounterId, remote);
        if (remote.status === "paused") {
          setPaused(true);
          setTrainingState("paused");
        } else if (remote.status === "in_training") {
          setPaused(false);
          setTrainingState("running");
        }
        if (remote.status === "awaiting_next_task" && remoteUpdateChanged) {
          stopAudioGuidance();
          setPaused(false);
          const nextTask = remote.dailyTrainingTasks?.find((item) => item.status === "pending");
          if (nextTask) setExercise(nextTask.exerciseKey as Exercise);
          setView((current) => ["report", "profile", "calendar"].includes(current) ? current : "home");
        }
        if (["post_assessment", "pending_signature", "completed", "terminated"].includes(remote.status) && remoteUpdateChanged) {
          stopAudioGuidance();
          setView((current) => ["report", "profile", "calendar"].includes(current) ? current : "home");
        }
      }).catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [authenticatedEncounterId, authenticatedEncounter?.patientNo, authenticatedEncounter?.status, authenticatedEncounter?.activeTrainingTaskId, authenticatedEncounter?.dayEndedAt]);

  function chooseRandomBikeVideo(avoidId?: string) {
    if (!bikeTrainingVideos.length) {
      setSelectedBikeVideo(null);
      return;
    }
    const candidates = bikeTrainingVideos.length > 1 && avoidId
      ? bikeTrainingVideos.filter((video) => video.id !== avoidId)
      : bikeTrainingVideos;
    setSelectedBikeVideo(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  useEffect(() => {
    if (view !== "training" || selectedBikeVideo || !bikeTrainingVideos.length) return;
    setSelectedBikeVideo(bikeTrainingVideos[Math.floor(Math.random() * bikeTrainingVideos.length)]);
  }, [bikeTrainingVideos, selectedBikeVideo, view]);

  function syncActiveEncounter(patch: Partial<TrainingEncounter>) {
    if (!authenticatedEncounterId || !authenticatedEncounter) return;
    onUpdateEncounter(authenticatedEncounterId, patch);
    setRemoteHandoff((current) => current && current.encounter.encounterId === authenticatedEncounterId
      ? { ...current, encounter: { ...current.encounter, ...patch, updatedAt: new Date().toISOString() }, updatedAt: new Date().toISOString() }
      : current);
    void updateDeviceHandoff(authenticatedEncounter.patientNo, patch).then((handoff) => { lastRemoteUpdateRef.current = handoff.updatedAt; }).catch(() => undefined);
  }

  function syncLiveMetrics(metrics: LiveTrainingMetrics) {
    if (!authenticatedEncounter) return;
    latestLiveMetricsRef.current = metrics;
    void updateDeviceHandoff(authenticatedEncounter.patientNo, { liveMetrics: metrics }).catch(() => undefined);
  }

  function saveTaskSession(encounter: TrainingEncounter, task: DailyTrainingTask, outcome: "completed" | "partially_completed" | "interrupted", metrics = latestLiveMetricsRef.current, sequence?: number, makeLatest = true) {
    const sessionId = `SESSION-${task.taskId}`;
    const existingSession = trainingSessions.find((item) => item.id === sessionId);
    if (existingSession) {
      if (!singleReports.some((item) => item.id === sessionId || item.sourceSessionId === sessionId)) onSaveTrainingSession(existingSession);
      if (makeLatest) setLastGeneratedSessionId(sessionId);
      return sessionId;
    }
    const recordedMetrics = task.recordedMetrics;
    const endedAt = task.completedAt ?? recordedMetrics?.recordedAt ?? metrics?.sampledAt ?? new Date().toISOString();
    const elapsedSeconds = Math.max(1, metrics?.elapsedSeconds ?? recordedMetrics?.recordedSeconds ?? elapsed);
    const activeMinutes = Number((elapsedSeconds / 60).toFixed(1));
    const totalMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
    const heartRate = metrics?.heartRate ?? recordedMetrics?.lastHeartRate ?? 0;
    const spo2 = metrics?.spo2 ?? recordedMetrics?.lastSpo2 ?? 0;
    const startedAt = task.startedAt ?? new Date(new Date(endedAt).getTime() - elapsedSeconds * 1000).toISOString();
    const baseSession = createStoredTrainingSession({
      encounterId: encounter.encounterId,
      appointmentId: encounter.appointmentId,
      treatmentId: encounter.treatmentId,
      patientId: encounter.patientId,
      exerciseType: task.exerciseName,
      trainingMode: task.exerciseKey === "bike" ? (trainingType === "continuous" ? "连续训练" : "间歇训练") : "视频跟练",
      prescriptionTaskId: encounter.prescriptionTaskId,
      prescriptionVersion: encounter.prescriptionVersion,
      actualSessionSequence: sequence ?? trainingSessions.filter((item) => item.patientId === encounter.patientId && item.completed).length + 1,
      preVitals: { bp: "", hr: "", spo2: "", rr: "" },
      postVitals: { bp: metrics?.bloodPressure === "— / —" ? "" : metrics?.bloodPressure ?? "", hr: heartRate ? String(heartRate) : "", spo2: spo2 ? String(spo2) : "", rr: "", symptoms: outcome === "interrupted" ? "训练中断" : "" },
      rpe: null,
      pauses: outcome === "interrupted" ? 1 : 0,
      terminatedEarly: outcome === "interrupted",
      recordedBy: "患者训练端",
      device: {
        hr: heartRate,
        power: metrics?.powerW ?? 0,
        cadence: metrics?.cadenceRpm ?? 0,
        durationMinutes: totalMinutes,
        activeMinutes,
        completeness: metrics || recordedMetrics ? 100 : 0
      }
    });
    const session: StoredTrainingSession = {
      ...baseSession,
      id: sessionId,
      executionId: `EXEC-${task.taskId}`,
      date: startedAt.slice(0, 10),
      actualStartAt: startedAt,
      actualEndAt: endedAt,
      distanceKm: metrics?.distanceKm ?? null,
      caloriesKcal: metrics?.caloriesKcal ?? null,
      avgSpo2: spo2 || null,
      minSpo2: spo2 || null,
      recordedAt: endedAt
    };
    onSaveTrainingSession(session);
    if (makeLatest) setLastGeneratedSessionId(sessionId);
    return sessionId;
  }

  function loginToEncounter(encounter: TrainingEncounter, handoff?: DeviceHandoff) {
    lastRemoteUpdateRef.current = handoff?.updatedAt ?? "";
    const task = handoff?.prescriptionTask ?? prescriptionTasks.find((item) => item.id === encounter.prescriptionTaskId);
    const content = handoff?.prescriptionContent ?? (task ? prescriptionContents[task.id] : undefined);
    const linkedPrescription = getDevicePrescription(task, content);
    const dailyTasks = reconcileDailyTrainingTasks(encounter, task, content);
    const activeTask = dailyTasks.find((item) => item.taskId === encounter.activeTrainingTaskId);
    const selectedTask = activeTask ?? dailyTasks.find((item) => !["completed", "skipped"].includes(item.status)) ?? dailyTasks[0];
    const enrichedEncounter = { ...encounter, dailyTrainingTasks: dailyTasks };
    setRemoteHandoff(handoff ? { ...handoff, encounter: enrichedEncounter } : null);
    setAuthenticatedPatientId(encounter.patientId);
    setAuthenticatedEncounterId(encounter.encounterId);
    activeTaskIdRef.current = activeTask?.taskId ?? null;
    setExercise((selectedTask?.exerciseKey as Exercise | undefined) ?? exerciseFromProject(encounter.project));
    setTrainingType(linkedPrescription.trainingType);
    setTargetHr(Math.round((linkedPrescription.targetHr[0] + linkedPrescription.targetHr[1]) / 2));
    setTargetPowerMin(linkedPrescription.targetPower[0]);
    setTargetPowerMax(linkedPrescription.targetPower[1]);
    setWarmup(linkedPrescription.warmupMinutes);
    setMainMinutes(linkedPrescription.trainingMinutes);
    setCooldown(linkedPrescription.cooldownMinutes);
    setBikeConnected(false);
    setBackpack(false);
    setBpMode(null);
    setElapsed(0);
    setPaused(encounter.status === "paused");
    const loginPatch: Partial<TrainingEncounter> = {
      status: encounter.status === "ready_for_device" ? "device_ready" : encounter.status,
      deviceLoggedInAt: encounter.deviceLoggedInAt ?? new Date().toISOString(),
      dailyTrainingTasks: dailyTasks
    };
    onUpdateEncounter(encounter.encounterId, loginPatch);
    void updateDeviceHandoff(encounter.patientNo, loginPatch)
      .then((saved) => { lastRemoteUpdateRef.current = saved.updatedAt; })
      .catch(() => undefined);
    const existingSessionCount = trainingSessions.filter((item) => item.patientId === encounter.patientId && item.completed).length;
    dailyTasks
      .filter((item) => ["completed", "partially_completed", "interrupted"].includes(item.status) && item.recordedMetrics)
      .forEach((item, index) => saveTaskSession(encounter, item, item.status === "completed" ? "completed" : item.status === "interrupted" ? "interrupted" : "partially_completed", null, existingSessionCount + index + 1, false));
    setView(["in_training", "paused"].includes(encounter.status) && activeTask ? activeTask.exerciseKey === "bike" ? "training" : "videoTraining" : "home");
  }

  function syncCurrentTask(status: DailyTrainingTaskStatus, encounterStatus: TrainingEncounter["status"]) {
    const now = new Date().toISOString();
    const currentTask = dailyTrainingTasks.find((item) => item.taskId === activeTaskIdRef.current)
      ?? dailyTrainingTasks.find((item) => item.taskId === authenticatedEncounter?.activeTrainingTaskId)
      ?? dailyTrainingTasks.find((item) => item.exerciseKey === exercise);
    const metrics = latestLiveMetricsRef.current;
    const nextTasks = dailyTrainingTasks.map((item) => item.taskId === currentTask?.taskId ? {
      ...item,
      status,
      startedAt: item.startedAt ?? (status === "in_progress" ? now : undefined),
      completedAt: ["completed", "partially_completed", "interrupted"].includes(status) ? now : item.completedAt,
      recordedMetrics: metrics && ["completed", "partially_completed", "interrupted"].includes(status) ? { lastHeartRate: metrics.heartRate, lastSpo2: metrics.spo2, recordedSeconds: metrics.elapsedSeconds, recordedAt: metrics.sampledAt } : item.recordedMetrics
    } : item);
    syncActiveEncounter({
      status: encounterStatus,
      dailyTrainingTasks: nextTasks,
      activeTrainingTaskId: status === "in_progress" ? currentTask?.taskId ?? "" : ""
    });
    if (status === "in_progress") activeTaskIdRef.current = currentTask?.taskId ?? null;
    else if (activeTaskIdRef.current === currentTask?.taskId) activeTaskIdRef.current = null;
    return { nextTasks, currentTask: currentTask ? nextTasks.find((item) => item.taskId === currentTask.taskId) : undefined };
  }

  function startTraining() {
    latestLiveMetricsRef.current = null;
    activeTaskIdRef.current = dailyTrainingTasks.find((item) => item.exerciseKey === "bike")?.taskId ?? null;
    syncCurrentTask("in_progress", "in_training");
    chooseRandomBikeVideo(selectedBikeVideo?.id);
    setPhase("warmup");
    setElapsed(0);
    setPaused(false);
    setTrainingState("running");
    syncActiveEncounter({ status: "in_training", trainingStartedAt: authenticatedEncounter?.trainingStartedAt ?? new Date().toISOString() });
    setView("training");
    announcePhase("warmup");
  }

  function startSelectedExercise() {
    if (exercise === "bike") {
      setView("prescription");
    } else {
      latestLiveMetricsRef.current = null;
      activeTaskIdRef.current = dailyTrainingTasks.find((item) => item.exerciseKey === exercise)?.taskId ?? null;
      syncCurrentTask("in_progress", "in_training");
      setView("videoTraining");
    }
  }

  function changePhase(nextPhase: Phase) {
    setPhase(nextPhase);
    announcePhase(nextPhase);
  }

  function changeAnomaly(nextAnomaly: boolean) {
    setAnomaly(nextAnomaly);
    syncActiveEncounter({ liveAlert: { type: "heart_rate", severity: "warning", active: nextAnomaly, message: nextAnomaly ? "心率出现异常变化，请降低强度并等待医护确认" : "心率已恢复至当前训练范围", value: `${nextAnomaly ? targetHr + 22 : targetHr} bpm`, updatedAt: new Date().toISOString() } });
    if (nextAnomaly) {
      announceHeartRateAlert();
    } else {
      announceRecovery();
    }
  }

  function finishTraining() {
    stopAudioGuidance();
    const { currentTask } = syncCurrentTask("completed", "awaiting_next_task");
    if (authenticatedEncounter && currentTask) saveTaskSession(authenticatedEncounter, currentTask, "completed");
    setSessionOutcome("completed");
    setSubjectiveFeeling(null);
    setTrainingState("completed");
    setView("result");
  }

  function interruptTraining() {
    stopAudioGuidance();
    const outcome = elapsed > 0 ? "partially_completed" : "interrupted";
    const { currentTask } = syncCurrentTask(outcome, "awaiting_next_task");
    if (authenticatedEncounter && currentTask) saveTaskSession(authenticatedEncounter, currentTask, outcome);
    setSessionOutcome(elapsed > 0 ? "partially_completed" : "interrupted");
    setSubjectiveFeeling(null);
    setTrainingState("completed");
    setView("result");
  }

  function completeVideoTraining() {
    const { nextTasks, currentTask } = syncCurrentTask("completed", "awaiting_next_task");
    if (authenticatedEncounter && currentTask) saveTaskSession(authenticatedEncounter, currentTask, "completed");
    const nextTask = nextTasks.find((item) => item.status === "pending");
    if (nextTask) setExercise(nextTask.exerciseKey as Exercise);
    setSessionOutcome("completed");
    setSubjectiveFeeling(null);
    setView("home");
  }

  function leaveVideoTraining(recordedSeconds: number) {
    const outcome = recordedSeconds > 0 ? "partially_completed" : "pending";
    const { currentTask } = syncCurrentTask(outcome, "awaiting_next_task");
    if (recordedSeconds > 0 && authenticatedEncounter && currentTask) saveTaskSession(authenticatedEncounter, currentTask, "partially_completed");
    setView("home");
  }

  function resetSession() {
    const nextTask = dailyTrainingTasks.find((item) => item.status === "pending");
    setExercise((nextTask?.exerciseKey as Exercise | undefined) ?? "bike");
    setTrainingType(prescribedTrainingType);
    setTargetHr(prescribedTargetHr);
    setTargetPowerMin(activePrescription.targetPower[0]);
    setTargetPowerMax(activePrescription.targetPower[1]);
    setWarmup(activePrescription.warmupMinutes);
    setMainMinutes(activePrescription.trainingMinutes);
    setCooldown(activePrescription.cooldownMinutes);
    setBackpack(false);
    setBikeConnected(false);
    setBpMode(null);
    setPhase("warmup");
    setElapsed(0);
    setPaused(false);
    setAnomaly(false);
    setTrainingState("ready");
    setSelectedBikeVideo(null);
    setReportToOpen(null);
    setView("home");
  }

  if (view === "login") {
    return <LoginScreen patients={patients} encounters={trainingEncounters} onExit={onExit} onLogin={loginToEncounter} />;
  }

  const mainView = view === "home" || view === "calendar" || view === "report" || view === "profile";

  return (
    <main className="ipad-stage min-h-screen" data-testid="page-VIEW-PATIENT-APP" data-patient-id={authenticatedPatientId ?? undefined}>
      <div className="patient-safe-area mx-auto flex min-h-screen max-w-[1440px] gap-3">
        <PatientSidebar
          active={view}
          patientIdentity={patientIdentity}
          onNavigate={(nextView) => {
            if (["training", "videoTraining"].includes(view)) return;
            if (nextView === "report") setReportToOpen(null);
            setView(nextView);
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <PatientHeader view={view} patientIdentity={patientIdentity} encounter={authenticatedEncounter} onExit={onExit} />
          {flow.some(([key]) => key === view) && <FlowBar view={view} />}

          <div className="min-h-0 flex-1 py-3">
          {view === "home" && (
            <HomeScreen
              exercise={exercise}
              onChoose={setExercise}
              onStart={startSelectedExercise}
              statusByItem={planItemStatuses}
              publishedTrainingVideos={publishedTrainingVideos}
              todayPlan={activeTodayPlan}
              patientPrescription={authenticatedPrescriptionContent}
              metrics={patientTrainingMetrics}
              patientIdentity={patientIdentity}
              encounter={authenticatedEncounter}
              dailyTasks={dailyTrainingTasks}
            />
          )}
          {view === "calendar" && <CalendarScreen onBack={() => setView("home")} todayPlan={activeTodayPlan} statusByItem={planItemStatuses} checkedIn={todayCheckedIn} onCheckIn={() => setTodayCheckedIn(true)} />}
          {view === "report" && <ReportScreen patientName={patientIdentity.name} onStart={() => setView("home")} initialSingleReportId={reportToOpen} singleReports={patientSingleReports} stageReports={patientStageReports} trainingSessions={patientTrainingSessions} rehabReports={patientRehabReports} />}
          {view === "profile" && <ProfileScreen patientIdentity={patientIdentity} metrics={patientTrainingMetrics} onBack={() => setView("home")} />}
          {view === "prescription" && (
            <PrescriptionScreen
              exercise={exercise}
              trainingType={trainingType}
              setTrainingType={setTrainingType}
              targetHr={targetHr}
              setTargetHr={setTargetHr}
              targetPowerMin={targetPowerMin}
              setTargetPowerMin={setTargetPowerMin}
              targetPowerMax={targetPowerMax}
              setTargetPowerMax={setTargetPowerMax}
              warmup={warmup}
              setWarmup={setWarmup}
              mainMinutes={mainMinutes}
              setMainMinutes={setMainMinutes}
              cooldown={cooldown}
              setCooldown={setCooldown}
              repeats={repeats}
              totalMinutes={totalMinutes}
              encounter={authenticatedEncounter}
              prescription={devicePrescription}
              onBack={() => setView("home")}
              onContinue={() => setView("devices")}
            />
          )}
          {view === "devices" && (
            <DeviceScreen
              backpack={backpack}
              bike={bikeConnected}
              onBackpack={() => { setBackpack(true); syncActiveEncounter({ wearableConnectedAt: new Date().toISOString() }); }}
              onBike={() => { setBikeConnected(true); syncActiveEncounter({ trainingDeviceConnectedAt: new Date().toISOString() }); }}
              onReset={() => {
                setBackpack(false);
                setBikeConnected(false);
              }}
              onBack={() => setView("prescription")}
              onContinue={() => setView("bp")}
            />
          )}
          {view === "bp" && (
            <BpModeScreen
              mode={bpMode}
              setMode={setBpMode}
              onBack={() => setView("devices")}
              onStart={startTraining}
            />
          )}
          {view === "training" && (
            <TrainingScreen
              phase={phase}
              setPhase={changePhase}
              elapsed={elapsed}
              paused={paused}
              setPaused={(value) => {
                setPaused(value);
                setTrainingState(value ? "paused" : "running");
                syncActiveEncounter({ status: value ? "paused" : "in_training" });
              }}
              bpMode={bpMode ?? "twice"}
              measuredBp={measuredBp}
              measuredBpTime={measuredBpTime}
              onMeasureBp={() => {
                setMeasuredBp(measuredBp === "126 / 78" ? "122 / 76" : "126 / 78");
                setMeasuredBpTime(formatTime(elapsed));
              }}
              targetHr={targetHr}
              targetPowerMin={targetPowerMin}
              targetPowerMax={targetPowerMax}
              warmup={warmup}
              mainMinutes={mainMinutes}
              cooldown={cooldown}
              repeats={repeats}
              setElapsed={setElapsed}
              anomaly={anomaly}
              setAnomaly={changeAnomaly}
              video={selectedBikeVideo}
              onMetrics={syncLiveMetrics}
              onVideoEnded={() => chooseRandomBikeVideo(selectedBikeVideo?.id)}
              onFinish={finishTraining}
              onInterrupt={interruptTraining}
            />
          )}
          {view === "videoTraining" && selectedTrainingVideo && <VideoTrainingScreen video={selectedTrainingVideo} monitoringEnabled={Boolean(authenticatedEncounter?.wearableConnectedAt)} paused={paused} alert={authenticatedEncounter?.liveAlert} onConnectMonitoring={() => { setBackpack(true); syncActiveEncounter({ wearableConnectedAt: new Date().toISOString() }); }} onBack={leaveVideoTraining} onMetrics={syncLiveMetrics} onFinish={completeVideoTraining} />}
          {view === "result" && (
            <ResultScreen
              totalMinutes={totalMinutes}
              trainingType={trainingType}
              targetHr={targetHr}
              targetPowerMin={targetPowerMin}
              targetPowerMax={targetPowerMax}
              bp={measuredBp}
              outcome={sessionOutcome}
              completedCount={patientTrainingMetrics.completedCount}
              subjectiveFeeling={subjectiveFeeling}
              setSubjectiveFeeling={setSubjectiveFeeling}
              onDone={resetSession}
              onViewReport={() => {
                setReportToOpen(lastGeneratedSessionId);
                setView("report");
              }}
            />
          )}
          </div>

          <div className="rounded-xl border border-medical-100 bg-white/80 px-4 py-2 text-center text-[11px] font-medium text-slate-500">
            调研演示数据 · 设备连接与生理指标为模拟状态 · 不用于真实医疗决策
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginScreen({ patients, encounters, onExit, onLogin }: { patients: ManagedPatient[]; encounters: TrainingEncounter[]; onExit: () => void; onLogin: (encounter: TrainingEncounter, handoff?: DeviceHandoff) => void }) {
  const [patientNo, setPatientNo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const normalizedPatientNo = patientNo.trim();
  const validFormat = /^\d{6}$/.test(normalizedPatientNo);
  const loginReadyStatuses: TrainingEncounter["status"][] = ["ready_for_device", "device_ready", "in_training", "paused", "awaiting_next_task"];
  const readyEncounterCount = encounters.filter((item) => loginReadyStatuses.includes(item.status)).length;

  async function login() {
    if (!normalizedPatientNo) {
      setError("请输入患者号。");
      return;
    }
    if (!validFormat) {
      setError("患者号格式不正确，请输入6位数字。");
      return;
    }
    setLoading(true);
    try {
      const matchedPatient = patients.find((item) => normalizeDeviceLoginCode(item.patient_no) === normalizedPatientNo);
      const handoff = await readDeviceHandoff(normalizedPatientNo);
      if (handoff && loginReadyStatuses.includes(handoff.encounter.status)) {
        setError("");
        onLogin(handoff.encounter, handoff);
        return;
      }
      const matchedEncounter = matchedPatient ? encounters
        .filter((item) => item.patientId === matchedPatient.patient_demo_id && loginReadyStatuses.includes(item.status))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] : undefined;
      if (matchedEncounter) {
        setError("");
        onLogin(matchedEncounter);
        return;
      }
      if (!matchedPatient) {
        setError("未找到该患者号或设备交接任务，请确认手机与医护端连接同一个本地服务。");
        return;
      }
      const preAssessmentEncounter = encounters.find((item) => item.patientId === matchedPatient.patient_demo_id && item.status === "pre_assessment");
      setError(preAssessmentEncounter ? `已找到${matchedPatient.name}，但本次训练前评估尚未完成。` : `已找到${matchedPatient.name}，但当前没有待设备执行的训练任务。`);
    } catch {
      setError("暂时无法读取本次设备交接任务，请检查院内网络后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ipad-stage flex min-h-screen items-center justify-center p-6" data-testid="page-VIEW-PATIENT-LOGIN">
      <section className="grid w-full max-w-[1180px] overflow-hidden rounded-[32px] border border-white bg-white shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[650px] overflow-hidden bg-gradient-to-br from-[#123d54] via-[#17636e] to-[#23928a] p-12 text-white">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border-[48px] border-white/5" />
          <div className="relative">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <HeartPulse className="h-8 w-8" />
            </span>
            <p className="mt-7 text-sm font-bold tracking-[0.22em] text-teal-100">CARDIAC REHABILITATION</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight">心康伴侣<br />训练设备端</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-teal-50/80">由康复师在功率车或院内训练屏上操作，串联本次任务、设备检查、训练监测和结果解读。</p>
          </div>
          <div className="absolute bottom-12 left-12 right-12 grid grid-cols-3 gap-3">
            {[[String(readyEncounterCount), "待登录训练任务"], ["院内", "专用训练网络"], ["专业", "医护陪同"]].map(([value, label]) => (
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10" key={label}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-teal-100/75">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-h-[650px] flex-col justify-center p-12">
          <p className="text-sm font-bold text-medical-700">康复师操作 · 固定患者号登录</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">欢迎回来</h2>
          <p className="mt-2 text-sm text-slate-500">训练前评估保存后，由康复师输入患者的6位固定患者号进入本次任务。</p>
          <label className="mt-8 text-sm font-bold text-slate-700" htmlFor="patient-no">患者号</label>
          <div className="mt-2 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-medical-400 focus-within:ring-4 focus-within:ring-medical-50">
            <IdCard className="h-5 w-5 text-slate-400" />
            <input id="patient-no" value={patientNo} onChange={(event) => { setPatientNo(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") login(); }} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} aria-invalid={Boolean(error)} aria-describedby="patient-login-help" autoComplete="username" className="h-14 flex-1 bg-transparent px-3 font-mono text-base font-semibold text-slate-800 outline-none" />
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">身份核验</span>
          </div>
          <div id="patient-login-help" className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-5 ${error ? "border-red-200 bg-red-50 text-red-700" : "border-amber-100 bg-amber-50 text-amber-800"}`}>
            {error || "请输入训练前评估完成后由系统显示的6位患者号。系统只会匹配本次待设备执行任务。"}
          </div>
          <button type="button" onClick={() => void login()} disabled={!patientNo.trim() || loading} className="patient-touch mt-7 flex items-center justify-center gap-2 rounded-2xl bg-medical-600 px-5 font-bold text-white shadow-lg shadow-medical-100 hover:bg-medical-700 disabled:bg-slate-300">
            {loading ? "正在核验本次任务" : "登录训练设备端"} <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-center text-xs leading-5 text-blue-800">如无法登录，请联系康复中心核对院内患者号；患者主档由医院现有系统维护，本系统不提供患者自助建档。</p>
          <button type="button" onClick={onExit} className="mt-7 text-sm font-semibold text-slate-500 hover:text-slate-800">返回系统入口</button>
        </div>
      </section>
    </main>
  );
}

function PatientSidebar({ active, patientIdentity, onNavigate }: { active: View; patientIdentity: PatientIdentity; onNavigate: (view: View) => void }) {
  const activeKey = active === "calendar" ? "calendar" : active === "report" ? "report" : active === "profile" ? "profile" : "home";
  const items = [
    { key: "home" as const, label: "训练", icon: Bike },
    { key: "calendar" as const, label: "日历", icon: CalendarDays },
    { key: "report" as const, label: "报告", icon: FileText },
    { key: "profile" as const, label: "个人", icon: UserRound }
  ];
  return (
    <aside className="flex w-[76px] shrink-0 flex-col items-center rounded-[24px] border border-white/90 bg-white/90 py-4 shadow-card backdrop-blur" aria-label="患者端主导航">
      <button type="button" onClick={() => onNavigate("home")} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-medical-700 to-medical-500 text-white shadow-lg shadow-medical-100" aria-label="心康伴侣首页">
        <HeartPulse className="h-6 w-6" />
      </button>
      <nav className="mt-8 flex w-full flex-1 flex-col items-center gap-3">
        {items.map(({ key, label, icon: Icon }) => {
          const selected = activeKey === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onNavigate(key)}
              className={`relative flex h-[66px] w-[62px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold ${
                selected ? "bg-medical-50 text-medical-800" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              }`}
              aria-current={selected ? "page" : undefined}
            >
              {selected && <span className="absolute -left-[7px] h-8 w-1 rounded-r-full bg-medical-600" />}
              <Icon className={`h-5 w-5 ${selected ? "text-medical-600" : ""}`} />
              {label}
            </button>
          );
        })}
      </nav>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-700">{patientIdentity.name.slice(0, 1)}</div>
      <p className="mt-1 text-[9px] font-bold text-slate-400">设备端</p>
    </aside>
  );
}

function PatientHeader({ view, patientIdentity, encounter, onExit }: { view: View; patientIdentity: PatientIdentity; encounter?: TrainingEncounter; onExit: () => void }) {
  const title = view === "home" ? "今日康复" : view === "calendar" ? "打卡日历" : view === "report" ? "训练报告" : view === "profile" ? "个人档案" : view === "videoTraining" ? "视频跟练" : "功率车训练";
  return (
    <header className="flex h-[66px] shrink-0 items-center justify-between rounded-2xl border border-white/80 bg-white/90 px-5 shadow-card backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-medical-700 text-white"><HeartPulse className="h-6 w-6" /></span>
        <div><p className="text-lg font-bold text-slate-950">心康伴侣</p><p className="text-xs text-slate-500">训练设备端 · 康复师操作 · {title}</p></div>
      </div>
      <div className="flex items-center gap-3">
        {encounter && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{encounter.project} · {encounter.station}</span>}
        <span className="rounded-full bg-medical-50 px-3 py-1.5 text-xs font-bold text-medical-700">{patientIdentity.name} · {patientIdentity.code}</span>
        <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"><Wifi className="h-4 w-4 text-medical-600" /> 院内网络</span>
        <button type="button" onClick={onExit} className="patient-touch flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" /> 退出</button>
      </div>
    </header>
  );
}

function FlowBar({ view }: { view: View }) {
  const current = flow.findIndex(([key]) => key === view);
  return (
    <nav className="mt-3 flex h-[48px] shrink-0 items-center rounded-2xl border border-white/80 bg-white/80 px-5" aria-label="功率车训练流程">
      {flow.map(([key, label], index) => (
        <div className="flex flex-1 items-center" key={key}>
          <div className={`flex items-center gap-2 whitespace-nowrap ${index <= current ? "text-medical-800" : "text-slate-400"}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index < current ? "bg-medical-600 text-white" : index === current ? "bg-medical-100 ring-2 ring-medical-300" : "bg-slate-100"}`}>{index < current ? <Check className="h-4 w-4" /> : index + 1}</span>
            <span className="text-xs font-bold">{label}</span>
          </div>
          {index < flow.length - 1 && <span className={`mx-3 h-px flex-1 ${index < current ? "bg-medical-400" : "bg-slate-200"}`} />}
        </div>
      ))}
    </nav>
  );
}

function HomeScreen({ exercise, onChoose, onStart, publishedTrainingVideos, todayPlan, patientPrescription, statusByItem, metrics, patientIdentity, encounter, dailyTasks }: { exercise: Exercise; onChoose: (value: Exercise) => void; onStart: () => void; publishedTrainingVideos: PublishedTrainingVideo[]; todayPlan: PrescriptionPlan; patientPrescription?: PrescriptionContent; statusByItem: Record<string, PrescriptionExerciseStatus>; metrics: PatientTrainingMetrics; patientIdentity: PatientIdentity; encounter?: TrainingEncounter; dailyTasks: DailyTrainingTask[] }) {
  const [showHandbook, setShowHandbook] = useState(false);
  const exerciseNames: Record<Exercise, string> = {
    diaphragmatic: "腹式呼吸",
    mindfulness: "正念呼吸",
    bike: "功率车",
    elliptical: "椭圆机",
    dumbbell: "哑铃",
    resistanceBand: "弹力带",
    flexibilityUpper: "上肢拉伸",
    flexibilityLower: "下肢拉伸",
    flexibilityFull: "全身柔韧",
    baduanjin: "八段锦",
    taichi: "太极拳"
  };
  const categories: { title: string; icon: typeof Activity; items: Exercise[] }[] = [
    { title: "呼吸训练", icon: HeartPulse, items: ["diaphragmatic", "mindfulness"] },
    { title: "有氧运动", icon: Bike, items: ["bike", "elliptical"] },
    { title: "抗阻运动", icon: Dumbbell, items: ["dumbbell", "resistanceBand"] },
    { title: "柔韧性运动", icon: Activity, items: ["flexibilityUpper", "flexibilityLower", "flexibilityFull"] },
    { title: "中医运动", icon: Waves, items: ["baduanjin", "taichi"] }
  ];
  const taskForExercise = (item: Exercise) => dailyTasks.find((task) => task.exerciseKey === item);
  const videoForExercise = (item: Exercise) => publishedTrainingVideos.find((video) => video.subtype === exerciseVideoSubtypes[item]);
  const selectedVideo = videoForExercise(exercise);
  const chooseOrdered = (value: Exercise) => {
    onChoose(value);
  };
  const selectedTask = taskForExercise(exercise);
  const dayClosed = Boolean(encounter && ["post_assessment", "pending_signature", "completed", "terminated"].includes(encounter.status));
  const canStart = !dayClosed && Boolean(selectedTask) && !["completed", "skipped"].includes(selectedTask?.status ?? "skipped");
  const completedToday = dailyTasks.filter((item) => item.status === "completed").length;
  return (
    <section className="flex h-full min-h-[570px] flex-col gap-4" data-testid="page-VIEW-PATIENT-HOME">
      <article className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#123d54] via-[#17636e] to-[#21877f] px-7 py-6 text-white shadow-xl">
        <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[42px] border-white/5" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[30px] font-bold">上午好，{patientIdentity.name}</p>
            <p className="mt-2 text-sm text-teal-50/80">{encounter ? `本次任务：${encounter.project} · ${encounter.station} · ${encounter.encounterId}` : "今天安排 1 项运动康复训练，请在护士协助下完成。"}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-3 text-right ring-1 ring-white/15">
            <p className="text-xs text-teal-100">今日可选运动</p>
            <p className="mt-1 text-base font-bold">{dayClosed ? "今日训练已结束" : `${completedToday}/${dailyTasks.length || "—"} 项已完成`}</p>
          </div>
        </div>
      </article>

      <div className="grid flex-1 grid-cols-[1fr_270px] gap-4">
        <article className="flex flex-col rounded-3xl border border-white bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-bold text-medical-600">患者首页</p><h1 className="mt-1 text-xl font-bold text-slate-950">选择本次运动方式</h1></div>
            <span className="flex items-center gap-1 rounded-full bg-medical-50 px-3 py-1.5 text-xs font-bold text-medical-700"><UserRound className="h-3.5 w-3.5" />患者选择</span>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2.5">
            {categories.map(({ title, icon: Icon, items }) => {
              const categorySelected = items.includes(exercise) && Boolean(selectedTask);
              return (
                <section key={title} className={`rounded-2xl border p-3 ${categorySelected ? "border-medical-300 bg-medical-50/70" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${categorySelected ? "bg-medical-600 text-white" : "bg-white text-slate-500"}`}><Icon className="h-4 w-4" /></span>
                    <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {items.map((item) => {
                      const task = taskForExercise(item);
                      const prescribed = Boolean(task);
                      const completed = task?.status === "completed";
                      return (
                      <button
                        type="button"
                        key={item}
                        disabled={!prescribed || completed || dayClosed}
                        onClick={() => chooseOrdered(item)}
                        title={!prescribed ? "未纳入本次医生处方" : undefined}
                        className={`relative min-h-9 rounded-xl border px-3 text-xs font-bold disabled:cursor-not-allowed ${
                          completed ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                          !prescribed ? "border-slate-200 bg-slate-100 text-slate-300" :
                          exercise === item ? "border-medical-500 bg-medical-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-medical-300"
                        }`}
                      >
                        {(exercise === item || completed) && <Check className="mr-1 inline h-3 w-3" />}
                        {exerciseNames[item]}
                        {prescribed && item !== "bike" && videoForExercise(item) && <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${exercise === item ? "bg-white" : "bg-emerald-500"}`} title="已有已发布视频" />}
                      </button>
                    );})}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="mt-auto flex items-center justify-between rounded-2xl bg-slate-50 p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span>
              <div><p className="text-sm font-bold text-slate-800">已选择：{exerciseNames[exercise]}</p><p className="mt-0.5 text-[11px] text-slate-500">{exercise === "bike" ? "功率车训练 · 目标参数未获取，仅记录实际数据" : selectedVideo ? `训练视频：${selectedVideo.title}` : "使用默认训练指导视频"}</p></div>
            </div>
            <button type="button" onClick={onStart} disabled={!canStart} className="patient-touch flex items-center gap-2 rounded-2xl bg-medical-600 px-6 font-bold text-white shadow-lg shadow-medical-100 disabled:cursor-not-allowed disabled:bg-slate-300">
              {exercise === "bike" ? "进入功率车训练" : `开始${exerciseNames[exercise]}跟练`} <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </article>

        <aside className="grid grid-rows-2 gap-3">
          <article className="flex flex-col rounded-3xl border border-white bg-white p-5 shadow-card">
            <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-800">我的实际训练</p><p className="mt-1 text-[11px] text-slate-400">记录每一次真实完成的康复运动</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-medical-50 text-medical-600"><Activity className="h-5 w-5" /></span></div>
            <div className="mt-3 grid flex-1 grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-medical-50 p-3"><p className="text-2xl font-bold text-medical-900">{metrics.completedCount}<span className="ml-1 text-[10px] text-medical-600">次</span></p><p className="mt-1 text-[11px] font-bold text-medical-700">累计训练次数</p></div>
              <div className="rounded-2xl bg-blue-50 p-3"><p className="text-2xl font-bold text-blue-950">{metrics.currentMonthCount}<span className="ml-1 text-[10px] text-blue-600">次</span></p><p className="mt-1 text-[11px] font-bold text-blue-700">本月训练次数</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl font-bold text-slate-900">{metrics.totalActiveMinutes}<span className="ml-1 text-[10px] font-medium text-slate-400">分钟</span></p><p className="mt-1 text-[11px] font-bold text-slate-500">累计运动时长</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl font-bold text-slate-900">{metrics.latestDate}</p><p className="mt-1 text-[11px] font-bold text-slate-500">最近训练时间</p></div>
            </div>
          </article>
          <button type="button" data-action="ACT-PATIENT-OPEN-HANDBOOK" onClick={() => setShowHandbook(true)} className="flex flex-col rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-left transition hover:border-emerald-300 hover:shadow-card"><div className="flex items-center justify-between"><p className="text-sm font-bold text-emerald-900">我的康复手册</p><FileText className="h-5 w-5 text-emerald-600" /></div><p className="mt-auto text-xs leading-5 text-slate-600">查看运动提醒、用药提醒、饮食注意和复查计划</p><span className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-700">打开康复手册 <ChevronRight className="h-4 w-4" /></span></button>
        </aside>
      </div>
      {showHandbook && <PatientHandbookModal prescription={patientPrescription} onClose={() => setShowHandbook(false)} />}
    </section>
  );
}

function PatientHandbookModal({ onClose, prescription }: { onClose: () => void; prescription?: PrescriptionContent }) {
  const handbook = demoDischargeHandbook;
  const exerciseTips = prescription ? [prescription.patientInstruction, prescription.exerciseCautions] : handbook.exercisePlan;
  const warningTips = prescription ? [prescription.stopConditions] : handbook.warningSigns;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm" data-testid="modal-PATIENT-DISCHARGE-HANDBOOK"><section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><div><p className="text-xs font-bold text-emerald-700">{handbook.handbookNo}</p><h2 className="mt-1 text-xl font-bold">我的康复手册</h2><p className="mt-1 text-xs text-slate-500">康复师已发送 · {formatDateTime(handbook.generatedAt)}</p></div><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"><X className="h-5 w-5" /></button></div><div className="overflow-y-auto p-6"><p className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{handbook.summary}</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{handbook.improvements.map((item) => <div key={item.label} className="rounded-2xl border border-slate-100 p-4"><p className="text-xs font-bold text-slate-500">{item.label}</p><p className="mt-2 text-xs text-slate-400">基线 {item.baseline}</p><p className="mt-1 text-base font-bold text-emerald-700">当前 {item.current}</p></div>)}</div><div className="mt-4 grid gap-4 md:grid-cols-2"><PatientHandbookSection title="康复师同步的运动提醒" items={exerciseTips} /><PatientHandbookSection title="用药提醒" items={prescription ? [prescription.medicationAdvice] : handbook.medicationTips} /><PatientHandbookSection title="饮食与生活" items={prescription ? [prescription.dietCautions] : handbook.nutritionTips} /><PatientHandbookSection title="1、3、6个月复查" items={handbook.reviewPlan} /><div className="md:col-span-2"><PatientHandbookSection title="以下情况立即停止运动并就医" items={warningTips} warning /></div></div></div><div className="flex justify-end border-t border-slate-100 p-4"><button type="button" className="btn-primary patient-touch px-8" onClick={onClose}>我已了解</button></div></section></div>;
}

function PatientHandbookSection({ title, items, warning = false }: { title: string; items: string[]; warning?: boolean }) { return <section className={`rounded-2xl border p-4 ${warning ? "border-rose-100 bg-rose-50" : "border-slate-100"}`}><h3 className={`font-bold ${warning ? "text-rose-800" : "text-slate-900"}`}>{title}</h3><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-slate-600"><CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${warning ? "text-rose-500" : "text-emerald-500"}`} />{item}</li>)}</ul></section>; }

function VideoTrainingScreen({ video, monitoringEnabled, paused, alert, onConnectMonitoring, onBack, onMetrics, onFinish }: { video: PublishedTrainingVideo; monitoringEnabled: boolean; paused: boolean; alert?: LiveTrainingAlert; onConnectMonitoring: () => void; onBack: (recordedSeconds: number) => void; onMetrics: (metrics: LiveTrainingMetrics) => void; onFinish: () => void }) {
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showMonitoring, setShowMonitoring] = useState(false);

  useEffect(() => {
    if (!started || paused || !monitoringEnabled) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started, paused, monitoringEnabled]);

  useEffect(() => {
    if (monitoringEnabled) setShowMonitoring(true);
  }, [monitoringEnabled]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player || !started) return;
    if (paused) player.pause();
    else void player.play().catch(() => undefined);
  }, [paused, started]);

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const requiredSeconds = videoDuration > 0 ? Math.ceil(videoDuration * 0.875) : 45;
  const completionRatio = Math.min(seconds / requiredSeconds, 1);
  const liveHeartRate = 86 + (seconds % 5);
  const liveOxygen = 97 + (seconds % 2);
  const openFullscreen = () => playerRef.current?.requestFullscreen?.();

  useEffect(() => {
    if (!started || paused || !monitoringEnabled) return;
    onMetrics({ heartRate: liveHeartRate, speedKmh: 0, distanceKm: 0, powerW: 0, cadenceRpm: 0, resistanceLevel: 0, spo2: liveOxygen, bloodPressure: "— / —", caloriesKcal: Math.round(seconds / 12), elapsedSeconds: seconds, phase: "training", paused: false, sampledAt: new Date().toISOString() });
  }, [started, paused, monitoringEnabled, seconds, liveHeartRate, liveOxygen]);

  return (
    <section className="grid h-full min-h-[600px] grid-cols-[1.38fr_0.62fr] gap-4" data-testid="page-VIEW-VIDEO-TRAINING">
      <article ref={playerRef} className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-[#0d2432] shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-white">
          <div><p className="text-xs font-bold text-teal-200">{video.category} · {video.subtype}</p><h1 className="mt-1 text-xl font-bold">{video.title}</h1></div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{monitoringEnabled ? `已记录 ${time}` : "未连接监测设备"}</span><button type="button" onClick={openFullscreen} className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/15"><Maximize2 className="h-4 w-4" />全屏 / 投屏</button></div>
        </div>
        <div className="relative min-h-0 flex-1 bg-black">
          {video.source === "link" ? <iframe title={video.title} src={video.url} className="absolute inset-0 h-full w-full border-0" allow="autoplay; fullscreen" /> : <video ref={videoRef} title={video.title} src={video.url} className="absolute inset-0 h-full w-full object-contain" controls playsInline onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)} />}
          {monitoringEnabled && showMonitoring && <div className="absolute inset-x-4 bottom-4 z-10 grid grid-cols-4 gap-2 rounded-2xl bg-slate-950/75 p-3 text-white backdrop-blur-md"><div className="col-span-2 rounded-xl bg-white/10 p-3"><div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-rose-300" /><span className="text-[10px] font-bold">实时心率</span></div><p className="mt-1 text-2xl font-bold">{liveHeartRate}<span className="ml-1 text-[9px] text-white/60">bpm</span></p></div><div className="rounded-xl bg-white/10 p-3"><p className="text-[9px] text-white/60">血氧</p><p className="mt-2 text-xl font-bold">{liveOxygen}<span className="ml-1 text-[9px] text-white/60">%</span></p></div><div className="rounded-xl bg-white/10 p-3"><p className="text-[9px] text-white/60">记录时间</p><p className="mt-2 text-xl font-bold tabular-nums">{time}</p></div></div>}
          {paused && <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/55"><div className={`rounded-2xl bg-white px-8 py-5 text-center shadow-xl ${alert?.active ? "border-2 border-red-300" : ""}`}><Pause className={`mx-auto h-8 w-8 ${alert?.active ? "text-red-600" : "text-medical-700"}`} /><p className="mt-2 font-bold text-slate-900">{alert?.active ? "训练异常，医护已暂停" : "医生已暂停本项训练"}</p><p className="mt-1 text-xs text-slate-500">{alert?.active ? alert.message : "请保持休息，等待医生恢复训练。"}</p></div></div>}
        </div>
        {monitoringEnabled && showMonitoring && <div className="flex items-center gap-5 border-t border-white/10 bg-[#102c3b] px-5 py-3 text-xs text-white"><span className="font-bold text-teal-200">实时采集</span><span>心率 <b className="ml-1 text-base">{liveHeartRate} bpm</b></span><span>血氧 <b className="ml-1 text-base">{liveOxygen}%</b></span><span>时间 <b className="ml-1 text-base">{time}</b></span></div>}
      </article>
      <aside className="flex flex-col gap-4">
        <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-medical-600">训练处方</p><h2 className="mt-1 text-xl font-bold text-slate-950">{video.subtype} · 视频跟练</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">{[["建议时长", "按视频完成"], ["目标强度", "RPE 9–11"], ["动作节奏", "跟随指导"], ["呼吸要求", "自然呼吸"]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-2 text-sm font-bold text-slate-800">{value}</p></div>)}</div>
          <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">请按医护人员确认的处方练习。若出现胸闷、头晕、心悸或明显气促，请立即停止并呼叫医护。</p>
        </article>
        <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3"><div><p className="font-bold text-slate-900">生理监测记录</p><p className="mt-1 text-xs text-slate-500">{monitoringEnabled ? "监测背包已连接，开始后记录心率、血氧和时间" : "未连接设备时不生成实时训练记录"}</p></div>{monitoringEnabled ? <button type="button" onClick={() => setShowMonitoring((value) => !value)} aria-label="显示生理指标" className={`relative h-7 w-12 shrink-0 rounded-full transition ${showMonitoring ? "bg-medical-600" : "bg-slate-200"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${showMonitoring ? "left-6" : "left-1"}`} /></button> : <button type="button" onClick={onConnectMonitoring} className="btn-secondary shrink-0"><Bluetooth className="h-4 w-4" />连接设备</button>}</div>
        </article>
        <div className="mt-auto grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onBack(seconds)} className="btn-secondary patient-touch"><ArrowLeft className="h-4 w-4" />{seconds > 0 ? "保存本次并返回" : "返回首页"}</button>
          {!started ? <button type="button" disabled={!monitoringEnabled} onClick={() => setStarted(true)} className="btn-primary patient-touch disabled:cursor-not-allowed disabled:bg-slate-300"><Play className="h-5 w-5 fill-current" />{monitoringEnabled ? "开始训练并记录" : "连接设备后开始"}</button> : <><div className="rounded-xl bg-slate-50 p-3 text-[10px] text-slate-500"><div className="flex items-center justify-between"><span>视频进度</span><b className="text-medical-700">{Math.round(completionRatio * 100)}%</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-medical-500 transition-all" style={{ width: `${completionRatio * 100}%` }} /></div></div><button type="button" disabled={seconds < requiredSeconds} onClick={onFinish} className="patient-touch flex items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><CheckCircle2 className="h-5 w-5" />{seconds < requiredSeconds ? "训练记录中" : "完成本项训练"}</button></>}
        </div>
      </aside>
    </section>
  );
}

function PrescriptionScreen(props: {
  exercise: Exercise; trainingType: TrainingType; setTrainingType: (value: TrainingType) => void;
  targetHr: number; setTargetHr: (value: number) => void;
  targetPowerMin: number; setTargetPowerMin: (value: number) => void;
  targetPowerMax: number; setTargetPowerMax: (value: number) => void;
  warmup: number; setWarmup: (value: number) => void;
  mainMinutes: number; setMainMinutes: (value: number) => void;
  cooldown: number; setCooldown: (value: number) => void;
  repeats: number; totalMinutes: number; encounter?: TrainingEncounter; prescription: DevicePrescription; onBack: () => void; onContinue: () => void;
}) {
  const {
    exercise,
    trainingType,
    setTrainingType,
    targetHr,
    setTargetHr,
    targetPowerMin,
    setTargetPowerMin,
    targetPowerMax,
    setTargetPowerMax,
    warmup,
    setWarmup,
    mainMinutes,
    setMainMinutes,
    cooldown,
    setCooldown,
    repeats,
    totalMinutes,
    encounter,
    prescription,
    onBack,
    onContinue
  } = props;
  const [showDifferenceConfirm, setShowDifferenceConfirm] = useState(false);
  const [differenceAcknowledged, setDifferenceAcknowledged] = useState(false);
  const adjustedHrRange = [targetHr - 8, targetHr + 8];
  const adjustments: { label: string; prescribed: string; adjusted: string }[] = [];
  const prescribedHeartRate = Math.round((prescription.targetHr[0] + prescription.targetHr[1]) / 2);

  if (targetHr !== prescribedHeartRate) adjustments.push({ label: "靶心率区间", prescribed: `${prescription.targetHr.join("–")} bpm`, adjusted: `${adjustedHrRange.join("–")} bpm` });
  if (targetPowerMin !== prescription.targetPower[0] || targetPowerMax !== prescription.targetPower[1]) adjustments.push({ label: "目标功率", prescribed: `${prescription.targetPower.join("–")} W`, adjusted: `${targetPowerMin}–${targetPowerMax} W` });
  if (warmup !== prescription.warmupMinutes) adjustments.push({ label: "热身时间", prescribed: `${prescription.warmupMinutes} 分钟`, adjusted: `${warmup} 分钟` });
  if (mainMinutes !== prescription.trainingMinutes) adjustments.push({ label: "主要训练", prescribed: `${prescription.trainingMinutes} 分钟`, adjusted: `${mainMinutes * repeats} 分钟` });
  if (cooldown !== prescription.cooldownMinutes) adjustments.push({ label: "放松时间", prescribed: `${prescription.cooldownMinutes} 分钟`, adjusted: `${cooldown} 分钟` });
  const hasAdjustments = adjustments.length > 0;

  function restorePrescription() {
    setTrainingType(prescription.trainingType);
    setTargetHr(prescribedHeartRate);
    setTargetPowerMin(prescription.targetPower[0]);
    setTargetPowerMax(prescription.targetPower[1]);
    setWarmup(prescription.warmupMinutes);
    setMainMinutes(prescription.trainingMinutes);
    setCooldown(prescription.cooldownMinutes);
  }

  function continueFromPrescription() {
    if (!hasAdjustments) {
      onContinue();
      return;
    }
    setDifferenceAcknowledged(false);
    setShowDifferenceConfirm(true);
  }

  return (
    <>
    <section className="grid h-full min-h-[570px] grid-cols-2 items-stretch gap-4" data-testid="page-VIEW-PATIENT-PRESCRIPTION">
      <article className="rounded-3xl border border-white bg-white p-6 shadow-card">
        <p className="text-xs font-bold text-medical-600">本次训练 · 患者号登录成功</p><h1 className="mt-2 text-2xl font-bold text-slate-950">今日{encounter?.project ?? "功率车"}执行信息</h1><p className="mt-2 text-sm leading-6 text-slate-500">系统已关联本次训练就诊、训练前评估和医生签署处方。患者仅确认本次参加训练，不签署临床报告。</p>
        {encounter && <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs"><div><p className="font-bold text-blue-500">训练就诊号</p><p className="mt-1 font-mono font-bold text-blue-950">{encounter.encounterId}</p></div><div><p className="font-bold text-blue-500">训练工位</p><p className="mt-1 font-bold text-blue-950">{encounter.station}</p></div><div><p className="font-bold text-blue-500">处方编号</p><p className="mt-1 font-mono font-bold text-blue-950">{prescription.prescriptionNo}</p></div><div><p className="font-bold text-blue-500">训前评估</p><p className="mt-1 font-bold text-emerald-700">已完成 · 可执行</p></div></div>}
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#123d54] to-[#1f7e79] p-6 text-white">
          <p className="text-sm text-teal-100">生效处方 {prescription.version}</p><div className="mt-3 text-3xl font-bold">处方参数已带入</div><p className="mt-2 text-sm text-teal-50/75">靶心率 {prescription.targetHr.join("–")} bpm · 功率 {prescription.targetPower.join("–")} W</p>
          <div className="mt-6 grid grid-cols-3 gap-2">{[["热身", warmup], ["训练", mainMinutes * repeats], ["放松", cooldown]].map(([label, value]) => <div className="rounded-xl bg-white/10 p-3" key={label}><p className="text-xs text-teal-100">{label}</p><p className="mt-1 text-xl font-bold">{value} 分</p></div>)}</div>
          <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-4"><span className="text-sm text-teal-100">总计时间</span><span className="text-2xl font-bold">{totalMinutes} 分钟</span></div>
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"><ShieldCheck className="mr-2 inline h-5 w-5" />{prescription.physician}签署 · {prescription.prescriptionNo} · 康复师已完成训前评估</div>
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-amber-900">本次训练安全提醒</p>
            <span className="text-[10px] font-bold text-amber-700">完整医嘱以医院正式处方为准</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs leading-5 text-amber-900">
            <PatientAdvice label="训练注意" value={prescription.exerciseCautions} />
            <PatientAdvice label="立即停止条件" value={prescription.stopConditions} />
          </div>
        </div>
      </article>
      <article className="flex flex-col rounded-3xl border border-white bg-white p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold text-slate-950">现场核对与本次调整</h2><p className="mt-1 text-xs text-slate-500">由现场康复师核对并调整本次执行参数，不覆盖医生原处方。</p></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={restorePrescription} className="btn-secondary !min-h-9 !px-3"><RotateCcw className="h-4 w-4" />恢复处方值</button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <label className="rounded-2xl border border-slate-200 p-4"><span className="text-xs font-bold text-slate-500">训练方式</span><select value={trainingType} onChange={(event) => setTrainingType(event.target.value as "continuous" | "interval")} className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold"><option value="continuous">连续训练</option><option value="interval">间歇训练</option></select></label>
          <NumberControl label="目标心率" value={targetHr} unit="bpm" onMinus={() => setTargetHr(Math.max(60, targetHr - 1))} onPlus={() => setTargetHr(Math.min(180, targetHr + 1))} />
          <NumberControl label="最低功率" value={targetPowerMin} unit="W" onMinus={() => setTargetPowerMin(Math.max(0, targetPowerMin - 5))} onPlus={() => setTargetPowerMin(Math.min(targetPowerMax, targetPowerMin + 5))} />
          <NumberControl label="最高功率" value={targetPowerMax} unit="W" onMinus={() => setTargetPowerMax(Math.max(targetPowerMin, targetPowerMax - 5))} onPlus={() => setTargetPowerMax(Math.min(200, targetPowerMax + 5))} />
          <SelectMinutes label="热身时间" value={warmup} options={[3, 5, 8, 10]} onChange={setWarmup} />
          <SelectMinutes label="主要训练" value={mainMinutes} options={[10, 15, 20, 25, 30]} onChange={setMainMinutes} />
          <SelectMinutes label="放松时间" value={cooldown} options={[3, 5, 8, 10]} onChange={setCooldown} />
          <div className="rounded-2xl border border-medical-100 bg-medical-50 p-4"><p className="text-xs font-bold text-medical-700">自动计算总时长</p><p className="mt-2 text-3xl font-bold text-medical-900">{totalMinutes}<span className="ml-1 text-sm">分钟</span></p></div>
        </div>
        <div className={`mt-5 rounded-2xl border p-4 text-xs font-bold leading-5 ${hasAdjustments ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`}>{hasAdjustments ? `已调整 ${adjustments.length} 项参数，进入设备检查前需要再次核对。` : "当前执行参数与医生处方一致。"}</div>
        <div className="mt-auto flex justify-between pt-5"><button type="button" onClick={onBack} className="btn-secondary patient-touch"><ArrowLeft className="h-4 w-4" /> 返回首页</button><button type="button" onClick={continueFromPrescription} className="btn-primary patient-touch px-7">核对完成，检查设备 <ArrowRight className="h-5 w-5" /></button></div>
      </article>
    </section>
    {showDifferenceConfirm && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="prescription-difference-title">
        <section className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div><p className="text-xs font-bold text-amber-600">训练参数差异确认</p><h2 id="prescription-difference-title" className="mt-1 text-2xl font-bold text-slate-950">确认使用调整后的参数？</h2><p className="mt-2 text-sm text-slate-500">以下内容与 {prescription.physician} 签署的 {prescription.version} 处方不一致。</p></div>
            <button type="button" onClick={() => setShowDifferenceConfirm(false)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500" aria-label="关闭差异确认窗口"><X className="h-5 w-5" /></button>
          </div>
          <div className="max-h-[54vh] overflow-y-auto px-6 py-5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><AlertTriangle className="mr-2 inline h-5 w-5" />本次调整仅用于当前训练，不修改医生原处方。请确认调整由现场医护人员完成，并已结合患者当日状态判断。</div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[0.72fr_1fr_1fr] bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500"><span>调整项目</span><span>医生处方</span><span>本次训练</span></div>
              {adjustments.map((item) => <div key={item.label} className="grid grid-cols-[0.72fr_1fr_1fr] items-center border-t border-slate-100 px-4 py-3 text-sm"><b className="text-slate-800">{item.label}</b><span className="text-slate-500">{item.prescribed}</span><span className="font-bold text-amber-700">{item.adjusted}</span></div>)}
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4"><input type="checkbox" checked={differenceAcknowledged} onChange={(event) => setDifferenceAcknowledged(event.target.checked)} className="mt-1 h-5 w-5 accent-medical-600" /><span><span className="block font-bold text-slate-900">我已核对上述差异并确认按调整后参数执行</span><span className="mt-1 block text-xs leading-5 text-slate-500">确认后进入设备检查；本次调整将保留在训练记录中供康复师查看。</span></span></label>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4"><button type="button" onClick={() => setShowDifferenceConfirm(false)} className="btn-secondary">返回调整</button><button type="button" disabled={!differenceAcknowledged} onClick={() => { setShowDifferenceConfirm(false); onContinue(); }} className="btn-primary"><ShieldCheck className="h-4 w-4" />确认并进入设备检查</button></div>
        </section>
      </div>
    )}
    </>
  );
}

function PatientAdvice({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/70 p-3"><p className="font-bold text-amber-950">{label}</p><p className="mt-1">{value}</p></div>;
}

function ReadOnlyPrescriptionItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-3 text-lg font-bold text-slate-900">{value}</p></div>;
}

function NumberControl({ label, value, unit, onMinus, onPlus }: { label: string; value: number; unit: string; onMinus: () => void; onPlus: () => void }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><div className="mt-3 flex items-center justify-between"><button type="button" onClick={onMinus} className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-bold text-slate-700" aria-label={`减少${label}`}>−</button><p className="text-2xl font-bold text-slate-950">{value}<span className="ml-1 text-xs text-slate-500">{unit}</span></p><button type="button" onClick={onPlus} className="h-10 w-10 rounded-xl bg-medical-100 text-xl font-bold text-medical-800" aria-label={`增加${label}`}>+</button></div></div>;
}

function SelectMinutes({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (value: number) => void }) {
  return <label className="rounded-2xl border border-slate-200 p-4"><span className="text-xs font-bold text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-800 outline-none">{options.map((option) => <option key={option} value={option}>{option} 分钟</option>)}</select></label>;
}

function DeviceScreen({ backpack, bike, onBackpack, onBike, onReset, onBack, onContinue }: { backpack: boolean; bike: boolean; onBackpack: () => void; onBike: () => void; onReset: () => void; onBack: () => void; onContinue: () => void }) {
  const allReady = backpack && bike;
  return (
    <section className="flex h-full min-h-[560px] flex-col rounded-3xl border border-white bg-white p-7 shadow-card" data-testid="page-VIEW-PATIENT-DEVICES">
      <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-medical-600">训练前准备 · 第 1 项</p><h1 className="mt-2 text-2xl font-bold text-slate-950">连接背包与功率车</h1><p className="mt-2 text-sm text-slate-500">两个设备均连接通过后，才能进入下一步。</p></div><span className={`rounded-full px-4 py-2 text-xs font-bold ${allReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{allReady ? "设备已就绪" : `已连接 ${Number(backpack) + Number(bike)} / 2`}</span></div>
      <div className="mt-8 grid flex-1 grid-cols-2 gap-5">
        <DeviceCard icon={Bluetooth} title="智能监测背包" code="CARDIO-BAG-08" details={["心率传感器", "血氧传感器", "血压模块"]} connected={backpack} onConnect={onBackpack} />
        <DeviceCard icon={Bike} title="功率车" code="BIKE-REHAB-03" details={["速度 / 距离", "功率 / 阻力", "踏频数据"]} connected={bike} onConnect={onBike} />
      </div>
      <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800"><Bluetooth className="mr-2 inline h-5 w-5" />本 Demo 使用模拟连接状态；真实版本需接入背包 BLE 与功率车 SDK，并保留断线重连。</div>
      <div className="mt-6 flex justify-between"><div className="flex gap-3"><button type="button" onClick={onBack} className="btn-secondary patient-touch"><ArrowLeft className="h-4 w-4" /> 返回训练核对</button><button type="button" onClick={onReset} className="btn-secondary patient-touch"><RotateCcw className="h-4 w-4" /> 重新检测</button></div><button type="button" disabled={!allReady} onClick={onContinue} className="btn-primary patient-touch px-8">设备通过，选择血压模式 <ArrowRight className="h-5 w-5" /></button></div>
    </section>
  );
}

function DeviceCard({ icon: Icon, title, code, details, connected, onConnect }: { icon: typeof Bluetooth; title: string; code: string; details: string[]; connected: boolean; onConnect: () => void }) {
  return <article className={`flex flex-col rounded-3xl border p-6 ${connected ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}><div className="flex items-start justify-between"><span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${connected ? "bg-emerald-600 text-white" : "bg-white text-slate-500"}`}><Icon className="h-7 w-7" /></span><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{connected ? "已连接" : "等待连接"}</span></div><h2 className="mt-5 text-xl font-bold text-slate-950">{title}</h2><p className="mt-1 text-xs font-semibold text-slate-400">{code}</p><div className="mt-5 grid grid-cols-3 gap-2">{details.map((item) => <span key={item} className={`rounded-xl px-2 py-3 text-center text-xs font-bold ${connected ? "bg-white text-emerald-700" : "bg-white text-slate-500"}`}>{connected && <Check className="mr-1 inline h-3 w-3" />}{item}</span>)}</div><button type="button" onClick={onConnect} className={`patient-touch mt-auto rounded-2xl font-bold ${connected ? "bg-white text-emerald-700 ring-1 ring-emerald-200" : "bg-medical-600 text-white"}`}>{connected ? "连接检测通过" : "搜索并连接"}</button></article>;
}

function BpModeScreen({ mode, setMode, onBack, onStart }: { mode: BpMode | null; setMode: (value: BpMode) => void; onBack: () => void; onStart: () => void }) {
  const modes: { key: BpMode; title: string; detail: string; tag: string }[] = [
    { key: "twice", title: "测量 2 次", detail: "训练开始前、训练结束后各测量一次", tag: "常规推荐" },
    { key: "multiple", title: "分阶段测量", detail: "开始前、训练中、放松期与结束后测量", tag: "重点监测" },
    { key: "none", title: "本次不测量", detail: "仅在医护确认无需测量时选择", tag: "需确认" }
  ];
  return (
    <section className="flex h-full min-h-[550px] flex-col rounded-3xl border border-white bg-white p-7 shadow-card" data-testid="page-VIEW-PATIENT-BP">
      <div><p className="text-xs font-bold text-medical-600">训练前准备 · 最后一项</p><h1 className="mt-2 text-2xl font-bold text-slate-950">选择本次血压测量模式</h1><p className="mt-2 text-sm text-slate-500">延续一期训练前的测量模式选择，并在训练中提供手动测量入口。</p></div>
      <div className="mt-8 grid flex-1 grid-cols-3 gap-5">
        {modes.map((item, index) => <button type="button" key={item.key} onClick={() => setMode(item.key)} className={`relative rounded-3xl border p-6 text-left ${mode === item.key ? "border-medical-400 bg-medical-50 ring-2 ring-medical-100" : "border-slate-200 bg-slate-50"}`}><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${mode === item.key ? "bg-medical-600 text-white" : "bg-white text-slate-500"}`}><Activity className="h-6 w-6" /></span><span className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-slate-500">{item.tag}</span><p className="mt-8 text-xl font-bold text-slate-950">{item.title}</p><p className="mt-3 text-sm leading-6 text-slate-500">{item.detail}</p>{mode === item.key && <p className="mt-6 flex items-center gap-2 text-sm font-bold text-medical-700"><CheckCircle2 className="h-5 w-5" /> 已选择</p>}</button>)}
      </div>
      <div className="mt-6 flex justify-between"><button type="button" onClick={onBack} className="btn-secondary patient-touch"><ArrowLeft className="h-4 w-4" /> 返回设备检查</button><button type="button" disabled={!mode} onClick={onStart} className="patient-touch flex items-center gap-2 rounded-2xl bg-medical-600 px-10 font-bold text-white shadow-lg shadow-medical-100 disabled:bg-slate-300"><Play className="h-5 w-5 fill-current" /> 开始功率车训练</button></div>
    </section>
  );
}

function TrainingScreen(props: {
  phase: Phase; setPhase: (value: Phase) => void; elapsed: number; paused: boolean; setPaused: (value: boolean) => void; bpMode: BpMode; measuredBp: string; measuredBpTime: string; onMeasureBp: () => void;
  targetHr: number; targetPowerMin: number; targetPowerMax: number; warmup: number; mainMinutes: number; cooldown: number; repeats: number; setElapsed: (value: number) => void; anomaly: boolean; setAnomaly: (value: boolean) => void; video: LocalBikeVideo | null; onMetrics: (metrics: LiveTrainingMetrics) => void; onVideoEnded: () => void; onFinish: () => void; onInterrupt: () => void;
}) {
  const { phase, setPhase, elapsed, paused, setPaused, bpMode, measuredBp, measuredBpTime, onMeasureBp, targetHr, targetPowerMin, targetPowerMax, warmup, mainMinutes, cooldown, repeats, setElapsed, anomaly, setAnomaly, video, onMetrics, onVideoEnded, onFinish, onInterrupt } = props;
  const sampleIndex = elapsed % 12;
  const heartRateWave = [0, 1, -1, 2, 0, -2, 1, 3, 0, -1, 2, -1];
  const speedWave = [0, 0.4, -0.2, 0.7, 0.2, -0.5, 0.3, 0.8, -0.1, -0.4, 0.5, 0.1];
  const powerWave = [0, 2, -1, 3, 1, -2, 2, 4, 0, -3, 1, -1];
  const cadenceWave = [0, 1, -1, 2, 0, -2, 1, 3, -1, 0, 2, -1];
  const oxygenWave = [0, 0, 1, 0, 0, -1, 0, 0, 1, 0, 0, -1];
  const phaseHeartRate = phase === "warmup" ? targetHr - 14 : phase === "cooldown" ? targetHr - 10 : targetHr;
  const hr = anomaly ? targetHr + 22 + Math.abs(heartRateWave[sampleIndex]) : phaseHeartRate + heartRateWave[sampleIndex];
  const baseSpeed = phase === "training" ? 22.2 : phase === "warmup" ? 16.6 : 15.2;
  const speed = paused ? 0 : Math.max(0, baseSpeed + speedWave[sampleIndex]);
  const basePower = phase === "training" ? Math.round((targetPowerMin + targetPowerMax) / 2) : Math.max(10, targetPowerMin - 8);
  const currentPower = paused ? 0 : Math.max(0, basePower + powerWave[sampleIndex]);
  const cadence = paused ? 0 : (phase === "training" ? 64 : phase === "warmup" ? 50 : 46) + cadenceWave[sampleIndex];
  const resistance = paused ? 0 : phase === "training" ? 5 + (sampleIndex === 7 ? 1 : 0) : 3;
  const oxygen = anomaly ? 95 + Math.max(oxygenWave[sampleIndex], 0) : 97 + oxygenWave[sampleIndex];
  const liveMetrics: Omit<LiveTrainingMetrics, "sampledAt"> = {
    heartRate: hr,
    speedKmh: Number(speed.toFixed(1)),
    distanceKm: Number((elapsed * (phase === "training" ? 21.8 : 16.0) / 3600).toFixed(2)),
    powerW: currentPower,
    cadenceRpm: cadence,
    resistanceLevel: resistance,
    spo2: oxygen,
    bloodPressure: bpMode === "none" ? "— / —" : measuredBp,
    caloriesKcal: Math.round(elapsed / 8),
    elapsedSeconds: elapsed,
    phase,
    paused
  };
  const phaseLabels: Record<Phase, string> = { warmup: "热身", training: "主要训练", cooldown: "放松" };
  const trainingMinutes = mainMinutes * repeats;
  const totalSeconds = (warmup + trainingMinutes + cooldown) * 60;
  const warmupEnd = warmup * 60;
  const trainingEnd = (warmup + trainingMinutes) * 60;
  const remainingSeconds = Math.max(totalSeconds - elapsed, 0);
  const overallProgress = Math.min((elapsed / totalSeconds) * 100, 100);
  const hrZonePosition = Math.min(Math.max(((hr - (targetHr - 24)) / 48) * 100, 4), 96);
  const hrStatus = anomaly ? "心率出现异常变化，请降低踏频并等待医护确认" : "实际心率记录中，目标范围未获取";
  const phasePlan: { key: Phase; label: string; minutes: number }[] = [
    { key: "warmup", label: "热身", minutes: warmup },
    { key: "training", label: "训练", minutes: trainingMinutes },
    { key: "cooldown", label: "放松", minutes: cooldown }
  ];
  const trainingVideoPanelRef = useRef<HTMLDivElement>(null);
  const trainingVideoRef = useRef<HTMLVideoElement>(null);
  const phaseIndex = phasePlan.findIndex((item) => item.key === phase);
  const nextPhase = () => {
    if (phase === "warmup") {
      setElapsed(warmupEnd);
      setPhase("training");
    } else if (phase === "training") {
      setElapsed(trainingEnd);
      setPhase("cooldown");
    } else {
      setElapsed(totalSeconds);
      onFinish();
    }
  };
  useEffect(() => {
    if (paused || elapsed >= totalSeconds) return;
    const expectedPhase: Phase = elapsed < warmupEnd ? "warmup" : elapsed < trainingEnd ? "training" : "cooldown";
    if (expectedPhase !== phase) setPhase(expectedPhase);
  }, [elapsed, paused, phase, setPhase, totalSeconds, trainingEnd, warmupEnd]);

  useEffect(() => {
    const player = trainingVideoRef.current;
    if (!player) return;
    if (paused) player.pause();
    else void player.play().catch(() => undefined);
  }, [paused, video?.url]);

  useEffect(() => {
    onMetrics({ ...liveMetrics, sampledAt: new Date().toISOString() });
  }, [liveMetrics.heartRate, liveMetrics.speedKmh, liveMetrics.distanceKm, liveMetrics.powerW, liveMetrics.cadenceRpm, liveMetrics.resistanceLevel, liveMetrics.spo2, liveMetrics.bloodPressure, liveMetrics.caloriesKcal, liveMetrics.elapsedSeconds, liveMetrics.phase, liveMetrics.paused]);

  return (
    <section className="h-full min-h-[620px]" data-testid="page-VIEW-PATIENT-TRAINING">
      <article className="flex h-full min-h-[620px] flex-col overflow-hidden rounded-3xl border border-white bg-[#eef4f8] p-4 shadow-xl">
          <header className="grid grid-cols-[118px_1fr_118px] items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-500">运动时间</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-950">{formatTime(elapsed)}</p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-medical-800">热身 {warmup} 分钟 · 训练 {trainingMinutes} 分钟 · 放松 {cooldown} 分钟</p>
                <p className="text-[10px] font-bold text-medical-600">当前：{phaseLabels[phase]}</p>
              </div>
              <div className="relative h-8 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-medical-400 to-medical-600 transition-[width] duration-1000 ease-linear" style={{ width: `${overallProgress}%` }} />
                <div className="relative grid h-full" style={{ gridTemplateColumns: `${warmup}fr ${trainingMinutes}fr ${cooldown}fr` }}>
                  {phasePlan.map((item, index) => (
                    <div key={item.key} className={`flex items-center justify-center text-[10px] font-bold ${index > 0 ? "border-l border-white/80" : ""} ${index < phaseIndex ? "text-white" : "text-slate-600"}`}>
                      <span className={phase === item.key ? "rounded-full bg-white/90 px-2.5 py-0.5 text-medical-800 shadow-sm" : ""}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500">剩余时间</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-medical-800">{formatTime(remainingSeconds)}</p>
            </div>
          </header>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_260px] items-stretch gap-3">
            <div ref={trainingVideoPanelRef} className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 shadow-xl ring-1 ring-slate-950/10">
              {video?.source === "link" ? (
                <iframe
                  key={video.url}
                  title={video.title}
                  src={video.url}
                  className={`absolute inset-0 h-full w-full border-0 transition duration-300 ${paused ? "scale-[1.01] opacity-50" : "opacity-100"}`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : video ? (
                <video
                  key={video.url}
                  ref={trainingVideoRef}
                  title={video.title}
                  src={video.url}
                  className={`absolute inset-0 h-full w-full object-contain transition duration-300 ${paused ? "scale-[1.01] opacity-50" : "opacity-100"}`}
                  autoPlay
                  playsInline
                  preload="auto"
                  onEnded={onVideoEnded}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-300">
                  <FileText className="h-10 w-10 opacity-60" />
                  <p className="mt-3 text-sm font-bold">功率车视频暂时无法加载</p>
                  <p className="mt-1 text-[10px] text-slate-500">请检查网络后重新进入训练</p>
                </div>
              )}
              <div className="fullscreen-heart-rate absolute left-0 top-0 z-30 w-60 rounded-br-3xl border-b border-r border-white/20 bg-[#103f4f]/75 p-4 text-white shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-rose-300" /><span className="text-xs font-bold">实时心率</span><span className="ml-auto text-[9px] text-emerald-300">动态</span></div>
                <p className="fullscreen-heart-rate-value mt-2 text-[40px] font-bold leading-none tabular-nums">{liveMetrics.heartRate}<span className="ml-2 text-sm font-medium text-white/70">bpm</span></p>
                <p className="mt-1 text-[10px] text-white/75">{hrStatus}</p>
              </div>
              <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-slate-950/75 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md">
                <span className={`h-2 w-2 rounded-full ${paused ? "bg-amber-400" : "metric-live-dot bg-emerald-400"}`} />{paused ? "训练视频已暂停" : `${phaseLabels[phase]}跟练中`}
              </div>
              {video && <div className="absolute left-3 top-12 max-w-[70%] truncate rounded-lg bg-slate-950/60 px-3 py-1.5 text-[9px] font-bold text-white/85 backdrop-blur-md">训练视频：{video.title}</div>}
              <button type="button" onClick={() => trainingVideoPanelRef.current?.requestFullscreen?.()} className="absolute right-3 top-3 flex h-9 items-center gap-2 rounded-xl bg-slate-950/75 px-3 text-[10px] font-bold text-white shadow-lg backdrop-blur-md hover:bg-slate-950/90"><Maximize2 className="h-4 w-4" />全屏 / 投屏</button>
              {paused && <div className="absolute inset-0 flex items-center justify-center"><div className="rounded-2xl bg-white/95 px-8 py-5 text-center shadow-xl"><Pause className="mx-auto h-8 w-8 text-medical-700" /><p className="mt-2 font-bold text-slate-900">训练已暂停</p><p className="mt-1 text-[10px] text-slate-500">点击“继续训练”恢复</p></div></div>}
              {anomaly && !paused && <div className="absolute inset-0 flex items-center justify-center bg-red-950/20"><div className="rounded-2xl border border-red-200 bg-red-50/95 px-8 py-5 text-center text-red-800 shadow-xl"><AlertTriangle className="mx-auto h-8 w-8 animate-pulse text-red-600" /><p className="mt-2 text-base font-bold">请降低踏频并等待医护确认</p><p className="mt-1 text-xs text-red-600">心率出现异常变化，演示警报不代表临床阈值</p></div></div>}
              <div className="absolute inset-x-3 bottom-20 z-10 grid grid-cols-5 gap-1.5 rounded-2xl bg-slate-950/70 p-2 text-white backdrop-blur-md">
                {[["速度", liveMetrics.speedKmh.toFixed(1), "km/h"], ["距离", liveMetrics.distanceKm.toFixed(2), "km"], ["功率", String(liveMetrics.powerW), "W"], ["血氧", String(liveMetrics.spo2), "%"], ["血压", liveMetrics.bloodPressure, ""]].map(([label, value, unit]) => <div className="rounded-xl bg-white/10 px-2 py-2 text-center" key={label}><p className="text-[9px] text-white/65">{label}</p><p className="mt-1 text-sm font-bold tabular-nums">{value}<span className="ml-0.5 text-[8px] text-white/60">{unit}</span></p></div>)}
              </div>
              <div className="absolute inset-x-3 bottom-3 z-20 grid grid-cols-4 gap-2 rounded-2xl bg-slate-950/65 p-2 backdrop-blur-md">
                <button type="button" onClick={() => setPaused(!paused)} className="patient-touch flex items-center justify-center gap-2 rounded-xl bg-white/95 font-bold text-medical-800 shadow-sm">{paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}{paused ? "继续训练" : "暂停训练"}</button>
                <button type="button" onClick={nextPhase} className="patient-touch flex items-center justify-center gap-2 rounded-xl bg-medical-600 font-bold text-white shadow-lg">{phase === "cooldown" ? <CircleStop className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}{phase === "cooldown" ? "结束训练" : "下一阶段"}</button>
                <button type="button" onClick={onInterrupt} className="patient-touch rounded-xl border border-rose-200 bg-rose-50 font-bold text-rose-700">中断并记录</button>
                <button type="button" onClick={() => setAnomaly(!anomaly)} className={`patient-touch rounded-xl border font-bold ${anomaly ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{anomaly ? "恢复指标" : "演示异常"}</button>
              </div>
            </div>

            <aside className="flex h-full min-h-0 flex-col gap-2" aria-label="实时心率与训练指标">
              <div className={`rounded-2xl p-3 text-white shadow-lg ${anomaly ? "bg-gradient-to-br from-red-600 to-red-800" : "bg-gradient-to-br from-[#102c3b] to-[#18536a]"}`}>
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><HeartPulse className={`h-5 w-5 ${anomaly ? "animate-pulse" : "text-rose-300"}`} /><span className="text-xs font-bold text-white">实时心率</span></div><span className={`h-2.5 w-2.5 rounded-full ${anomaly ? "animate-pulse bg-white" : "metric-live-dot bg-emerald-400"}`} /></div>
                <div className="mt-1.5 flex items-end gap-2"><span key={`hr-${liveMetrics.heartRate}`} className="metric-value-pulse text-4xl font-bold tabular-nums text-white">{liveMetrics.heartRate}</span><span className="pb-1 text-[10px] font-bold text-white/70">bpm</span><span className="mb-1 ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-bold text-white/75">1 秒采样</span></div>
                <div className="relative mt-2">
                  <div className="grid h-2.5 grid-cols-4 overflow-hidden rounded-full">
                    <span className="bg-sky-400" />
                    <span className="bg-emerald-400" />
                  <span className="bg-amber-400" />
                  <span className="bg-red-500" />
                </div>
                    <span className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-slate-950 shadow" style={{ left: `${hrZonePosition}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-white/70"><span>目标参数</span><span className="text-white">未获取 · 仅记录实际心率</span></div>
                <p className="mt-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-[9px] font-bold leading-4 text-white">{hrStatus}</p>
                <p className="mt-2 border-t border-white/10 pt-2 text-[9px] font-bold leading-4 text-white/80"><Volume2 className={`mr-1 inline h-3.5 w-3.5 ${anomaly ? "animate-pulse" : ""}`} />{anomaly ? "声音警报：心率出现异常变化，请暂停并联系医护" : phaseAnnouncements[phase]}</p>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-1.5">
                <TrainingMetric icon={Gauge} label="速度" value={liveMetrics.speedKmh.toFixed(1)} unit="km/h" live />
                <TrainingMetric icon={Activity} label="距离" value={liveMetrics.distanceKm.toFixed(2)} unit="km" live />
                <TrainingMetric icon={Bike} label="功率" value={String(liveMetrics.powerW)} unit="W" note={`目标 ${targetPowerMin}–${targetPowerMax}W`} live />
                <TrainingMetric icon={Settings2} label="踏频 / 阻力" value={String(liveMetrics.cadenceRpm)} unit="rpm" note={`阻力 ${liveMetrics.resistanceLevel} 级`} live />
                <TrainingMetric icon={ThermometerSun} label="血氧" value={String(liveMetrics.spo2)} unit="%" live />
                <button type="button" onClick={onMeasureBp} disabled={bpMode === "none"} className="rounded-xl border border-sky-100 bg-sky-50 p-2 text-left shadow-sm disabled:opacity-50"><p className="text-[9px] font-bold text-sky-600">血压</p><p className="mt-1 text-sm font-bold text-slate-950">{liveMetrics.bloodPressure}</p><p className="mt-0.5 text-[8px] text-slate-500">{bpMode === "none" ? "未测量" : measuredBpTime}</p></button>
                <TrainingMetric icon={Clock3} label="热量" value={String(liveMetrics.caloriesKcal)} unit="kcal" live />
              </div>
            </aside>
          </div>
      </article>
    </section>
  );
}

function TrainingMetric({ icon: Icon, label, value, unit, tone = "blue", note, live = false }: { icon: typeof Gauge; label: string; value: string; unit: string; tone?: "blue" | "rose" | "red"; note?: string; live?: boolean }) {
  const toneClasses = tone === "red" ? "border-red-100 bg-red-50/90 text-red-600" : tone === "rose" ? "border-rose-100 bg-rose-50/90 text-rose-600" : "border-medical-100 bg-medical-50/90 text-medical-600";
  return (
    <div className={`rounded-xl border p-2 shadow-sm ${toneClasses}`}>
      <div className="flex items-center gap-1"><Icon className="h-3.5 w-3.5" /><p className="text-[9px] font-bold">{label}</p>{live && <span className="metric-live-dot ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />}</div>
      <p key={`${label}-${value}`} className={`mt-1 text-base font-bold tabular-nums text-slate-950 ${live ? "metric-value-pulse" : ""}`}>{value}<span className="ml-0.5 text-[8px] text-slate-500">{unit}</span></p>
      {note && <p className="mt-0.5 truncate text-[8px] font-bold">{note}</p>}
    </div>
  );
}

function ResultScreen({
  totalMinutes,
  trainingType,
  targetHr,
  targetPowerMin,
  targetPowerMax,
  bp,
  outcome,
  completedCount,
  subjectiveFeeling,
  setSubjectiveFeeling,
  onDone,
  onViewReport
}: {
  totalMinutes: number;
  trainingType: TrainingType;
  targetHr: number;
  targetPowerMin: number;
  targetPowerMax: number;
  bp: string;
  outcome: "completed" | "partially_completed" | "interrupted";
  completedCount: number;
  subjectiveFeeling: number | null;
  setSubjectiveFeeling: (value: number) => void;
  onDone: () => void;
  onViewReport: () => void;
}) {
  return (
    <section className="grid h-full min-h-[610px] grid-cols-[0.8fr_1.2fr] gap-5" data-testid="page-VIEW-PATIENT-RESULT">
      <article className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-[#123d54] to-[#1f7e79] p-8 text-center text-white shadow-xl"><span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 ring-8 ring-white/5">{outcome === "completed" ? <CheckCircle2 className="h-14 w-14" /> : <CircleStop className="h-14 w-14" />}</span><p className="mt-7 text-sm font-bold text-teal-100">累计第 {completedCount + 1} 次实际训练</p><h1 className="mt-2 text-4xl font-bold">{outcome === "completed" ? "训练已完成" : outcome === "partially_completed" ? "训练部分完成" : "训练已中断"}</h1><p className="mt-3 max-w-sm text-sm leading-6 text-teal-50/75">本次实际执行状态与设备数据已记录，不代表处方完成进度。</p><div className="mt-8 w-full space-y-3"><button type="button" onClick={onViewReport} className="patient-touch flex w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-medical-900"><FileText className="h-5 w-5" /> 查看单次报告</button><button type="button" onClick={onDone} className="patient-touch flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 font-bold text-white ring-1 ring-white/25 hover:bg-white/15"><House className="h-5 w-5" /> 返回首页</button></div></article>
      <article className="rounded-3xl border border-white bg-white p-7 shadow-card"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-medical-600">本次训练小结</p><h2 className="mt-1 text-2xl font-bold text-slate-950">功率车 · {trainingType === "continuous" ? "连续训练" : "间歇训练"}</h2></div><span className={`rounded-full px-4 py-2 text-xs font-bold ${outcome === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{outcome === "completed" ? "数据完整" : "部分数据"}</span></div><div className="mt-7 grid grid-cols-4 gap-4">{[["实际训练时间", `${totalMinutes} 分`], ["实际平均心率", `${targetHr - 2} bpm`], ["目标参数", "未获取"], ["距离", "8.4 km"], ["消耗热量", "126 kcal"], ["结束血压", `${bp} mmHg`], ["实际平均功率", `${Math.round((targetPowerMin + targetPowerMax) / 2)} W`], ["数据完整率", "96%"]].map(([label, value]) => <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4" key={label}><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-lg font-bold text-slate-900">{value}</p></div>)}</div><div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-900">未获取可靠的处方目标范围，本次不计算目标区间时长或达标率。主观感受如需记录，由康复师在治疗记录中录入。</div><div className="mt-6 rounded-2xl border border-medical-100 bg-medical-50 p-5"><p className="font-bold text-medical-900">训练建议</p><p className="mt-2 text-sm leading-6 text-slate-600">请坐位休息并少量饮水。若离开后出现持续胸闷、心悸或明显不适，请及时联系医护人员。</p></div></article>
    </section>
  );
}

function CalendarScreen({ onBack, todayPlan, statusByItem, checkedIn, onCheckIn }: { onBack: () => void; todayPlan: PrescriptionPlan; statusByItem: Record<string, PrescriptionExerciseStatus>; checkedIn: boolean; onCheckIn: () => void }) {
  const completedCount = todayPlan.items.filter((item) => (statusByItem[item.itemId] ?? item.status) === "completed").length;
  const canCheckIn = completedCount > 0;
  const allCompleted = todayPlan.items.length > 0 && completedCount === todayPlan.items.length;
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  return <section className="rounded-3xl border border-white bg-white p-7 shadow-card">
    <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-medical-600">训练记录</p><h1 className="mt-1 text-2xl font-bold text-slate-950">2026 年 7 月打卡日历</h1><p className="mt-2 text-xs text-slate-500">完成任意一项实际训练后，患者即可自助确认今日打卡。</p></div><button type="button" onClick={onBack} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> 返回首页</button></div>
    <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${canCheckIn ? "border-emerald-100 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
      <div><p className={`text-xs font-bold ${canCheckIn ? "text-emerald-900" : "text-slate-600"}`}>今日实际训练</p><p className={`mt-1 text-sm ${canCheckIn ? "text-emerald-800" : "text-slate-500"}`}>{completedCount} 项已完成 · {allCompleted ? "全部完成" : completedCount > 0 ? "部分完成" : "暂无已完成任务"}</p><p className="mt-1 text-[10px] text-slate-500">打卡只确认今日已参加训练，不代表完成处方计划。</p></div>
      <button type="button" disabled={!canCheckIn || checkedIn} onClick={onCheckIn} className={`patient-touch min-w-40 rounded-xl px-5 font-bold transition ${canCheckIn ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" : "cursor-not-allowed bg-slate-200 text-slate-400"} ${checkedIn ? "bg-emerald-700" : ""}`}>{checkedIn ? "✓ 今日已打卡" : canCheckIn ? "确认今日打卡" : "完成任务后可打卡"}</button>
    </div>
    <div className="mt-7 grid grid-cols-7 gap-3">{["一", "二", "三", "四", "五", "六", "日"].map((day) => <p key={day} className="text-center text-xs font-bold text-slate-400">周{day}</p>)}{days.map((day) => { const done = [2, 4, 7, 9, 11, 14, 16, 18, 22, 23, 25].includes(day); const partial = [26, 28].includes(day); return <div key={day} className={`flex h-16 items-center justify-center rounded-2xl text-sm font-bold ${done ? "bg-emerald-50 text-emerald-700" : partial ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"}`}>{done ? <span className="text-center"><Check className="mx-auto h-4 w-4" /><small className="text-[9px]">已训练</small></span> : partial ? <span className="text-center"><span className="mx-auto block h-2.5 w-2.5 rounded-full bg-amber-500" /><small className="text-[9px]">部分完成</small></span> : day}</div>; })}</div>
    <div className="mt-5 flex gap-4 text-xs font-bold text-slate-500"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />全部完成</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />部分完成</span></div>
  </section>;
}

function ReportScreen({
  patientName,
  onStart,
  initialSingleReportId,
  rehabReports = [],
  singleReports = [],
  stageReports = [],
  trainingSessions = []
}: {
  patientName: string;
  onStart: () => void;
  initialSingleReportId?: string | null;
  rehabReports?: RehabReport[];
  singleReports?: StoredSingleReport[];
  stageReports?: StoredStageReport[];
  trainingSessions?: StoredTrainingSession[];
}) {
  const [reportTab, setReportTab] = useState<"single" | "stage" | "discharge">("single");
  const [selectedSingleReport, setSelectedSingleReport] = useState<string | null>(initialSingleReportId ?? null);
  const [selectedStageReport, setSelectedStageReport] = useState<string | null>(null);
  const [selectedRehabReportId, setSelectedRehabReportId] = useState<string | null>(rehabReports[0]?.reportId ?? null);
  const rehabReport = rehabReports.find((item) => item.reportId === selectedRehabReportId) ?? rehabReports[0];
  return (
    <section className="space-y-4 pb-2" data-testid="page-VIEW-PATIENT-REPORT">
      <header className="flex items-center justify-between rounded-3xl border border-white bg-white px-6 py-4 shadow-card">
        <div>
          <p className="text-xs font-bold text-medical-600">康复训练报告</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">{patientName}的运动康复记录</h1>
        </div>
        <div className="flex rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="报告类型">
          <button type="button" role="tab" aria-selected={reportTab === "single"} onClick={() => { setReportTab("single"); setSelectedSingleReport(null); }} className={`min-h-10 rounded-xl px-6 text-sm font-bold ${reportTab === "single" ? "bg-white text-medical-800 shadow-sm" : "text-slate-500"}`}>单次报告</button>
          <button type="button" role="tab" aria-selected={reportTab === "stage"} onClick={() => { setReportTab("stage"); setSelectedStageReport(null); }} className={`min-h-10 rounded-xl px-6 text-sm font-bold ${reportTab === "stage" ? "bg-white text-medical-800 shadow-sm" : "text-slate-500"}`}>阶段性报告</button>
          <button type="button" role="tab" aria-selected={reportTab === "discharge"} onClick={() => setReportTab("discharge")} className={`min-h-10 rounded-xl px-6 text-sm font-bold ${reportTab === "discharge" ? "bg-white text-medical-800 shadow-sm" : "text-slate-500"}`}>康复出院报告</button>
        </div>
      </header>
      {reportTab === "discharge" ? (
        rehabReport ? <div className="space-y-4"><div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-card"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-500">已发布康复周期</span>{rehabReports.map((item) => <button type="button" key={item.reportId} onClick={() => setSelectedRehabReportId(item.reportId)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${item.reportId === rehabReport.reportId ? "bg-medical-600 text-white" : "bg-medical-50 text-medical-700"}`}>第{item.episodeNo ?? 1}周期 · {item.publishedAt?.slice(0, 10) ?? "已发布"}</button>)}</div><p className="mt-2 text-[10px] text-slate-400">每次住院/康复周期单独保存，患者只能查看康复师已发送的版本。</p></div><PatientRehabReport report={rehabReport} /></div> : <article className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center"><FileText className="mx-auto h-8 w-8 text-amber-600" /><h2 className="mt-3 text-lg font-bold text-amber-950">康复出院报告尚未发布</h2><p className="mt-2 text-xs text-amber-800">康复师完成康复数据核对并发送后，患者可在此查看。</p></article>
      ) : reportTab === "single" ? (
        selectedSingleReport
          ? <SingleTrainingReport reportId={selectedSingleReport} reports={singleReports} onBack={() => setSelectedSingleReport(null)} />
          : <SingleReportList reports={singleReports} onSelect={setSelectedSingleReport} />
      ) : selectedStageReport
        ? <StageTrainingReport report={stageReports.find((item) => item.reportId === selectedStageReport) ?? stageReports[0]} sessions={trainingSessions} onBack={() => setSelectedStageReport(null)} onStart={onStart} />
        : <StageReportList reports={stageReports} onSelect={setSelectedStageReport} />}
    </section>
  );
}

export function PatientRehabReport({ report }: { report: RehabReport }) {
  const medicalItems = [["入院诊断", report.medicalSection.diagnosis], ["住院治疗经过", report.medicalSection.treatmentCourse], ["手术/介入情况", report.medicalSection.procedure], ["药物及注意事项", report.medicalSection.medications], ["医学复诊要求", report.medicalSection.followUpRequirements], ["临床结论", report.medicalSection.clinicalConclusion]];
  const rehabItems = [["评估结果", report.rehabSection.assessmentSummary], ["训练数据", report.rehabSection.trainingSummary], ["训练参与情况", report.rehabSection.adherenceSummary], ["随访", report.rehabSection.followUpSummary], ["改善趋势", report.rehabSection.improvementSummary]];
  const narrative = report.patientNarrative;
  return <div className="space-y-5" data-testid="page-VIEW-PATIENT-REHAB-REPORT"><article className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-card"><div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700 p-7 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-emerald-100">第{report.episodeNo ?? 1}康复周期 · 我的康复手册</p><h2 className="mt-3 text-3xl font-bold">{narrative?.greeting || "你好！"}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/90">{narrative?.celebrationMessage || "恭喜你完成本阶段康复训练！"}</p></div><span className="rounded-2xl bg-white/15 p-4"><Award className="h-10 w-10" /></span></div></div><div className="grid gap-3 p-5 sm:grid-cols-3"><div className="rounded-2xl bg-emerald-50 p-4"><CalendarDays className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-xs text-slate-500">康复周期</p><b className="mt-1 block text-sm">{narrative?.admissionDate || report.admissionDate || "未采集"} 至 {narrative?.dischargeDate || report.dischargeDate || "未采集"}</b></div><div className="rounded-2xl bg-blue-50 p-4"><Activity className="h-5 w-5 text-blue-600" /><p className="mt-3 text-xs text-slate-500">完成康复训练</p><b className="mt-1 block text-2xl text-blue-700">{narrative?.completedTrainingCount ?? 0} 次</b></div><div className="rounded-2xl bg-amber-50 p-4"><TrendingUp className="h-5 w-5 text-amber-600" /><p className="mt-3 text-xs text-slate-500">本阶段变化</p><b className="mt-1 block text-sm leading-6">{report.rehabSection.improvementSummary}</b></div></div></article><section className="grid gap-4 xl:grid-cols-2"><article className="rounded-3xl border border-teal-100 bg-teal-50 p-5 shadow-card"><h3 className="text-sm font-bold text-teal-950">你的康复足迹</h3><div className="mt-4 space-y-3">{rehabItems.map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-4"><p className="text-xs font-bold text-teal-600">{label}</p><p className="mt-1 text-sm leading-6 text-slate-700">{value}</p></div>)}</div></article><article className="rounded-3xl border border-blue-100 bg-blue-50 p-5 shadow-card"><h3 className="text-sm font-bold text-blue-950">治疗与复查信息</h3><div className="mt-4 space-y-3">{medicalItems.map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-4"><p className="text-xs font-bold text-blue-600">{label}</p><p className="mt-1 text-sm leading-6 text-slate-700">{value || "未采集"}</p></div>)}</div></article></section><article className="rounded-3xl border border-violet-100 bg-violet-50 p-6 shadow-card"><h3 className="text-base font-bold text-violet-950">带回家的康复提醒</h3><p className="mt-4 whitespace-pre-line text-sm leading-7 text-violet-950">{report.recommendationDraft}</p><p className="mt-4 rounded-2xl bg-white/70 p-4 text-xs leading-6 text-violet-800">如出现持续胸痛、明显气促、头晕、晕厥或急诊/再住院，请停止运动并及时联系医疗人员。</p></article></div>;
}

function SingleReportList({ reports, onSelect }: { reports: StoredSingleReport[]; onSelect: (reportId: string) => void }) {
  const [exerciseFilter, setExerciseFilter] = useState("全部运动类型");
  const exerciseTypes = ["全部运动类型", ...Array.from(new Set(reports.map((item) => item.exercise)))];
  const visibleRecords = exerciseFilter === "全部运动类型" ? reports : reports.filter((item) => item.exercise === exerciseFilter);
  return (
    <article className="overflow-hidden rounded-3xl border border-white bg-white shadow-card" data-testid="page-VIEW-SINGLE-REPORT-LIST">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div><p className="text-xs font-bold text-medical-600">单次训练记录</p><h2 className="mt-1 text-xl font-bold text-slate-950">选择一条记录查看完整报告</h2><p className="mt-1 text-xs text-slate-500">列表按训练时间倒序排列。</p></div>
        <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs font-bold text-slate-500">运动类型<select value={exerciseFilter} onChange={(event) => setExerciseFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">{exerciseTypes.map((item) => <option key={item}>{item}</option>)}</select></label><span className="rounded-full bg-medical-50 px-4 py-2 text-xs font-bold text-medical-700">共 {visibleRecords.length} 份报告</span></div>
      </div>
      <div className="grid grid-cols-[1.1fr_1.3fr_0.9fr_0.9fr_0.75fr_0.85fr_0.85fr_0.7fr] bg-slate-50 px-5 py-3 text-[11px] font-bold text-slate-400">
        <span>单次报告号</span><span>训练时间</span><span>运动项目</span><span>运动类型</span><span>总时长</span><span>平均心率</span><span>有效时间</span><span>状态 / 查看</span>
      </div>
      {visibleRecords.map((record) => (
        <button type="button" key={record.id} onClick={() => onSelect(record.id)} className="grid w-full grid-cols-[1.1fr_1.3fr_0.9fr_0.9fr_0.75fr_0.85fr_0.85fr_0.7fr] items-center border-t border-slate-100 px-5 py-4 text-left text-xs text-slate-600 hover:bg-medical-50/60">
          <span className="font-bold text-slate-800">{record.singleReportNo}</span>
          <span>{formatDateTime(record.actualStartAt)}</span><span className="font-bold text-slate-700">{record.exercise}</span><span>{record.trainingType}</span><span>{record.totalMinutes} 分钟</span><span>{record.hrStats.average} bpm</span><span>{record.activeMinutes} 分钟</span>
          <span className="font-bold text-medical-700">{record.status} <ChevronRight className="inline h-3.5 w-3.5" /></span>
        </button>
      ))}
      {!visibleRecords.length && <div className="py-12 text-center text-sm text-slate-400">当前运动类型暂无单次报告</div>}
    </article>
  );
}

function StageReportList({ reports, onSelect }: { reports: StoredStageReport[]; onSelect: (reportId: string) => void }) {
  return <article className="overflow-hidden rounded-3xl border border-white bg-white shadow-card" data-testid="page-VIEW-STAGE-REPORT-LIST">
    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><p className="text-xs font-bold text-medical-600">阶段训练报告</p><h2 className="mt-1 text-xl font-bold text-slate-950">选择一份阶段报告查看详情</h2><p className="mt-1 text-xs text-slate-500">系统按处方周期汇总已完成训练；新增数据生成新版本，不覆盖历史。</p></div><span className="rounded-full bg-medical-50 px-4 py-2 text-xs font-bold text-medical-700">共 {reports.length} 份报告</span></div>
    <div className="grid grid-cols-[1.25fr_1.35fr_0.65fr_1.05fr_0.75fr_0.8fr_0.8fr] bg-slate-50 px-5 py-3 text-[11px] font-bold text-slate-400"><span>版本 / 阶段报告号</span><span>报告周期</span><span>纳入次数</span><span>训练项目</span><span>平均心率</span><span>报告状态</span><span>查看</span></div>
    {reports.map((record) => <button type="button" key={record.reportId} onClick={() => onSelect(record.reportId)} className="grid w-full grid-cols-[1.25fr_1.35fr_0.65fr_1.05fr_0.75fr_0.8fr_0.8fr] items-center border-t border-slate-100 px-5 py-4 text-left text-xs text-slate-600 hover:bg-medical-50/60"><span className="font-bold text-slate-800">V{record.version ?? 1} · {record.reportNo}</span><span>{record.periodStart} 至 {record.periodEnd}</span><b>{record.selectedSessionIds.length} 次</b><span>{record.aggregate.exerciseTypes?.join("、") || "未提供"}</span><span>{record.aggregate.averageHeartRate ?? "未提供"} bpm</span><span className="font-bold text-emerald-700">已发送患者端</span><span className="font-bold text-medical-700">查看报告 <ChevronRight className="inline h-3.5 w-3.5" /></span></button>)}
    {!reports.length && <div className="py-12 text-center text-sm text-slate-400">暂无已发送阶段报告</div>}
  </article>;
}

export function SingleTrainingReport({ reportId, reports = [], onBack }: { reportId: string; reports?: StoredSingleReport[]; onBack: () => void }) {
  const report = reports.length ? reports.find((item) => item.id === reportId || item.singleReportId === reportId) : getSingleTrainingReportDetail(reportId);
  if (!report) return <section className="card p-8 text-center text-sm text-slate-500">暂无可查看的单次报告。</section>;
  const previousReport = [...(reports.length ? reports : singleTrainingReportDetails)].filter((item) => item.patientId === report.patientId && item.actualStartAt < report.actualStartAt).sort((left, right) => right.actualStartAt.localeCompare(left.actualStartAt))[0];
  const prescriptionDetail = getPrescriptionVersionDetail(report.prescriptionVersionId);
  const isDemoData = report.dataMode === "demo" || !report.sampleSeries?.length;
  const patientInfo = [
    ["患者姓名", report.clinicalSnapshot.name],
    ["患者号", report.patientNo],
    ["年龄", report.clinicalSnapshot.age == null ? "未提供" : `${report.clinicalSnapshot.age} 岁`],
    ["体重", report.clinicalSnapshot.weightKg == null ? "未提供" : `${report.clinicalSnapshot.weightKg} kg`],
    ["BMI", report.clinicalSnapshot.bmi == null ? "未提供" : `${report.clinicalSnapshot.bmi} kg/m²`],
    ["运动时间", `${report.totalMinutes} 分钟`],
    ["危险分组", displayReportValue(report.clinicalSnapshot.riskLevel)],
    ["运动项目", report.exercise],
    ["运动类型", report.trainingType]
  ];
  const prescription = [
    ["设备记录总时长", `${report.totalMinutes} 分钟`],
    ["有效运动时间", `${report.activeMinutes} 分钟`],
    ["暂停/无效时间", `${report.invalidMinutes} 分钟`],
    ["目标心率/功率", "未获取，不计算达标率"]
  ];
  return (
    <div className="space-y-4">
      <article className="rounded-3xl border border-white bg-white p-6 shadow-card">
        <div className="flex items-center justify-between"><div className="flex items-center gap-4"><button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="返回单次报告列表"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-bold text-medical-600">单次报告号 {report.singleReportNo}</p><h2 className="mt-1 text-xl font-bold text-slate-950">单次{report.exercise}训练报告</h2></div></div><div className="flex items-center gap-2"><span className={`rounded-full px-4 py-2 text-xs font-bold ${isDemoData ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{isDemoData ? "Demo 数据" : "设备采样时序"}</span><span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />训练已完成</span></div></div>
        <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">{report.dataSourceNote}</p>
        <div className="mt-5 grid grid-cols-4 gap-3">
          {patientInfo.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[11px] font-bold text-slate-400">{label}</p><p className="mt-1.5 text-sm font-bold text-slate-900">{value}</p></div>)}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[["病史", displayReportValue(report.clinicalSnapshot.patientFriendlySummary)], ["诊断", displayReportValue(report.clinicalSnapshot.diagnosis)], ["特殊用药", displayReportValue(report.clinicalSnapshot.specialMedications.join("、"))]].map(([label, value]) => <div key={label} className="rounded-2xl border border-medical-100 bg-medical-50 p-3.5"><p className="text-[11px] font-bold text-medical-600">{label}</p><p className="mt-1.5 text-xs font-bold leading-5 text-medical-950">{value}</p></div>)}
        </div>
        <div className="mt-5 border-t border-slate-100 pt-5"><p className="text-sm font-bold text-slate-900">本次执行参数</p><p className="mt-1 text-[11px] text-slate-400">由康复师对照纸质处方或 HIS 处方核对</p><div className="mt-3 grid grid-cols-4 gap-3">{prescription.map(([label, value]) => <div key={label} className="rounded-2xl border border-medical-100 bg-medical-50 p-3.5"><p className="text-[11px] font-bold text-medical-600">{label}</p><p className="mt-1.5 text-base font-bold text-medical-900">{value}</p></div>)}</div></div>
      </article>

      {previousReport && <article className="rounded-3xl border border-sky-100 bg-sky-50 p-5 shadow-card"><div className="flex items-center gap-2 text-sm font-bold text-sky-900"><TrendingUp className="h-4 w-4" />与上一次同类训练对比</div><p className="mt-1 text-xs text-slate-500">仅比较同一运动类型的实际记录，不推断处方达标情况。</p><div className="mt-4 grid grid-cols-3 gap-3"><div className="rounded-2xl bg-white p-3"><p className="text-[10px] text-slate-400">平均心率</p><p className="mt-1 font-bold text-slate-900">{previousReport.hrStats.average} → {report.hrStats.average} bpm</p><p className="mt-1 text-[10px] font-bold text-slate-500">需结合工作量判断</p></div><div className="rounded-2xl bg-white p-3"><p className="text-[10px] text-slate-400">实际运动时间</p><p className="mt-1 font-bold text-slate-900">{previousReport.activeMinutes} → {report.activeMinutes} 分钟</p><p className="mt-1 text-[10px] font-bold text-sky-700">按设备实际记录</p></div><div className="rounded-2xl bg-white p-3"><p className="text-[10px] text-slate-400">血氧摘要</p><p className="mt-1 font-bold text-slate-900">{previousReport.spo2Summary} → {report.spo2Summary}</p><p className="mt-1 text-[10px] font-bold text-slate-500">请结合实际测量时间理解</p></div></div></article>}

      <article className="rounded-3xl border border-white bg-white p-6 shadow-card">
        <div><p className="text-xs font-bold text-medical-600">处方执行情况</p><h2 className="mt-1 text-xl font-bold text-slate-950">训练时间与分期生命体征</h2></div>
        <div className="mt-5 grid grid-cols-[260px_1fr] gap-6">
          <div className="flex items-center gap-5 rounded-2xl bg-slate-50 p-5">
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#1f7e79 0 ${report.activeMinutes / report.totalMinutes * 100}%, #dbe6ec ${report.activeMinutes / report.totalMinutes * 100}% 100%)` }}>
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white"><span className="text-2xl font-bold text-slate-950">{report.totalMinutes}</span><span className="text-[10px] font-bold text-slate-400">总分钟</span></div>
            </div>
            <div className="space-y-4"><div><p className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-medical-600" />有效运动时间</p><p className="mt-1 text-xl font-bold text-slate-950">{report.activeMinutes} 分钟</p></div><div><p className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />无效运动时间</p><p className="mt-1 text-xl font-bold text-slate-950">{report.invalidMinutes} 分钟</p></div></div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <div className="grid grid-cols-[1.05fr_1fr_1fr_1fr] bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500"><span>监测指标</span><span>热身期</span><span>训练期</span><span>放松期</span></div>
            {report.phaseVitals.map((row) => <div key={row.metric} className="grid grid-cols-[1.05fr_1fr_1fr_1fr] border-t border-slate-100 px-4 py-3 text-xs text-slate-600"><b className="text-slate-800">{row.metric}</b><span>{row.warmup}</span><span>{row.training}</span><span>{row.cooldown}</span></div>)}
          </div>
        </div>
      </article>
      <article className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-card">
        <p className="text-sm font-bold text-amber-900">医生同步给您的注意事项</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs leading-5 text-amber-900">
          <PatientAdvice label="吃饭注意" value={prescriptionDetail.advice.dietCautions} />
          <PatientAdvice label="运动注意" value={prescriptionDetail.advice.exerciseCautions} />
          <PatientAdvice label="何时停止" value={prescriptionDetail.advice.stopConditions} />
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { name: "实际心率 bpm", color: "#e84b68", values: [86, 92, 101, 108, 112, 109, 103, 96] },
          { name: "实际呼吸率 次/分", color: "#347faf", values: [17, 18, 20, 22, 23, 22, 20, 18] },
          { name: "实际血氧 %", color: "#1f7e79", values: [98, 98, 97, 97, 96, 97, 98, 98] }
        ].map((item) => <TrendChart key={item.name} title={item.name} subtitle={isDemoData ? "Demo 数据 · 非设备真实采样" : "设备采样时序"} dataMode={report.dataMode} sourceNote={report.dataSourceNote} series={[item]} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        {previousReport && <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-card"><p className="text-xs font-bold text-emerald-700">本次变化提示</p><h3 className="mt-1 text-lg font-bold text-emerald-950">实际记录发生了什么变化？</h3><p className="mt-3 text-sm leading-6 text-emerald-900">本次实际运动 {report.activeMinutes} 分钟，平均心率 {report.hrStats.average} bpm。是否改善须由医生结合相同运动类型、相近模式和工作量确认，系统不自动给出阶段改善结论。</p></article>}
        <BpAndEcgPanel report={report} />
      </div>
    </div>
  );
}

function TrendChart({ title, subtitle, series, dataMode, sourceNote }: { title: string; subtitle: string; series: { name: string; color: string; values: number[] }[]; dataMode: "demo" | "sampled"; sourceNote: string }) {
  const pointsFor = (values: number[]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    return values.map((value, index) => `${40 + index * (460 / (values.length - 1))},${150 - ((value - min) / range) * 92}`).join(" ");
  };
  return (
    <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
      <div className="flex items-start justify-between"><div><p className={`text-xs font-bold ${dataMode === "demo" ? "text-amber-600" : "text-medical-600"}`}>{subtitle}</p><h3 className="mt-1 text-base font-bold text-slate-950">{title}</h3></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${dataMode === "demo" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{dataMode === "demo" ? "Demo 数据" : "真实采样"}</span></div>
      <div className="mt-3 flex flex-wrap gap-3">{series.map((item) => <span key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>)}</div>
      <svg viewBox="0 0 540 190" className="mt-2 h-[180px] w-full" role="img" aria-label={title}>
        {[58, 89, 120, 150].map((y) => <line key={y} x1="40" y1={y} x2="500" y2={y} stroke="#e8eef1" strokeWidth="1" />)}
        {[0, 5, 10, 15, 20, 25, 30].map((minute, index) => <g key={minute}><line x1={40 + index * (460 / 6)} y1="45" x2={40 + index * (460 / 6)} y2="155" stroke="#f2f5f7" strokeWidth="1" /><text x={40 + index * (460 / 6)} y="176" textAnchor="middle" fontSize="9" fill="#94a3b8">{minute}m</text></g>)}
        {series.map((item) => <polyline key={item.name} points={pointsFor(item.values)} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
      <p className={`rounded-xl px-3 py-2 text-[10px] font-bold ${dataMode === "demo" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{sourceNote}</p>
    </article>
  );
}

function BpAndEcgPanel({ report }: { report: ReturnType<typeof getSingleTrainingReportDetail> }) {
  return (
    <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div><p className="text-xs font-bold text-medical-600">间歇测量与心电摘要</p><h3 className="mt-1 text-base font-bold text-slate-950">血压测量点、心电事件与复核</h3></div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">不绘制连续血压曲线</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {report.bpMeasurements.map((item) => (
          <div key={item.phase} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-bold text-slate-400">{item.phase} · {item.time}</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
        <p className="text-[10px] font-bold text-emerald-700">心电监测摘要</p>
        <p className="mt-2 text-xs font-bold leading-5 text-emerald-900">{report.ecgSummary}</p>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
        <div className="grid grid-cols-[0.65fr_1.2fr_1.35fr_0.6fr] bg-slate-50 px-3 py-2.5 text-[10px] font-bold text-slate-500"><span>时间</span><span>事件</span><span>处置</span><span>复核</span></div>
        {(report.ecgEvents ?? []).map((event) => (
          <div key={`${event.time}-${event.event}`} className="grid grid-cols-[0.65fr_1.2fr_1.35fr_0.6fr] border-t border-slate-100 px-3 py-2.5 text-[10px] text-slate-600">
            <span className="font-bold text-slate-800">{event.time}</span><span>{event.event}</span><span>{event.action}</span><span className={event.reviewed ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>{event.reviewed ? "已复核" : "待复核"}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-slate-400">血压为人工/设备间歇测量点；心电只展示事件和复核摘要，不生成“稳定度”曲线。</p>
    </article>
  );
}

function StageTrainingReport({ report, sessions, onBack, onStart }: { report?: StoredStageReport; sessions: StoredTrainingSession[]; onBack: () => void; onStart: () => void }) {
  if (!report) return <section className="card p-8 text-center text-sm text-slate-500">暂无可查看的阶段报告。</section>;
  const selectedSessions = sessions.filter((item) => report.selectedSessionIds.includes(item.id));
  const completedSessions = selectedSessions.filter((item) => item.completed).length;
  const avgHr = report.aggregate.averageHeartRate ?? null;
  const totalActiveMinutes = report.aggregate.totalActiveMinutes;
  const dataCompleteness = report.aggregate.dataCompleteness;
  const avgRpe = report.aggregate.averageRpe;
  const abnormalSessions = selectedSessions.filter((item) => item.symptom !== "无明显不适" || item.pauses > 0 || item.terminatedEarly);
  const conclusion = report.patientStageConclusion;
  const clinicalConclusion = report.clinicalConclusion;
  return (
    <section className="space-y-4 pb-3" data-testid="page-VIEW-STAGE-REPORT">
      <button type="button" onClick={onBack} className="btn-secondary"><ArrowLeft className="h-4 w-4" />返回阶段报告列表</button>
      <div className="grid grid-cols-[1.25fr_0.75fr] gap-4">
        <article className="rounded-3xl bg-gradient-to-br from-[#123d54] via-[#165e69] to-[#1f7e79] p-6 text-white shadow-xl">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold text-teal-100">{report.reportNo} · 报告周期：{report.periodStart} 至 {report.periodEnd}</p>
              <h2 className="mt-2 text-2xl font-bold">{report.selectedSessionIds.length}次训练阶段总结</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-50/80">系统已按处方周期汇总本阶段训练记录。数据用于了解康复变化，运动安排仍以医院正式处方为准。</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-xs font-bold ring-1 ring-white/20">医患共读版</span>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[
              [`${completedSessions}`, "本报告纳入次数"],
              [`${avgHr ?? "未提供"} bpm`, "平均心率"],
              [`${totalActiveMinutes} 分`, "总实际运动时间"],
              [`${dataCompleteness ?? "未提供"}%`, "数据完整率"]
            ].map(([value, label]) => <div key={label} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-xl font-bold">{value}</p><p className="mt-1 text-[10px] text-teal-100">{label}</p></div>)}
          </div>
        </article>
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-card">
          <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-bold text-amber-900"><AlertTriangle className="h-5 w-5" />本阶段需要留意</p><span className="text-xs font-bold text-amber-700">{abnormalSessions.length} 次记录</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl font-bold text-slate-950">{abnormalSessions.length}</p><p className="mt-1 text-[10px] font-bold text-slate-500">有症状/暂停</p></div>
            <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl font-bold text-slate-950">{avgRpe ?? "未提供"}</p><p className="mt-1 text-[10px] font-bold text-slate-500">平均RPE</p></div>
          </div>
          <p className="mt-3 text-xs leading-5 text-amber-800">如训练后出现持续胸闷、明显气促、头晕或心悸，请及时告知医护人员，不自行调整训练强度。</p>
        </article>
      </div>

      <PatientFriendlyStageTemplate conclusion={conclusion} />

      <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
        <div><p className="text-xs font-bold text-medical-600">本报告所选训练记录</p><h2 className="mt-1 text-xl font-bold text-slate-950">按运动类型查看实际采集数据</h2><p className="mt-1 text-xs text-slate-500">不同运动类型不混算功率或速度；血压为训练前后测量点。</p></div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100"><div className="grid grid-cols-7 bg-slate-50 px-4 py-3 text-[10px] font-bold text-slate-400"><span>日期/项目</span><span>平均/峰值心率</span><span>血压测量点</span><span>最低血氧</span><span>项目指标</span><span>RPE</span><span>完成情况</span></div>{selectedSessions.map((session) => <div key={session.id} className="grid grid-cols-7 border-t border-slate-100 px-4 py-3 text-xs text-slate-600"><span><b>{session.exerciseType}</b><br />{session.date}</span><span>{session.avgHr ?? "未采集"}/{session.peakHr ?? "未采集"} bpm</span><span>{session.preBp ?? "未采集"} → {session.postBp ?? "未采集"}</span><span>{session.minSpo2 ?? "未采集"}%</span><span>{session.exerciseType === "功率车" ? `${session.avgPower ?? "未采集"}/${session.peakPower ?? "未采集"} W` : "不适用"}</span><span>{session.rpe ?? "未采集"}</span><span>{session.symptom || "未提供"}</span></div>)}</div>
      </article>

      <article className="rounded-3xl border border-medical-200 bg-white p-6 shadow-card">
        <div className="flex items-start justify-between gap-6">
          <div><p className="text-xs font-bold text-medical-600">医护同步的阶段总结</p><h2 className="mt-1 text-xl font-bold text-slate-950">{clinicalConclusion.summary || "未提供"}</h2></div>
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700"><ShieldCheck className="mr-1 inline h-4 w-4" />{report.confirmedBy ? `${report.confirmedBy}已确认` : `${report.generatedBy || "系统"}生成`}{report.confirmedAt ? ` · ${report.confirmedAt.slice(0, 10)}` : report.sentAt ? ` · ${report.sentAt.slice(0, 10)}` : ""}</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-800">已达到目标</p><ul className="mt-3 space-y-2 text-xs text-emerald-900">{(clinicalConclusion.achievedGoals.length ? clinicalConclusion.achievedGoals : ["未提供"]).map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" />{item}</li>)}</ul></div>
          <div className="rounded-2xl bg-amber-50 p-4"><p className="text-sm font-bold text-amber-800">尚待完成</p><ul className="mt-3 space-y-2 text-xs text-amber-900">{(clinicalConclusion.pendingGoals.length ? clinicalConclusion.pendingGoals : ["未提供"]).map((item) => <li key={item} className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{item}</li>)}</ul></div>
        </div>
        <div className="mt-4 rounded-2xl bg-medical-50 p-4"><p className="text-xs font-bold text-medical-700">患者提醒</p><p className="mt-2 text-sm font-bold leading-6 text-medical-950">本页面不提供处方调整。若医生需要调整运动项目或强度，将通过医院正式流程完成。</p><button type="button" onClick={onStart} className="mt-3 text-xs font-bold text-medical-700">返回今日训练</button></div>
        <p className="mt-4 text-[10px] text-slate-400">演示报告：指标来自模拟设备与人工记录。间歇血压保留测量时间；缺失数据不按0计入均值。</p>
      </article>
    </section>
  );
}

function PatientFriendlyStageTemplate({ conclusion }: { conclusion: StoredStageReport["patientStageConclusion"] }) {
  const stabilityTone = (value: string) => value === "稳定" ? "bg-emerald-50 text-emerald-700" : value === "未采集" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700";
  return (
    <article className="rounded-3xl border border-white bg-white p-6 shadow-card" data-testid="patient-stage-readable-template">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold text-medical-600">患者可读版 · 阶段性报告模板</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">{displayReportValue(conclusion.headline)}</h2>
          <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-slate-600">{displayReportValue(conclusion.plainSummary)}</p>
        </div>
        <div className="w-40 shrink-0 rounded-2xl bg-medical-50 p-4 text-center">
          <p className="text-[10px] font-bold text-medical-600">耐量变化</p>
          <p className="mt-2 text-3xl font-bold text-medical-900">{displayReportValue(conclusion.toleranceChange.value)}</p>
          <p className="mt-2 text-[10px] leading-4 text-medical-700">{displayReportValue(conclusion.toleranceChange.label)}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[0.85fr_1.15fr] gap-4">
        <section className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">生命体征稳不稳</p>
            <div className="flex gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${stabilityTone(conclusion.vitalsStability.bp)}`}>血压：{conclusion.vitalsStability.bp}</span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${stabilityTone(conclusion.vitalsStability.spo2)}`}>血氧：{conclusion.vitalsStability.spo2}</span>
            </div>
          </div>
          <p className="mt-3 text-xs font-medium leading-6 text-slate-600">{displayReportValue(conclusion.vitalsStability.summary)}</p>
          <p className="mt-3 rounded-xl bg-white p-3 text-[10px] leading-5 text-slate-500">{displayReportValue(conclusion.toleranceChange.basis)}</p>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-100">
          <div className="grid grid-cols-[0.9fr_0.8fr_0.8fr_1.2fr] bg-slate-50 px-4 py-3 text-[10px] font-bold text-slate-500"><span>对比项</span><span>之前</span><span>现在</span><span>说明</span></div>
          {(conclusion.beforeAfterComparison.length ? conclusion.beforeAfterComparison : [{ metric: "未提供", before: "未提供", after: "未提供", meaning: "未提供" }]).map((item) => (
            <div key={item.metric} className="grid grid-cols-[0.9fr_0.8fr_0.8fr_1.2fr] border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
              <b className="text-slate-800">{displayReportValue(item.metric)}</b><span>{displayReportValue(item.before)}</span><span className="font-bold text-medical-700">{displayReportValue(item.after)}</span><span>{displayReportValue(item.meaning)}</span>
            </div>
          ))}
        </section>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <PatientStageAdvice title="吃饭怎么注意" items={conclusion.dietAdvice} tone="emerald" />
        <PatientStageAdvice title="平时训练怎么做" items={conclusion.dailyCautions} tone="blue" />
        <PatientStageAdvice title="什么时候要停下来" items={conclusion.stopAndContactRules} tone="amber" />
      </div>
    </article>
  );
}

function PatientStageAdvice({ title, items, tone }: { title: string; items: string[]; tone: "emerald" | "blue" | "amber" }) {
  const classes = {
    emerald: "bg-emerald-50 text-emerald-900",
    blue: "bg-medical-50 text-medical-950",
    amber: "bg-amber-50 text-amber-900"
  };
  return (
    <section className={`rounded-2xl p-4 ${classes[tone]}`}>
      <p className="text-sm font-bold">{title}</p>
      <ul className="mt-3 space-y-2 text-xs leading-5">
        {displayReportList(items).map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{item}</li>)}
      </ul>
    </section>
  );
}

function PrescriptionVersionCard({ version, summary, onOpen }: { version: PrescriptionVersion; summary: VersionSummary; onOpen: () => void }) {
  const directionStyle = version.direction === "上调" ? "bg-sky-50 text-sky-700" : version.direction === "维持" ? "bg-amber-50 text-amber-700" : version.direction === "下调" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600";
  return (
    <button type="button" onClick={onOpen} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-medical-200 hover:bg-medical-50/50">
      <div className="flex items-center justify-between"><span className="text-xl font-bold text-slate-950">{version.id}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${directionStyle}`}>{version.direction === "上调" && "↑ "}{version.direction === "下调" && "↓ "}{version.direction === "维持" && "→ "}{version.direction}</span></div>
      <p className="mt-1 text-[10px] text-slate-400">{version.effectiveDate}生效 · {version.physician}</p>
      <p className="mt-3 min-h-10 text-xs font-bold leading-5 text-slate-700">{version.adjustmentReason}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-xl bg-white p-2"><p className="text-slate-400">靶心率</p><p className="mt-1 font-bold text-slate-800">{version.targetHr.join("–")} bpm</p></div>
        <div className="rounded-xl bg-white p-2"><p className="text-slate-400">目标功率</p><p className="mt-1 font-bold text-slate-800">{version.targetPower.join("–")} W</p></div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px]"><span className="text-slate-500">完成 {summary.completedSessions}/{version.plannedSessions}次</span><span className="font-bold text-medical-700">{summary.completionRate.toFixed(0)}%</span></div>
      <p className="mt-2 text-[10px] font-bold text-medical-700">查看本版处方内容 <ChevronRight className="inline h-3.5 w-3.5" /></p>
    </button>
  );
}

function PatientPrescriptionDetailModal({ version, onClose }: { version: ReturnType<typeof getPrescriptionVersionDetail>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm">
      <section className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold text-medical-600">处方号 {version.prescriptionNo} · {version.version}</p><h2 className="mt-1 text-2xl font-bold text-slate-950">这版医生给我的训练安排</h2><p className="mt-2 text-sm text-slate-500">{formatDateTime(version.issuedAt)} · {version.physician}开具</p></div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500" aria-label="关闭处方详情"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-3">
          {[["频次", `每周${version.weeklyFrequency}次`], ["时间", `${version.warmupMinutes}+${version.trainingMinutes}+${version.cooldownMinutes} 分`], ["心率", `${version.targetHr[0]}–${version.targetHr[1]} bpm`], ["功率", `${version.targetPower[0]}–${version.targetPower[1]} W`]].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-sm font-bold text-slate-900">{value}</p></div>)}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm leading-6">
          <PatientAdvice label="医生说明" value={version.advice.patientInstruction} />
          <PatientAdvice label="吃饭注意" value={version.advice.dietCautions} />
          <PatientAdvice label="运动注意" value={version.advice.exerciseCautions} />
          <PatientAdvice label="何时停止" value={version.advice.stopConditions} />
        </div>
      </section>
    </div>
  );
}

function PrescriptionEvolutionTable({ versions, summaries }: { versions: PrescriptionVersion[]; summaries: VersionSummary[] }) {
  const rows = [
    ["生效日期", ...versions.map((item) => item.effectiveDate)],
    ["调整原因", ...versions.map((item) => item.adjustmentReason)],
    ["运动/模式", ...versions.map((item) => `${item.exerciseProject} · ${item.trainingType}`)],
    ["频次", ...versions.map((item) => `每周${item.weeklyFrequency}次`)],
    ["阶段时长", ...versions.map((item) => `${item.warmupMinutes}+${item.trainingMinutes}+${item.cooldownMinutes}分`)],
    ["靶心率", ...versions.map((item) => `${item.targetHr.join("–")} bpm`)],
    ["功率/阻力", ...versions.map((item) => `${item.targetPower.join("–")}W / ${item.resistance.join("–")}级`)],
    ["RPE目标", ...versions.map((item) => item.rpeTarget.join("–"))],
    ["计划/完成", ...versions.map((item, index) => `${summaries[index].completedSessions}/${item.plannedSessions}次`)]
  ];
  return (
    <article className="overflow-hidden rounded-3xl border border-white bg-white shadow-card">
      <div className="border-b border-slate-100 px-5 py-4"><p className="text-xs font-bold text-medical-600">历史兼容数据</p><h2 className="mt-1 text-lg font-bold text-slate-950">既往训练参数记录</h2></div>
      <div className="grid grid-cols-[1.1fr_repeat(4,1fr)] bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500"><span>处方字段</span>{versions.map((item) => <span key={item.id}>{item.id}</span>)}</div>
      {rows.map((row) => <div key={row[0]} className="grid grid-cols-[1.1fr_repeat(4,1fr)] border-t border-slate-100 px-5 py-3 text-xs text-slate-600">{row.map((item, index) => <span key={`${row[0]}-${index}`} className={index === 0 ? "font-bold text-slate-800" : ""}>{item}</span>)}</div>)}
    </article>
  );
}

function VersionMetricBars({ title, unit, values, max, color }: { title: string; unit: string; values: (number | null)[]; max: number; color: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-700">{title}</p>
      <div className="mt-3 flex h-24 items-end justify-around gap-2">
        {values.map((value, index) => <div key={`${title}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end"><span className="mb-1 text-[9px] font-bold text-slate-600">{value === null ? "—" : `${value.toFixed(title === "平均 RPE" ? 1 : 0)}${unit}`}</span><div className={`w-full max-w-8 rounded-t-md ${value === null ? "bg-slate-200" : color}`} style={{ height: `${value === null ? 4 : Math.max(8, value / max * 64)}px` }} /><span className="mt-1 text-[9px] font-bold text-slate-400">V{index + 1}</span></div>)}
      </div>
    </div>
  );
}

function VersionExecutionTable({ summaries }: { summaries: VersionSummary[] }) {
  const show = (item: VersionSummary, value: string) => item.completedSessions ? value : "—";
  const rows = [
    ["实际训练次数", ...summaries.map((item) => `${item.completedSessions}次`)],
    ["平均训练时长", ...summaries.map((item) => show(item, `${item.avgDuration.toFixed(1)}分`))],
    ["数据有效率", ...summaries.map((item) => show(item, `${item.sensorValidRate.toFixed(0)}%`))],
    ["平均实际运动", ...summaries.map((item) => show(item, `${item.avgActiveMinutes.toFixed(1)}分`))],
    ["平均靶区时间", ...summaries.map((item) => show(item, `${item.avgTargetZoneMinutes.toFixed(1)}分`))],
    ["平均/峰值心率", ...summaries.map((item) => show(item, `${item.avgHr.toFixed(0)}/${item.peakHr} bpm`))],
    ["平均/峰值功率", ...summaries.map((item) => show(item, `${item.avgPower.toFixed(0)}/${item.peakPower} W`))],
    ["距离/热量", ...summaries.map((item) => show(item, `${item.totalDistance.toFixed(1)}km / ${item.totalCalories}kcal`))],
    ["RPE/暂停", ...summaries.map((item) => show(item, `${item.avgRpe.toFixed(1)} / ${item.pauses}次`))],
    ["数据完整率", ...summaries.map((item) => show(item, `${item.dataCompleteness.toFixed(0)}%`))],
    ["缺失字段", ...summaries.map((item) => item.completedSessions ? (item.missingFields.length ? item.missingFields.join("、") : "无") : "无训练数据")]
  ];
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
      <div className="min-w-[820px]">
        <div className="grid grid-cols-[1.2fr_repeat(4,1fr)] bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500"><span>执行指标</span>{summaries.map((item) => <span key={item.versionId}>{item.versionId}</span>)}</div>
        {rows.map((row) => <div key={row[0]} className="grid grid-cols-[1.2fr_repeat(4,1fr)] border-t border-slate-100 px-4 py-3 text-xs text-slate-600">{row.map((item, index) => <span key={`${row[0]}-${index}`} className={index === 0 ? "font-bold text-slate-800" : item !== "无" && row[0] === "缺失字段" ? "font-bold text-amber-700" : ""}>{item}</span>)}</div>)}
      </div>
    </div>
  );
}

function StageSafetySection() {
  const data = stageReportData;
  const bpRows = data.prescriptionVersions.map((version) => {
    const sessions = data.sessions.filter((item) => item.prescriptionVersionId === version.id);
    const firstPre = sessions.find((item) => item.preBp);
    const latestPostSession = [...sessions].reverse().find((item) => item.postBp);
    const pre = firstPre?.preBp ? `${firstPre.preBp} (${firstPre.date}训练前)` : "未采集";
    const latestPost = latestPostSession?.postBp ? `${latestPostSession.postBp} (${latestPostSession.date}训练后)` : "未采集";
    const missing = sessions.filter((item) => item.postBp === null).length;
    return [version.id, pre, latestPost, missing ? `${missing}次未采集` : "完整"];
  });
  return (
    <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
      <div><p className="text-xs font-bold text-medical-600">安全与生命体征</p><h2 className="mt-1 text-xl font-bold text-slate-950">异常事件、间歇血压与医护处置</h2></div>
      <div className="mt-5 grid grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <div className="grid grid-cols-[0.6fr_0.9fr_1fr_1.5fr] bg-slate-50 px-4 py-3 text-[11px] font-bold text-slate-500"><span>版本</span><span>事件</span><span>数值/时间</span><span>处置与复核</span></div>
          {data.safetyEvents.map((event) => <div key={event.id} className="grid grid-cols-[0.6fr_0.9fr_1fr_1.5fr] border-t border-slate-100 px-4 py-3 text-[11px] text-slate-600"><span className="font-bold text-slate-800">{event.prescriptionVersionId}</span><span><b className={event.severity === "关注" ? "text-amber-700" : "text-sky-700"}>{event.type}</b><br />{event.severity}</span><span>{event.value}<br />{event.occurredAt}</span><span>{event.action}<br /><b className="text-medical-700">{event.review}</b></span></div>)}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <div className="grid grid-cols-[0.55fr_1fr_1fr_0.8fr] bg-slate-50 px-4 py-3 text-[11px] font-bold text-slate-500"><span>版本</span><span>训练前</span><span>最近训练后</span><span>完整性</span></div>
          {bpRows.map((row) => <div key={row[0]} className="grid grid-cols-[0.55fr_1fr_1fr_0.8fr] border-t border-slate-100 px-4 py-3 text-[11px] text-slate-600"><span className="font-bold text-slate-800">{row[0]}</span><span>{row[1]}{row[1] !== "未采集" && " mmHg"}</span><span>{row[2]}{row[2] !== "未采集" && " mmHg"}</span><span className={row[3] === "完整" ? "text-emerald-700" : "font-bold text-amber-700"}>{row[3]}</span></div>)}
          <p className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">血压为训练前后间歇测量，不代表连续实时血压。</p>
        </div>
      </div>
    </article>
  );
}

function FunctionalAssessmentSection() {
  const formatValue = (value: number | null, unit: string) => value === null ? "未评估" : `${value} ${unit}`;
  return (
    <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
      <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-medical-600">能力变化</p><h2 className="mt-1 text-lg font-bold text-slate-950">基线与阶段末评估</h2></div><TrendingUp className="h-6 w-6 text-medical-600" /></div>
      <div className="mt-4 grid grid-cols-[1fr_0.9fr_0.9fr_0.8fr] bg-slate-50 px-3 py-2.5 text-[10px] font-bold text-slate-500"><span>指标</span><span>基线</span><span>阶段末</span><span>变化</span></div>
      {stageReportData.functionalAssessments.map((item) => {
        const change = item.latest === null || item.baseline === null ? "—" : `${item.latest - item.baseline > 0 ? "+" : ""}${(item.latest - item.baseline).toFixed(1)}`;
        return <div key={item.metric} className="grid grid-cols-[1fr_0.9fr_0.9fr_0.8fr] border-t border-slate-100 px-3 py-3 text-[11px] text-slate-600"><span className="font-bold text-slate-800">{item.metric}</span><span>{formatValue(item.baseline, item.unit)}</span><span className={item.latest === null ? "font-bold text-amber-700" : ""}>{formatValue(item.latest, item.unit)}</span><span className="font-bold text-medical-700">{change}</span></div>;
      })}
    </article>
  );
}

function PatientOutcomeSection() {
  const outcomes = stageReportData.patientReportedOutcomes;
  return (
    <article className="rounded-3xl border border-white bg-white p-5 shadow-card">
      <div><p className="text-xs font-bold text-medical-600">患者感受与依从性</p><h2 className="mt-1 text-lg font-bold text-slate-950">同等或更高工作量下，RPE逐步下降</h2></div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {outcomes.map((item) => <div key={item.prescriptionVersionId} className="rounded-2xl bg-slate-50 p-3 text-center"><p className="text-xs font-bold text-slate-500">{item.prescriptionVersionId}</p><p className="mt-2 text-2xl font-bold text-slate-950">{item.avgRpe}</p><p className="text-[9px] text-slate-400">平均RPE</p><div className="mt-3 space-y-1.5 text-left text-[9px] text-slate-500"><p>信心 <b className="float-right text-slate-700">{item.confidence}%</b></p><p>准备度 <b className="float-right text-slate-700">{item.readiness}%</b></p><p>依从性 <b className="float-right text-slate-700">{item.adherence}%</b></p></div></div>)}
      </div>
      <div className="mt-4 rounded-2xl bg-medical-50 p-3 text-xs leading-5 text-medical-900"><b>医生解读：</b>V4平均功率高于V1约20W，而平均心率接近，RPE较V3由12.7回落至11，提示运动耐量改善；仍需结合剩余训练和阶段末CPET确认。</div>
    </article>
  );
}

function ProfileScreen({ patientIdentity, metrics, onBack }: { patientIdentity: PatientIdentity; metrics: PatientTrainingMetrics; onBack: () => void }) {
  const rows = [["姓名 / 性别", `${patientIdentity.name} / ${patientIdentity.sex}`], ["年龄", `${patientIdentity.age} 岁`], ["康复分组", patientIdentity.group], ["康复阶段", patientIdentity.stage], ["运动风险", patientIdentity.risk], ["累计实际训练", `${metrics.completedCount} 次`], ["最近训练", metrics.latestDate], ["资料状态", "医院已核对"]];
  return <section className="rounded-3xl border border-white bg-white p-7 shadow-card"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-medical-600">本人训练资料</p><h1 className="mt-1 text-2xl font-bold text-slate-950">个人康复概览</h1></div><button type="button" onClick={onBack} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> 返回首页</button></div><div className="mt-7 grid grid-cols-2 gap-4">{rows.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-5"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-lg font-bold text-slate-900">{value}</p></div>)}</div><div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">本页仅供患者查看本人已核对资料；诊断、风险与正式处方由医院原系统管理。</div></section>;
}

function buildDailyTrainingTasks(encounter: TrainingEncounter, task?: PrescriptionTask, content?: PrescriptionContent): DailyTrainingTask[] {
  const prescriptionItems = task?.doctorFinal?.items.filter((item) => !/热身/.test(item.category)) ?? [];
  const sourceItems = prescriptionItems.length ? prescriptionItems.map((item) => ({ category: item.category, project: item.project })) : [
    content?.breathingModes?.length ? { category: "呼吸训练", project: content.breathingModes.join("、") } : null,
    content?.aerobicModes?.length ? { category: "有氧运动", project: content.aerobicModes.join("、") } : null,
    content?.resistanceModes?.length ? { category: "抗阻训练", project: content.resistanceModes.join("、") } : null,
    content?.flexibilityModes?.length ? { category: "柔韧性训练", project: content.flexibilityModes.join("、") } : null
  ].filter((item): item is { category: string; project: string } => Boolean(item));
  const normalizedItems = sourceItems.length ? sourceItems : [{ category: "有氧运动", project: encounter.project }];
  const seen = new Set<string>();
  return normalizedItems.flatMap((item, index) => {
    const exerciseKey = exerciseFromProject(item.project);
    if (seen.has(exerciseKey)) return [];
    seen.add(exerciseKey);
    const exerciseName = exerciseKey === "bike" ? "功率车"
      : exerciseKey === "diaphragmatic" ? "腹式呼吸"
      : exerciseKey === "dumbbell" ? "哑铃力量"
      : exerciseKey === "resistanceBand" ? "弹力带"
      : exerciseKey === "flexibilityFull" ? "全身柔韧训练"
      : exerciseKey === "baduanjin" ? "八段锦"
      : exerciseKey === "taichi" ? "太极拳"
      : item.project.split(/[、，,／]/)[0] || item.category;
    return [{ taskId: `${encounter.encounterId}-TASK-${index + 1}`, category: item.category, exerciseName, exerciseKey, order: index + 1, status: "pending" as const }];
  });
}

function reconcileDailyTrainingTasks(encounter: TrainingEncounter, task?: PrescriptionTask, content?: PrescriptionContent): DailyTrainingTask[] {
  const prescribedTasks = buildDailyTrainingTasks(encounter, task, content);
  const existingTasks = encounter.dailyTrainingTasks ?? [];
  return prescribedTasks.map((prescribedTask) => {
    const existingTask = existingTasks.find((item) => item.exerciseKey === prescribedTask.exerciseKey);
    if (!existingTask) return prescribedTask;
    return {
      ...prescribedTask,
      ...existingTask,
      category: prescribedTask.category,
      exerciseName: prescribedTask.exerciseName,
      exerciseKey: prescribedTask.exerciseKey,
      order: prescribedTask.order
    };
  });
}

function exerciseFromProject(project: string): Exercise {
  if (/呼吸|腹式/.test(project)) return "diaphragmatic";
  if (/椭圆/.test(project)) return "elliptical";
  if (/哑铃/.test(project)) return "dumbbell";
  if (/弹力带|抗阻|力量/.test(project)) return "resistanceBand";
  if (/柔韧|拉伸|牵伸/.test(project)) return "flexibilityFull";
  if (/八段锦/.test(project)) return "baduanjin";
  if (/太极/.test(project)) return "taichi";
  return "bike";
}

function getDevicePrescription(task?: PrescriptionTask, content?: PrescriptionContent): DevicePrescription {
  const aerobicItem = task?.doctorFinal?.items.find((item) => item.category === "有氧运动");
  const warmupItem = task?.doctorFinal?.items.find((item) => item.category === "热身运动");
  const aerobicText = [content?.aerobicIntensity, aerobicItem?.intensity].filter(Boolean).join("；");
  const targetHr = parseRange(aerobicText, /(?:靶心率|目标心率)[^\d]*(\d{2,3})\D+(\d{2,3})/) ?? activePrescription.targetHr;
  const targetPower = parseRange(aerobicText, /(?:目标功率|功率)[^\d]*(\d{1,3})\D+(\d{1,3})/) ?? activePrescription.targetPower;
  return {
    version: task?.version ?? activePrescription.version,
    prescriptionNo: task?.prescriptionNo ?? "未关联",
    physician: task?.signedBy ?? task?.assignedDoctorName ?? activePrescription.physician,
    trainingType: /间歇/.test(aerobicText) ? "interval" : "continuous",
    targetHr,
    targetPower,
    warmupMinutes: parseMinutes(content?.warmupTime ?? warmupItem?.duration) ?? activePrescription.warmupMinutes,
    trainingMinutes: parseMinutes(content?.aerobicTime ?? aerobicItem?.duration) ?? activePrescription.trainingMinutes,
    cooldownMinutes: activePrescription.cooldownMinutes,
    exerciseCautions: content?.exerciseCautions || task?.doctorFinal?.exerciseAdvice || activePrescription.advice.exerciseCautions,
    stopConditions: content?.stopConditions || task?.doctorFinal?.stopConditions || activePrescription.advice.stopConditions
  };
}

function parseRange(value: string, pattern: RegExp): [number, number] | null {
  const match = value.match(pattern);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  return Number.isFinite(first) && Number.isFinite(second) ? [first, second] : null;
}

function parseMinutes(value?: string) {
  const matched = value?.match(/\d{1,3}/)?.[0];
  return matched ? Number(matched) : null;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function formatPatientDate(value: string) {
  const [, month = "", day = ""] = value.slice(0, 10).split("-");
  return `${Number(month)}月${Number(day)}日`;
}
