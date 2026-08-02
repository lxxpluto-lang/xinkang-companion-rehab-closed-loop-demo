import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileClock,
  FileText,
  HeartPulse,
  History,
  MessageSquareText,
  PenLine,
  Printer,
  Save,
  ShieldAlert,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import { SectionHeader, StatusBadge } from "../components/UI";
import {
  getPrescriptionVersionDetail,
  minimalSafetyEvents,
  prescriptionVersionDetails,
  singleTrainingReportDetails,
  type PrescriptionVersionDetail,
  type SingleTrainingReportDetail
} from "../clinicalSharedData";
import { stageReportData } from "../patient/stageReportData";
import { prescriptionStatusLabels, type PrescriptionTask } from "../prescriptionData";
import {
  emptyNarrativeContent,
  type ClinicalNarrativeContent,
  type ClinicalNarrativeRecord,
  type PatientClinicalProfile,
  type PrescriptionContent
} from "../prescriptionWorkspaceData";
import { formatDateTime } from "../utils/dateTime";
import { demoDischargeHandbook } from "../dischargeHandbookData";

export type PrescriptionWorkspaceTab = "profile" | "narrative" | "current" | "history" | "reports";
type ReportMode = "stage" | "training";

const workspaceTabs: { key: PrescriptionWorkspaceTab; label: string; icon: typeof UserRound }[] = [
  { key: "profile", label: "患者基本信息", icon: UserRound },
  { key: "narrative", label: "本次问诊与历史口述", icon: MessageSquareText },
  { key: "current", label: "本次处方", icon: PenLine },
  { key: "history", label: "上一版与历次处方", icon: History },
  { key: "reports", label: "训练记录与阶段报告", icon: Activity }
];

const symptomOptions = ["无明显变化", "胸痛", "胸闷", "气促", "头晕", "心悸", "乏力", "睡眠欠佳"];

function clonePrescription(content: PrescriptionContent): PrescriptionContent {
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

export function PrescriptionWorkspacePage({
  task,
  profile,
  narratives,
  content,
  initialTab = "narrative",
  onBack,
  onOpenPatient,
  onGenerate,
  onSaveProfile,
  onSaveNarrative,
  onSaveContent,
  onConfirm
}: {
  task: PrescriptionTask;
  profile: PatientClinicalProfile;
  narratives: ClinicalNarrativeRecord[];
  content: PrescriptionContent;
  onBack: () => void;
  initialTab?: PrescriptionWorkspaceTab;
  onOpenPatient: (patientId: string, returnTab: PrescriptionWorkspaceTab) => void;
  onGenerate: (taskId: string) => void;
  onSaveProfile: (profile: PatientClinicalProfile) => void;
  onSaveNarrative: (record: ClinicalNarrativeRecord) => void;
  onSaveContent: (taskId: string, content: PrescriptionContent) => void;
  onConfirm: (taskId: string) => void;
}) {
  const readonly = task.status === "completed";
  const [activeTab, setActiveTab] = useState<PrescriptionWorkspaceTab>(initialTab);
  const [profileDraft, setProfileDraft] = useState<PatientClinicalProfile>({ ...profile });
  const [prescriptionDraft, setPrescriptionDraft] = useState<PrescriptionContent>(() => clonePrescription(content));
  const [narrativeDraft, setNarrativeDraft] = useState<ClinicalNarrativeContent>({ ...emptyNarrativeContent, symptoms: [] });
  const [narrativeSaved, setNarrativeSaved] = useState(Boolean(task.currentNarrativeId) || readonly);
  const [profileDirty, setProfileDirty] = useState(false);
  const [prescriptionDirty, setPrescriptionDirty] = useState(false);
  const [narrativeDirty, setNarrativeDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(task.lastDraftSavedAt);
  const [previousReviewed, setPreviousReviewed] = useState(readonly);
  const [riskReviewed, setRiskReviewed] = useState(readonly);
  const [contentConfirmed, setContentConfirmed] = useState(readonly);
  const [showCarryPanel, setShowCarryPanel] = useState(false);
  const [carrySelection, setCarrySelection] = useState<string[]>([]);
  const [expandedNarrative, setExpandedNarrative] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<PrescriptionVersionDetail | null>(null);
  const [reportMode, setReportMode] = useState<ReportMode>(task.sourceType === "single_report" ? "training" : "stage");
  const [selectedTraining, setSelectedTraining] = useState<SingleTrainingReportDetail | null>(null);
  const [showFormalPrescription, setShowFormalPrescription] = useState(false);
  const [showDischargeHandbook, setShowDischargeHandbook] = useState(false);
  const [signatureBlockerItems, setSignatureBlockerItems] = useState<string[]>([]);

  const previousVersion = useMemo(() => prescriptionVersionDetails.find((item) => item.prescriptionId === task.previousPrescriptionId) ?? getPrescriptionVersionDetail(task.previousVersionId?.match(/V[1-4]/)?.[0]), [task.previousPrescriptionId, task.previousVersionId]);
  const patientNarratives = narratives.filter((item) => item.patientId === task.patientId).sort((a, b) => b.encounterAt.localeCompare(a.encounterAt));
  const safetyEvents = minimalSafetyEvents.filter((item) => item.patientId === task.patientId);
  const unresolvedEvents = safetyEvents.filter((item) => item.doctorReviewStatus !== "医生已复核");
  const patientTraining = singleTrainingReportDetails.filter((item) => item.patientId === task.patientId).sort((a, b) => b.actualStartAt.localeCompare(a.actualStartAt));
  const assessment = profileDraft.rehabAssessment;
  const assessmentMissing = assessment.status !== "已复核" || assessment.sixMinuteWalk.distanceMeters === null || assessment.cpet.peakVo2 === null || Object.values(assessment.restingVitals).some((value) => value === null);
  const hasProfileMissing = [profileDraft.contact, profileDraft.diagnosis, profileDraft.medicalHistory, profileDraft.specialMedications, profileDraft.cpet, profileDraft.sixMinuteWalk].some((value) => !value.trim() || value.includes("待补充")) || assessmentMissing;
  const hasUnsaved = profileDirty || prescriptionDirty || narrativeDirty;
  const requiresRiskReview = task.risk === "高危" || safetyEvents.length > 0;
  const signatureBlockers = [
    !narrativeSaved ? "本次问诊尚未保存" : "",
    task.missingFields?.length ? task.missingFields.join("、") : "",
    hasProfileMissing ? "患者关键临床资料不完整" : "",
    unresolvedEvents.length ? "存在未复核安全事件" : "",
    requiresRiskReview && !contentConfirmed ? "风险与异常尚未纳入医生最终核对" : "",
    !contentConfirmed ? "本次处方内容尚未确认" : ""
  ].filter(Boolean);

  const tabStatus: Record<PrescriptionWorkspaceTab, { label: string; tone: "green" | "orange" | "blue" }> = {
    profile: { label: hasProfileMissing ? "资料待补" : profileDirty ? "未保存" : "资料完整", tone: hasProfileMissing || profileDirty ? "orange" : "green" },
    narrative: { label: narrativeSaved ? "问诊已保存" : narrativeDirty ? "正在记录" : "待记录", tone: narrativeSaved ? "green" : "orange" },
    current: { label: readonly ? "已签署" : prescriptionDirty ? "未保存" : "处方待完善", tone: readonly ? "green" : prescriptionDirty ? "orange" : "blue" },
    history: { label: previousReviewed || readonly ? "已核对" : "待核对", tone: previousReviewed || readonly ? "green" : "orange" },
    reports: { label: unresolvedEvents.length ? "异常待确认" : "报告可用", tone: unresolvedEvents.length ? "orange" : "green" }
  };

  function setProfileField<K extends keyof PatientClinicalProfile>(key: K, value: PatientClinicalProfile[K]) {
    setProfileDraft((current) => ({ ...current, [key]: value }));
    setProfileDirty(true);
  }

  function setPrescriptionField<K extends keyof PrescriptionContent>(key: K, value: PrescriptionContent[K]) {
    setPrescriptionDraft((current) => ({ ...current, [key]: value }));
    setPrescriptionDirty(true);
  }

  function setNarrativeField<K extends keyof ClinicalNarrativeContent>(key: K, value: ClinicalNarrativeContent[K]) {
    setNarrativeDraft((current) => ({ ...current, [key]: value }));
    setNarrativeDirty(true);
    setNarrativeSaved(false);
  }

  function saveProfile() {
    const now = "2026-07-30T10:56:00+08:00";
    onSaveProfile({ ...profileDraft, updatedAt: now, updatedBy: task.assignedDoctor, auditSummary: "医生在处方工作区更新临床资料" });
    setProfileDraft((current) => ({ ...current, updatedAt: now, updatedBy: task.assignedDoctor, auditSummary: "医生在处方工作区更新临床资料" }));
    setProfileDirty(false);
  }

  function saveNarrative() {
    if (!narrativeDraft.chiefComplaint.trim() || !narrativeDraft.clinicalAssessment.trim()) {
      window.alert("请至少填写当前主诉和医生临床判断后再保存本次问诊。");
      return false;
    }
    const now = new Date().toISOString();
    onSaveNarrative({ narrativeId: task.currentNarrativeId ?? `N-${task.id}-CURRENT`, patientId: task.patientId, taskId: task.id, encounterAt: now, author: task.assignedDoctor, recordType: "本次处方问诊", content: { ...narrativeDraft, symptoms: [...narrativeDraft.symptoms] } });
    setNarrativeDirty(false);
    setNarrativeSaved(true);
    return true;
  }

  function saveDraft() {
    const now = new Date().toISOString();
    onSaveContent(task.id, clonePrescription(prescriptionDraft));
    setLastSavedAt(now);
    setPrescriptionDirty(false);
  }

  function leaveWorkspace() {
    if (hasUnsaved && !window.confirm("当前工作区存在未保存内容，离开后这些修改将丢失。是否继续？")) return;
    onBack();
  }

  function openFullArchive() {
    if (narrativeDirty) {
      window.alert("请先保存本次问诊记录，再查看完整患者档案，避免临床记录丢失。");
      setActiveTab("narrative");
      return;
    }
    if (profileDirty) saveProfile();
    if (prescriptionDirty) saveDraft();
    onOpenPatient(task.patientId, activeTab);
  }

  function applyPreviousFields() {
    if (!carrySelection.length) return;
    if (prescriptionDirty && !window.confirm("沿用上一版将覆盖当前选中字段的未保存内容，是否继续？")) return;
    const next = clonePrescription(prescriptionDraft);
    if (carrySelection.includes("aerobicMode")) next.aerobicModes = [previousVersion.exerciseProject];
    if (carrySelection.includes("intensity")) next.aerobicIntensity = `靶心率${previousVersion.targetHr.join("–")}次/分钟；目标功率${previousVersion.targetPower.join("–")}W；RPE ${previousVersion.rpeTarget.join("–")}`;
    if (carrySelection.includes("frequency")) next.aerobicFrequency = `每周${previousVersion.weeklyFrequency}次`;
    if (carrySelection.includes("duration")) next.aerobicTime = `${previousVersion.trainingMinutes}分钟/次`;
    if (carrySelection.includes("warmup")) next.warmupTime = `${previousVersion.warmupMinutes}分钟`;
    if (carrySelection.includes("remark")) next.remark = `${previousVersion.advice.exerciseCautions}；${previousVersion.advice.stopConditions}`;
    next.inheritedFields = Array.from(new Set([...next.inheritedFields, ...carrySelection]));
    setPrescriptionDraft(next);
    setPrescriptionDirty(true);
    setPreviousReviewed(true);
    setShowCarryPanel(false);
  }

  function confirmAndSign() {
    const narrativeComplete = Boolean(narrativeDraft.chiefComplaint.trim() && narrativeDraft.clinicalAssessment.trim());
    if (!narrativeSaved && narrativeComplete) saveNarrative();
    saveDraft();

    const blockersAfterAutoSave = signatureBlockers
      .filter((blocker) => blocker !== "本次问诊尚未保存" || !narrativeComplete)
      .map((blocker) => blocker === "本次问诊尚未保存" ? "本次问诊必填内容未填写完整" : blocker);
    if (blockersAfterAutoSave.length) {
      setSignatureBlockerItems(blockersAfterAutoSave);
      return;
    }
    onConfirm(task.id);
    setShowFormalPrescription(true);
  }

  const tabIndex = workspaceTabs.findIndex((item) => item.key === activeTab);
  const goPrevious = () => setActiveTab(workspaceTabs[Math.max(0, tabIndex - 1)].key);
  const goNext = () => setActiveTab(workspaceTabs[Math.min(workspaceTabs.length - 1, tabIndex + 1)].key);

  return (
    <section className="space-y-4 pb-24" data-testid="page-PRESCRIPTION-WORKSPACE">
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <button type="button" className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" onClick={leaveWorkspace} aria-label="返回处方列表"><ArrowLeft className="h-4 w-4" /></button>
            <div><p className="text-[10px] font-bold tracking-wider text-blue-600">处方管理 · 患者开方工作区</p><h1 className="mt-1 text-xl font-bold text-slate-950">患者处方详情</h1><p className="mt-1 text-xs text-slate-500">{task.kind === "initial" ? "首次处方" : "调整处方"} · {task.prescriptionNo} · {task.versionNo}</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={task.status === "completed" ? "green" : "orange"}>{prescriptionStatusLabels[task.status]}</StatusBadge><button type="button" data-action="ACT-DISCHARGE-HANDBOOK" onClick={() => setShowDischargeHandbook(true)} className="btn-secondary"><FileText className="h-4 w-4" />出院康复手册</button><button type="button" onClick={openFullArchive} className="btn-secondary"><UserRound className="h-4 w-4" />查看完整患者档案</button></div>
        </div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-7">
          <SummaryCell label="患者" value={`${task.patientName} · ${task.sex} · ${task.age}岁`} />
          <SummaryCell label="患者号" value={task.patientNo} />
          <SummaryCell label="风险等级" value={profileDraft.riskLevel} warning={profileDraft.riskLevel === "高危"} />
          <SummaryCell label="康复阶段" value={profileDraft.rehabStage} />
          <SummaryCell label="最近异常" value={safetyEvents[0]?.type ?? "无异常记录"} warning={safetyEvents.length > 0} />
          <SummaryCell label="当前任务" value={prescriptionStatusLabels[task.status]} />
          <SummaryCell label="草稿状态" value={readonly ? "已签署归档" : prescriptionDirty ? "存在未保存修改" : lastSavedAt ? `已保存 ${formatDateTime(lastSavedAt)}` : "尚未保存"} warning={prescriptionDirty} />
        </div>
      </header>

      <nav className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm lg:grid-cols-5" aria-label="患者开方工作区栏目">
        {workspaceTabs.map(({ key, label, icon: Icon }, index) => {
          const status = tabStatus[key];
          return <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex min-h-14 items-center gap-3 rounded-xl px-3 text-left transition ${activeTab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activeTab === key ? "bg-white/15" : "bg-slate-100"}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-xs font-bold">{index + 1}. {label}</span><span className={`mt-0.5 block text-[9px] font-semibold ${activeTab === key ? "text-blue-100" : status.tone === "green" ? "text-emerald-600" : status.tone === "orange" ? "text-amber-600" : "text-blue-600"}`}>{status.label}</span></span></button>;
        })}
      </nav>

      {activeTab === "profile" && <ProfileTab profile={profileDraft} readonly={readonly} dirty={profileDirty} onChange={setProfileField} onSave={saveProfile} />}
      {activeTab === "narrative" && <NarrativeTab draft={narrativeDraft} readonly={readonly} saved={narrativeSaved} dirty={narrativeDirty} records={patientNarratives} expandedId={expandedNarrative} onExpanded={setExpandedNarrative} onChange={setNarrativeField} onSave={saveNarrative} />}
      {activeTab === "current" && <CurrentPrescriptionTab task={task} content={prescriptionDraft} previousVersion={previousVersion} safetyEvents={safetyEvents} readonly={readonly} narrativeSaved={narrativeSaved} assessmentSummary={assessment.status === "已复核" ? `康复评估已复核：SPPB ${assessment.sppb.balanceScore + assessment.sppb.gaitScore + assessment.sppb.chairStandScore}/12，6MWT ${assessment.sixMinuteWalk.distanceMeters ?? "待补"}m，峰值VO₂ ${assessment.cpet.peakVo2 ?? "待补"}` : `康复评估${assessment.status}`} profileComplete={!hasProfileMissing && !task.missingFields?.length} previousReviewed={previousReviewed} riskReviewed={riskReviewed} contentConfirmed={contentConfirmed} signatureBlockers={signatureBlockers} onGenerate={() => { if (task.aiDraft && !window.confirm("重新生成只会替换 AI 建议，不会覆盖医生已编辑字段。是否继续？")) return; onGenerate(task.id); }} onFieldChange={setPrescriptionField} onOpenCarry={() => setShowCarryPanel(true)} onPreviousReviewed={setPreviousReviewed} onRiskReviewed={setRiskReviewed} onContentConfirmed={setContentConfirmed} onSign={confirmAndSign} onPrint={() => setShowFormalPrescription(true)} />}
      {activeTab === "history" && <HistoryTab task={task} previousVersion={previousVersion} current={prescriptionDraft} selected={selectedHistory} onSelect={setSelectedHistory} reviewed={previousReviewed} onReviewed={setPreviousReviewed} onCarry={() => setShowCarryPanel(true)} readonly={readonly} />}
      {activeTab === "reports" && <ReportsTab task={task} mode={reportMode} onMode={setReportMode} training={patientTraining} selectedTraining={selectedTraining} onSelectTraining={setSelectedTraining} safetyEvents={safetyEvents} />}

      {!readonly && <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur"><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4"><div><p className="text-xs font-bold text-slate-800">{workspaceTabs[tabIndex].label}</p><p className="mt-0.5 text-[10px] text-slate-500">{hasUnsaved ? "存在未保存内容" : lastSavedAt ? `草稿已保存 · ${formatDateTime(lastSavedAt)}` : "尚未保存草稿"}</p></div><div className="flex items-center gap-2"><button type="button" className="btn-secondary" onClick={goPrevious} disabled={tabIndex === 0}><ArrowLeft className="h-4 w-4" />上一步</button><button type="button" className="btn-secondary" onClick={saveDraft}><Save className="h-4 w-4" />保存草稿</button>{activeTab === "current" ? <button type="button" className="btn-primary" onClick={confirmAndSign}><BadgeCheck className="h-4 w-4" />确认并签署</button> : <button type="button" className="btn-primary" onClick={goNext} disabled={tabIndex === workspaceTabs.length - 1}>下一步<ArrowRight className="h-4 w-4" /></button>}</div></div></div>}

      {showCarryPanel && <CarryPreviousModal previous={previousVersion} selection={carrySelection} onSelection={setCarrySelection} onApply={applyPreviousFields} onClose={() => setShowCarryPanel(false)} />}
      {signatureBlockerItems.length > 0 && <SignatureBlockerModal blockers={signatureBlockerItems} onClose={() => setSignatureBlockerItems([])} />}
      {showFormalPrescription && <FormalPrescriptionModal task={task} content={prescriptionDraft} onClose={() => setShowFormalPrescription(false)} />}
      {showDischargeHandbook && <DischargeHandbookModal patientName={task.patientName} onClose={() => setShowDischargeHandbook(false)} />}
    </section>
  );
}

function SummaryCell({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className={`min-h-20 bg-white px-4 py-3 ${warning ? "bg-amber-50" : ""}`}><p className="text-[9px] font-bold text-slate-400">{label}</p><p className={`mt-1.5 text-xs font-bold leading-5 ${warning ? "text-amber-800" : "text-slate-800"}`}>{value}</p></div>;
}

function ProfileTab({ profile, readonly, dirty, onChange, onSave }: { profile: PatientClinicalProfile; readonly: boolean; dirty: boolean; onChange: <K extends keyof PatientClinicalProfile>(key: K, value: PatientClinicalProfile[K]) => void; onSave: () => void }) {
  const [showRecognition, setShowRecognition] = useState(false);
  const assessment = profile.rehabAssessment;
  const sppbTotal = assessment.sppb.balanceScore + assessment.sppb.gaitScore + assessment.sppb.chairStandScore;
  const sppbLevel = sppbTotal >= 10 ? "功能良好" : sppbTotal >= 7 ? "中度受限" : "明显受限";
  const updateAssessment = (next: PatientClinicalProfile["rehabAssessment"]) => onChange("rehabAssessment", next);
  const setScore = (key: keyof typeof assessment.sppb, value: number) => updateAssessment({ ...assessment, status: "待复核", sppb: { ...assessment.sppb, [key]: Math.max(0, Math.min(4, value)) } });
  const setNumber = (section: "sixMinuteWalk" | "restingVitals", key: string, raw: string) => updateAssessment({ ...assessment, status: "待复核", [section]: { ...assessment[section], [key]: raw === "" ? null : Number(raw) } });
  const applyRecognizedForm = () => {
    updateAssessment({ ...assessment, source: "纸质评估单识别", status: "待复核", assessedAt: "2026-08-02T10:20:00+08:00", sppb: { balanceScore: 3, gaitScore: 3, chairStandScore: 3 }, sixMinuteWalk: { distanceMeters: 492, baselineMeters: 438, startHeartRate: 71, endHeartRate: 106 }, cpet: { peakVo2: 19.2, anaerobicThreshold: 13.8, contraindication: "未发现运动禁忌证" }, restingVitals: { heartRate: 71, systolic: 124, diastolic: 76, spo2: 98 } });
    onChange("cpet", "峰值 VO₂ 19.2 ml/kg/min；AT 13.8 ml/kg/min");
    onChange("sixMinuteWalk", "492 m");
    onChange("restingVitals", "HR 71 bpm · BP 124/76 mmHg · SpO₂ 98%");
    setShowRecognition(false);
  };
  return <div className="space-y-4"><section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><SectionHeader title="患者基本信息与临床资料" description="身份主索引只读；医生可维护与本次开方相关的临床信息。" /><div className="flex items-center gap-2">{profile.auditSummary && <span className="text-[10px] text-slate-400">{profile.auditSummary} · {profile.updatedBy}</span>}{!readonly && <button type="button" onClick={onSave} disabled={!dirty} className="btn-primary"><Save className="h-4 w-4" />保存全部资料</button>}</div></div><div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4"><ReadOnlyField label="患者号" value={profile.patientNo} /><ReadOnlyField label="患者姓名" value={profile.name} /><ReadOnlyField label="证件信息（脱敏）" value={profile.idNumberMasked} /><ReadOnlyField label="性别 / 年龄" value={`${profile.sex} / ${profile.age}岁`} /><EditField label="联系电话" value={profile.contact} disabled={readonly} onChange={(value) => onChange("contact", value)} /><SelectField label="危险分组" value={profile.riskLevel} disabled={readonly} options={["低危", "中危", "高危"]} onChange={(value) => onChange("riskLevel", value as PatientClinicalProfile["riskLevel"])} /><EditField label="康复阶段" value={profile.rehabStage} disabled={readonly} onChange={(value) => onChange("rehabStage", value)} /><EditField label="特殊用药" value={profile.specialMedications} disabled={readonly} onChange={(value) => onChange("specialMedications", value)} /><div className="md:col-span-2 xl:col-span-4"><EditArea label="诊断摘要" value={profile.diagnosis} disabled={readonly} onChange={(value) => onChange("diagnosis", value)} /></div><div className="md:col-span-2 xl:col-span-4"><EditArea label="既往史与风险说明" value={profile.medicalHistory} disabled={readonly} onChange={(value) => onChange("medicalHistory", value)} /></div></div></section>
  <section className="card overflow-hidden" data-testid="region-REG-REHAB-ASSESSMENT"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4"><SectionHeader title="康复评估与自动评分" description="结构化结果直接进入风险复核、AI开方依据和阶段对比。" action={<StatusBadge tone={assessment.status === "已复核" ? "green" : "orange"}>{assessment.status}</StatusBadge>} /><div className="flex gap-2">{!readonly && <button type="button" data-action="ACT-ASSESSMENT-OCR" onClick={() => setShowRecognition(true)} className="btn-secondary"><FileText className="h-4 w-4" />识别纸质评估单</button>}{!readonly && assessment.status !== "已复核" && <button type="button" data-action="ACT-ASSESSMENT-REVIEW" onClick={() => updateAssessment({ ...assessment, status: "已复核", assessor: "王医生" })} className="btn-primary"><ClipboardCheck className="h-4 w-4" />确认评估结果</button>}</div></div>
  <div className="grid gap-3 p-5 lg:grid-cols-4"><article className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4" data-ac="AC-ASSESSMENT-AUTO-SCORE"><p className="text-[10px] font-bold text-emerald-700">SPPB 自动评分</p><div className="mt-2 flex items-end gap-2"><b className="text-3xl text-slate-950">{sppbTotal}</b><span className="pb-1 text-xs text-slate-500">/ 12 · {sppbLevel}</span></div><div className="mt-3 grid grid-cols-3 gap-2">{([['balanceScore','平衡'],['gaitScore','步速'],['chairStandScore','起坐']] as const).map(([key,label]) => <label key={key}><span className="block text-[9px] text-slate-500">{label}</span><input disabled={readonly} type="number" min="0" max="4" value={assessment.sppb[key]} onChange={(event) => setScore(key, Number(event.target.value))} className="text-field mt-1 text-center" /></label>)}</div></article>
  <AssessmentCard title="6分钟步行" status={assessment.sixMinuteWalk.distanceMeters === null ? "待补充" : `${assessment.sixMinuteWalk.distanceMeters} m`} note={assessment.sixMinuteWalk.baselineMeters && assessment.sixMinuteWalk.distanceMeters !== null ? `较基线 ${assessment.sixMinuteWalk.distanceMeters - assessment.sixMinuteWalk.baselineMeters} m` : "暂无基线对比"}><MiniNumber label="距离(m)" value={assessment.sixMinuteWalk.distanceMeters} disabled={readonly} onChange={(value) => setNumber("sixMinuteWalk", "distanceMeters", value)} /><MiniNumber label="结束心率" value={assessment.sixMinuteWalk.endHeartRate} disabled={readonly} onChange={(value) => setNumber("sixMinuteWalk", "endHeartRate", value)} /></AssessmentCard>
  <AssessmentCard title="CPET" status={assessment.cpet.peakVo2 === null ? "待补充" : `峰值VO₂ ${assessment.cpet.peakVo2}`} note={assessment.cpet.contraindication}><MiniNumber label="峰值VO₂" value={assessment.cpet.peakVo2} disabled={readonly} onChange={(value) => updateAssessment({ ...assessment, status: "待复核", cpet: { ...assessment.cpet, peakVo2: value === "" ? null : Number(value) } })} /><MiniNumber label="无氧阈" value={assessment.cpet.anaerobicThreshold} disabled={readonly} onChange={(value) => updateAssessment({ ...assessment, status: "待复核", cpet: { ...assessment.cpet, anaerobicThreshold: value === "" ? null : Number(value) } })} /></AssessmentCard>
  <AssessmentCard title="静息生命体征" status={assessment.restingVitals.heartRate === null ? "待补充" : `${assessment.restingVitals.heartRate} bpm · ${assessment.restingVitals.systolic}/${assessment.restingVitals.diastolic}`} note={`SpO₂ ${assessment.restingVitals.spo2 ?? "--"}%`}><MiniNumber label="心率" value={assessment.restingVitals.heartRate} disabled={readonly} onChange={(value) => setNumber("restingVitals", "heartRate", value)} /><MiniNumber label="收缩压" value={assessment.restingVitals.systolic} disabled={readonly} onChange={(value) => setNumber("restingVitals", "systolic", value)} /></AssessmentCard></div>
  <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500">评估号 {assessment.assessmentId} · {assessment.source} · {formatDateTime(assessment.assessedAt)} · {assessment.assessor}</div></section>
  {showRecognition && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"><section className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><p className="text-[10px] font-bold text-blue-600">原型模拟 · OCR + 结构化抽取</p><h2 className="mt-1 text-lg font-bold">纸质康复评估单识别结果</h2></div><button type="button" onClick={() => setShowRecognition(false)}><X className="h-4 w-4 text-slate-400" /></button></div><div className="p-5"><div className="grid grid-cols-2 gap-3">{[["SPPB","9/12"],["6MWT","492 m"],["峰值VO₂","19.2 ml/kg/min"],["静息血压","124/76 mmHg"]].map(([label,value]) => <ClinicalValue key={label} label={label} value={value} />)}</div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">识别结果不会直接生效。写入后状态为“待复核”，需医生核对原始评估单并确认。</p></div><div className="flex justify-end gap-2 border-t border-slate-100 p-4"><button type="button" className="btn-secondary" onClick={() => setShowRecognition(false)}>取消</button><button type="button" className="btn-primary" onClick={applyRecognizedForm}>确认写入评估</button></div></section></div>}</div>;
}

function AssessmentCard({ title, status, note, children }: { title: string; status: string; note: string; children: ReactNode }) { return <article className="rounded-xl border border-slate-200 p-4"><p className="text-[10px] font-bold text-slate-500">{title}</p><p className="mt-1 text-base font-bold text-slate-900">{status}</p><p className="mt-1 truncate text-[9px] text-slate-400">{note}</p><div className="mt-3 grid grid-cols-2 gap-2">{children}</div></article>; }
function MiniNumber({ label, value, disabled, onChange }: { label: string; value: number | null; disabled: boolean; onChange: (value: string) => void }) { return <label><span className="block text-[9px] text-slate-500">{label}</span><input type="number" disabled={disabled} value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="text-field mt-1" /></label>; }

function NarrativeTab({ draft, readonly, saved, dirty, records, expandedId, onExpanded, onChange, onSave }: { draft: ClinicalNarrativeContent; readonly: boolean; saved: boolean; dirty: boolean; records: ClinicalNarrativeRecord[]; expandedId: string | null; onExpanded: (id: string | null) => void; onChange: <K extends keyof ClinicalNarrativeContent>(key: K, value: ClinicalNarrativeContent[K]) => void; onSave: () => void }) {
  function toggleSymptom(option: string) {
    const next = draft.symptoms.includes(option) ? draft.symptoms.filter((item) => item !== option) : [...draft.symptoms.filter((item) => item !== "无明显变化"), option];
    onChange("symptoms", option === "无明显变化" ? ["无明显变化"] : next);
  }
  function fillStableVisit() {
    onChange("chiefComplaint", "与上次相比无明显不适，日常活动耐量稳定。");
    onChange("symptoms", ["无明显变化"]);
    onChange("medicationChange", "无明显变化");
    onChange("medicationAdherence", "按医嘱服药");
    onChange("trainingFeedback", "按计划完成训练，用药、睡眠、饮食及训练后感受无特殊变化。");
    onChange("lifestyle", "无特殊变化");
    onChange("newClinicalEvents", "无新增就诊、住院或安全事件");
    onChange("clinicalAssessment", "患者目前状态稳定，可结合上一版处方和训练报告继续开具本次处方。");
  }
  return (
    <div className="space-y-3">
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-4 py-3">
          <SectionHeader title="本次问诊记录" description="只记录影响本次开方的关键信息。" action={<StatusBadge tone={saved ? "green" : "orange"}>{saved ? "已保存" : dirty ? "正在记录" : "待记录"}</StatusBadge>} />
          <div className="flex gap-2">{!readonly && <button type="button" className="btn-secondary" onClick={fillStableVisit}><Check className="h-4 w-4" />一键填写无明显变化</button>}{!readonly && <button type="button" className="btn-primary" onClick={onSave}><Save className="h-4 w-4" />保存本次问诊</button>}</div>
        </div>
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold text-slate-500">症状快捷选择</span>{symptomOptions.map((option) => <button type="button" key={option} disabled={readonly} onClick={() => toggleSymptom(option)} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${draft.symptoms.includes(option) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}`}>{draft.symptoms.includes(option) && <Check className="mr-1 inline h-3 w-3" />}{option}</button>)}</div>
          <div className="grid gap-3 lg:grid-cols-3">
            <CompactNarrativeField label="本次情况简述 *" value={draft.chiefComplaint} disabled={readonly} placeholder="症状变化、活动耐量、主要诉求" onChange={(value) => onChange("chiefComplaint", value)} />
            <CompactNarrativeField label="用药、训练与生活情况" value={draft.trainingFeedback} disabled={readonly} placeholder="仅记录有变化或需关注的内容" onChange={(value) => onChange("trainingFeedback", value)} />
            <CompactNarrativeField label="医生判断与处置 *" value={draft.clinicalAssessment} disabled={readonly} placeholder="维持、调整或暂缓处方的判断" onChange={(value) => onChange("clinicalAssessment", value)} />
          </div>
          <p className="mt-2 text-[9px] text-slate-400">默认记录：用药无变化、按医嘱服药、无新增就诊或住院；如有异常，请在上述输入区补充说明。</p>
        </div>
      </section>
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><SectionHeader title="历次口述" description="点击记录查看详情。" /><span className="text-[10px] text-slate-400">共 {records.length} 条</span></div>
        <div className="max-h-[250px] overflow-y-auto">{records.map((record) => { const expanded = expandedId === record.narrativeId; return <article key={record.narrativeId} className="border-b border-slate-100 last:border-0"><button type="button" onClick={() => onExpanded(expanded ? null : record.narrativeId)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><MessageSquareText className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><b className="text-[11px] text-slate-900">{record.recordType}</b><span className="text-[9px] text-blue-600">{record.author}</span></span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{record.content.chiefComplaint}</span></span><span className="text-[9px] text-slate-400">{formatDateTime(record.encounterAt)}</span>{expanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}</button>{expanded && <div className="grid gap-2 bg-slate-50 px-4 py-3 md:grid-cols-2 xl:grid-cols-4"><NarrativeValue label="症状" value={record.content.symptoms.join("、") || "未记录"} /><NarrativeValue label="用药与依从性" value={`${record.content.medicationChange}；${record.content.medicationAdherence}`} /><NarrativeValue label="训练与生活方式" value={`${record.content.trainingFeedback}；${record.content.lifestyle}`} /><NarrativeValue label="临床判断" value={record.content.clinicalAssessment} /></div>}</article>; })}{!records.length && <EmptyState text="暂无历史口述记录" />}</div>
      </section>
    </div>
  );
}

function CompactNarrativeField({ label, value, disabled, placeholder, onChange }: { label: string; value: string; disabled: boolean; placeholder: string; onChange: (value: string) => void }) {
  return <label><span className="field-label">{label}</span><textarea className="text-field min-h-[76px] resize-none py-2 disabled:bg-slate-50" value={value} disabled={disabled} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function CurrentPrescriptionTab({ task, content, previousVersion, safetyEvents, readonly, narrativeSaved, assessmentSummary, profileComplete, previousReviewed, riskReviewed, contentConfirmed, signatureBlockers, onGenerate, onFieldChange, onOpenCarry, onPreviousReviewed, onRiskReviewed, onContentConfirmed, onSign, onPrint }: { task: PrescriptionTask; content: PrescriptionContent; previousVersion: PrescriptionVersionDetail; safetyEvents: typeof minimalSafetyEvents; readonly: boolean; narrativeSaved: boolean; assessmentSummary: string; profileComplete: boolean; previousReviewed: boolean; riskReviewed: boolean; contentConfirmed: boolean; signatureBlockers: string[]; onGenerate: () => void; onFieldChange: <K extends keyof PrescriptionContent>(key: K, value: PrescriptionContent[K]) => void; onOpenCarry: () => void; onPreviousReviewed: (value: boolean) => void; onRiskReviewed: (value: boolean) => void; onContentConfirmed: (value: boolean) => void; onSign: () => void; onPrint: () => void }) {
  void assessmentSummary;
  return <div className="space-y-4"><AiWorkspace task={task} previous={previousVersion} content={content} readonly={readonly} narrativeSaved={narrativeSaved} onGenerate={onGenerate} /><section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><SectionHeader title="本次运动处方" description={readonly ? "处方已签署，当前只能查看和打印。" : "结合问诊、上一版和近期训练数据完善本次处方。"} action={<span className="text-[10px] text-slate-400">处方号 {task.prescriptionNo}</span>} /><div className="flex gap-2">{!readonly && task.kind === "adjustment" && <button type="button" className="btn-secondary" onClick={onOpenCarry}><History className="h-4 w-4" />从上一版逐项沿用</button>}{readonly && <button type="button" className="btn-primary" onClick={onPrint}><Printer className="h-4 w-4" />查看/打印</button>}</div></div><div className="space-y-4 bg-slate-50/60 p-5"><OptionSection title="康复目标" options={["降低血压", "降低血脂", "改善症状", "提高体能", "改善心功能", "改善睡眠", "预防支架内再狭窄"]} selected={content.rehabGoals} disabled={readonly} onChange={(value) => onFieldChange("rehabGoals", value)} /><ExerciseSection title="呼吸训练" modes={content.breathingModes} modeOptions={["腹式呼吸练习", "吸气抬手", "吸气耸肩", "正念呼吸"]} intensity={content.breathingIntensity} frequency={content.breathingFrequency} time={content.breathingTime} disabled={readonly} onModes={(value) => onFieldChange("breathingModes", value)} onIntensity={(value) => onFieldChange("breathingIntensity", value)} onFrequency={(value) => onFieldChange("breathingFrequency", value)} onTime={(value) => onFieldChange("breathingTime", value)} /><ExerciseSection title="热身运动" modes={content.warmupModes} modeOptions={["原地踏步", "肩部热身运动", "扩胸运动", "四肢伸展运动", "手腕踝关节"]} intensity="低强度，逐步提升心率" frequency={content.warmupFrequency} time={content.warmupTime} disabled={readonly} onModes={(value) => onFieldChange("warmupModes", value)} onIntensity={() => undefined} onFrequency={(value) => onFieldChange("warmupFrequency", value)} onTime={(value) => onFieldChange("warmupTime", value)} /><ExerciseSection title="有氧运动" modes={content.aerobicModes} modeOptions={["步行", "骑自行车", "功率车", "椭圆机", "八段锦", "太极拳"]} intensity={content.aerobicIntensity} frequency={content.aerobicFrequency} time={content.aerobicTime} disabled={readonly} onModes={(value) => onFieldChange("aerobicModes", value)} onIntensity={(value) => onFieldChange("aerobicIntensity", value)} onFrequency={(value) => onFieldChange("aerobicFrequency", value)} onTime={(value) => onFieldChange("aerobicTime", value)} /><ExerciseSection title="抗阻训练" modes={content.resistanceModes} modeOptions={["哑铃", "弹力带", "绑腿沙袋", "下肢静蹲"]} intensity={content.resistanceIntensity} frequency={content.resistanceFrequency} time={content.resistanceTime} disabled={readonly} onModes={(value) => onFieldChange("resistanceModes", value)} onIntensity={(value) => onFieldChange("resistanceIntensity", value)} onFrequency={(value) => onFieldChange("resistanceFrequency", value)} onTime={(value) => onFieldChange("resistanceTime", value)} /><ExerciseSection title="柔韧性训练" modes={content.flexibilityModes} modeOptions={["颈部肌肉牵伸", "躯干肌肉牵伸", "上肢肌肉牵伸", "下肢肌肉牵伸"]} intensity={content.flexibilityIntensity} frequency={content.flexibilityFrequency} time={content.flexibilityTime} disabled={readonly} onModes={(value) => onFieldChange("flexibilityModes", value)} onIntensity={(value) => onFieldChange("flexibilityIntensity", value)} onFrequency={(value) => onFieldChange("flexibilityFrequency", value)} onTime={(value) => onFieldChange("flexibilityTime", value)} /><EditArea label="备注与注意事项" value={content.remark} disabled={readonly} onChange={(value) => onFieldChange("remark", value)} /></div></section><section className="card p-5"><SectionHeader title="签署前临床核对" description="所有必检项完成后，才能生成正式处方。" action={<ClipboardCheck className="h-4 w-4 text-blue-600" />} /><div className="mt-4 grid gap-3 lg:grid-cols-3"><ChecklistItem checked={narrativeSaved} label="本次问诊已保存" fixed /><ChecklistItem checked={profileComplete} label="关键临床资料完整" fixed /><ChecklistItem checked={previousReviewed || task.kind === "initial"} label={task.kind === "initial" ? "首次处方无需核对上一版" : "已核对上一版处方"} disabled={readonly || task.kind === "initial"} onChange={onPreviousReviewed} /><ChecklistItem checked={!safetyEvents.length || riskReviewed} label={safetyEvents.length ? "已核对近期异常与处置" : "无近期安全事件"} disabled={readonly || !safetyEvents.length} onChange={onRiskReviewed} /><ChecklistItem checked={riskReviewed || task.risk !== "高危"} label={task.risk === "高危" ? "已完成高危患者人工复核" : "风险等级已确认"} disabled={readonly || task.risk !== "高危"} onChange={onRiskReviewed} /><ChecklistItem checked={contentConfirmed} label="本次处方内容由医生确认" disabled={readonly} onChange={onContentConfirmed} /></div><div className="mt-4 flex justify-end">{!readonly && <button type="button" className="btn-primary" onClick={onSign}><BadgeCheck className="h-4 w-4" />确认完成并数字签署</button>}</div></section></div>;
}

function AiWorkspace({ task, previous, content, readonly, narrativeSaved, assessmentSummary = "康复评估结果与自动评分", onGenerate }: { task: PrescriptionTask; previous: PrescriptionVersionDetail; content: PrescriptionContent; readonly: boolean; narrativeSaved: boolean; assessmentSummary?: string; onGenerate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const draft = task.aiDraft;
  const evidence = draft ? Array.from(new Set([...draft.evidenceSnapshot, assessmentSummary, narrativeSaved ? "本次问诊记录" : "本次问诊尚未保存", "近期训练完成情况与安全事件"])) : [];

  if (!draft) {
    return <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-600 p-2.5 text-white"><Sparkles className="h-4 w-4" /></span><div><div className="flex items-center gap-2"><h2 className="text-sm font-bold text-slate-900">AI 辅助开方</h2><StatusBadge tone="orange">等待生成</StatusBadge></div><p className="mt-1 text-[10px] text-slate-500">生成前检查患者资料、问诊、上一版处方及近期训练数据。</p></div></div>{!readonly && <button type="button" onClick={onGenerate} className="btn-primary"><Bot className="h-4 w-4" />生成 AI 建议</button>}</section>;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm" data-testid="compact-ai-prescription-advice">
      <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-4 py-3">
        <div className="flex min-w-[190px] items-center gap-3">
          <span className="rounded-xl bg-blue-600 p-2.5 text-white shadow-sm"><Sparkles className="h-4 w-4" /></span>
          <div><div className="flex items-center gap-2"><h2 className="text-sm font-bold text-slate-950">AI 开方建议</h2><StatusBadge tone="blue">供医生参考</StatusBadge></div><p className="mt-1 text-[9px] text-slate-500">不会自动写入或签署处方</p></div>
        </div>
        <div className="grid min-w-[460px] flex-1 grid-cols-2 gap-2 md:grid-cols-4">
          <AiMetric label="靶心率" value={draft.proposedContent.targetHeartRate} />
          <AiMetric label="目标功率" value={draft.proposedContent.targetPower} />
          <AiMetric label="频率" value={draft.proposedContent.frequency} />
          <AiMetric label="时长" value={draft.proposedContent.duration} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setExpanded((value) => !value)} className="btn-secondary">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{expanded ? "收起详情" : "依据与对比"}</button>
          <button type="button" onClick={(event) => event.currentTarget.closest("section")?.nextElementSibling?.scrollIntoView({ behavior: "smooth", block: "start" })} className="btn-primary">开始开方<ArrowRight className="h-4 w-4" /></button>
          {!readonly && <button type="button" onClick={onGenerate} className="rounded-lg px-2 py-2 text-[10px] font-bold text-blue-700 hover:bg-blue-50">重新生成</button>}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-blue-100 bg-amber-50/70 px-4 py-2 text-[10px] leading-5 text-amber-800"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /><b>临床提示：</b><span className="truncate">{draft.proposedContent.clinicalAdvice}</span></div>
      {expanded && <div className="grid border-t border-slate-100 lg:grid-cols-[0.72fr_1.28fr]"><div className="bg-slate-50 p-4"><p className="text-xs font-bold text-slate-800">生成依据</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{evidence.map((item) => <p key={item} className="flex gap-2 text-[10px] leading-5 text-slate-600"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />{item}</p>)}</div><p className="mt-3 text-[9px] text-slate-400">{formatDateTime(draft.generatedAt)} · {draft.modelVersion}</p></div><div className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-900">上一版—AI建议—医生最终值</p><p className="mt-1 text-[9px] text-slate-500">医生最终值始终以下方编辑区为准。</p></div><StatusBadge tone="blue">待医生确认</StatusBadge></div><div className="mt-3 overflow-hidden rounded-xl border border-slate-100 text-xs"><CompareRow header values={["参数", "上一版", "AI建议", "医生最终值"]} /><CompareRow values={["靶心率", `${previous.targetHr.join("–")} bpm`, draft.proposedContent.targetHeartRate, content.aerobicIntensity]} /><CompareRow values={["功率", `${previous.targetPower.join("–")} W`, draft.proposedContent.targetPower, content.aerobicIntensity]} /><CompareRow values={["频率", `每周${previous.weeklyFrequency}次`, draft.proposedContent.frequency, content.aerobicFrequency]} /><CompareRow values={["时长", `${previous.trainingMinutes}分钟`, draft.proposedContent.duration, content.aerobicTime]} /></div></div></div>}
    </section>
  );
}

function AiMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-blue-100 bg-white px-3 py-2"><p className="text-[9px] font-bold text-slate-400">{label}</p><p className="mt-0.5 truncate text-xs font-bold text-blue-800">{value}</p></div>;
}

function HistoryTab({ task, previousVersion, current, selected, onSelect, reviewed, onReviewed, onCarry, readonly }: { task: PrescriptionTask; previousVersion: PrescriptionVersionDetail; current: PrescriptionContent; selected: PrescriptionVersionDetail | null; onSelect: (version: PrescriptionVersionDetail | null) => void; reviewed: boolean; onReviewed: (value: boolean) => void; onCarry: () => void; readonly: boolean }) {
  if (task.kind === "initial") return <section className="card p-5"><SectionHeader title="上一版与历次处方" description="该任务为首次开方，不存在上一版处方。" /><div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center"><FileClock className="mx-auto h-7 w-7 text-blue-500" /><p className="mt-3 text-sm font-bold text-blue-900">首次运动处方</p><p className="mt-1 text-xs text-blue-700">请依据患者基本信息、本次问诊和基线评估完成处方。</p></div></section>;
  const viewed = selected ?? previousVersion;
  return <div className="space-y-4"><section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-950 to-blue-950 px-5 py-4 text-white"><div><p className="text-[10px] font-bold text-blue-200">默认展示上一版处方</p><h2 className="mt-1 text-lg font-bold">{previousVersion.version} · {previousVersion.prescriptionNo}</h2><p className="mt-1 text-xs text-slate-300">{formatDateTime(previousVersion.issuedAt)} · {previousVersion.physician}签署</p></div><div className="flex gap-2">{!readonly && <button type="button" onClick={onCarry} className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-blue-900">逐项沿用上一版</button>}<label className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold"><input type="checkbox" checked={reviewed} disabled={readonly} onChange={(event) => onReviewed(event.target.checked)} className="accent-cyan-400" />已核对上一版</label></div></div><div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]"><div><SectionHeader title="上一版完整处方" /><div className="mt-3 grid grid-cols-2 gap-3"><ClinicalValue label="训练项目" value={`${previousVersion.exerciseProject} · ${previousVersion.trainingType}`} /><ClinicalValue label="靶心率" value={`${previousVersion.targetHr.join("–")} bpm`} /><ClinicalValue label="目标功率" value={`${previousVersion.targetPower.join("–")} W`} /><ClinicalValue label="RPE" value={previousVersion.rpeTarget.join("–")} /><ClinicalValue label="频率" value={`每周${previousVersion.weeklyFrequency}次`} /><ClinicalValue label="阶段时长" value={`热身${previousVersion.warmupMinutes}分 · 主训练${previousVersion.trainingMinutes}分 · 放松${previousVersion.cooldownMinutes}分`} /></div><div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-6"><b>上一版注意事项</b><p className="mt-1 text-slate-600">{previousVersion.advice.exerciseCautions}；{previousVersion.advice.stopConditions}</p></div></div><div><SectionHeader title="与本次处方对照" description="快速识别维持和调整项。" /><div className="mt-3 overflow-hidden rounded-xl border border-slate-100 text-xs"><DiffRow label="运动方式" previous={previousVersion.exerciseProject} current={current.aerobicModes.join("、")} /><DiffRow label="运动强度" previous={`${previousVersion.targetHr.join("–")} bpm / ${previousVersion.targetPower.join("–")} W`} current={current.aerobicIntensity} /><DiffRow label="运动频率" previous={`每周${previousVersion.weeklyFrequency}次`} current={current.aerobicFrequency} /><DiffRow label="运动时间" previous={`${previousVersion.trainingMinutes}分钟/次`} current={current.aerobicTime} /></div></div></div></section><section className="card overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><SectionHeader title="历次处方版本" description="历史版本只读；选择后在下方查看完整信息。" /></div><div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">{prescriptionVersionDetails.map((version) => <button type="button" key={version.prescriptionId} onClick={() => onSelect(version)} className={`rounded-xl border p-4 text-left ${viewed.prescriptionId === version.prescriptionId ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><div className="flex items-center justify-between"><b className="text-sm">{version.version}</b>{version.prescriptionId === task.previousPrescriptionId && <StatusBadge tone="blue">上一版</StatusBadge>}</div><p className="mt-2 font-mono text-[9px] text-slate-400">{version.prescriptionNo}</p><p className="mt-2 text-xs text-slate-600">{version.targetHr.join("–")} bpm · {version.targetPower.join("–")} W</p><p className="mt-1 text-[10px] text-slate-400">{formatDateTime(version.issuedAt)}</p></button>)}</div>{selected && <div className="border-t border-slate-100 bg-slate-50 p-5"><div className="flex items-center justify-between"><div><b>{selected.version} 完整处方</b><p className="mt-1 text-xs text-slate-500">{selected.advice.diagnosisAdvice}</p></div><button type="button" className="btn-secondary" onClick={() => onSelect(null)}>关闭历史详情</button></div><div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4"><ClinicalValue label="项目" value={selected.exerciseProject} /><ClinicalValue label="靶心率" value={`${selected.targetHr.join("–")} bpm`} /><ClinicalValue label="功率" value={`${selected.targetPower.join("–")} W`} /><ClinicalValue label="时间" value={`${selected.trainingMinutes}分钟`} /></div></div>}</section></div>;
}

function ReportsTab({ task, mode, onMode, training, selectedTraining, onSelectTraining, safetyEvents }: { task: PrescriptionTask; mode: ReportMode; onMode: (mode: ReportMode) => void; training: SingleTrainingReportDetail[]; selectedTraining: SingleTrainingReportDetail | null; onSelectTraining: (report: SingleTrainingReportDetail | null) => void; safetyEvents: typeof minimalSafetyEvents }) {
  if (selectedTraining) return <TrainingDetail report={selectedTraining} onBack={() => onSelectTraining(null)} />;
  const completed = stageReportData.sessions.filter((item) => item.completed).length;
  const planned = stageReportData.prescriptionVersions.reduce((sum, item) => sum + item.plannedSessions, 0);
  const activeMinutes = stageReportData.sessions.reduce((sum, item) => sum + item.activeMinutes, 0);
  const targetMinutes = stageReportData.sessions.reduce((sum, item) => sum + item.targetZoneMinutes, 0);
  const targetRate = Math.round(targetMinutes / activeMinutes * 100);
  return <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><SectionHeader title="训练记录与阶段报告" description="当前处方依据会优先标记，异常训练记录置顶。" /><div className="flex rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => onMode("stage")} className={`rounded-lg px-4 py-2 text-xs font-bold ${mode === "stage" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>阶段报告</button><button type="button" onClick={() => onMode("training")} className={`rounded-lg px-4 py-2 text-xs font-bold ${mode === "training" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>训练记录</button></div></div>{mode === "stage" ? <div className="space-y-4 p-5"><div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4"><div><p className="text-[10px] font-bold text-blue-600">阶段报告号 · CRH-PR-202607-0003</p><h3 className="mt-1 text-sm font-bold text-slate-900">{stageReportData.reportPeriod.start} 至 {stageReportData.reportPeriod.end}</h3></div>{task.sourceType === "stage_report" && <StatusBadge tone="blue">本次开方依据</StatusBadge>}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><Metric label="计划完成" value={`${completed}/${planned}`} note={`${Math.round(completed / planned * 100)}%`} /><Metric label="靶区达标" value={`${targetRate}%`} note="按实际运动时间" /><Metric label="耐量变化" value="+18%" note="相近HR/RPE下" tone="green" /><Metric label="安全事件" value={String(safetyEvents.length)} note="均需医生核对" tone={safetyEvents.length ? "orange" : "green"} /><Metric label="处方版本" value="V1–V4" note="阶段演变" /></div><div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-xl border border-slate-100 p-4"><b className="text-sm">阶段临床结论</b><p className="mt-2 text-xs leading-6 text-slate-600">{stageReportData.clinicalConclusion.summary}</p><p className="mt-3 rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-800">下一阶段建议：{stageReportData.clinicalConclusion.nextPrescription}</p></div><div className="rounded-xl border border-amber-100 bg-amber-50 p-4"><b className="flex items-center gap-2 text-sm text-amber-900"><ShieldAlert className="h-4 w-4" />安全事件与处置</b>{safetyEvents.length ? safetyEvents.map((event) => <div key={event.id} className="mt-3 text-xs leading-5 text-amber-800"><b>{event.type}</b><p>{event.metricSnapshot}</p><p>{event.fieldAction}</p><StatusBadge tone="green">{event.doctorReviewStatus}</StatusBadge></div>) : <p className="mt-3 text-xs text-amber-700">本阶段无安全事件。</p>}</div></div></div> : <div>{training.map((report) => { const abnormal = report.safetySummary !== "无异常"; const isSource = task.sourceTrainingRecordIds.includes(report.id); return <button type="button" key={report.id} onClick={() => onSelectTraining(report)} className={`grid w-full grid-cols-[1.1fr_0.85fr_0.65fr_0.65fr_0.65fr_0.8fr_0.75fr] items-center border-b px-5 py-4 text-left text-xs hover:bg-slate-50 ${abnormal ? "border-amber-100 bg-amber-50/50" : "border-slate-100"}`}><span><b className="block font-mono text-[10px]">{report.trainingRecordNo}</b><span className="mt-1 block text-[10px] text-slate-400">{formatDateTime(report.actualStartAt)}</span></span><span><b>{report.exercise}</b><span className="block text-[10px] text-slate-400">{report.prescriptionVersionId}</span></span><span>{report.totalMinutes}分钟</span><span>HR {report.hrStats.average}/{report.hrStats.peak}</span><span>{report.targetZoneRate}%靶区</span><span className={abnormal ? "font-bold text-amber-700" : "text-slate-500"}>{report.safetySummary}</span><span className="flex flex-col items-start gap-1">{isSource && <StatusBadge tone="blue">本次开方依据</StatusBadge>}<span className="font-bold text-blue-700">查看完整记录</span></span></button>; })}{!training.length && <EmptyState text="该患者暂无训练记录" />}</div>}</section>;
}

function TrainingDetail({ report, onBack }: { report: SingleTrainingReportDetail; onBack: () => void }) {
  return <section className="card p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><button type="button" className="btn-secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" />返回训练记录</button><div><p className="text-[10px] font-bold text-blue-600">训练记录号 · {report.trainingRecordNo}</p><h2 className="mt-1 text-lg font-bold">{report.exercise} · {formatDateTime(report.actualStartAt)}</h2></div></div><StatusBadge tone={report.safetySummary === "无异常" ? "green" : "orange"}>{report.safetySummary}</StatusBadge></div><div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6"><Metric label="总时长" value={`${report.totalMinutes}分`} /><Metric label="平均心率" value={`${report.hrStats.average}`} note="bpm" /><Metric label="峰值心率" value={`${report.hrStats.peak}`} note="bpm" /><Metric label="靶区达标" value={`${report.targetZoneRate}%`} /><Metric label="处方版本" value={report.prescriptionVersionId} /><Metric label="血氧" value={report.spo2Summary} /></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><ClinicalValue label="训练执行总结" value={report.executionSummary} /><ClinicalValue label="心电与安全摘要" value={report.ecgSummary} /></div></section>;
}

function CarryPreviousModal({ previous, selection, onSelection, onApply, onClose }: { previous: PrescriptionVersionDetail; selection: string[]; onSelection: (selection: string[]) => void; onApply: () => void; onClose: () => void }) {
  const options = [["aerobicMode", "有氧运动方式", previous.exerciseProject], ["intensity", "运动强度", `${previous.targetHr.join("–")} bpm / ${previous.targetPower.join("–")} W`], ["frequency", "运动频率", `每周${previous.weeklyFrequency}次`], ["duration", "主要训练时间", `${previous.trainingMinutes}分钟`], ["warmup", "热身时间", `${previous.warmupMinutes}分钟`], ["remark", "注意事项", previous.advice.exerciseCautions]];
  function toggle(key: string) { onSelection(selection.includes(key) ? selection.filter((item) => item !== key) : [...selection, key]); }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"><section className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-bold text-blue-600">版本继承 · 不属于模板应用</p><h2 className="mt-1 text-lg font-bold">逐项沿用上一版 {previous.version}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="space-y-2 p-5">{options.map(([key, label, value]) => <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${selection.includes(key) ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}><input type="checkbox" checked={selection.includes(key)} onChange={() => toggle(key)} className="mt-1 accent-blue-600" /><span><b className="text-xs text-slate-900">{label}</b><span className="mt-1 block text-xs leading-5 text-slate-500">{value}</span></span></label>)}</div><div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><p className="text-[10px] text-slate-500">仅覆盖选中字段，并记录字段来源为上一版处方。</p><div className="flex gap-2"><button type="button" className="btn-secondary" onClick={onClose}>取消</button><button type="button" className="btn-primary" disabled={!selection.length} onClick={onApply}>沿用所选字段</button></div></div></section></div>;
}

function SignatureBlockerModal({ blockers, onClose }: { blockers: string[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="signature-blocker-title">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4">
          <span className="rounded-xl bg-amber-100 p-2 text-amber-700"><AlertTriangle className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="text-xs font-bold text-amber-700">签署条件提醒</p><h2 id="signature-blocker-title" className="mt-1 text-lg font-bold text-slate-950">暂时无法签署该处方</h2><p className="mt-1 text-sm text-slate-600">请先完成以下事项，再重新发起签署。</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white" aria-label="关闭签署提醒"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2 p-5">{blockers.map((blocker, index) => <div key={`${blocker}-${index}`} className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">{index + 1}</span><span className="leading-5">{blocker}</span></div>)}</div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-4"><button type="button" className="btn-primary" onClick={onClose}>返回处理</button></div>
      </section>
    </div>
  );
}

function DischargeHandbookModal({ patientName, onClose }: { patientName: string; onClose: () => void }) {
  const handbook = demoDischargeHandbook;
  return <div className="fixed inset-0 z-50 bg-slate-950/40 p-6 backdrop-blur-sm" data-testid="modal-DISCHARGE-HANDBOOK"><section className="mx-auto flex max-h-[92vh] max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-bold text-emerald-700">个性化院外康复指导 · {handbook.handbookNo}</p><h2 className="mt-1 text-lg font-bold">{patientName}的出院康复手册</h2><p className="mt-1 text-xs text-slate-500">由评估、处方、训练与阶段报告自动汇总，医生确认后才发布给患者。</p></div><div className="flex items-center gap-2"><StatusBadge tone={handbook.status === "已发布给患者" ? "green" : "orange"}>{handbook.status}</StatusBadge><button type="button" className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" />打印</button><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2"><X className="h-4 w-4" /></button></div></div><div className="overflow-y-auto bg-slate-50 p-5"><article className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"><p className="rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{handbook.summary}</p><div className="grid gap-3 sm:grid-cols-3">{handbook.improvements.map((item) => <div key={item.label} className="rounded-xl border border-slate-100 p-4"><p className="text-[10px] font-bold text-slate-400">{item.label}</p><p className="mt-2 text-xs text-slate-500">基线 {item.baseline}</p><p className="mt-1 text-base font-bold text-emerald-700">当前 {item.current}</p></div>)}</div><HandbookSection title="居家运动处方" items={handbook.exercisePlan} /><div className="grid gap-4 md:grid-cols-2"><HandbookSection title="用药提醒" items={handbook.medicationTips} /><HandbookSection title="饮食与生活方式" items={handbook.nutritionTips} /><HandbookSection title="1、3、6个月复查计划" items={handbook.reviewPlan} /><HandbookSection title="出现以下情况立即停止运动并就医" items={handbook.warningSigns} warning /></div><p className="text-right text-[10px] text-slate-400">生成于 {formatDateTime(handbook.generatedAt)} · {handbook.confirmedBy ?? "待医生确认"}</p></article></div></section></div>;
}

function HandbookSection({ title, items, warning = false }: { title: string; items: string[]; warning?: boolean }) { return <section className={`rounded-xl border p-4 ${warning ? "border-rose-100 bg-rose-50" : "border-slate-100"}`}><h3 className={`text-sm font-bold ${warning ? "text-rose-800" : "text-slate-900"}`}>{title}</h3><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-slate-600"><Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${warning ? "text-rose-500" : "text-emerald-500"}`} />{item}</li>)}</ul></section>; }

function FormalPrescriptionModal({ task, content, onClose }: { task: PrescriptionTask; content: PrescriptionContent; onClose: () => void }) {
  const signer = task.signedBy ?? task.assignedDoctor;
  const signedAt = task.signedAt ?? new Date().toISOString();
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 p-6 backdrop-blur-sm">
      <section className="mx-auto flex max-h-[92vh] max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div><p className="text-xs font-bold text-blue-700">正式处方</p><h2 className="mt-1 text-lg font-bold">心脏康复中心运动处方</h2></div>
          <div className="flex gap-2"><button type="button" className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" />打印</button><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="关闭正式处方"><X className="h-4 w-4" /></button></div>
        </div>
        <div className="overflow-y-auto bg-slate-100 p-6">
          <article className="mx-auto min-h-[760px] max-w-3xl bg-white p-8 text-xs leading-6 shadow-sm" data-testid="formal-prescription-document">
            <h1 className="text-center text-2xl font-bold">心脏康复中心运动处方</h1>
            <div className="mt-5 grid grid-cols-4 gap-2 border-y border-slate-300 py-3"><span className="col-span-2">处方号：{task.prescriptionNo}</span><span>版本：{task.versionNo}</span><span>患者号：{task.patientNo}</span><span>姓名：{task.patientName}</span><span>性别：{task.sex}</span><span>年龄：{task.age}岁</span><span>身高：{content.height}cm</span></div>
            <PrescriptionLine title="康复目标" value={content.rehabGoals.join("、")} />
            <PrescriptionLine title="呼吸训练" value={`${content.breathingModes.join("、")}；${content.breathingIntensity}；${content.breathingFrequency}；${content.breathingTime}`} />
            <PrescriptionLine title="热身运动" value={`${content.warmupModes.join("、")}；${content.warmupFrequency}；${content.warmupTime}`} />
            <PrescriptionLine title="有氧运动" value={`${content.aerobicModes.join("、")}；${content.aerobicIntensity}；${content.aerobicFrequency}；${content.aerobicTime}`} />
            <PrescriptionLine title="抗阻训练" value={`${content.resistanceModes.join("、")}；${content.resistanceIntensity}；${content.resistanceFrequency}；${content.resistanceTime}`} />
            <PrescriptionLine title="柔韧性训练" value={`${content.flexibilityModes.join("、")}；${content.flexibilityIntensity}；${content.flexibilityFrequency}；${content.flexibilityTime}`} />
            <PrescriptionLine title="备注" value={content.remark} />
            <div className="prescription-sign-line mt-8 grid grid-cols-[1fr_1.1fr_1.2fr] items-end gap-6 border-t border-slate-300 pt-5">
              <div><p className="text-[10px] text-slate-500">制定医生</p><p className="mt-1 font-bold text-slate-900">{signer}</p></div>
              <div className="text-center" data-testid="handwritten-doctor-signature"><p className="text-[10px] text-slate-500">医生手写签名</p><p className="signature-script prescription-hand-signature mt-1 text-4xl font-bold leading-none text-blue-950">{signer}</p></div>
              <div className="text-right"><p className="font-bold text-slate-700">时间：{formatDateTime(signedAt)}</p></div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function OptionSection({ title, options, selected, disabled, onChange }: { title: string; options: string[]; selected: string[]; disabled: boolean; onChange: (value: string[]) => void }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex flex-wrap items-center gap-2"><div className="mr-2 flex min-w-24 items-center justify-between gap-2"><b className="!text-sm">{title}</b><span className="!text-xs text-slate-400">{selected.length}项</span></div>{options.map((option) => <label key={option} className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 !text-sm font-bold ${selected.includes(option) ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}><input type="checkbox" checked={selected.includes(option)} disabled={disabled} onChange={() => onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])} className="sr-only" />{selected.includes(option) && <Check className="h-4 w-4" />}{option}</label>)}</div></section>;
}

function ExerciseSection({ title, modes, modeOptions, intensity, frequency, time, disabled, onModes, onIntensity, onFrequency, onTime }: { title: string; modes: string[]; modeOptions: string[]; intensity: string; frequency: string; time: string; disabled: boolean; onModes: (value: string[]) => void; onIntensity: (value: string) => void; onFrequency: (value: string) => void; onTime: (value: string) => void }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-3"><div className="grid items-end gap-2 xl:grid-cols-[112px_1.25fr_1fr_0.55fr_0.55fr]"><div className="flex h-10 items-center gap-2 self-center"><span className="rounded-lg bg-blue-50 p-1.5 text-blue-600"><Activity className="h-4 w-4" /></span><b className="!text-sm">{title}</b></div><div><span className="field-label !mb-1 !text-xs">运动方式</span><div className="flex min-h-10 flex-wrap content-center gap-x-4 gap-y-2 rounded-[10px] border border-slate-200 px-3 py-2">{modeOptions.map((option) => <label key={option} className="flex min-h-6 items-center gap-2 !text-sm font-medium text-slate-700"><input type="checkbox" checked={modes.includes(option)} disabled={disabled} onChange={() => onModes(modes.includes(option) ? modes.filter((item) => item !== option) : [...modes, option])} className="h-5 w-5 shrink-0 accent-blue-600" />{option}</label>)}</div></div><EditField label="运动强度" value={intensity} disabled={disabled || title === "热身运动"} onChange={onIntensity} /><EditField label="运动频率" value={frequency} disabled={disabled} onChange={onFrequency} /><EditField label="运动时间" value={time} disabled={disabled} onChange={onTime} /></div></section>;
}

function ChecklistItem({ checked, label, fixed = false, disabled = false, onChange }: { checked: boolean; label: string; fixed?: boolean; disabled?: boolean; onChange?: (value: boolean) => void }) {
  if (label !== "本次处方内容由医生确认") return null;
  return <label className={`flex items-start gap-3 rounded-xl border p-4 !text-sm font-bold ${checked ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><input type="checkbox" checked={checked} disabled={fixed || disabled} onChange={(event) => onChange?.(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600" /><span><span className="block">我已完成签署前临床核对</span><span className="mt-1 block !text-xs font-normal leading-5 opacity-80">已核对问诊与临床资料、上一版处方、近期异常及本次处方内容。</span></span></label>;
}

function CompareRow({ values, header = false }: { values: string[]; header?: boolean }) { return <div className={`grid grid-cols-[0.6fr_0.8fr_0.9fr_1.4fr] gap-2 border-b border-slate-100 px-3 py-2.5 last:border-0 ${header ? "bg-slate-50 text-[10px] font-bold text-slate-400" : ""}`}>{values.map((value, index) => <span key={`${value}-${index}`} className={!header && index === 2 ? "font-bold text-blue-700" : !header && index === 3 ? "truncate text-slate-700" : ""}>{value}</span>)}</div>; }
function DiffRow({ label, previous, current }: { label: string; previous: string; current: string }) { const changed = previous !== current; return <div className="grid grid-cols-[0.55fr_1fr_1.35fr_0.45fr] gap-2 border-b border-slate-100 px-3 py-3 last:border-0"><b>{label}</b><span className="text-slate-500">{previous}</span><span className="text-slate-700">{current}</span><StatusBadge tone={changed ? "orange" : "green"}>{changed ? "调整" : "维持"}</StatusBadge></div>; }
function ClinicalValue({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1.5 text-xs font-semibold leading-5 text-slate-700">{value}</p></div>; }
function NarrativeValue({ label, value }: { label: string; value: string }) { return <div><b className="text-[10px] text-slate-400">{label}</b><p className="mt-1 text-xs leading-5 text-slate-600">{value}</p></div>; }
function ReadOnlyField({ label, value }: { label: string; value: string }) { return <div><span className="field-label">{label}</span><div className="text-field flex items-center bg-slate-50 font-semibold text-slate-500">{value}</div></div>; }
function EditField({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) { return <label><span className="field-label !mb-1 !text-xs">{label}</span><input className="text-field !py-2 !text-xs disabled:bg-slate-50" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>; }
function EditArea({ label, value, disabled, placeholder, onChange }: { label: string; value: string; disabled: boolean; placeholder?: string; onChange: (value: string) => void }) { return <label><span className="field-label !mb-1 !text-xs">{label}</span><textarea className="text-field min-h-16 resize-none !py-2 !text-xs leading-5 disabled:bg-slate-50" value={value} disabled={disabled} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, value, disabled, options, onChange }: { label: string; value: string; disabled: boolean; options: string[]; onChange: (value: string) => void }) { return <label><span className="field-label">{label}</span><select className="text-field disabled:bg-slate-50" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function Metric({ label, value, note, tone = "blue" }: { label: string; value: string; note?: string; tone?: "blue" | "orange" | "green" }) { const colors = tone === "orange" ? "bg-amber-50 text-amber-800" : tone === "green" ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-900"; return <div className={`rounded-xl p-4 ${colors}`}><p className="text-[10px] font-bold opacity-60">{label}</p><p className="mt-2 text-lg font-bold leading-6">{value}</p>{note && <p className="mt-1 text-[9px] opacity-60">{note}</p>}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="flex flex-col items-center py-12 text-xs text-slate-400"><FileText className="mb-2 h-6 w-6" />{text}</div>; }
function PrescriptionLine({ title, value }: { title: string; value: string }) { return <div className="mt-4 border-b border-slate-100 pb-3"><p className="font-bold text-slate-950">{title}</p><p className="mt-1">{value}</p></div>; }
