import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Bike, Check, CheckCircle2, CircleStop, ClipboardCheck, Copy, Droplets, FileBarChart, FileText, Flame, Gauge, HeartPulse, IdCard, Pause, Play, Radio, RotateCcw, Route, ShieldCheck, Smartphone, UserRound, X } from "lucide-react";
import { canActAs } from "../accessControl";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "../components/UI";
import type { Appointment, AlertEvent, PrescriptionTask } from "../clinicalWorkflowData";
import { createStoredTrainingSession, type StoredSingleReport, type StoredStageReport, type StoredTrainingSession } from "../reportData";
import type { CardiopulmonaryTreatmentRecord } from "../treatmentData";
import { encounterStatusLabel, type ExecutionAdjustment, type LiveTrainingAlert, type LiveTrainingMetrics, type TrainingEncounter } from "../trainingEncounterData";
import type { Role } from "../types";
import type { ManagedPatient } from "./PatientArchivePage";
import { listDeviceHandoffs, normalizeDeviceLoginCode, readDeviceHandoff, updateDeviceHandoff, type DeviceHandoff } from "../deviceHandoffData";

type DeviceStep = "login" | "parameters" | "device" | "running" | "paused" | "tasks" | "summary";
type Props = {
  role: Exclude<Role, "PATIENT">;
  currentAccount?: string;
  encounters: TrainingEncounter[];
  appointments: Appointment[];
  patients: ManagedPatient[];
  prescriptions: PrescriptionTask[];
  treatmentRecords: CardiopulmonaryTreatmentRecord[];
  trainingSessions?: StoredTrainingSession[];
  singleReports?: StoredSingleReport[];
  stageReports?: StoredStageReport[];
  initialEncounterId?: string | null;
  onUpdateEncounter: (encounterId: string, patch: Partial<TrainingEncounter>) => void;
  onImportHandoff: (handoff: DeviceHandoff) => void;
  onPublishHandoff: (encounterId: string) => void;
  onSaveTrainingSession: (session: StoredTrainingSession) => void;
  onCreateAlert: (event: AlertEvent) => void;
  onOpenTreatment: (encounterId: string) => void;
  onGenerateStageReport: (patientId: string, prescriptionTaskId?: string) => void;
};

const adjustmentReasons: ExecutionAdjustment["reason"][] = ["患者当日状态", "设备适配", "现场反应", "康复师评估", "其他"];

export function NurseStationPage({ role, currentAccount = "周康复师", encounters, appointments, patients, prescriptions, treatmentRecords, trainingSessions = [], singleReports = [], stageReports = [], initialEncounterId, onUpdateEncounter, onImportHandoff, onPublishHandoff, onSaveTrainingSession, onCreateAlert, onOpenTreatment, onGenerateStageReport }: Props) {
  const executableEncounters = useMemo(() => encounters.filter((item) => !["completed", "cancelled", "no_show"].includes(item.status)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [encounters]);
  const firstReady = executableEncounters.find((item) => ["ready_for_device", "device_ready", "in_training", "paused", "awaiting_next_task", "post_assessment"].includes(item.status));
  const [activeEncounterId, setActiveEncounterId] = useState(initialEncounterId ?? firstReady?.encounterId ?? executableEncounters[0]?.encounterId ?? "");
  const activeEncounter = executableEncounters.find((item) => item.encounterId === activeEncounterId) ?? firstReady ?? executableEncounters[0];
  const activePatient = patients.find((item) => item.patient_demo_id === activeEncounter?.patientId);
  const activeAppointment = appointments.find((item) => item.id === activeEncounter?.appointmentId);
  const activePrescription = prescriptions.find((item) => item.id === activeEncounter?.prescriptionTaskId);
  const activeTreatment = treatmentRecords.find((item) => item.treatmentId === activeEncounter?.treatmentId);
  const [handoffOpen, setHandoffOpen] = useState(activeEncounter?.status === "ready_for_device");
  const [copied, setCopied] = useState(false);
  const [endDayOpen, setEndDayOpen] = useState(false);
  const [endDayReason, setEndDayReason] = useState("");
  const [endDayDestination, setEndDayDestination] = useState<"summary" | "assessment">("summary");
  const [step, setStep] = useState<DeviceStep>(activeEncounter?.status === "post_assessment" || activeEncounter?.status === "completed" ? "summary" : "login");
  const prescribed = getPrescriptionExecutionValues(activePrescription);
  const [targetHeartRate, setTargetHeartRate] = useState(prescribed.targetHeartRate);
  const [targetPower, setTargetPower] = useState(prescribed.targetPower);
  const [durationMinutes, setDurationMinutes] = useState(prescribed.durationMinutes);
  const [trainingMode, setTrainingMode] = useState("连续训练");
  const [adjustmentReason, setAdjustmentReason] = useState<ExecutionAdjustment["reason"] | "">("");
  const [backpackConnected, setBackpackConnected] = useState(false);
  const [bikeConnected, setBikeConnected] = useState(false);
  const [fieldNote, setFieldNote] = useState("");
  const [safetyEvents, setSafetyEvents] = useState<string[]>([]);
  const [lastSession, setLastSession] = useState<StoredTrainingSession | null>(() => trainingSessions.find((item) => item.encounterId === activeEncounter?.encounterId) ?? null);
  const canExecute = canActAs(role, "REHAB_EXECUTION");
  const canControl = canExecute || canActAs(role, "DOCTOR");
  const latestSingleReport = singleReports.find((item) => item.encounterId === activeEncounter?.encounterId || item.sourceSessionId === lastSession?.id);
  const patientStageReports = stageReports.filter((item) => item.patientId === activeEncounter?.patientId).sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  const hasAdjustment = targetHeartRate !== prescribed.targetHeartRate || targetPower !== prescribed.targetPower || durationMinutes !== prescribed.durationMinutes || trainingMode !== "连续训练";
  const inTrainingCount = encounters.filter((item) => ["in_training", "paused", "awaiting_next_task"].includes(item.status)).length;
  const waitingPostCount = encounters.filter((item) => item.status === "post_assessment").length;
  const completedTrainingCount = encounters.filter((item) => item.status === "completed").length;
  const lastRemoteUpdateRef = useRef("");

  useEffect(() => {
    const discoverActiveHandoffs = () => {
      void listDeviceHandoffs().then((handoffs) => {
        handoffs
          .filter((handoff) => !["completed", "cancelled", "no_show"].includes(handoff.encounter.status))
          .forEach(onImportHandoff);
      }).catch(() => undefined);
    };
    discoverActiveHandoffs();
    const timer = window.setInterval(discoverActiveHandoffs, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const newestActive = executableEncounters.find((item) => ["in_training", "paused"].includes(item.status));
    if (!newestActive || newestActive.encounterId === activeEncounterId) return;
    const selected = executableEncounters.find((item) => item.encounterId === activeEncounterId);
    const selectedIsCurrentWorkflow = selected && ["ready_for_device", "device_ready", "in_training", "paused", "awaiting_next_task", "post_assessment"].includes(selected.status);
    if (!selectedIsCurrentWorkflow) {
      chooseEncounter(newestActive);
    }
  }, [executableEncounters]);

  useEffect(() => {
    if (!initialEncounterId || initialEncounterId === activeEncounterId) return;
    const requested = executableEncounters.find((item) => item.encounterId === initialEncounterId);
    if (requested) chooseEncounter(requested);
  }, [initialEncounterId, executableEncounters]);

  useEffect(() => {
    if (!activeEncounter) return;
    if (activeEncounter.status === "ready_for_device") setHandoffOpen(true);
    if (!["ready_for_device", "device_ready"].includes(activeEncounter.status)) return;
    void readDeviceHandoff(activeEncounter.patientNo).then((handoff) => {
      if (!handoff || handoff.encounter.encounterId !== activeEncounter.encounterId) onPublishHandoff(activeEncounter.encounterId);
    }).catch(() => onPublishHandoff(activeEncounter.encounterId));
  }, [activeEncounter?.encounterId]);

  useEffect(() => {
    if (!activeEncounter || !["ready_for_device", "device_ready", "in_training", "paused", "awaiting_next_task"].includes(activeEncounter.status)) return;
    lastRemoteUpdateRef.current = "";
    const timer = window.setInterval(() => {
      void readDeviceHandoff(activeEncounter.patientNo).then((handoff) => {
        if (!handoff || handoff.encounter.encounterId !== activeEncounter.encounterId) return;
        if (handoff.updatedAt === lastRemoteUpdateRef.current) return;
        lastRemoteUpdateRef.current = handoff.updatedAt;
        onUpdateEncounter(activeEncounter.encounterId, handoff.encounter);
      }).catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [activeEncounter?.encounterId, activeEncounter?.patientNo]);

  useEffect(() => {
    if (!activeEncounter) return;
    if (activeEncounter.status === "in_training") setStep("running");
    if (activeEncounter.status === "paused") setStep("paused");
    if (activeEncounter.status === "awaiting_next_task") setStep("tasks");
    if (["post_assessment", "completed"].includes(activeEncounter.status)) setStep("summary");
  }, [activeEncounter?.status]);

  function chooseEncounter(encounter: TrainingEncounter) {
    const prescription = prescriptions.find((item) => item.id === encounter.prescriptionTaskId);
    const values = getPrescriptionExecutionValues(prescription);
    setActiveEncounterId(encounter.encounterId);
    setCopied(false);
    if (encounter.status === "ready_for_device") setHandoffOpen(true);
    setTargetHeartRate(values.targetHeartRate);
    setTargetPower(values.targetPower);
    setDurationMinutes(values.durationMinutes);
    setTrainingMode("连续训练");
    setAdjustmentReason("");
    setBackpackConnected(false);
    setBikeConnected(false);
    setSafetyEvents([]);
    setLastSession(trainingSessions.find((item) => item.encounterId === encounter.encounterId) ?? null);
    setStep(encounter.status === "post_assessment" || encounter.status === "completed"
      ? "summary"
      : encounter.status === "awaiting_next_task"
        ? "tasks"
        : encounter.status === "in_training"
          ? "running"
          : encounter.status === "paused"
            ? "paused"
            : "login");
  }

  function buildAdjustments(): ExecutionAdjustment[] {
    if (!activeEncounter || !hasAdjustment || !adjustmentReason) return [];
    const now = new Date().toISOString();
    const values: Array<[ExecutionAdjustment["field"], string, string, string]> = [
      ["targetHeartRate", "目标心率", `${prescribed.targetHeartRate} bpm`, `${targetHeartRate} bpm`],
      ["targetPower", "目标功率", `${prescribed.targetPower} W`, `${targetPower} W`],
      ["durationMinutes", "训练时长", `${prescribed.durationMinutes}分钟`, `${durationMinutes}分钟`],
      ["trainingMode", "训练方式", "连续训练", trainingMode]
    ];
    return values.filter(([, , original, current]) => original !== current).map(([field, label, prescribedValue, executionValue]) => ({ field, label, prescribedValue, executionValue, reason: adjustmentReason, changedBy: currentAccount, changedAt: now }));
  }

  function startTraining() {
    if (!activeEncounter) return;
    if (hasAdjustment && !adjustmentReason) return;
    onUpdateEncounter(activeEncounter.encounterId, { status: "in_training", adjustments: buildAdjustments(), trainingStartedAt: new Date().toISOString() });
    setStep("running");
  }

  function createAlert(severity: "warning" | "critical") {
    if (!activeEncounter) return;
    const now = new Date();
    const event: AlertEvent = {
      id: `ALT-${now.getTime()}`,
      encounterId: activeEncounter.encounterId,
      patientId: activeEncounter.patientId,
      patientName: activeEncounter.patientName,
      sessionId: `PENDING-${activeEncounter.encounterId}`,
      type: severity === "critical" ? "患者主诉胸闷" : "心率偏高",
      severity,
      value: severity === "critical" ? "主诉胸闷" : "158 bpm",
      threshold: severity === "critical" ? "任意出现" : ">150 bpm",
      status: severity === "critical" ? "pending_doctor_review" : "processing",
      occurredAt: now.toLocaleString("zh-CN", { hour12: false }),
      snapshot: severity === "critical" ? "功率车主训练阶段；胸闷；心率146 bpm；SpO₂ 95%" : "功率车主训练阶段；心率158 bpm；SpO₂ 96%；功率42 W",
      onSiteRecord: severity === "critical" ? "已终止训练并协助患者坐位休息，等待医生复核。" : "已暂停训练、降低负荷并复测生命体征。"
    };
    onCreateAlert(event);
    setFieldNote(event.onSiteRecord ?? "");
    setSafetyEvents((items) => [...items, event.type]);
    const liveAlert: LiveTrainingAlert = {
      type: severity === "critical" ? "symptom" : "heart_rate",
      severity,
      active: true,
      message: severity === "critical" ? "患者主诉胸闷，训练已终止并等待医生复核" : "心率超过当前告警阈值，训练已暂停",
      value: event.value,
      updatedAt: now.toISOString()
    };
    if (severity === "critical") {
      syncRemoteControl({ status: "terminated", liveAlert, trainingEndedAt: now.toISOString() });
      finishSession(true, event.type);
    } else {
      syncRemoteControl({ status: "paused", liveAlert, liveMetrics: activeEncounter.liveMetrics ? { ...activeEncounter.liveMetrics, heartRate: 158, paused: true, sampledAt: now.toISOString() } : undefined });
      setStep("paused");
    }
  }

  function finishSession(terminatedEarly = false, symptom = "") {
    if (!activeEncounter || !activeTreatment) return;
    const pre = activeTreatment.preAssessment;
    const live = activeEncounter.liveMetrics;
    const session = createStoredTrainingSession({
      encounterId: activeEncounter.encounterId,
      appointmentId: activeEncounter.appointmentId,
      treatmentId: activeEncounter.treatmentId,
      patientId: activeEncounter.patientId,
      exerciseType: activeEncounter.project,
      trainingMode,
      prescriptionTaskId: activeEncounter.prescriptionTaskId,
      prescriptionVersion: activeEncounter.prescriptionVersion,
      actualSessionSequence: trainingSessions.filter((item) => item.patientId === activeEncounter.patientId && item.completed).length + 1,
      preVitals: { bp: pre.bloodPressure.replace(" mmHg", ""), hr: String(pre.heartRate ?? ""), spo2: String(pre.spo2 ?? ""), rr: String(pre.respiratoryRate ?? "") },
      postVitals: { bp: "", hr: "", spo2: "", rr: "", symptoms: symptom || safetyEvents.join("；") },
      rpe: null,
      pauses: terminatedEarly ? Math.max(1, safetyEvents.length) : safetyEvents.length,
      terminatedEarly,
      fieldNote,
      recordedBy: currentAccount,
      device: {
        hr: live?.heartRate ?? (terminatedEarly ? 146 : 108),
        power: live?.powerW ?? (Number(targetPower) || 48),
        cadence: live?.cadenceRpm ?? 61,
        durationMinutes: live ? Math.max(1, Math.round(live.elapsedSeconds / 60)) : Number(durationMinutes) || 20,
        activeMinutes: live ? Math.max(1, Math.round(live.elapsedSeconds / 60)) : terminatedEarly ? Math.max(3, Math.round((Number(durationMinutes) || 20) * 0.4)) : Number(durationMinutes) || 20,
        completeness: live ? 100 : 96
      }
    });
    setLastSession(session);
    onSaveTrainingSession(session);
    setStep("summary");
  }

  function endTodayTraining() {
    if (!activeEncounter || activeEncounter.liveAlert?.active) return;
    const incomplete = activeEncounter.dailyTrainingTasks?.some((item) => !["completed", "skipped"].includes(item.status));
    if (incomplete && !endDayReason.trim()) return;
    const now = new Date().toISOString();
    const patch: Partial<TrainingEncounter> = {
      status: "post_assessment",
      activeTrainingTaskId: "",
      dailyTrainingTasks: activeEncounter.dailyTrainingTasks?.map((item) => item.status === "in_progress" ? { ...item, status: "partially_completed", completedAt: now } : item.status === "pending" ? { ...item, status: "skipped", completedAt: now } : item),
      dayEndedAt: now,
      dayEndedBy: currentAccount,
      dayEndReason: incomplete ? endDayReason.trim() : "今日处方项目已完成",
      trainingEndedAt: now
    };
    onUpdateEncounter(activeEncounter.encounterId, patch);
    void updateDeviceHandoff(activeEncounter.patientNo, patch).catch(() => undefined);
    setEndDayOpen(false);
    setEndDayReason("");
    setStep("summary");
    if (endDayDestination === "assessment") onOpenTreatment(activeEncounter.encounterId);
    setEndDayDestination("summary");
  }

  function syncRemoteControl(patch: Partial<TrainingEncounter>) {
    if (!activeEncounter) return;
    onUpdateEncounter(activeEncounter.encounterId, patch);
    void updateDeviceHandoff(activeEncounter.patientNo, patch).catch(() => undefined);
  }

  function toggleRemotePause() {
    if (!activeEncounter || !["in_training", "paused"].includes(activeEncounter.status)) return;
    const nextPaused = activeEncounter.status !== "paused";
    const now = new Date().toISOString();
    syncRemoteControl({
      status: nextPaused ? "paused" : "in_training",
      liveMetrics: activeEncounter.liveMetrics ? { ...activeEncounter.liveMetrics, paused: nextPaused, sampledAt: now } : undefined,
      liveAlert: !nextPaused && activeEncounter.liveAlert?.active
        ? { ...activeEncounter.liveAlert, active: false, message: "复测后指标已恢复，医护允许继续训练", updatedAt: now }
        : activeEncounter.liveAlert
    });
    setStep(nextPaused ? "paused" : "running");
  }

  function quickCompleteActiveTask() {
    if (!activeEncounter?.activeTrainingTaskId || activeEncounter.liveAlert?.active) return;
    const now = new Date().toISOString();
    const activeTask = activeEncounter.dailyTrainingTasks?.find((item) => item.taskId === activeEncounter.activeTrainingTaskId);
    const live = activeEncounter.liveMetrics;
    if (activeTask && !trainingSessions.some((item) => item.id === `SESSION-${activeTask.taskId}`)) {
      const pre = activeTreatment?.preAssessment;
      const durationMinutes = Math.max(1, Math.ceil((live?.elapsedSeconds ?? 1) / 60));
      const session = createStoredTrainingSession({
        encounterId: activeEncounter.encounterId,
        appointmentId: activeEncounter.appointmentId,
        treatmentId: activeEncounter.treatmentId,
        patientId: activeEncounter.patientId,
        exerciseType: activeTask.exerciseName,
        trainingMode: activeTask.exerciseKey === "bike" ? trainingMode : "视频跟练",
        prescriptionTaskId: activeEncounter.prescriptionTaskId,
        prescriptionVersion: activeEncounter.prescriptionVersion,
        actualSessionSequence: trainingSessions.filter((item) => item.patientId === activeEncounter.patientId && item.completed).length + 1,
        preVitals: { bp: pre?.bloodPressure.replace(" mmHg", "") ?? "", hr: String(pre?.heartRate ?? ""), spo2: String(pre?.spo2 ?? ""), rr: String(pre?.respiratoryRate ?? "") },
        postVitals: { bp: live?.bloodPressure === "— / —" ? "" : live?.bloodPressure ?? "", hr: String(live?.heartRate ?? ""), spo2: String(live?.spo2 ?? ""), rr: "", symptoms: "" },
        rpe: null,
        recordedBy: currentAccount,
        device: { hr: live?.heartRate ?? 0, power: live?.powerW ?? 0, cadence: live?.cadenceRpm ?? 0, durationMinutes, activeMinutes: Number(((live?.elapsedSeconds ?? 1) / 60).toFixed(1)), completeness: live ? 100 : 0 }
      });
      onSaveTrainingSession({ ...session, id: `SESSION-${activeTask.taskId}`, executionId: `EXEC-${activeTask.taskId}`, distanceKm: live?.distanceKm ?? null, caloriesKcal: live?.caloriesKcal ?? null });
    }
    syncRemoteControl({
      status: "awaiting_next_task",
      activeTrainingTaskId: "",
      dailyTrainingTasks: activeEncounter.dailyTrainingTasks?.map((item) => item.taskId === activeEncounter.activeTrainingTaskId ? { ...item, status: "completed", completedAt: now, recordedMetrics: activeEncounter.liveMetrics ? { lastHeartRate: activeEncounter.liveMetrics.heartRate, lastSpo2: activeEncounter.liveMetrics.spo2, recordedSeconds: activeEncounter.liveMetrics.elapsedSeconds, recordedAt: activeEncounter.liveMetrics.sampledAt } : item.recordedMetrics } : item)
    });
    setStep("tasks");
  }

  function openPostAssessment() {
    if (!activeEncounter) return;
    if (["post_assessment", "pending_signature", "completed"].includes(activeEncounter.status)) {
      onOpenTreatment(activeEncounter.encounterId);
      return;
    }
    setEndDayDestination("assessment");
    setEndDayOpen(true);
  }

  const overviewMetrics = <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <StatCard label="待设备登录" value={String(encounters.filter((item) => item.status === "ready_for_device").length)} icon={<IdCard className="h-4 w-4" />} />
    <StatCard label="训练中" value={String(inTrainingCount)} tone="green" icon={<Activity className="h-4 w-4" />} />
    <StatCard label="待训后评估" value={String(waitingPostCount)} tone="orange" icon={<ClipboardCheck className="h-4 w-4" />} />
    <StatCard label="严重异常待复核" value={String(encounters.filter((item) => item.status === "terminated").length)} tone="orange" icon={<AlertTriangle className="h-4 w-4" />} />
    <StatCard label="完成训练" value={String(completedTrainingCount)} tone="green" icon={<CheckCircle2 className="h-4 w-4" />} />
  </div>;

  if (!activeEncounter) return <section data-testid="page-VIEW-NURSE-STATION"><PageHeader eyebrow={role === "ADMIN" ? "管理员操作 · 全权限监护屏" : role === "REHAB_EXECUTION" ? "康复师操作 · 训练监护屏" : "医生监护 · 可暂停或结束当前项目"} title="训练设备端" description="已完成训练不在任务区保留，完成场次统一累计到顶部指标。" action={<StatusBadge tone="green"><Radio className="h-3.5 w-3.5" />设备数据连接正常</StatusBadge>} />{overviewMetrics}<section className="card p-12 text-center text-sm text-slate-500">当前没有待执行的院内训练任务</section></section>;

  const sessionSummary = lastSession ? { outcome: lastSession.terminatedEarly ? "terminated" as const : "completed" as const, activeMinutes: lastSession.activeMinutes, averageHeartRate: lastSession.avgHr, peakHeartRate: lastSession.peakHr, minimumSpo2: lastSession.minSpo2, averagePower: lastSession.avgPower, pauses: lastSession.pauses, safetySummary: lastSession.safetyEvents.join("；") || "无异常", generatedAt: lastSession.recordedAt ?? "" } : undefined;
  const displaySummary = activeEncounter.status === "completed" ? sessionSummary ?? activeEncounter.immediateSummary : activeEncounter.immediateSummary ?? sessionSummary;
  const deviceLoginCode = normalizeDeviceLoginCode(activeEncounter.patientNo);
  const activeDailyTask = activeEncounter.dailyTrainingTasks?.find((item) => item.taskId === activeEncounter.activeTrainingTaskId);

  return <section data-testid="page-VIEW-NURSE-STATION">
    <PageHeader eyebrow={role === "ADMIN" ? "管理员操作 · 全权限监护屏" : role === "REHAB_EXECUTION" ? "康复师操作 · 训练监护屏" : "医生监护 · 可暂停或结束当前项目"} title="训练设备端" description="固定患者号只负责识别患者，系统自动匹配其当天已完成训练前评估的唯一任务。" action={<StatusBadge tone="green"><Radio className="h-3.5 w-3.5" />设备数据连接正常</StatusBadge>} />
    {overviewMetrics}
    <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
      <section className="card overflow-hidden"><div className="border-b px-5 py-4"><SectionHeader title="院内训练任务" description="来源于预约到诊和训练前评估，不在设备端临时新建患者。" /></div><div className="divide-y divide-slate-100">{executableEncounters.map((item) => <button type="button" key={item.encounterId} onClick={() => chooseEncounter(item)} className={`grid w-full grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 text-left ${item.encounterId === activeEncounter.encounterId ? "bg-blue-50" : "hover:bg-slate-50"}`}><div><div className="flex items-center gap-2"><b className="text-sm text-slate-900">{item.patientName}</b><span className="font-mono text-[10px] text-slate-400">{item.patientNo}</span></div><p className="mt-1 text-xs text-slate-500">{item.project} · {item.station} · 处方{item.prescriptionVersion}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{item.encounterId}</p></div><StatusBadge tone={item.status === "completed" ? "green" : item.status === "paused" || item.status === "terminated" ? "red" : "orange"}>{encounterStatusLabel[item.status]}</StatusBadge></button>)}</div></section>
      <div className="space-y-4">
        {Boolean(activeEncounter.dailyTrainingTasks?.length) && <DailyTaskProgress encounter={activeEncounter} canEnd={canExecute && !["post_assessment", "pending_signature", "completed", "terminated"].includes(activeEncounter.status)} canControl={canControl} onTogglePause={toggleRemotePause} onQuickComplete={quickCompleteActiveTask} onEnd={() => { setEndDayDestination("summary"); setEndDayOpen(true); }} onGenerateReport={() => onGenerateStageReport(activeEncounter.patientId, activeEncounter.prescriptionTaskId)} onOpenAssessment={openPostAssessment} />}
        {step === "login" && <section className="card overflow-hidden" data-testid="device-login-panel"><div className="flex items-start justify-between border-b px-6 py-5"><div><p className="eyebrow">{activeEncounter.patientName} · 本次设备准备</p><h2 className="mt-1 text-xl font-bold">患者正在完成训练设备准备</h2><p className="mt-2 text-sm text-slate-500">患者端操作进度会自动同步到此处，无需在训练大屏重复输入患者号。</p></div><button type="button" onClick={() => setHandoffOpen(true)} aria-label="查看患者登录信息" title="查看患者登录信息" className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700"><IdCard className="h-5 w-5" /></button></div><div className="grid gap-0 p-6 md:grid-cols-3"><HandoffStage icon={Smartphone} index="1" title="登录训练设备" detail={activeEncounter.deviceLoggedInAt ? `已核验 ${activeEncounter.patientNo}` : `等待输入 ${deviceLoginCode}`} completed={Boolean(activeEncounter.deviceLoggedInAt)} active={!activeEncounter.deviceLoggedInAt} /><HandoffStage icon={UserRound} index="2" title="穿戴监测设备" detail={activeEncounter.wearableConnectedAt ? "监测背包已连接" : "等待穿戴并连接背包"} completed={Boolean(activeEncounter.wearableConnectedAt)} active={Boolean(activeEncounter.deviceLoggedInAt && !activeEncounter.wearableConnectedAt)} /><HandoffStage icon={Bike} index="3" title="连接训练器械" detail={activeEncounter.trainingDeviceConnectedAt ? `${activeEncounter.station} 已连接` : `等待连接 ${activeEncounter.station}`} completed={Boolean(activeEncounter.trainingDeviceConnectedAt)} active={Boolean(activeEncounter.wearableConnectedAt && !activeEncounter.trainingDeviceConnectedAt)} /></div><div className="border-t bg-slate-50 px-6 py-4 text-xs text-slate-500"><b className="text-slate-800">本次任务：</b>{activeEncounter.project} · {activeEncounter.station} · 处方{activeEncounter.prescriptionVersion} · {activeEncounter.encounterId}</div></section>}
        {step === "tasks" && <section className="card p-6 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /><h2 className="mt-3 text-xl font-bold text-slate-900">本项训练已记录</h2><p className="mt-2 text-sm text-slate-500">患者端已返回首页，可继续选择下一项；康复师也可根据当日状态决定提前结束今日训练。</p>{activeEncounter.liveAlert?.active && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">当前仍有心率异常未解除，暂不能结束今日训练。</p>}</section>}
        {step === "parameters" && <section className="card p-5"><SectionHeader title="处方核对与本次执行参数" description="由康复师操作。与处方不一致时选择原因后直接生效，不重复审批。" action={<StatusBadge tone="green">处方{activeEncounter.prescriptionVersion}</StatusBadge>} /><div className="mt-4 grid gap-3 md:grid-cols-2"><ExecutionField label="目标心率" unit="bpm" value={targetHeartRate} prescribed={prescribed.targetHeartRate} onChange={setTargetHeartRate} /><ExecutionField label="目标功率" unit="W" value={targetPower} prescribed={prescribed.targetPower} onChange={setTargetPower} /><ExecutionField label="训练时长" unit="分钟" value={durationMinutes} prescribed={prescribed.durationMinutes} onChange={setDurationMinutes} /><label className="rounded-xl border border-slate-200 p-3"><span className="field-label">训练方式</span><select value={trainingMode} onChange={(event) => setTrainingMode(event.target.value)} className="text-field"><option>连续训练</option><option>间歇训练</option></select></label></div>{hasAdjustment && <label className="mt-4 block rounded-xl border border-amber-200 bg-amber-50 p-4"><span className="field-label text-amber-800">参数调整原因</span><select value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value as ExecutionAdjustment["reason"])} className="text-field mt-2"><option value="">请选择原因后直接生效</option>{adjustmentReasons.map((item) => <option key={item}>{item}</option>)}</select></label>}<div className="mt-5 flex justify-end"><button type="button" disabled={!canExecute || (hasAdjustment && !adjustmentReason)} onClick={() => setStep("device")} className="btn-primary disabled:bg-slate-300">进入设备检查<ArrowRight className="h-4 w-4" /></button></div></section>}
        {step === "device" && <section className="card p-5"><SectionHeader title="设备连接检查" description="监测背包和功率车均连接后才能开始训练。" /><div className="mt-4 grid grid-cols-2 gap-3"><DeviceCheck label="生理监测背包" detail="心率、SpO₂与心电信号" checked={backpackConnected} onChange={setBackpackConnected} /><DeviceCheck label="功率车" detail="功率、踏频、速度与距离" checked={bikeConnected} onChange={setBikeConnected} /></div><div className="mt-5 flex justify-end"><button type="button" disabled={!canExecute || !backpackConnected || !bikeConnected} onClick={startTraining} className="btn-primary disabled:bg-slate-300"><Play className="h-4 w-4" />开始训练</button></div></section>}
        {(step === "running" || step === "paused") && <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4"><div><p className="eyebrow">{activeEncounter.station}</p><h2 className="mt-1 text-lg font-bold">{activeEncounter.patientName} · {activeDailyTask?.exerciseName ?? activeEncounter.project}</h2></div><StatusBadge tone={step === "paused" ? "red" : "green"}>{step === "paused" ? "异常暂停" : "训练中"}</StatusBadge></div>
          <div className="grid md:grid-cols-[0.55fr_1.45fr]"><div className="flex min-h-[360px] flex-col items-center justify-center bg-blue-50 p-6">{activeDailyTask?.exerciseKey === "bike" ? <Bike className={`h-28 w-28 text-blue-600 ${step === "running" ? "nurse-bike-moving" : ""}`} strokeWidth={1.5} /> : <Activity className="h-28 w-28 text-blue-600" strokeWidth={1.5} />}<p className="mt-3 text-sm font-bold text-slate-700">{step === "paused" ? "已暂停，等待复测" : phaseLabel(activeEncounter.liveMetrics?.phase)}</p></div><DoctorLiveMetrics metrics={activeEncounter.liveMetrics} alert={activeEncounter.liveAlert} /></div>
          <div className="border-t bg-slate-50 p-4"><textarea value={fieldNote} onChange={(event) => setFieldNote(event.target.value)} className="text-field min-h-20" placeholder="现场处置记录会进入异常和单次报告" /><div className="mt-3 flex flex-wrap justify-end gap-2">{step === "paused" ? <button type="button" onClick={() => { onUpdateEncounter(activeEncounter.encounterId, { status: "in_training" }); setStep("running"); }} className="btn-secondary"><RotateCcw className="h-4 w-4" />复测后恢复训练</button> : <button type="button" onClick={() => createAlert("warning")} className="btn-secondary text-amber-700"><Pause className="h-4 w-4" />模拟一般异常</button>}<button type="button" onClick={() => createAlert("critical")} className="btn-secondary text-red-600"><AlertTriangle className="h-4 w-4" />严重异常并终止</button><button type="button" onClick={() => finishSession(false)} className="btn-primary"><CheckCircle2 className="h-4 w-4" />完成设备训练</button></div></div>
        </section>}
        {step === "summary" && <section className="space-y-4" data-testid="instant-training-summary"><section className="card overflow-hidden"><div className="flex items-start justify-between border-b bg-emerald-50 px-5 py-4"><div><p className="eyebrow text-emerald-700">{activeEncounter.status === "completed" ? "完整训练记录" : "设备即时摘要"}</p><h2 className="mt-1 text-xl font-bold text-emerald-950">本次训练设备采集已结束</h2><p className="mt-1 text-xs text-emerald-800">{activeEncounter.status === "completed" ? "训练后评估与签署已完成，当前展示同一训练记录的最终数据。" : "当前为即时摘要，康复师补完训练后评估后自动更新为完整单次报告。"}</p></div><ShieldCheck className="h-7 w-7 text-emerald-600" /></div>{displaySummary ? <div className="grid grid-cols-2 gap-px bg-slate-100 md:grid-cols-4"><SummaryMetric label="实际运动" value={`${displaySummary.activeMinutes}分钟`} /><SummaryMetric label="平均/峰值心率" value={`${displaySummary.averageHeartRate ?? "未采集"}/${displaySummary.peakHeartRate ?? "未采集"} bpm`} /><SummaryMetric label="最低SpO₂" value={displaySummary.minimumSpo2 == null ? "未采集" : `${displaySummary.minimumSpo2}%`} /><SummaryMetric label="平均功率" value={displaySummary.averagePower == null ? "不适用" : `${displaySummary.averagePower} W`} /><SummaryMetric label="暂停次数" value={`${displaySummary.pauses}次`} /><SummaryMetric label="完成情况" value={displaySummary.outcome === "terminated" ? "提前终止" : displaySummary.outcome === "partially_completed" ? "部分完成" : "已完成"} /><div className="col-span-2 bg-white p-4"><p className="text-xs font-bold text-slate-400">安全摘要</p><p className="mt-2 text-sm font-bold text-slate-800">{displaySummary.safetySummary}</p></div></div> : <p className="p-6 text-sm text-slate-500">正在读取设备摘要。</p>}<div className="flex flex-wrap justify-end gap-2 border-t p-4"><button type="button" disabled={!canExecute} onClick={() => onGenerateStageReport(activeEncounter.patientId, activeEncounter.prescriptionTaskId)} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"><FileBarChart className="h-4 w-4" />{activeEncounter.status === "completed" ? "生成/更新阶段报告" : "提前生成阶段报告"}</button><button type="button" onClick={() => onOpenTreatment(activeEncounter.encounterId)} className="btn-primary"><ClipboardCheck className="h-4 w-4" />{activeEncounter.status === "completed" ? "查看完整治疗记录" : "填写训练后评估"}</button></div></section>{latestSingleReport && <section className="card p-5"><SectionHeader title="单次报告状态" description={latestSingleReport.reportStage === "complete" ? "设备事实、训练后生命体征、Borg、症状和处置已合并为同一份完整报告。" : "设备数据已形成即时版，训后评估和RPE尚未完成的字段明确标记，不按0处理。"} action={<StatusBadge tone={latestSingleReport.reportStage === "complete" ? "green" : "orange"}>{latestSingleReport.reportStage === "complete" ? "完整报告" : "即时摘要"}</StatusBadge>} /><p className="mt-4 text-sm leading-6 text-slate-700">{latestSingleReport.executionSummary}</p></section>}{patientStageReports[0] && <section className="card p-5"><SectionHeader title={`阶段报告 V${patientStageReports[0].version ?? 1}`} description="达到处方周期自动生成，也可由康复师提前生成；后续新增训练保留旧版并生成新版。" action={<StatusBadge tone="green">设备端可查看</StatusBadge>} /><p className="mt-4 text-sm leading-6 text-slate-700">{patientStageReports[0].patientStageConclusion.plainSummary || patientStageReports[0].generatedSummary}</p></section>}</section>}
        {role === "ADMIN" && <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">管理员可执行康复师操作和医生监护控制，所有操作以管理员本人身份留痕。</p>}
      </div>
    </div>
    {handoffOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5" role="dialog" aria-modal="true" aria-labelledby="handoff-title"><article className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl"><div className="flex items-start justify-between border-b p-6"><div><p className="eyebrow">训前评估完成 · 设备交接</p><h2 id="handoff-title" className="mt-1 text-xl font-bold">{activeEncounter.patientName}的患者端登录信息</h2></div><button type="button" onClick={() => setHandoffOpen(false)} aria-label="关闭患者登录信息" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500"><X className="h-5 w-5" /></button></div><div className="p-6"><div className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-center"><p className="text-sm font-bold text-blue-700">当前患者登录号码</p><p className="mt-3 font-mono text-3xl font-bold text-blue-950">{activePatient?.patient_code ?? activeEncounter.patientNo}</p><p className="mt-2 text-sm text-blue-800">患者端请输入 <b className="font-mono text-lg">{deviceLoginCode}</b></p></div><p className="mt-4 text-sm leading-6 text-slate-600">患者端核验后会自动带入本次处方、训练项目和工位。号码前缀仅用于院内展示，患者端输入后六位数字即可。</p><div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm"><div><p className="text-xs font-bold text-slate-400">训练项目</p><p className="mt-1 font-bold">{activeEncounter.project}</p></div><div><p className="text-xs font-bold text-slate-400">训练工位</p><p className="mt-1 font-bold">{activeEncounter.station}</p></div><div><p className="text-xs font-bold text-slate-400">处方版本</p><p className="mt-1 font-bold">{activeEncounter.prescriptionVersion}</p></div><div><p className="text-xs font-bold text-slate-400">训练就诊号</p><p className="mt-1 break-all font-mono text-xs font-bold">{activeEncounter.encounterId}</p></div></div></div><div className="flex justify-end gap-3 border-t p-4"><button type="button" onClick={() => { void navigator.clipboard?.writeText(deviceLoginCode); setCopied(true); }} className="btn-secondary"><Copy className="h-4 w-4" />{copied ? "已复制" : "复制6位登录号"}</button><button type="button" onClick={() => setHandoffOpen(false)} className="btn-primary">知道了</button></div></article></div>}
    {endDayOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5" role="dialog" aria-modal="true" aria-labelledby="end-day-title"><article className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl"><div className="flex items-start justify-between border-b p-6"><div><p className="eyebrow">康复师确认</p><h2 id="end-day-title" className="mt-1 text-xl font-bold">是否结束今日训练？</h2></div><button type="button" onClick={() => setEndDayOpen(false)} aria-label="关闭结束训练确认" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500"><X className="h-5 w-5" /></button></div><div className="p-6"><p className="text-sm leading-6 text-slate-600">已完成 {activeEncounter.dailyTrainingTasks?.filter((item) => item.status === "completed").length ?? 0} 项，共 {activeEncounter.dailyTrainingTasks?.length ?? 0} 项。结束后进入训练后评估，患者端不能继续启动今日项目。</p>{activeEncounter.dailyTrainingTasks?.some((item) => !["completed", "skipped"].includes(item.status)) && <label className="mt-5 block"><span className="field-label">提前结束原因</span><textarea value={endDayReason} onChange={(event) => setEndDayReason(event.target.value)} className="text-field mt-2 min-h-24" placeholder="例如：患者疲劳、当日时间不足、康复师评估后调整" /></label>}{activeEncounter.liveAlert?.active && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">心率异常尚未解除，请先完成现场处置。</p>}</div><div className="flex justify-end gap-3 border-t p-4"><button type="button" onClick={() => setEndDayOpen(false)} className="btn-secondary">继续下一项</button><button type="button" onClick={endTodayTraining} disabled={Boolean(activeEncounter.liveAlert?.active) || Boolean(activeEncounter.dailyTrainingTasks?.some((item) => !["completed", "skipped"].includes(item.status)) && !endDayReason.trim())} className="btn-primary disabled:cursor-not-allowed disabled:bg-slate-300">确认结束并进入训后评估</button></div></article></div>}
  </section>;
}

function DailyTaskProgress({ encounter, canEnd, canControl, onTogglePause, onQuickComplete, onEnd, onGenerateReport, onOpenAssessment }: { encounter: TrainingEncounter; canEnd: boolean; canControl: boolean; onTogglePause: () => void; onQuickComplete: () => void; onEnd: () => void; onGenerateReport: () => void; onOpenAssessment: () => void }) {
  const tasks = encounter.dailyTrainingTasks ?? [];
  const completedCount = tasks.filter((item) => item.status === "completed").length;
  const allCompleted = tasks.length > 0 && tasks.every((item) => ["completed", "skipped"].includes(item.status));
  const hasActiveTask = Boolean(encounter.activeTrainingTaskId && tasks.some((item) => item.taskId === encounter.activeTrainingTaskId));
  const statusText = (status: (typeof tasks)[number]["status"]) => status === "completed" ? "已完成" : status === "in_progress" ? "训练中" : status === "partially_completed" ? "部分完成" : status === "interrupted" ? "已中断" : status === "skipped" ? "已跳过" : "待训练";
  return <section className="card overflow-hidden" data-testid="daily-training-task-progress"><div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><div><p className="eyebrow">今日训练任务</p><h2 className="mt-1 text-lg font-bold">共 {tasks.length} 项 · 已完成 {completedCount} 项</h2></div><div className="flex flex-wrap justify-end gap-2">{canControl && hasActiveTask && <button type="button" onClick={onTogglePause} className="btn-secondary">{encounter.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{encounter.status === "paused" ? "恢复患者运动" : "暂停患者运动"}</button>}{canEnd && <><button type="button" onClick={onGenerateReport} className="btn-secondary"><FileBarChart className="h-4 w-4" />提前生成阶段性报告</button><button type="button" onClick={onOpenAssessment} className="btn-primary"><ClipboardCheck className="h-4 w-4" />填写训练后评估</button></>}{canEnd && completedCount > 0 && <button type="button" onClick={onEnd} disabled={Boolean(encounter.liveAlert?.active)} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"><CircleStop className="h-4 w-4" />{allCompleted ? "完成今日训练" : "评估是否提前结束"}</button>}</div></div><div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">{tasks.map((item) => { const active = item.taskId === encounter.activeTrainingTaskId || item.status === "in_progress"; const complete = item.status === "completed"; return <div key={item.taskId} className={`bg-white p-4 ${active ? "ring-2 ring-inset ring-blue-300" : ""}`}><div className="flex items-center justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-full ${complete ? "bg-emerald-600 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{complete ? <Check className="h-4 w-4" /> : item.order}</span><span className={`text-[10px] font-bold ${complete ? "text-emerald-700" : active ? "text-blue-700" : item.status === "pending" ? "text-slate-400" : "text-amber-700"}`}>{statusText(item.status)}</span></div><p className="mt-3 text-xs font-bold text-slate-400">{item.category}</p><p className="mt-1 text-sm font-bold text-slate-900">{item.exerciseName}</p>{active && canControl && <button type="button" onClick={onQuickComplete} disabled={Boolean(encounter.liveAlert?.active)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-[11px] font-bold text-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" />快速完成本项</button>}</div>; })}</div></section>;
}

function HandoffStage({ icon: Icon, index, title, detail, completed, active }: { icon: typeof Activity; index: string; title: string; detail: string; completed: boolean; active: boolean }) {
  return <div className="relative flex flex-col items-center px-4 py-5 text-center"><div className={`flex h-20 w-20 items-center justify-center rounded-full border-4 ${completed ? "border-emerald-100 bg-emerald-600 text-white" : active ? "border-blue-100 bg-blue-600 text-white" : "border-slate-100 bg-slate-200 text-slate-500"}`}>{completed ? <Check className="h-9 w-9" /> : <Icon className="h-9 w-9" />}</div><span className={`mt-4 rounded-full px-2.5 py-1 text-[10px] font-bold ${completed ? "bg-emerald-50 text-emerald-700" : active ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{completed ? "已完成" : active ? "当前阶段" : `第${index}步`}</span><h3 className="mt-2 text-base font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>;
}

function getPrescriptionExecutionValues(task?: PrescriptionTask) {
  const aerobic = task?.doctorFinal?.items.find((item) => item.category === "有氧运动");
  const heartRates = aerobic?.intensity.match(/(\d{2,3})\D+(\d{2,3})/)?.slice(1).map(Number) ?? [];
  const powers = aerobic?.intensity.match(/功率[^\d]*(\d{1,3})\D+(\d{1,3})/)?.slice(1).map(Number) ?? [];
  const duration = Number(aerobic?.duration.match(/\d{1,3}/)?.[0]) || 20;
  return {
    targetHeartRate: heartRates.length === 2 ? String(Math.round((heartRates[0] + heartRates[1]) / 2)) : "108",
    targetPower: powers.length === 2 ? String(Math.round((powers[0] + powers[1]) / 2)) : "48",
    durationMinutes: String(duration)
  };
}

function ExecutionField({ label, value, prescribed, unit, onChange }: { label: string; value: string; prescribed: string; unit: string; onChange: (value: string) => void }) {
  return <label className={`rounded-xl border p-3 ${value !== prescribed ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}><span className="flex items-center justify-between text-xs font-bold text-slate-600"><span>{label}</span><span className="text-[10px] text-slate-400">处方 {prescribed}{unit}</span></span><div className="mt-2 flex items-center gap-2"><input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} className="text-field" /><span className="text-xs font-bold text-slate-500">{unit}</span></div></label>;
}

function DeviceCheck({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className={`cursor-pointer rounded-xl border p-4 ${checked ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}><div className="flex items-center gap-3"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-emerald-600" /><div><b className="text-sm text-slate-900">{label}</b><p className="mt-1 text-xs text-slate-500">{detail}</p></div></div></label>;
}

function DoctorLiveMetrics({ metrics, alert }: { metrics?: LiveTrainingMetrics; alert?: LiveTrainingAlert }) {
  if (!metrics) return <div className="flex min-h-[360px] items-center justify-center p-6 text-center"><div><Radio className="mx-auto h-8 w-8 animate-pulse text-blue-500" /><p className="mt-3 text-sm font-bold text-slate-700">等待患者训练端上传指标</p><p className="mt-1 text-xs text-slate-400">训练启动后按秒同步设备数据</p></div></div>;
  const sampledTime = new Date(metrics.sampledAt).toLocaleTimeString("zh-CN", { hour12: false });
  return <div className="p-5">{alert?.active && <div className="mb-3 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-3 text-red-800"><AlertTriangle className="mt-0.5 h-5 w-5 animate-pulse" /><div><p className="text-sm font-bold">心率异常 · {metrics.heartRate} bpm</p><p className="mt-1 text-xs">{alert.message}</p></div></div>}<div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-slate-700">患者端实时指标</p><p className="mt-1 text-[10px] text-slate-400">{phaseLabel(metrics.phase)} · 已训练 {formatMetricTime(metrics.elapsedSeconds)}</p></div><span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700"><span className={`h-2 w-2 rounded-full ${alert?.active ? "animate-pulse bg-red-500" : "metric-live-dot bg-emerald-500"}`} />{sampledTime} 同步</span></div><div className="grid grid-cols-2 gap-2 xl:grid-cols-4"><LiveMetric icon={HeartPulse} label="心率" value={String(metrics.heartRate)} unit="bpm" alert={Boolean(alert?.active)} /><LiveMetric icon={Gauge} label="速度" value={metrics.speedKmh.toFixed(1)} unit="km/h" /><LiveMetric icon={Route} label="距离" value={metrics.distanceKm.toFixed(2)} unit="km" /><LiveMetric icon={Bike} label="功率" value={String(metrics.powerW)} unit="W" /><LiveMetric icon={RotateCcw} label="踏频" value={String(metrics.cadenceRpm)} unit="rpm" note={`阻力 ${metrics.resistanceLevel}级`} /><LiveMetric icon={Droplets} label="血氧" value={String(metrics.spo2)} unit="%" /><LiveMetric icon={Activity} label="血压" value={metrics.bloodPressure} unit="mmHg" /><LiveMetric icon={Flame} label="热量" value={String(metrics.caloriesKcal)} unit="kcal" /></div></div>;
}

function phaseLabel(phase?: LiveTrainingMetrics["phase"]) {
  return phase === "warmup" ? "热身阶段" : phase === "cooldown" ? "放松阶段" : phase === "training" ? "主要训练阶段" : "等待训练数据";
}

function formatMetricTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function LiveMetric({ icon: Icon, label, value, unit, note, alert = false }: { icon: typeof Activity; label: string; value: string; unit: string; note?: string; alert?: boolean }) {
  return <div className={`min-w-0 rounded-xl border p-3 ${alert ? "border-red-300 bg-red-50" : "border-slate-100 bg-slate-50"}`}><p className={`flex items-center gap-1.5 text-[11px] font-bold ${alert ? "text-red-600" : "text-slate-400"}`}><Icon className="h-3.5 w-3.5" />{label}</p><p className={`mt-1.5 break-words text-lg font-bold ${alert ? "text-red-800" : "text-slate-900"}`}>{value}<span className="ml-1 text-[10px] text-slate-400">{unit}</span></p>{note && <p className="mt-1 text-[9px] font-bold text-slate-400">{note}</p>}</div>;
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return <div className="bg-white p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-base font-bold text-slate-900">{value}</p></div>;
}
