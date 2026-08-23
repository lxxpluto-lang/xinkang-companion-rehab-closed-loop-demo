import { useMemo, useState } from "react";
import {
  Activity,
  Award,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  ClipboardList,
  CalendarDays,
  FileHeart,
  FileText,
  History,
  PenLine,
  Printer,
  Save,
  Search,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import { SectionHeader, StatusBadge } from "../components/UI";
import type { RehabReport } from "../dischargeHandbookData";
import type { AssessmentRecord } from "../assessmentData";
import type { CardiopulmonaryTreatmentRecord } from "../treatmentData";
import type { FollowUpRecord } from "../followUpData";
import { defaultPrescriptionContent, type PatientClinicalProfile, type PrescriptionContent } from "../prescriptionWorkspaceData";
import { type PrescriptionDraft, type PrescriptionItem, type PrescriptionStatus, type PrescriptionTask } from "../clinicalWorkflowData";
import type { StaffRole } from "../types";
import { PatientRehabReport } from "../patient/PatientApp";
import { displayClinicalMetric, type StoredSingleReport, type StoredStageReport } from "../reportData";

export type PrescriptionWorkspaceTab = "profile" | "current" | "history" | "reports" | "rehab";

const tabs: { key: PrescriptionWorkspaceTab; label: string; icon: typeof UserRound }[] = [
  { key: "profile", label: "患者基本信息", icon: UserRound },
  { key: "current", label: "本次处方", icon: PenLine },
  { key: "history", label: "既往处方", icon: History },
  { key: "reports", label: "相关报告", icon: Activity },
  { key: "rehab", label: "康复报告/手册", icon: FileHeart }
];

const statusLabel: Record<PrescriptionStatus, string> = {
  pending_generation: "待生成",
  pending_review: "待复核",
  pending_signature: "待签署",
  completed: "已完成",
  withdrawn: "已撤回",
  archived: "已归档失效"
};

function cloneContent(content: PrescriptionContent): PrescriptionContent {
  return {
    ...content,
    rehabGoals: [...content.rehabGoals],
    breathingModes: [...content.breathingModes],
    warmupModes: [...content.warmupModes],
    aerobicModes: [...content.aerobicModes],
    resistanceModes: [...content.resistanceModes],
    flexibilityModes: [...content.flexibilityModes],
    inheritedFields: [...content.inheritedFields]
  };
}

const contentArrayKeys: (keyof PrescriptionContent)[] = [
  "rehabGoals",
  "breathingModes",
  "warmupModes",
  "aerobicModes",
  "resistanceModes",
  "flexibilityModes",
  "inheritedFields",
];

function normalizeContent(value: Partial<PrescriptionContent> | undefined): PrescriptionContent {
  const next = { ...defaultPrescriptionContent, ...(value ?? {}) } as PrescriptionContent;
  contentArrayKeys.forEach((key) => {
    if (!Array.isArray(next[key])) (next as unknown as Record<string, unknown>)[key] = [...(defaultPrescriptionContent[key] as string[])];
  });
  return next;
}

const prescriptionCategories: PrescriptionItem["category"][] = ["呼吸训练", "热身运动", "有氧运动", "抗阻训练", "柔韧性训练"];
function normalizeCategory(value: unknown): PrescriptionItem["category"] {
  return prescriptionCategories.includes(value as PrescriptionItem["category"]) ? value as PrescriptionItem["category"] : "有氧运动";
}

function normalizeDraft(value?: PrescriptionDraft): PrescriptionDraft | undefined {
  if (!value || typeof value !== "object") return undefined;
  return {
    ...value,
    summary: String(value.summary ?? ""),
    items: Array.isArray(value.items)
      ? value.items.map((item) => ({
        ...item,
        category: normalizeCategory(item.category),
        project: String(item.project ?? "未提供"),
        intensity: String(item.intensity ?? "未提供"),
        duration: String(item.duration ?? "未提供"),
        frequency: String(item.frequency ?? "未提供"),
        reason: String(item.reason ?? ""),
      }))
      : [],
    dietAdvice: String(value.dietAdvice ?? ""),
    exerciseAdvice: String(value.exerciseAdvice ?? ""),
    stopConditions: String(value.stopConditions ?? ""),
  };
}

type PrescriptionHistoryRecord = {
  id: string;
  prescriptionNo: string;
  version: string;
  issuedAt: string;
  doctorName: string;
  rehabStage: string;
  sourceLabel: string;
  status: PrescriptionStatus;
  signed: boolean;
  draft?: PrescriptionDraft;
};

function buildPrescriptionHistory(task: PrescriptionTask, allTasks: PrescriptionTask[]): PrescriptionHistoryRecord[] {
  const records = allTasks
    .filter((item) => item.patientId === task.patientId && item.id !== task.id)
    .map((item) => ({
      id: item.id,
      prescriptionNo: item.prescriptionNo,
      version: item.version,
      issuedAt: item.signedAt ?? item.generatedAt ?? item.updatedAt,
      doctorName: item.signedBy ?? item.assignedDoctorName,
      rehabStage: item.rehabStage,
      sourceLabel: item.sourceLabel ?? "基线评估",
      status: item.status,
      signed: item.status === "completed" && Boolean(item.doctorFinal),
      draft: normalizeDraft(item.doctorFinal ?? item.aiSuggestion ?? item.previous)
    }));
  if (task.kind !== "initial" && !records.length && task.previous) {
    records.push({
      id: `${task.id}-previous`,
      prescriptionNo: `${task.prescriptionNo}-PREV`,
      version: `${task.version} 前一版`,
      issuedAt: task.generatedAt ?? task.updatedAt,
      doctorName: task.assignedDoctorName,
      rehabStage: task.rehabStage,
      sourceLabel: "历史处方快照",
      status: "completed",
      signed: true,
      draft: normalizeDraft(task.previous)
    });
  }
  return records.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export function PrescriptionWorkspacePage({
  task,
  allTasks = [],
  role,
  accountId,
  currentAccount,
  profile,
  content,
  rehabReports,
  assessmentRecords,
  treatmentRecords,
  followUpRecords,
  singleReports = [],
  stageReports = [],
  initialTab = "profile",
  onBack,
  onOpenPatient,
  onOpenAssessment,
  onUpdateTask,
  onSaveContent,
  onSaveRehabReport
}: {
  task: PrescriptionTask;
  allTasks?: PrescriptionTask[];
  role: StaffRole;
  accountId: string;
  currentAccount: string;
  profile: PatientClinicalProfile;
  content: PrescriptionContent;
  rehabReports: RehabReport[];
  assessmentRecords: AssessmentRecord[];
  treatmentRecords: CardiopulmonaryTreatmentRecord[];
  followUpRecords: FollowUpRecord[];
  singleReports?: StoredSingleReport[];
  stageReports?: StoredStageReport[];
  initialTab?: PrescriptionWorkspaceTab;
  onBack: () => void;
  onOpenPatient: (patientId: string, tab?: string) => void;
  onOpenAssessment: (patientId: string, recordId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<PrescriptionTask>) => void;
  onSaveContent: (taskId: string, content: PrescriptionContent) => void;
  onSaveRehabReport: (report: RehabReport) => void;
}) {
  const [activeTab, setActiveTab] = useState<PrescriptionWorkspaceTab>(initialTab);
  const [draft, setDraft] = useState<PrescriptionContent>(() => cloneContent(normalizeContent(content)));
  const [finalDraft, setFinalDraft] = useState<PrescriptionDraft | undefined>(() => normalizeDraft(task.doctorFinal ?? task.aiSuggestion));
  const [dirty, setDirty] = useState(false);
  const [responsibilityConfirmed, setResponsibilityConfirmed] = useState(false);
  const [signatureName, setSignatureName] = useState(task.signedBy ?? currentAccount);
  const [signatureError, setSignatureError] = useState("");
  const readonly = task.status === "completed" || task.status === "withdrawn" || task.status === "archived";
  const canManageAssignedPrescription = role === "ADMIN" || (role === "DOCTOR" && task.assignedDoctorId === accountId);
  const editable = canManageAssignedPrescription && !readonly;
  const canManageRehabReport = canManageAssignedPrescription;
  const patientReports = singleReports.filter((item) => item.patientId === task.patientId);
  const patientAssessments = assessmentRecords.filter((item) => item.patientId === task.patientId && item.status !== "draft");
  const patientStageReports = stageReports.filter((item) => item.patientId === task.patientId);
  const patientRehabReports = rehabReports.filter((item) => item.patientId === task.patientId);
  const patientPrescriptionHistory = useMemo(() => buildPrescriptionHistory(task, allTasks), [allTasks, task]);
  const relatedReportCount = patientAssessments.length + patientReports.length + patientStageReports.length;
  const latestPatientAssessment = [...patientAssessments].sort((a, b) => b.assessedAt.localeCompare(a.assessedAt))[0];

  const tabStatus = useMemo<Record<PrescriptionWorkspaceTab, { text: string; tone: "blue" | "green" | "orange" }>>(() => ({
    profile: { text: profile.diagnosis ? "资料可用" : "资料待补", tone: profile.diagnosis ? "green" : "orange" },
    current: { text: statusLabel[task.status], tone: task.status === "completed" ? "green" : "orange" },
    history: { text: patientPrescriptionHistory.length ? `${patientPrescriptionHistory.length}条记录` : "暂无处方", tone: patientPrescriptionHistory.length ? "green" : "orange" },
    reports: { text: relatedReportCount ? `${relatedReportCount}份报告` : "暂无报告", tone: relatedReportCount ? "green" : "orange" },
    rehab: { text: patientRehabReports.some((item) => item.status === "published") ? "已发布" : "待生成", tone: patientRehabReports.some((item) => item.status === "published") ? "green" : "orange" }
  }), [patientPrescriptionHistory.length, patientRehabReports, profile.diagnosis, relatedReportCount, task.status]);

  const tabIndex = tabs.findIndex((item) => item.key === activeTab);

  function changeContent<K extends keyof PrescriptionContent>(key: K, value: PrescriptionContent[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function saveWorkspace() {
    onSaveContent(task.id, cloneContent(draft));
    if (finalDraft) onUpdateTask(task.id, { doctorFinal: finalDraft, updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }) });
    setDirty(false);
  }

  function generateAiDraft() {
    const generated = buildEvidenceBasedAiPrescription(task, profile, latestPatientAssessment, draft);
    const ai = generated.draft;
    const generatedContent = { ...draft, ...generated.contentPatch };
    setFinalDraft(ai);
    setDraft(generatedContent);
    onSaveContent(task.id, cloneContent(generatedContent));
    setDirty(false);
    const stageReport = stageReports.find((item) => item.patientId === task.patientId && item.status === "sent") ?? stageReports.find((item) => item.patientId === task.patientId);
    const sourceRecordIds = [
      `患者档案:${task.patientId}`,
      ...(latestPatientAssessment ? [`SPPB:${latestPatientAssessment.assessmentId}`] : []),
      ...(stageReport?.selectedSessionIds.length ? stageReport.selectedSessionIds.map((id) => `训练:${id}`) : []),
    ];
    const missingFields = task.kind === "initial"
      ? latestPatientAssessment ? [] : ["患者体能评估记录"]
      : stageReport ? [] : ["患者阶段性报告"];
    onUpdateTask(task.id, {
      aiSuggestion: ai,
      aiSuggestionMeta: {
        suggestionId: `AI-PRESCRIPTION-${task.id}-${Date.now()}`,
        patientId: task.patientId,
        type: "PRESCRIPTION",
        sourceRecordIds,
        missingFields,
        content: ai.summary,
        status: "DRAFT",
        generatedAt: new Date().toISOString()
      },
      status: "pending_review",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false })
    });
  }

  function confirmPrescription() {
    if (!editable || !finalDraft || !responsibilityConfirmed) return;
    const now = new Date().toLocaleString("zh-CN", { hour12: false });
    if (task.status === "pending_signature" && signatureName.trim() !== currentAccount) {
      setSignatureError(`签署姓名必须与当前登录账号“${currentAccount}”一致。`);
      return;
    }
    saveWorkspace();
    setSignatureError("");
    onUpdateTask(task.id, task.status === "pending_signature"
      ? { doctorFinal: finalDraft, status: "completed", signedBy: signatureName.trim(), signedAt: now, updatedAt: now }
      : { doctorFinal: finalDraft, status: "pending_signature", signedBy: undefined, signedAt: undefined, updatedAt: now });
  }

  return (
    <section className="space-y-4 pb-24" data-testid="page-PRESCRIPTION-WORKSPACE">
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <button type="button" onClick={onBack} className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="返回处方列表"><ArrowLeft className="h-5 w-5" /></button>
            <div><p className="text-xs font-bold tracking-wide text-blue-600">处方管理 · 患者开方工作区</p><h1 className="mt-1 text-2xl font-bold text-slate-950">患者处方详情</h1><p className="mt-1 text-sm text-slate-500">{task.kind === "initial" ? "初始处方" : "调整处方"} · {task.prescriptionNo} · {task.version}</p>{task.sourceLabel && <p className="mt-1 text-xs font-semibold text-blue-700">生成来源：{task.sourceLabel}</p>}</div>
          </div>
          <div className="flex items-center gap-2"><StatusBadge tone={task.status === "completed" ? "green" : "orange"}>{statusLabel[task.status]}</StatusBadge><button type="button" className="btn-secondary" onClick={() => onOpenPatient(task.patientId, "profile")}><UserRound className="h-4 w-4" />查看完整患者档案</button></div>
        </div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-7">
          <SummaryCell label="患者" value={`${profile.name} · ${profile.sex} · ${profile.age}岁`} />
          <SummaryCell label="患者号" value={task.patientNo} />
          <SummaryCell label="风险等级" value={task.risk} warning={task.risk === "高危"} />
          <SummaryCell label="康复阶段" value={task.rehabStage} />
          <SummaryCell label="最近异常" value={task.patientId === "P-DEMO-001" ? "训练中心率偏高" : "无异常记录"} warning={task.patientId === "P-DEMO-001"} />
          <SummaryCell label="当前任务" value={statusLabel[task.status]} />
          <SummaryCell label="草稿状态" value={dirty ? "存在未保存修改" : `已保存 ${task.updatedAt}`} warning={dirty} />
        </div>
      </header>

      <nav className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm lg:grid-cols-5" aria-label="患者开方工作区栏目">
        {tabs.map(({ key, label, icon: Icon }, index) => {
          const state = tabStatus[key];
          return <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex min-h-16 items-center gap-3 rounded-xl px-3 text-left transition ${activeTab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activeTab === key ? "bg-white/15" : "bg-slate-100"}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-bold">{index + 1}. {label}</span><span className={`mt-1 block text-xs font-semibold ${activeTab === key ? "text-blue-100" : state.tone === "green" ? "text-emerald-600" : state.tone === "orange" ? "text-amber-600" : "text-blue-600"}`}>{state.text}</span></span></button>;
        })}
      </nav>

      {activeTab === "profile" && <ProfileTab profile={profile} task={task} onOpenPatient={onOpenPatient} />}
      {activeTab === "current" && <CurrentPrescriptionTab task={task} profile={profile} assessment={latestPatientAssessment} content={draft} finalDraft={finalDraft} editable={editable} currentAccount={currentAccount} signatureName={signatureName} signatureError={signatureError} responsibilityConfirmed={responsibilityConfirmed} onSignatureNameChange={setSignatureName} onResponsibilityConfirmed={setResponsibilityConfirmed} onGenerate={generateAiDraft} onDraftChange={setFinalDraft} onContentChange={changeContent} onSave={saveWorkspace} onConfirm={confirmPrescription} />}
      {activeTab === "history" && <HistoryTab task={task} records={patientPrescriptionHistory} finalDraft={finalDraft} />}
      {activeTab === "reports" && <ReportsTab task={task} assessments={patientAssessments} reports={patientReports} stageReports={patientStageReports} onOpenPatient={onOpenPatient} onOpenAssessment={onOpenAssessment} />}
      {activeTab === "rehab" && <RehabTab task={task} profile={profile} content={draft} reports={patientRehabReports} trainingReports={patientReports} stageReports={stageReports} assessments={assessmentRecords.filter((item) => item.patientId === task.patientId && item.status === "completed")} treatments={treatmentRecords.filter((item) => item.patientId === task.patientId && item.status !== "draft")} followUps={followUpRecords.filter((item) => item.patientId === task.patientId)} canManage={canManageRehabReport} onOpenPatient={onOpenPatient} onSave={onSaveRehabReport} />}

      <div className="fixed bottom-0 left-[180px] right-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4"><div><p className="text-sm font-bold text-slate-800">{tabs[tabIndex].label}</p><p className="mt-0.5 text-xs text-slate-500">{readonly ? "已完成处方仅可查看和打印" : dirty ? "存在未保存内容" : "当前内容已保存"}</p></div><div className="flex items-center gap-2"><button type="button" className="btn-secondary" disabled={tabIndex === 0} onClick={() => setActiveTab(tabs[Math.max(0, tabIndex - 1)].key)}><ArrowLeft className="h-4 w-4" />上一步</button>{editable && <button type="button" className="btn-secondary" onClick={saveWorkspace}><Save className="h-4 w-4" />保存草稿</button>}<button type="button" className="btn-primary" disabled={tabIndex === tabs.length - 1} onClick={() => setActiveTab(tabs[Math.min(tabs.length - 1, tabIndex + 1)].key)}>下一步<ArrowRight className="h-4 w-4" /></button></div></div>
      </div>
    </section>
  );
}

function SummaryCell({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className={`min-h-20 bg-white px-4 py-3 ${warning ? "!bg-amber-50" : ""}`}><p className="text-xs font-bold text-slate-400">{label}</p><p className={`mt-1.5 text-sm font-bold leading-5 ${warning ? "text-amber-800" : "text-slate-800"}`}>{value}</p></div>;
}

function ProfileTab({ profile, task, onOpenPatient }: { profile: PatientClinicalProfile; task: PrescriptionTask; onOpenPatient: (patientId: string, tab?: string) => void }) {
  const items = [["患者姓名", profile.name], ["性别 / 年龄", `${profile.sex} / ${profile.age}岁`], ["患者编号", task.patientNo], ["联系电话", profile.contact], ["康复阶段", profile.rehabStage], ["风险等级", profile.riskLevel], ["诊断摘要", profile.diagnosis], ["特殊用药", profile.specialMedications], ["既往史", profile.medicalHistory], ["CPET", profile.cpet], ["6分钟步行", profile.sixMinuteWalk], ["静息生命体征", profile.restingVitals]];
  return <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><SectionHeader title="患者基本信息" description="展示本次开方需要快速确认的临床摘要，资料维护请进入患者档案。" /><button type="button" className="btn-secondary" onClick={() => onOpenPatient(task.patientId, "profile")}><UserRound className="h-4 w-4" />完整患者档案</button></div><div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">{items.map(([label, value]) => <div key={label} className={`rounded-xl bg-slate-50 p-3 ${label === "既往史" || label === "诊断摘要" ? "md:col-span-2" : ""}`}><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1.5 text-xs font-semibold leading-5 text-slate-700">{value || "未提供"}</p></div>)}</div></section>;
}

type AiBodySnapshot = {
  sppbScore: number | null;
  functionLevel: string;
  bmi: number | null;
  restingHeartRate: number | null;
  restingBloodPressure: string;
  startingIntensity: string;
  sourceText: string;
  hasStructuredAssessment: boolean;
};

function buildAiBodySnapshot(profile: PatientClinicalProfile, assessment?: AssessmentRecord): AiBodySnapshot {
  const profileSppb = profile.rehabAssessment.sppb;
  const profileSppbScore = profile.rehabAssessment.status !== "待补充"
    ? profileSppb.balanceScore + profileSppb.gaitScore + profileSppb.chairStandScore
    : null;
  const sppbScore = assessment?.sppb.totalScore ?? profileSppbScore;
  const functionLevel = sppbScore === null
    ? "待补充体能评估"
    : sppbScore <= 3 ? "重度功能受限"
      : sppbScore <= 6 ? "中度功能受限"
        : sppbScore <= 9 ? "轻度功能受限"
          : "功能状态较好";
  const restingHeartRate = assessment?.preVitals.pulse ?? profile.rehabAssessment.restingVitals.heartRate;
  const profileBp = profile.rehabAssessment.restingVitals.systolic !== null && profile.rehabAssessment.restingVitals.diastolic !== null
    ? `${profile.rehabAssessment.restingVitals.systolic}/${profile.rehabAssessment.restingVitals.diastolic}`
    : "未采集";
  const restingBloodPressure = assessment?.preVitals.bloodPressure || profileBp;
  const startingIntensity = profile.riskLevel === "高危" || (sppbScore !== null && sppbScore <= 6)
    ? "低强度起始"
    : profile.riskLevel === "中危" || sppbScore === null || sppbScore <= 9
      ? "低至中等强度"
      : "中等强度起始";
  const sources = ["患者基础档案", assessment ? `SPPB ${assessment.assessedAt.slice(0, 10)}` : profile.rehabAssessment.status !== "待补充" ? "结构化体能评估" : "无体能评估", profile.cpetStatus === "completed" ? "CPET" : null].filter(Boolean);
  return {
    sppbScore,
    functionLevel,
    bmi: profile.bmi,
    restingHeartRate,
    restingBloodPressure,
    startingIntensity,
    sourceText: sources.join(" · "),
    hasStructuredAssessment: Boolean(assessment) || profile.rehabAssessment.status !== "待补充",
  };
}

function buildEvidenceBasedAiPrescription(task: PrescriptionTask, profile: PatientClinicalProfile, assessment: AssessmentRecord | undefined, content: PrescriptionContent): { draft: PrescriptionDraft; contentPatch: Partial<PrescriptionContent> } {
  const body = buildAiBodySnapshot(profile, assessment);
  const prescriptionKindLabel = task.kind === "initial" ? "首次" : "调整";
  const sppbText = body.sppbScore === null ? "SPPB尚未采集" : `SPPB ${body.sppbScore}/12（${body.functionLevel}）`;
  const atHeartRateMetric = profile.rehabAssessment.cpet.anaerobicThresholdHr;
  const confirmedAtHeartRate = atHeartRateMetric.status === "confirmed" ? atHeartRateMetric.value : null;
  const aerobicIntensity = confirmedAtHeartRate
    ? `靶心率${Math.max(60, confirmedAtHeartRate - 18)}–${Math.max(70, confirmedAtHeartRate - 2)}次/分钟；RPE 9–11；可正常交谈`
    : "RPE 9–11；运动时可正常交谈；暂不设置目标功率，待CPET或首次训练反应确认";
  const aerobicTime = body.sppbScore !== null && body.sppbScore <= 6 ? "10–15分钟/次" : body.sppbScore !== null && body.sppbScore >= 10 ? "20–30分钟/次" : "15–20分钟/次";
  const warmupTime = profile.riskLevel === "高危" ? "8–10分钟" : "5–10分钟";
  const lowerStrength = Number(assessment?.sppb.muscleStrength.lower.match(/\d/)?.[0] ?? "");
  const resistanceModes = lowerStrength > 0 && lowerStrength <= 3 ? ["徒手抗阻", "轻阻力弹力带"] : content.resistanceModes;
  const resistanceIntensity = lowerStrength > 0 && lowerStrength <= 3
    ? "每种动作1组，每组8次；动作缓慢，呼气发力，避免憋气"
    : "每种动作1–2组，每组8–10次；呼气发力，避免憋气";
  const vitalText = `静息HR ${body.restingHeartRate ?? "未采集"}次/分、BP ${body.restingBloodPressure}`;
  const reasons = {
    breathing: `依据${task.risk}风险分层及${vitalText}，先建立稳定呼吸节律，降低开始训练时紧张和屏气风险。`,
    warmup: `依据${body.startingIntensity}和${vitalText}，采用渐进热身，使循环负荷平稳上升后再进入主训练。`,
    aerobic: `依据${sppbText}、${task.rehabStage}和${task.risk}风险分层；${confirmedAtHeartRate ? `CPET无氧阈心率${confirmedAtHeartRate}次/分用于限定上限。` : "缺少已确认CPET阈值，因此仅使用RPE和谈话测试控制强度。"}`,
    resistance: `依据SPPB椅子坐立${assessment ? `${assessment.sppb.chairStand.score}/4` : "未采集"}、下肢肌力${assessment?.sppb.muscleStrength.lower || "未采集"}，从低阻力和较少组数开始，避免屏气。`,
    flexibility: `依据当前功能水平“${body.functionLevel}”，在主训练后安排舒适范围拉伸，帮助恢复并维持关节活动度。`,
  };
  const contentPatch: Partial<PrescriptionContent> = {
    breathingModes: ["腹式呼吸练习"],
    breathingIntensity: "舒适节律，呼气时间长于吸气，避免屏气",
    breathingFrequency: "每天2次",
    breathingTime: "每次5–10分钟",
    warmupModes: content.warmupModes,
    warmupFrequency: "每次训练前",
    warmupTime,
    aerobicModes: body.sppbScore !== null && body.sppbScore <= 6 ? ["低速步行", "低功率踏车"] : ["步行训练", "功率车"],
    aerobicIntensity,
    aerobicFrequency: "每周3次",
    aerobicTime,
    resistanceModes,
    resistanceIntensity,
    resistanceFrequency: "每周2次",
    resistanceTime: "每次3–4种动作",
    flexibilityModes: content.flexibilityModes,
    flexibilityIntensity: "每组肌肉拉伸2–3次，以舒适牵伸感为度",
    flexibilityFrequency: "每次有氧或抗阻训练后",
    flexibilityTime: "每次拉伸15–30秒",
    remark: `${body.hasStructuredAssessment ? "已引用体能评估" : "当前仅引用基础档案"}生成${prescriptionKindLabel}处方草稿；医生需核对禁忌证、用药、症状及全部最终参数。`,
  };
  return {
    contentPatch,
    draft: {
      summary: `AI基于${body.sourceText}形成辅助评估：${sppbText}，${task.risk}风险，建议${body.startingIntensity}。以下内容为可编辑草稿，须由${task.assignedDoctorName}逐项复核。`,
      items: [
        { category: "呼吸训练", project: contentPatch.breathingModes?.join("、") ?? "腹式呼吸练习", intensity: contentPatch.breathingIntensity ?? "", duration: contentPatch.breathingTime ?? "", frequency: contentPatch.breathingFrequency ?? "", reason: reasons.breathing },
        { category: "热身运动", project: content.warmupModes.join("、"), intensity: "低强度，逐步提升心率", duration: warmupTime, frequency: "每次训练前", reason: reasons.warmup },
        { category: "有氧运动", project: contentPatch.aerobicModes?.join("、") ?? "", intensity: aerobicIntensity, duration: aerobicTime, frequency: "每周3次", reason: reasons.aerobic },
        { category: "抗阻训练", project: resistanceModes.join("、"), intensity: resistanceIntensity, duration: "每次3–4种动作", frequency: "每周2次", reason: reasons.resistance },
        { category: "柔韧性训练", project: content.flexibilityModes.join("、"), intensity: contentPatch.flexibilityIntensity ?? "", duration: contentPatch.flexibilityTime ?? "", frequency: contentPatch.flexibilityFrequency ?? "", reason: reasons.flexibility },
      ],
      dietAdvice: content.dietCautions,
      exerciseAdvice: contentPatch.remark ?? content.exerciseCautions,
      stopConditions: content.stopConditions,
    },
  };
}

function AiBodyAssessmentPanel({ profile, assessment, generated }: { profile: PatientClinicalProfile; assessment?: AssessmentRecord; generated: boolean }) {
  const body = buildAiBodySnapshot(profile, assessment);
  const metrics = [
    { label: "SPPB总分", value: body.sppbScore === null ? "未采集" : `${body.sppbScore}/12`, note: assessment ? assessment.assessedAt.slice(0, 10) : "结构化资料" },
    { label: "AI功能分层", value: generated ? body.functionLevel : "待AI评估", note: "基于SPPB辅助分层" },
    { label: "BMI", value: body.bmi === null ? "未采集" : body.bmi.toFixed(1), note: "患者基础档案" },
    { label: "静息心率", value: body.restingHeartRate === null ? "未采集" : `${body.restingHeartRate} 次/分`, note: assessment ? "SPPB评估前" : "结构化资料" },
    { label: "静息血压", value: body.restingBloodPressure, note: assessment ? "SPPB评估前" : "结构化资料" },
    { label: "AI建议起始强度", value: generated ? body.startingIntensity : "待AI评估", note: "结合风险与功能状态" },
  ];
  return <section className="card overflow-hidden" data-testid="ai-body-assessment">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><SectionHeader title="AI患者身体评估" description="展示AI实际引用的身体指标和辅助分层，不补造缺失数值。" /><StatusBadge tone={generated ? "green" : "orange"}>{generated ? "AI已完成评估" : "等待生成"}</StatusBadge></div>
    <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-6">{metrics.map((metric) => <div key={metric.label} className="min-h-24 px-4 py-4"><p className="text-xs font-bold text-slate-400">{metric.label}</p><p className={`mt-2 text-base font-bold ${metric.value.includes("未采集") || metric.value.includes("待AI") ? "text-amber-700" : "text-slate-900"}`}>{metric.value}</p><p className="mt-1 text-[10px] leading-4 text-slate-400">{metric.note}</p></div>)}</div>
    <div className={`border-t px-5 py-3 text-xs leading-5 ${body.hasStructuredAssessment ? "border-blue-100 bg-blue-50 text-blue-800" : "border-amber-100 bg-amber-50 text-amber-900"}`}><b>本次引用：</b>{body.sourceText}。{body.hasStructuredAssessment ? "AI将按现有指标形成草稿，医生需复核适配性。" : "当前缺少SPPB，AI只生成保守草稿，不计算目标功率或精确靶心率。"}</div>
  </section>;
}

function CurrentPrescriptionTab({ task, profile, assessment, content, finalDraft, editable, currentAccount, signatureName, signatureError, responsibilityConfirmed, onSignatureNameChange, onResponsibilityConfirmed, onGenerate, onDraftChange, onContentChange, onSave, onConfirm }: { task: PrescriptionTask; profile: PatientClinicalProfile; assessment?: AssessmentRecord; content: PrescriptionContent; finalDraft?: PrescriptionDraft; editable: boolean; currentAccount: string; signatureName: string; signatureError: string; responsibilityConfirmed: boolean; onSignatureNameChange: (value: string) => void; onResponsibilityConfirmed: (value: boolean) => void; onGenerate: () => void; onDraftChange: (draft: PrescriptionDraft) => void; onContentChange: <K extends keyof PrescriptionContent>(key: K, value: PrescriptionContent[K]) => void; onSave: () => void; onConfirm: () => void }) {
  const ai = task.aiSuggestion;
  const [drawer, setDrawer] = useState<"evidence" | "comparison" | null>(null);
  const [quickInputOpen, setQuickInputOpen] = useState(false);
  const [naturalText, setNaturalText] = useState("功率车训练，每周3次，每次30分钟，靶心率100-116次/分钟，RPE 11-13；训练前后监测血压、心率，如胸闷胸痛、头晕或心悸立即停止。");
  const reasonFor = (category: string) => finalDraft?.items.find((item) => item.category === category)?.reason;

  function applyNaturalText() {
    const parsed = parseNaturalPrescriptionText(naturalText, content, task);
    Object.entries(parsed.contentPatch).forEach(([key, value]) => onContentChange(key as keyof PrescriptionContent, value as never));
    onDraftChange(parsed.finalDraft);
  }

  return <div className="space-y-4">
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-600 p-2.5 text-white"><Sparkles className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-blue-950">AI 辅助处方草稿</h2><p className="mt-1 text-sm leading-5 text-blue-800">AI先读取SPPB、基础档案和已确认临床指标，再生成带理由的处方草稿；最终参数由医生确认。</p></div></div><div className="flex gap-2">{task.aiSuggestionMeta && <button type="button" className="btn-secondary" onClick={() => setDrawer("evidence")}><FileText className="h-4 w-4" />生成依据</button>}{ai && finalDraft && <button type="button" className="btn-secondary" onClick={() => setDrawer("comparison")}><History className="h-4 w-4" />三值对比</button>}{!ai && editable && <button type="button" className="btn-primary" onClick={onGenerate}><Bot className="h-4 w-4" />{task.kind === "initial" ? "AI快速生成首次处方" : "生成AI调整建议"}</button>}</div></div></section>
    <AiBodyAssessmentPanel profile={profile} assessment={assessment} generated={Boolean(finalDraft)} />
    {editable && <section className="card overflow-hidden"><button type="button" onClick={() => setQuickInputOpen((open) => !open)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"><span><span className="flex items-center gap-2 text-sm font-bold text-slate-900"><Search className="h-4 w-4 text-blue-600" />快速输入/从文字生成</span><span className="mt-1 block text-xs text-slate-500">粘贴医生习惯性处方文字，识别后填入本次处方表单；不会自动保存为模板。</span></span><StatusBadge tone={quickInputOpen ? "blue" : "gray"}>{quickInputOpen ? "已展开" : "可选"}</StatusBadge></button>{quickInputOpen && <div className="border-t border-slate-100 bg-slate-50/60 p-5"><textarea className="text-field min-h-28 py-3" value={naturalText} onChange={(event) => setNaturalText(event.target.value)} placeholder="例如：功率车训练，每周3次，每次30分钟，靶心率100-116次/分钟..." /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-slate-500">可识别运动类型、频次、时长、强度/靶心率和停止条件；未识别字段仍需医生手工确认。</p><button type="button" className="btn-primary" onClick={applyNaturalText}><Sparkles className="h-4 w-4" />识别并填入本次处方</button></div></div>}</section>}
    <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><SectionHeader title="心脏康复中心运动处方" description="医生最终签署值以本区域内容为准。" action={<span className="text-[10px] text-slate-400">{task.prescriptionNo}</span>} />{task.status === "completed" && <button type="button" className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" />打印</button>}</div><div className="space-y-3 bg-slate-50/60 p-5"><PrescriptionRow title="呼吸训练" reason={reasonFor("呼吸训练")} modes={content.breathingModes} intensity={content.breathingIntensity} frequency={content.breathingFrequency} time={content.breathingTime} editable={editable} onModes={(value) => onContentChange("breathingModes", value)} onIntensity={(value) => onContentChange("breathingIntensity", value)} onFrequency={(value) => onContentChange("breathingFrequency", value)} onTime={(value) => onContentChange("breathingTime", value)} /><PrescriptionRow title="热身运动" reason={reasonFor("热身运动")} modes={content.warmupModes} intensity="低强度，逐步提升心率" frequency={content.warmupFrequency} time={content.warmupTime} editable={editable} onModes={(value) => onContentChange("warmupModes", value)} onIntensity={() => undefined} onFrequency={(value) => onContentChange("warmupFrequency", value)} onTime={(value) => onContentChange("warmupTime", value)} /><PrescriptionRow title="有氧运动" reason={reasonFor("有氧运动")} modes={content.aerobicModes} intensity={content.aerobicIntensity} frequency={content.aerobicFrequency} time={content.aerobicTime} editable={editable} onModes={(value) => onContentChange("aerobicModes", value)} onIntensity={(value) => onContentChange("aerobicIntensity", value)} onFrequency={(value) => onContentChange("aerobicFrequency", value)} onTime={(value) => onContentChange("aerobicTime", value)} /><PrescriptionRow title="抗阻训练" reason={reasonFor("抗阻训练")} modes={content.resistanceModes} intensity={content.resistanceIntensity} frequency={content.resistanceFrequency} time={content.resistanceTime} editable={editable} onModes={(value) => onContentChange("resistanceModes", value)} onIntensity={(value) => onContentChange("resistanceIntensity", value)} onFrequency={(value) => onContentChange("resistanceFrequency", value)} onTime={(value) => onContentChange("resistanceTime", value)} /><PrescriptionRow title="柔韧性训练" reason={reasonFor("柔韧性训练")} modes={content.flexibilityModes} intensity={content.flexibilityIntensity} frequency={content.flexibilityFrequency} time={content.flexibilityTime} editable={editable} onModes={(value) => onContentChange("flexibilityModes", value)} onIntensity={(value) => onContentChange("flexibilityIntensity", value)} onFrequency={(value) => onContentChange("flexibilityFrequency", value)} onTime={(value) => onContentChange("flexibilityTime", value)} /><label className="block"><span className="field-label">备注与患者注意事项</span><textarea className="text-field min-h-24" disabled={!editable} value={content.remark} onChange={(event) => onContentChange("remark", event.target.value)} /></label></div></section>
    {editable && finalDraft && <section className="card p-5">
      <SectionHeader
        title={task.status === "pending_signature" ? "医生签署" : "签署前责任确认"}
        description={task.status === "pending_signature" ? "处方内容已保存，请确认本人姓名后签署发布。" : "医生确认患者身份、报告来源、异常事件和最终处方参数后方可进入签署。"}
      />
      <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <input type="checkbox" checked={responsibilityConfirmed} onChange={(event) => onResponsibilityConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" />
        <span><b>我已完成处方内容人工复核</b><span className="mt-1 block leading-5">AI内容仅为辅助草稿，最终参数由本人确认并承担签署责任。</span></span>
      </label>
      {task.status === "pending_signature" && <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <label className="block"><span className="field-label">医生签署姓名</span><input className="text-field bg-white" value={signatureName} onChange={(event) => onSignatureNameChange(event.target.value)} placeholder="请输入本人姓名" /></label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-800"><span>当前登录医生：<b>{currentAccount}</b></span><span>签署姓名须与当前登录身份一致</span></div>
        {signatureError && <p className="mt-2 text-xs font-bold text-red-600">{signatureError}</p>}
      </div>}
      <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onSave}><Save className="h-4 w-4" />暂存处方</button><button type="button" className="btn-primary" disabled={!responsibilityConfirmed || (task.status === "pending_signature" && !signatureName.trim())} onClick={onConfirm}><BadgeCheck className="h-4 w-4" />{task.status === "pending_signature" ? "签署并发布" : "保存处方并进入签署"}</button></div>
    </section>}
    {task.status === "completed" && <section className="card p-5"><SectionHeader title="医生签署记录" description="签署完成后处方正式生效，签署信息不可由其他角色修改。" /><div className="mt-4 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-2"><div><p className="text-xs font-bold text-emerald-700">签署医生</p><p className="mt-1 text-base font-bold text-emerald-950">{task.signedBy ?? task.assignedDoctorName}</p></div><div><p className="text-xs font-bold text-emerald-700">签署时间</p><p className="mt-1 text-sm font-semibold text-emerald-950">{task.signedAt ?? task.updatedAt}</p></div></div></section>}
    {!editable && task.status !== "completed" && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">当前账号仅可查看。只有该处方所属医生可以生成、编辑、确认和签署。</p>}
    {drawer && <div className="fixed inset-0 z-50 bg-slate-950/35" onClick={() => setDrawer(null)}><aside className="ml-auto h-full w-full max-w-4xl overflow-y-auto bg-slate-50 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-start justify-between"><div><p className="eyebrow">处方辅助信息</p><h2 className="mt-1 text-xl font-bold text-slate-950">{drawer === "comparison" ? "上一版、AI建议与医生最终值" : "AI建议生成依据"}</h2><p className="mt-2 text-sm text-slate-500">辅助信息不占用主编辑区，关闭后继续填写本次处方。</p></div><button type="button" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500" onClick={() => setDrawer(null)} aria-label="关闭抽屉"><X className="h-5 w-5" /></button></div>{drawer === "comparison" && ai && finalDraft ? <Comparison previous={task.previous} ai={ai} finalDraft={finalDraft} editable={editable} onChange={onDraftChange} /> : <section className="card p-5"><SectionHeader title="引用记录与缺失字段" description="AI建议只引用当前患者已经存在的记录。" /><div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">引用记录</p><p className="mt-2 text-sm leading-7 text-slate-700">{task.aiSuggestionMeta?.sourceRecordIds.join("；") || "暂无可追溯记录"}</p></div><div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-4"><p className="text-xs font-bold text-amber-800">缺失字段</p><p className="mt-2 text-sm leading-7 text-amber-900">{task.aiSuggestionMeta?.missingFields.length ? task.aiSuggestionMeta.missingFields.join("、") : "当前引用范围内未标记缺失字段"}</p></div><p className="mt-4 text-xs leading-6 text-slate-500">上述信息只用于辅助医生判断，不能自动改变诊断、风险等级、正式处方或签署状态。</p></section>}</aside></div>}
  </div>;
}

function Comparison({ previous, ai, finalDraft, editable, onChange }: { previous?: PrescriptionDraft; ai: PrescriptionDraft; finalDraft: PrescriptionDraft; editable: boolean; onChange: (draft: PrescriptionDraft) => void }) {
  return <section className="card overflow-hidden"><div className="border-b p-5"><SectionHeader title="参数差异（三值对比）" description="上一版用于追溯，AI建议为辅助快照，医生最终值才是签署内容。" /></div><div className="grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0"><DraftColumn title="上一版" draft={previous} /><DraftColumn title="AI建议" draft={ai} accent /><div className="p-5"><h3 className="text-xs font-bold text-slate-800">医生最终值</h3><textarea className="text-field mt-3 min-h-20" disabled={!editable} value={finalDraft.summary} onChange={(event) => onChange({ ...finalDraft, summary: event.target.value })} />{finalDraft.items.map((item, index) => <div key={`${item.category}-${index}`} className="mt-3 rounded-xl border border-slate-200 p-3"><b className="text-xs">{item.category}</b><input className="text-field mt-2" disabled={!editable} value={item.project} onChange={(event) => onChange({ ...finalDraft, items: finalDraft.items.map((row, rowIndex) => rowIndex === index ? { ...row, project: event.target.value } : row) })} /><p className="mt-2 text-[10px] leading-5 text-slate-500">{item.intensity}｜{item.duration}｜{item.frequency}</p></div>)}</div></div></section>;
}

function DraftColumn({ title, draft, accent = false }: { title: string; draft?: PrescriptionDraft; accent?: boolean }) {
  return <div className={`p-5 ${accent ? "bg-blue-50/70" : ""}`}><h3 className="text-xs font-bold text-slate-800">{title}</h3>{!draft ? <p className="mt-4 text-xs text-slate-400">暂无上一版处方</p> : <><p className="mt-3 text-xs leading-6 text-slate-600">{draft.summary}</p>{draft.items.map((item) => <div key={item.category} className="mt-3"><b className="text-xs text-slate-800">{item.category} · {item.project}</b><p className="mt-1 text-[10px] leading-5 text-slate-500">{item.intensity}｜{item.duration}｜{item.frequency}<br />理由：{item.reason}</p></div>)}</>}</div>;
}

function PrescriptionRow({ title, reason, modes, intensity, frequency, time, editable, onModes, onIntensity, onFrequency, onTime }: { title: string; reason?: string; modes: string[]; intensity: string; frequency: string; time: string; editable: boolean; onModes: (value: string[]) => void; onIntensity: (value: string) => void; onFrequency: (value: string) => void; onTime: (value: string) => void }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-start gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Activity className="h-4 w-4" /></span><div className="min-w-0"><b className="text-sm text-slate-900">{title}</b><div className={`mt-1.5 flex items-start gap-1.5 text-xs leading-5 ${reason ? "text-blue-800" : "text-slate-400"}`}><Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><b>{reason ? "AI推荐理由：" : "AI推荐理由待生成："}</b>{reason || "点击上方AI生成按钮后，将在这里显示本项建议对应的患者数据和判断依据。"}</span></div></div></div>
    <div className="mt-3 grid items-end gap-3 xl:grid-cols-[1.2fr_1.2fr_0.65fr_0.65fr]"><label><span className="field-label">运动方式</span><input className="text-field" disabled={!editable} value={modes.join("、")} onChange={(event) => onModes(event.target.value.split(/[、,，]/).filter(Boolean))} /></label><label><span className="field-label">运动强度</span><input className="text-field" disabled={!editable || title === "热身运动"} value={intensity} onChange={(event) => onIntensity(event.target.value)} /></label><label><span className="field-label">频率</span><input className="text-field" disabled={!editable} value={frequency} onChange={(event) => onFrequency(event.target.value)} /></label><label><span className="field-label">时间</span><input className="text-field" disabled={!editable} value={time} onChange={(event) => onTime(event.target.value)} /></label></div>
  </section>;
}

function parseNaturalPrescriptionText(text: string, content: PrescriptionContent, task: PrescriptionTask): { contentPatch: Partial<PrescriptionContent>; finalDraft: PrescriptionDraft } {
  const normalized = text.replace(/\s+/g, "");
  const project = normalized.includes("八段锦") ? "八段锦" : normalized.includes("步行") ? "步行训练" : normalized.includes("椭圆") ? "椭圆机" : normalized.includes("呼吸") && !normalized.includes("功率车") ? "腹式呼吸" : "功率车";
  const duration = normalized.match(/每次(\d{1,3}(?:[-–—至到]\d{1,3})?分钟)/)?.[1] ?? normalized.match(/(\d{1,3}(?:[-–—至到]\d{1,3})?分钟)/)?.[1] ?? content.aerobicTime;
  const frequency = normalized.match(/每周[一二三四五六七两0-9\d]+次/)?.[0] ?? normalized.match(/(?:每天|每日)[一二三四五六七两0-9\d]?次?/)?.[0] ?? content.aerobicFrequency;
  const hrRange = normalized.match(/靶心率[:：]?([0-9]{2,3}[-–—至到][0-9]{2,3})(?:次\/分钟|bpm)?/)?.[1]?.replace(/[至到]/, "-");
  const rpe = normalized.match(/RPE[≤<]?([0-9]{1,2}(?:[-–—至到][0-9]{1,2})?)/i)?.[1]?.replace(/[至到]/, "-");
  const intensity = [hrRange && `靶心率${hrRange}次/分钟`, rpe && `RPE ${rpe}`].filter(Boolean).join("；") || content.aerobicIntensity;
  const stopConditions = normalized.includes("胸闷") || normalized.includes("胸痛") || normalized.includes("头晕") || normalized.includes("心悸")
    ? "出现胸闷胸痛、明显气促、头晕、晕厥或心悸时立即停止并联系医护。"
    : content.stopConditions;
  const remark = `自由文本识别：${text}`;
  const contentPatch: Partial<PrescriptionContent> = {
    aerobicModes: [project],
    aerobicIntensity: intensity,
    aerobicFrequency: frequency,
    aerobicTime: duration,
    stopConditions,
    exerciseCautions: text.includes("训练前后") || text.includes("监测") ? "训练前后监测血压、心率和症状变化，康复师现场确认后记录。" : content.exerciseCautions,
    remark
  };
  const finalDraft: PrescriptionDraft = {
    summary: `从医生自由文本识别出${project}、${frequency}、${duration}；请${task.assignedDoctorName}继续核对强度、停止条件和患者适配性。`,
    items: [
      { category: "呼吸训练", project: content.breathingModes.join("、"), intensity: content.breathingIntensity, duration: content.breathingTime, frequency: content.breathingFrequency, reason: "沿用基础呼吸训练安排。" },
      { category: "热身运动", project: content.warmupModes.join("、"), intensity: "低强度，逐步提升心率", duration: content.warmupTime, frequency: content.warmupFrequency, reason: "训练前准备。" },
      { category: "有氧运动", project, intensity, duration, frequency, reason: "来自医生自由文本，经AI字段识别后填入标准处方。" },
      { category: "抗阻训练", project: content.resistanceModes.join("、"), intensity: content.resistanceIntensity, duration: content.resistanceTime, frequency: content.resistanceFrequency, reason: "未在自由文本中明确调整，暂沿用原值。" },
      { category: "柔韧性训练", project: content.flexibilityModes.join("、"), intensity: content.flexibilityIntensity, duration: content.flexibilityTime, frequency: content.flexibilityFrequency, reason: "未在自由文本中明确调整，暂沿用原值。" }
    ],
    dietAdvice: content.dietCautions,
    exerciseAdvice: contentPatch.exerciseCautions ?? content.exerciseCautions,
    stopConditions
  };
  return { contentPatch, finalDraft };
}

function HistoryTab({ task, records, finalDraft }: { task: PrescriptionTask; records: PrescriptionHistoryRecord[]; finalDraft?: PrescriptionDraft }) {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<PrescriptionStatus | "all">("all");
  const filtered = records.filter((item) => {
    const text = `${item.prescriptionNo}${item.version}${item.doctorName}${item.rehabStage}${item.sourceLabel}`.toLowerCase();
    return (!keyword || text.includes(keyword.trim().toLowerCase())) && (status === "all" || item.status === status);
  });
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  return <section className="space-y-4">
    <section className="card overflow-hidden">
      <div className="border-b px-5 py-4"><SectionHeader title="既往处方查询" description="展示该患者已签署或正在流转的历史处方；历史数据只读，不覆盖本次处方。" /></div>
      {!records.length ? (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center" data-testid="prescription-history-empty">
          <History className="h-10 w-10 text-slate-300" />
          <h3 className="mt-4 text-base font-bold text-slate-700">暂无处方</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">当前为首次开具处方，待本次处方完成签署后，后续调整处方可在这里查看历史版本。</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 md:grid-cols-[1fr_220px_auto]">
            <label><span className="field-label">关键词搜索</span><input className="text-field" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="处方号、版本、医生、阶段" /></label>
            <label><span className="field-label">处方状态</span><select className="text-field" value={status} onChange={(event) => setStatus(event.target.value as PrescriptionStatus | "all")}><option value="all">全部状态</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <div className="flex items-end"><StatusBadge tone="blue">共 {filtered.length} 条</StatusBadge></div>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-2">{filtered.map((item) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`grid w-full grid-cols-[1fr_auto] gap-3 rounded-xl border p-3 text-left text-xs transition ${selected?.id === item.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200"}`}><span><b className="text-sm text-slate-900">{item.prescriptionNo} · {item.version}</b><span className="mt-1 block text-slate-500">{item.issuedAt} · {item.doctorName} · {item.rehabStage}</span><span className="mt-1 block text-slate-400">依据：{item.sourceLabel}</span></span><span className="flex flex-col items-end gap-2"><StatusBadge tone={item.status === "completed" ? "green" : item.status === "withdrawn" ? "red" : "orange"}>{statusLabel[item.status]}</StatusBadge><span className="text-[10px] font-bold text-slate-400">{item.signed ? "已签名" : "未签名"}</span></span></button>)}{!filtered.length && <p className="bg-slate-50 p-8 text-center text-sm text-slate-400">暂无匹配的既往处方</p>}</div>
            {selected ? <VersionCard title="历史处方详情" version={`${selected.version} · ${selected.signed ? "已签名" : "未签名"}`} draft={selected.draft} /> : <div className="flex min-h-72 items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">请选择一条既往处方</div>}
          </div>
        </>
      )}
    </section>
    <section className="card overflow-hidden"><div className="border-b px-5 py-4"><SectionHeader title="本次处方对照" description="本次处方是唯一可编辑对象；医生确认并签署后才生成新的处方记录。" /></div><div className="p-5"><VersionCard title="本次处方" version={task.version} draft={finalDraft ?? task.aiSuggestion} current /></div></section>
  </section>;
}

function VersionCard({ title, version, draft, current = false }: { title: string; version: string; draft?: PrescriptionDraft; current?: boolean }) {
  return <article className={`rounded-2xl border p-5 ${current ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold text-slate-400">{title}</p><h3 className="mt-1 text-lg font-bold">{version}</h3></div><StatusBadge tone={current ? "blue" : "green"}>{current ? "当前编辑版本" : "历史只读"}</StatusBadge></div>{draft ? <><p className="mt-4 text-xs leading-6 text-slate-600">{draft.summary}</p><div className="mt-4 space-y-2">{draft.items.map((item) => <div key={item.category} className="rounded-xl bg-white p-3"><b className="text-xs">{item.category} · {item.project}</b><p className="mt-1 text-[10px] text-slate-500">{item.intensity}｜{item.duration}｜{item.frequency}</p></div>)}</div></> : <p className="mt-8 text-center text-xs text-slate-400">首次处方，无上一版数据</p>}</article>;
}

type RelatedReportSheet = "sppb" | "single" | "stage";

function ReportsTab({ task, assessments, reports, stageReports, onOpenPatient, onOpenAssessment }: { task: PrescriptionTask; assessments: AssessmentRecord[]; reports: StoredSingleReport[]; stageReports: StoredStageReport[]; onOpenPatient: (patientId: string, tab?: string) => void; onOpenAssessment: (patientId: string, recordId: string) => void }) {
  const [sheet, setSheet] = useState<RelatedReportSheet>("sppb");
  const sortedAssessments = [...assessments].sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
  const sortedReports = [...reports].sort((a, b) => b.actualStartAt.localeCompare(a.actualStartAt));
  const sortedStageReports = [...stageReports].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  const sheets: { key: RelatedReportSheet; label: string; count: number; icon: typeof Activity }[] = [
    { key: "sppb", label: "SPPB体能评估", count: sortedAssessments.length, icon: Activity },
    { key: "single", label: "单次报告", count: sortedReports.length, icon: ClipboardList },
    { key: "stage", label: "阶段性报告", count: sortedStageReports.length, icon: FileText },
  ];
  const archiveTab = sheet === "sppb" ? "assessments" : "sessions";

  return <section className="card overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
      <SectionHeader title="相关报告" description="按数据来源分别查看当前患者的评估和训练报告，首次入组无数据时保留明确空状态。" />
      <button type="button" className="btn-secondary" onClick={() => onOpenPatient(task.patientId, archiveTab)}><ClipboardList className="h-4 w-4" />查看患者全部记录</button>
    </div>
    <nav className="grid grid-cols-3 border-b border-slate-200 bg-slate-50" aria-label="相关报告分类">
      {sheets.map(({ key, label, count, icon: Icon }) => <button key={key} type="button" data-testid={`report-sheet-${key}`} onClick={() => setSheet(key)} className={`flex min-h-14 items-center justify-center gap-2 border-b-2 px-3 text-sm font-bold transition ${sheet === key ? "border-blue-600 bg-white text-blue-700" : "border-transparent text-slate-500 hover:bg-white hover:text-slate-800"}`}><Icon className="h-4 w-4" /><span>{label}</span><span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${sheet === key ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>{count}</span></button>)}
    </nav>

    {sheet === "sppb" && <div data-testid="report-sheet-content-sppb">
      <div className="grid grid-cols-[1.1fr_0.65fr_0.75fr_0.9fr_0.75fr_0.65fr] gap-3 border-b bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500"><span>评估日期</span><span>评估次数</span><span>SPPB总分</span><span>评估前生命体征</span><span>状态</span><span>操作</span></div>
      {sortedAssessments.map((assessment) => <button type="button" key={assessment.assessmentId} onClick={() => onOpenAssessment(task.patientId, assessment.assessmentId)} aria-label={`查看${assessment.assessedAt.slice(0, 10)}第${assessment.attemptNo}次SPPB体能评估详情`} className="grid w-full gap-3 border-b border-slate-100 px-5 py-4 text-left text-sm transition last:border-b-0 hover:bg-blue-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500 md:grid-cols-[1.1fr_0.65fr_0.75fr_0.9fr_0.75fr_0.65fr] md:items-center"><span><b className="block text-slate-800">{assessment.assessedAt.slice(0, 10)}</b><small className="mt-1 block text-slate-400">{assessment.therapist ?? assessment.enteredBy}</small></span><span>第{assessment.attemptNo}次</span><span><b className="text-blue-700">{assessment.sppb.totalScore}/12</b><small className="mt-1 block text-slate-400">平衡{assessment.sppb.balance.score} · 步行{assessment.sppb.walk4m.score} · 坐立{assessment.sppb.chairStand.score}</small></span><span><b className="block">BP {assessment.preVitals.bloodPressure || "未采集"}</b><small className="mt-1 block text-slate-400">HR {assessment.preVitals.pulse ?? "未采集"}</small></span><span><StatusBadge tone={assessment.status === "doctor_reviewed" ? "green" : "blue"}>{assessment.status === "doctor_reviewed" ? "医生已复核" : assessment.status === "therapist_confirmed" ? "康复师已确认" : "已完成"}</StatusBadge></span><span className="flex items-center gap-1 font-bold text-blue-700">查看详情<ArrowRight className="h-4 w-4" /></span></button>)}
      {!sortedAssessments.length && <RelatedReportEmpty icon={Activity} title="暂无SPPB体能评估" description="首次开具处方时可先完成处方草稿；体能评估归档后会自动出现在这里。" />}
    </div>}

    {sheet === "single" && <div data-testid="report-sheet-content-single">
      <div className="grid grid-cols-[1.3fr_0.7fr_0.8fr_0.8fr] gap-3 border-b bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500"><span>训练项目与时间</span><span>训练时长</span><span>心率</span><span>安全结论</span></div>
      {sortedReports.map((report) => <article key={report.id} className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm last:border-b-0 md:grid-cols-[1.3fr_0.7fr_0.8fr_0.8fr] md:items-center"><span><b className="block text-slate-800">{report.exercise}</b><small className="mt-1 block text-slate-400">{report.actualStartAt.slice(0, 16).replace("T", " ")}</small></span><span>{report.totalMinutes}分钟</span><span>平均 {displayClinicalMetric("心率", report.hrStats.average)}<small className="mt-1 block text-slate-400">峰值 {displayClinicalMetric("心率", report.hrStats.peak)}</small></span><span className={report.safetySummary === "无异常" ? "font-bold text-emerald-600" : "font-bold text-amber-700"}>{report.safetySummary}</span></article>)}
      {!sortedReports.length && <RelatedReportEmpty icon={ClipboardList} title="暂无单次报告" description="首次入组尚未开始训练，完成一次院内训练后会自动生成单次报告。" />}
    </div>}

    {sheet === "stage" && <div data-testid="report-sheet-content-stage">
      <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.8fr] gap-3 border-b bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500"><span>报告周期</span><span>纳入训练</span><span>运动时长</span><span>异常记录</span><span>状态</span></div>
      {sortedStageReports.map((report) => <article key={report.reportId} className="border-b border-slate-100 px-5 py-4 last:border-b-0"><div className="grid gap-3 text-sm md:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.8fr] md:items-center"><span><b className="block text-slate-800">{report.periodStart} 至 {report.periodEnd}</b><small className="mt-1 block text-slate-400">{report.reportNo}</small></span><span>{report.selectedSessionIds.length}次</span><span>{report.aggregate.totalActiveMinutes}分钟</span><span className={report.aggregate.abnormalCount ? "font-bold text-amber-700" : "text-slate-700"}>{report.aggregate.abnormalCount}次</span><StatusBadge tone={report.status === "sent" || report.status === "confirmed" ? "green" : "orange"}>{report.status === "sent" ? "已发送" : report.status === "confirmed" ? "已确认" : report.status === "pending_doctor_review" ? "待医生复核" : "草稿"}</StatusBadge></div><p className="mt-3 border-l-2 border-blue-200 pl-3 text-sm leading-6 text-slate-600">{report.clinicalConclusion.summary || "暂无阶段结论"}</p></article>)}
      {!sortedStageReports.length && <RelatedReportEmpty icon={FileText} title="暂无阶段性报告" description="首次入组尚未形成训练周期，累计多次训练并生成阶段报告后会自动出现在这里。" />}
    </div>}
  </section>;
}

function RelatedReportEmpty({ icon: Icon, title, description }: { icon: typeof Activity; title: string; description: string }) {
  return <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center"><Icon className="h-10 w-10 text-slate-300" /><h3 className="mt-4 text-base font-bold text-slate-700">{title}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p></div>;
}

function RehabTab({ task, profile, content, reports, trainingReports, stageReports, assessments, treatments, followUps, canManage, onOpenPatient, onSave }: { task: PrescriptionTask; profile: PatientClinicalProfile; content: PrescriptionContent; reports: RehabReport[]; trainingReports: StoredSingleReport[]; stageReports: StoredStageReport[]; assessments: AssessmentRecord[]; treatments: CardiopulmonaryTreatmentRecord[]; followUps: FollowUpRecord[]; canManage: boolean; onOpenPatient: (patientId: string, tab?: string) => void; onSave: (report: RehabReport) => void }) {
  const latest = [...reports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
  const [draft, setDraft] = useState<RehabReport | null>(latest ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const stageReport = stageReports.find((item) => item.patientId === task.patientId && item.status === "sent") ?? stageReports.find((item) => item.patientId === task.patientId);
  const locked = draft?.status === "published";

  function generate() {
    if (!canManage) return;
    const now = new Date().toISOString();
    const prescription = task.doctorFinal ?? task.aiSuggestion;
    const missingFields = [!assessments.length && "已确认体能评估", !treatments.length && "已完成治疗记录", !trainingReports.length && "单次训练报告", !stageReport && "阶段性报告", !followUps.length && "已完成随访记录"].filter(Boolean) as string[];
    const sourceRefs = [`处方:${task.id}`, ...assessments.map((item) => `评估:${item.assessmentId}`), ...treatments.map((item) => `治疗:${item.treatmentId}`), ...trainingReports.map((item) => `训练:${item.id}`), ...(stageReport ? [`阶段报告:${stageReport.reportId}`] : []), ...followUps.map((item) => `随访:${item.recordId}`)];
    const next: RehabReport = {
      reportId: `REHAB-${task.patientId}-${Date.now()}`,
      patientId: task.patientId,
      episodeNo: Math.max(0, ...reports.map((item) => item.episodeNo ?? 1)) + 1,
      generatedAt: now,
      status: "draft",
      admissionDate: trainingReports.length ? [...trainingReports].sort((a, b) => a.actualStartAt.localeCompare(b.actualStartAt))[0].actualStartAt.slice(0, 10) : "",
      dischargeDate: profile.dischargeDate || now.slice(0, 10),
      patientNarrative: {
        greeting: `${profile.name}，你好！`,
        admissionDate: trainingReports.length ? [...trainingReports].sort((a, b) => a.actualStartAt.localeCompare(b.actualStartAt))[0].actualStartAt.slice(0, 10) : "",
        dischargeDate: profile.dischargeDate || now.slice(0, 10),
        completedTrainingCount: trainingReports.length,
        celebrationMessage: trainingReports.length ? `你已完成 ${trainingReports.length} 次康复训练。每一次坚持都值得肯定，恭喜你完成本阶段康复！` : "训练次数尚未采集，医生补充确认后再发布。"
      },
      version: Math.max(0, ...reports.map((item) => item.version ?? 1)) + 1,
      generationMode: "template_ai_demo",
      generatedByRole: "DOCTOR",
      medicalSection: {
        diagnosis: profile.diagnosis || task.diagnosis || "未采集",
        treatmentCourse: treatments.length ? `已关联${treatments.length}条完成的心肺康复治疗记录。` : "未采集",
        procedure: "未采集",
        medications: profile.specialMedications || task.specialMedication || "未采集",
        followUpRequirements: "建议按出院后1、3、6个月Demo节点进行人工电话随访，正式周期以医院要求为准。",
        clinicalConclusion: stageReport?.clinicalConclusion.summary ?? "未采集阶段性报告，暂不生成改善结论。"
      },
      rehabSection: {
        assessmentSummary: assessments.length ? `已完成${assessments.length}次体能评估，最近一次SPPB总分${assessments.at(-1)?.sppb.totalScore ?? "未采集"}分。` : "未采集",
        trainingSummary: trainingReports.length ? `已关联${trainingReports.length}次实际训练记录；训练事实来自单次报告，不由AI补写。` : "未采集",
        adherenceSummary: treatments.length ? `已完成${treatments.length}条治疗记录。` : "未采集",
        followUpSummary: followUps.length ? `已完成${followUps.length}条人工电话随访记录。` : "未采集",
        improvementSummary: stageReport?.clinicalConclusion.summary ?? "缺少可比较的阶段性数据，暂不判断提升或下降。"
      },
      recommendationDraft: [prescription?.exerciseAdvice || content.remark || "运动建议未采集", prescription?.dietAdvice || "饮食建议未采集", prescription?.stopConditions || "停止运动条件未采集", "复查与用药调整必须遵循线下医生正式医嘱。"].join("\n"),
      sourceRefs,
      missingFields
    };
    setDraft(next);
    onSave(next);
  }

  function updateSection(section: "medicalSection" | "rehabSection", key: string, value: string) {
    if (!draft || locked || !canManage) return;
    setDraft({ ...draft, [section]: { ...draft[section], [key]: value } });
  }

  function persist(status: RehabReport["status"]) {
    if (!draft || !canManage || locked) return;
    const now = new Date().toISOString();
    const next: RehabReport = { ...draft, status, confirmedBy: status !== "draft" ? task.assignedDoctorName : draft.confirmedBy, confirmedAt: status !== "draft" ? now : draft.confirmedAt, publishedAt: status === "published" ? now : undefined };
    setDraft(next);
    onSave(next);
  }

  const stateLabel = draft?.status === "published" ? "已发送患者端" : draft?.status === "doctor_confirmed" ? "医生已确认" : "草稿";
  return <div className="space-y-4">
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-600 p-2.5 text-white"><Sparkles className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-blue-950">AI辅助康复报告</h2><p className="mt-1 text-sm text-blue-800">AI只生成摘要和患者可读建议草稿；生命体征、训练次数、诊断、用药与签名仅引用已有记录。</p></div></div>{canManage && <button type="button" className="btn-primary" onClick={generate}><Bot className="h-4 w-4" />{draft ? "生成新版本" : "一键生成康复报告"}</button>}</div></section>
    {!draft ? <section className="card p-10 text-center"><FileHeart className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 text-base font-bold">尚未生成康复报告</h3><p className="mt-2 text-sm text-slate-500">责任医生可基于当前患者已有记录生成最小报告草稿。</p></section> : <><section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><SectionHeader title={`康复报告 V${draft.version ?? 1}`} description={`生成时间：${draft.generatedAt}`} /><StatusBadge tone={draft.status === "published" ? "green" : draft.status === "doctor_confirmed" ? "blue" : "orange"}>{stateLabel}</StatusBadge></div><div className="space-y-5 p-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><b className="text-sm">生成依据</b><p className="mt-2 text-xs leading-6 text-slate-600">{draft.sourceRefs.join("；") || "未采集"}</p>{Boolean(draft.missingFields?.length) && <p className="mt-2 text-xs font-semibold text-amber-700">缺失字段：{draft.missingFields?.join("、")}</p>}</div>
      <div className="grid gap-4 lg:grid-cols-2"><ReportField label="诊断摘要" value={draft.medicalSection.clinicalConclusion} disabled={locked || !canManage} onChange={(value) => updateSection("medicalSection", "clinicalConclusion", value)} /><ReportField label="体能评估摘要" value={draft.rehabSection.assessmentSummary} disabled={locked || !canManage} onChange={(value) => updateSection("rehabSection", "assessmentSummary", value)} /><ReportField label="实际治疗情况" value={draft.medicalSection.treatmentCourse} disabled={locked || !canManage} onChange={(value) => updateSection("medicalSection", "treatmentCourse", value)} /><ReportField label="实际训练情况" value={draft.rehabSection.trainingSummary} disabled={locked || !canManage} onChange={(value) => updateSection("rehabSection", "trainingSummary", value)} /><ReportField label="阶段变化总结" value={draft.rehabSection.improvementSummary} disabled={locked || !canManage} onChange={(value) => updateSection("rehabSection", "improvementSummary", value)} /></div>
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="mb-3 flex items-center gap-2"><Award className="h-5 w-5 text-emerald-600" /><b className="text-sm text-emerald-950">患者手册开篇文案</b></div><div className="grid gap-3 md:grid-cols-2"><ReportInput label="问候语" value={draft.patientNarrative?.greeting ?? `${profile.name}，你好！`} disabled={locked || !canManage} onChange={(value) => setDraft({ ...draft, patientNarrative: { ...(draft.patientNarrative ?? { admissionDate: "", dischargeDate: "", completedTrainingCount: 0, celebrationMessage: "" }), greeting: value } })} /><ReportInput label="完成训练次数" type="number" value={String(draft.patientNarrative?.completedTrainingCount ?? 0)} disabled={locked || !canManage} onChange={(value) => setDraft({ ...draft, patientNarrative: { ...(draft.patientNarrative ?? { greeting: `${profile.name}，你好！`, admissionDate: "", dischargeDate: "", celebrationMessage: "" }), completedTrainingCount: Number(value) || 0 } })} /><ReportInput label="入院/开始康复日期" type="date" value={draft.patientNarrative?.admissionDate ?? ""} disabled={locked || !canManage} onChange={(value) => setDraft({ ...draft, admissionDate: value, patientNarrative: { ...(draft.patientNarrative ?? { greeting: `${profile.name}，你好！`, dischargeDate: "", completedTrainingCount: 0, celebrationMessage: "" }), admissionDate: value } })} /><ReportInput label="出院/完成日期" type="date" value={draft.patientNarrative?.dischargeDate ?? ""} disabled={locked || !canManage} onChange={(value) => setDraft({ ...draft, dischargeDate: value, patientNarrative: { ...(draft.patientNarrative ?? { greeting: `${profile.name}，你好！`, admissionDate: "", completedTrainingCount: 0, celebrationMessage: "" }), dischargeDate: value } })} /></div><label className="mt-3 block"><span className="field-label">祝贺与鼓励语</span><textarea className="text-field min-h-20 py-3 disabled:bg-white/70" disabled={locked || !canManage} value={draft.patientNarrative?.celebrationMessage ?? ""} onChange={(event) => setDraft({ ...draft, patientNarrative: { ...(draft.patientNarrative ?? { greeting: `${profile.name}，你好！`, admissionDate: "", dischargeDate: "", completedTrainingCount: 0 }), celebrationMessage: event.target.value } })} /></label></section>
      <label><span className="field-label">运动、饮食、用药、停止条件与复查建议</span><textarea className="text-field min-h-40 py-3 disabled:bg-slate-50" disabled={locked || !canManage} value={draft.recommendationDraft} onChange={(event) => setDraft({ ...draft, recommendationDraft: event.target.value })} /></label>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div><b className="text-sm text-slate-900">患者端图文手册预览</b><p className="mt-1 text-xs leading-5 text-slate-500">图文版只用于患者阅读和打印预览，医生编辑区保持结构化文书形式。</p></div><button type="button" className="btn-secondary" onClick={() => setPreviewOpen(true)}><FileHeart className="h-4 w-4" />打开患者端预览</button></section>
      <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4"><button type="button" className="btn-secondary" onClick={() => onOpenPatient(task.patientId, "rehabReport")}><FileText className="h-4 w-4" />患者档案中的报告版本</button>{canManage && !locked && <div className="flex gap-2"><button type="button" className="btn-secondary" onClick={() => persist("draft")}><Save className="h-4 w-4" />保存草稿</button>{draft.status === "draft" && <button type="button" className="btn-secondary" onClick={() => persist("doctor_confirmed")}><BadgeCheck className="h-4 w-4" />医生确认</button>}{draft.status === "doctor_confirmed" && <button type="button" className="btn-primary" onClick={() => persist("published")}><ArrowRight className="h-4 w-4" />发送患者端</button>}</div>}</div>
    </div></section><section><div className="mb-3 flex items-center justify-between"><SectionHeader title="患者端同步预览" description="下方与患者端打开的康复报告使用同一组件、同一数据。" /><StatusBadge tone="blue">所见即患者所见</StatusBadge></div><PatientRehabReport report={draft} /></section></>}
    {previewOpen && draft && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-6" onClick={() => setPreviewOpen(false)}><div className="mx-auto max-w-5xl" onClick={(event) => event.stopPropagation()}><div className="mb-3 flex justify-end gap-2"><button type="button" className="btn-secondary bg-white" onClick={() => window.print()}><Printer className="h-4 w-4" />打印预览</button><button type="button" className="btn-secondary bg-white" onClick={() => setPreviewOpen(false)}><X className="h-4 w-4" />关闭</button></div><HandbookPreview report={draft} patientName={profile.name} /></div></div>}
  </div>;
}

function ReportField({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <label><span className="field-label">{label}</span><textarea className="text-field min-h-28 py-3 disabled:bg-slate-50" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ReportInput({ label, value, disabled, onChange, type = "text" }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void; type?: string }) {
  return <label><span className="field-label">{label}</span><input type={type} min={type === "number" ? 0 : undefined} className="text-field disabled:bg-white/70" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function HandbookPreview({ report, patientName }: { report: RehabReport; patientName: string }) {
  const narrative = report.patientNarrative;
  return <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"><header className="relative overflow-hidden bg-[#123b5d] px-8 py-8 text-white"><div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-teal-400/20" /><div className="relative flex items-start justify-between gap-5"><div><p className="text-xs font-bold tracking-[0.18em] text-teal-200">心康伴侣 · 康复成果手册</p><h2 className="mt-5 text-3xl font-bold">{narrative?.greeting || `${patientName}，你好！`}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-blue-50/90">{narrative?.celebrationMessage || "完成本阶段康复训练后，这份手册将帮助你了解康复成果与下一步安排。"}</p></div><span className="rounded-2xl bg-white/10 p-4"><Award className="h-10 w-10 text-amber-300" /></span></div></header><div className="grid gap-px bg-slate-200 md:grid-cols-3"><PreviewStat icon={CalendarDays} label="康复周期" value={`${narrative?.admissionDate || "未采集"} 至 ${narrative?.dischargeDate || "未采集"}`} /><PreviewStat icon={Activity} label="完成康复训练" value={`${narrative?.completedTrainingCount ?? 0} 次`} strong /><PreviewStat icon={Sparkles} label="阶段总结" value={report.rehabSection.improvementSummary || "未采集"} /></div><div className="grid gap-6 p-7 md:grid-cols-2"><div><p className="text-xs font-bold tracking-[0.15em] text-blue-600">01 · 康复足迹</p><p className="mt-3 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{report.rehabSection.trainingSummary}</p></div><div><p className="text-xs font-bold tracking-[0.15em] text-emerald-600">02 · 下一阶段</p><p className="mt-3 whitespace-pre-line rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-7 text-emerald-950">{report.recommendationDraft}</p></div></div></section>;
}

function PreviewStat({ icon: Icon, label, value, strong = false }: { icon: typeof Activity; label: string; value: string; strong?: boolean }) { return <div className="bg-white p-5"><Icon className="h-5 w-5 text-blue-600" /><p className="mt-3 text-xs font-bold text-slate-400">{label}</p><p className={`mt-2 leading-6 ${strong ? "text-2xl font-bold text-blue-700" : "text-sm font-bold text-slate-800"}`}>{value}</p></div>; }

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}</p></div>;
}
