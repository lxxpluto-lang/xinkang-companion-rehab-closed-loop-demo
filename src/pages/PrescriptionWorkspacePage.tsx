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
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import { SectionHeader, StatusBadge } from "../components/UI";
import { singleTrainingReportDetails } from "../clinicalSharedData";
import { getStageReportData } from "../patient/stageReportData";
import type { RehabReport } from "../dischargeHandbookData";
import type { AssessmentRecord } from "../assessmentData";
import type { CardiopulmonaryTreatmentRecord } from "../treatmentData";
import type { FollowUpRecord } from "../followUpData";
import type { PatientClinicalProfile, PrescriptionContent } from "../prescriptionWorkspaceData";
import { createAiDraft, type PrescriptionDraft, type PrescriptionStatus, type PrescriptionTask } from "../clinicalWorkflowData";
import type { StaffRole } from "../types";

export type PrescriptionWorkspaceTab = "profile" | "current" | "history" | "reports" | "rehab";

const tabs: { key: PrescriptionWorkspaceTab; label: string; icon: typeof UserRound }[] = [
  { key: "profile", label: "患者基本信息", icon: UserRound },
  { key: "current", label: "本次处方", icon: PenLine },
  { key: "history", label: "上一版处方", icon: History },
  { key: "reports", label: "训练和阶段性报告", icon: Activity },
  { key: "rehab", label: "康复报告", icon: FileHeart }
];

const statusLabel: Record<PrescriptionStatus, string> = {
  pending_generation: "待生成",
  pending_review: "待复核",
  pending_signature: "待签署",
  completed: "已完成",
  withdrawn: "已撤回"
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

export function PrescriptionWorkspacePage({
  task,
  role,
  accountId,
  profile,
  content,
  rehabReports,
  assessmentRecords,
  treatmentRecords,
  followUpRecords,
  initialTab = "profile",
  onBack,
  onOpenPatient,
  onUpdateTask,
  onSaveContent,
  onSaveRehabReport
}: {
  task: PrescriptionTask;
  role: StaffRole;
  accountId: string;
  profile: PatientClinicalProfile;
  content: PrescriptionContent;
  rehabReports: RehabReport[];
  assessmentRecords: AssessmentRecord[];
  treatmentRecords: CardiopulmonaryTreatmentRecord[];
  followUpRecords: FollowUpRecord[];
  initialTab?: PrescriptionWorkspaceTab;
  onBack: () => void;
  onOpenPatient: (patientId: string, tab?: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<PrescriptionTask>) => void;
  onSaveContent: (taskId: string, content: PrescriptionContent) => void;
  onSaveRehabReport: (report: RehabReport) => void;
}) {
  const [activeTab, setActiveTab] = useState<PrescriptionWorkspaceTab>(initialTab);
  const [draft, setDraft] = useState<PrescriptionContent>(() => cloneContent(content));
  const [finalDraft, setFinalDraft] = useState<PrescriptionDraft | undefined>(task.doctorFinal ?? task.aiSuggestion);
  const [dirty, setDirty] = useState(false);
  const [responsibilityConfirmed, setResponsibilityConfirmed] = useState(false);
  const readonly = task.status === "completed" || task.status === "withdrawn";
  const editable = role === "DOCTOR" && task.assignedDoctorId === accountId && !readonly;
  const canManageRehabReport = role === "DOCTOR" && task.assignedDoctorId === accountId;
  const patientReports = singleTrainingReportDetails.filter((item) => item.patientId === task.patientId);
  const patientRehabReports = rehabReports.filter((item) => item.patientId === task.patientId);

  const tabStatus = useMemo<Record<PrescriptionWorkspaceTab, { text: string; tone: "blue" | "green" | "orange" }>>(() => ({
    profile: { text: profile.diagnosis ? "资料可用" : "资料待补", tone: profile.diagnosis ? "green" : "orange" },
    current: { text: statusLabel[task.status], tone: task.status === "completed" ? "green" : "orange" },
    history: { text: task.previous ? "可核对" : "首次处方", tone: task.previous ? "orange" : "blue" },
    reports: { text: patientReports.length ? `${patientReports.length}条记录` : "暂无记录", tone: patientReports.length ? "green" : "orange" },
    rehab: { text: patientRehabReports.some((item) => item.status === "published") ? "已发布" : "待生成", tone: patientRehabReports.some((item) => item.status === "published") ? "green" : "orange" }
  }), [patientRehabReports, patientReports.length, profile.diagnosis, task.previous, task.status]);

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
    const ai = createAiDraft(task);
    setFinalDraft(ai);
    const stageReport = getStageReportData(task.patientId);
    onUpdateTask(task.id, {
      aiSuggestion: ai,
      aiSuggestionMeta: {
        suggestionId: `AI-PRESCRIPTION-${task.id}-${Date.now()}`,
        patientId: task.patientId,
        type: "PRESCRIPTION",
        sourceRecordIds: stageReport?.sessions.map((item) => item.id) ?? [],
        missingFields: stageReport ? [] : ["患者阶段性报告"],
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
    saveWorkspace();
    onUpdateTask(task.id, { doctorFinal: finalDraft, status: task.status === "pending_signature" ? "completed" : "pending_signature", updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }) });
  }

  return (
    <section className="space-y-4 pb-24" data-testid="page-PRESCRIPTION-WORKSPACE">
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <button type="button" onClick={onBack} className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="返回处方列表"><ArrowLeft className="h-5 w-5" /></button>
            <div><p className="text-xs font-bold tracking-wide text-blue-600">处方管理 · 患者开方工作区</p><h1 className="mt-1 text-2xl font-bold text-slate-950">患者处方详情</h1><p className="mt-1 text-sm text-slate-500">{task.kind === "initial" ? "初始处方" : "调整处方"} · {task.prescriptionNo} · {task.version}</p></div>
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
      {activeTab === "current" && <CurrentPrescriptionTab task={task} content={draft} finalDraft={finalDraft} editable={editable} responsibilityConfirmed={responsibilityConfirmed} onResponsibilityConfirmed={setResponsibilityConfirmed} onGenerate={generateAiDraft} onDraftChange={setFinalDraft} onContentChange={changeContent} onSave={saveWorkspace} onConfirm={confirmPrescription} />}
      {activeTab === "history" && <HistoryTab task={task} finalDraft={finalDraft} />}
      {activeTab === "reports" && <ReportsTab task={task} reports={patientReports} onOpenPatient={onOpenPatient} />}
      {activeTab === "rehab" && <RehabTab task={task} profile={profile} content={draft} reports={patientRehabReports} assessments={assessmentRecords.filter((item) => item.patientId === task.patientId && item.status === "completed")} treatments={treatmentRecords.filter((item) => item.patientId === task.patientId && item.status !== "draft")} followUps={followUpRecords.filter((item) => item.patientId === task.patientId)} canManage={canManageRehabReport} onOpenPatient={onOpenPatient} onSave={onSaveRehabReport} />}

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

function CurrentPrescriptionTab({ task, content, finalDraft, editable, responsibilityConfirmed, onResponsibilityConfirmed, onGenerate, onDraftChange, onContentChange, onSave, onConfirm }: { task: PrescriptionTask; content: PrescriptionContent; finalDraft?: PrescriptionDraft; editable: boolean; responsibilityConfirmed: boolean; onResponsibilityConfirmed: (value: boolean) => void; onGenerate: () => void; onDraftChange: (draft: PrescriptionDraft) => void; onContentChange: <K extends keyof PrescriptionContent>(key: K, value: PrescriptionContent[K]) => void; onSave: () => void; onConfirm: () => void }) {
  const ai = task.aiSuggestion;
  const [drawer, setDrawer] = useState<"evidence" | "comparison" | null>(null);
  return <div className="space-y-4">
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-600 p-2.5 text-white"><Sparkles className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-blue-950">AI 辅助处方草稿</h2><p className="mt-1 text-sm leading-5 text-blue-800">AI只生成建议草稿；事实、诊断、最终参数和签署结果均由医生确认。</p></div></div><div className="flex gap-2">{task.aiSuggestionMeta && <button type="button" className="btn-secondary" onClick={() => setDrawer("evidence")}><FileText className="h-4 w-4" />生成依据</button>}{ai && finalDraft && <button type="button" className="btn-secondary" onClick={() => setDrawer("comparison")}><History className="h-4 w-4" />三值对比</button>}{!ai && editable && <button type="button" className="btn-primary" onClick={onGenerate}><Bot className="h-4 w-4" />生成 AI 建议</button>}</div></div></section>
    <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><SectionHeader title="心脏康复中心运动处方" description="医生最终签署值以本区域内容为准。" action={<span className="text-[10px] text-slate-400">{task.prescriptionNo}</span>} />{task.status === "completed" && <button type="button" className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" />打印</button>}</div><div className="space-y-3 bg-slate-50/60 p-5"><PrescriptionRow title="呼吸训练" modes={content.breathingModes} intensity={content.breathingIntensity} frequency={content.breathingFrequency} time={content.breathingTime} editable={editable} onModes={(value) => onContentChange("breathingModes", value)} onIntensity={(value) => onContentChange("breathingIntensity", value)} onFrequency={(value) => onContentChange("breathingFrequency", value)} onTime={(value) => onContentChange("breathingTime", value)} /><PrescriptionRow title="热身运动" modes={content.warmupModes} intensity="低强度，逐步提升心率" frequency={content.warmupFrequency} time={content.warmupTime} editable={editable} onModes={(value) => onContentChange("warmupModes", value)} onIntensity={() => undefined} onFrequency={(value) => onContentChange("warmupFrequency", value)} onTime={(value) => onContentChange("warmupTime", value)} /><PrescriptionRow title="有氧运动" modes={content.aerobicModes} intensity={content.aerobicIntensity} frequency={content.aerobicFrequency} time={content.aerobicTime} editable={editable} onModes={(value) => onContentChange("aerobicModes", value)} onIntensity={(value) => onContentChange("aerobicIntensity", value)} onFrequency={(value) => onContentChange("aerobicFrequency", value)} onTime={(value) => onContentChange("aerobicTime", value)} /><PrescriptionRow title="抗阻训练" modes={content.resistanceModes} intensity={content.resistanceIntensity} frequency={content.resistanceFrequency} time={content.resistanceTime} editable={editable} onModes={(value) => onContentChange("resistanceModes", value)} onIntensity={(value) => onContentChange("resistanceIntensity", value)} onFrequency={(value) => onContentChange("resistanceFrequency", value)} onTime={(value) => onContentChange("resistanceTime", value)} /><PrescriptionRow title="柔韧性训练" modes={content.flexibilityModes} intensity={content.flexibilityIntensity} frequency={content.flexibilityFrequency} time={content.flexibilityTime} editable={editable} onModes={(value) => onContentChange("flexibilityModes", value)} onIntensity={(value) => onContentChange("flexibilityIntensity", value)} onFrequency={(value) => onContentChange("flexibilityFrequency", value)} onTime={(value) => onContentChange("flexibilityTime", value)} /><label className="block"><span className="field-label">备注与患者注意事项</span><textarea className="text-field min-h-24" disabled={!editable} value={content.remark} onChange={(event) => onContentChange("remark", event.target.value)} /></label></div></section>
    {editable && finalDraft && <section className="card p-5"><SectionHeader title="签署前责任确认" description="医生确认患者身份、报告来源、异常事件和最终处方参数后方可进入签署。" /><label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><input type="checkbox" checked={responsibilityConfirmed} onChange={(event) => onResponsibilityConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" /><span><b>我已完成处方内容人工复核</b><span className="mt-1 block leading-5">AI内容仅为辅助草稿，最终参数由本人确认并承担签署责任。</span></span></label><div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onSave}><Save className="h-4 w-4" />保存最终值</button><button type="button" className="btn-primary" disabled={!responsibilityConfirmed} onClick={onConfirm}><BadgeCheck className="h-4 w-4" />{task.status === "pending_signature" ? "签署并发布" : "确认处方内容"}</button></div></section>}
    {!editable && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">当前账号仅可查看。只有该处方所属医生可以生成、编辑、确认和签署。</p>}
    {drawer && <div className="fixed inset-0 z-50 bg-slate-950/35" onClick={() => setDrawer(null)}><aside className="ml-auto h-full w-full max-w-4xl overflow-y-auto bg-slate-50 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-start justify-between"><div><p className="eyebrow">处方辅助信息</p><h2 className="mt-1 text-xl font-bold text-slate-950">{drawer === "comparison" ? "上一版、AI建议与医生最终值" : "AI建议生成依据"}</h2><p className="mt-2 text-sm text-slate-500">辅助信息不占用主编辑区，关闭后继续填写本次处方。</p></div><button type="button" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500" onClick={() => setDrawer(null)} aria-label="关闭抽屉"><X className="h-5 w-5" /></button></div>{drawer === "comparison" && ai && finalDraft ? <Comparison previous={task.previous} ai={ai} finalDraft={finalDraft} editable={editable} onChange={onDraftChange} /> : <section className="card p-5"><SectionHeader title="引用记录与缺失字段" description="AI建议只引用当前患者已经存在的记录。" /><div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">引用记录</p><p className="mt-2 text-sm leading-7 text-slate-700">{task.aiSuggestionMeta?.sourceRecordIds.join("；") || "暂无可追溯记录"}</p></div><div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-4"><p className="text-xs font-bold text-amber-800">缺失字段</p><p className="mt-2 text-sm leading-7 text-amber-900">{task.aiSuggestionMeta?.missingFields.length ? task.aiSuggestionMeta.missingFields.join("、") : "当前引用范围内未标记缺失字段"}</p></div><p className="mt-4 text-xs leading-6 text-slate-500">上述信息只用于辅助医生判断，不能自动改变诊断、风险等级、正式处方或签署状态。</p></section>}</aside></div>}
  </div>;
}

function Comparison({ previous, ai, finalDraft, editable, onChange }: { previous?: PrescriptionDraft; ai: PrescriptionDraft; finalDraft: PrescriptionDraft; editable: boolean; onChange: (draft: PrescriptionDraft) => void }) {
  return <section className="card overflow-hidden"><div className="border-b p-5"><SectionHeader title="参数差异（三值对比）" description="上一版用于追溯，AI建议为辅助快照，医生最终值才是签署内容。" /></div><div className="grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0"><DraftColumn title="上一版" draft={previous} /><DraftColumn title="AI建议" draft={ai} accent /><div className="p-5"><h3 className="text-xs font-bold text-slate-800">医生最终值</h3><textarea className="text-field mt-3 min-h-20" disabled={!editable} value={finalDraft.summary} onChange={(event) => onChange({ ...finalDraft, summary: event.target.value })} />{finalDraft.items.map((item, index) => <div key={`${item.category}-${index}`} className="mt-3 rounded-xl border border-slate-200 p-3"><b className="text-xs">{item.category}</b><input className="text-field mt-2" disabled={!editable} value={item.project} onChange={(event) => onChange({ ...finalDraft, items: finalDraft.items.map((row, rowIndex) => rowIndex === index ? { ...row, project: event.target.value } : row) })} /><p className="mt-2 text-[10px] leading-5 text-slate-500">{item.intensity}｜{item.duration}｜{item.frequency}</p></div>)}</div></div></section>;
}

function DraftColumn({ title, draft, accent = false }: { title: string; draft?: PrescriptionDraft; accent?: boolean }) {
  return <div className={`p-5 ${accent ? "bg-blue-50/70" : ""}`}><h3 className="text-xs font-bold text-slate-800">{title}</h3>{!draft ? <p className="mt-4 text-xs text-slate-400">暂无上一版处方</p> : <><p className="mt-3 text-xs leading-6 text-slate-600">{draft.summary}</p>{draft.items.map((item) => <div key={item.category} className="mt-3"><b className="text-xs text-slate-800">{item.category} · {item.project}</b><p className="mt-1 text-[10px] leading-5 text-slate-500">{item.intensity}｜{item.duration}｜{item.frequency}<br />理由：{item.reason}</p></div>)}</>}</div>;
}

function PrescriptionRow({ title, modes, intensity, frequency, time, editable, onModes, onIntensity, onFrequency, onTime }: { title: string; modes: string[]; intensity: string; frequency: string; time: string; editable: boolean; onModes: (value: string[]) => void; onIntensity: (value: string) => void; onFrequency: (value: string) => void; onTime: (value: string) => void }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-3"><div className="grid items-end gap-3 xl:grid-cols-[120px_1.15fr_1.15fr_0.65fr_0.65fr]"><div className="flex h-10 items-center gap-2"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Activity className="h-4 w-4" /></span><b className="text-sm">{title}</b></div><label><span className="field-label">运动方式</span><input className="text-field" disabled={!editable} value={modes.join("、")} onChange={(event) => onModes(event.target.value.split(/[、,，]/).filter(Boolean))} /></label><label><span className="field-label">运动强度</span><input className="text-field" disabled={!editable || title === "热身运动"} value={intensity} onChange={(event) => onIntensity(event.target.value)} /></label><label><span className="field-label">频率</span><input className="text-field" disabled={!editable} value={frequency} onChange={(event) => onFrequency(event.target.value)} /></label><label><span className="field-label">时间</span><input className="text-field" disabled={!editable} value={time} onChange={(event) => onTime(event.target.value)} /></label></div></section>;
}

function HistoryTab({ task, finalDraft }: { task: PrescriptionTask; finalDraft?: PrescriptionDraft }) {
  return <section className="card overflow-hidden"><div className="border-b px-5 py-4"><SectionHeader title="上一版与当前处方对照" description="上一版只读，当前版本不覆盖历史；签署后形成新的处方版本。" /></div><div className="grid gap-4 p-5 lg:grid-cols-2"><VersionCard title="上一版处方" version={task.previous ? `${task.version} 前一版` : "—"} draft={task.previous} /><VersionCard title="本次处方" version={task.version} draft={finalDraft ?? task.aiSuggestion} current /></div></section>;
}

function VersionCard({ title, version, draft, current = false }: { title: string; version: string; draft?: PrescriptionDraft; current?: boolean }) {
  return <article className={`rounded-2xl border p-5 ${current ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold text-slate-400">{title}</p><h3 className="mt-1 text-lg font-bold">{version}</h3></div><StatusBadge tone={current ? "blue" : "green"}>{current ? "当前编辑版本" : "历史只读"}</StatusBadge></div>{draft ? <><p className="mt-4 text-xs leading-6 text-slate-600">{draft.summary}</p><div className="mt-4 space-y-2">{draft.items.map((item) => <div key={item.category} className="rounded-xl bg-white p-3"><b className="text-xs">{item.category} · {item.project}</b><p className="mt-1 text-[10px] text-slate-500">{item.intensity}｜{item.duration}｜{item.frequency}</p></div>)}</div></> : <p className="mt-8 text-center text-xs text-slate-400">首次处方，无上一版数据</p>}</article>;
}

function ReportsTab({ task, reports, onOpenPatient }: { task: PrescriptionTask; reports: typeof singleTrainingReportDetails; onOpenPatient: (patientId: string, tab?: string) => void }) {
  const stageReport = getStageReportData(task.patientId);
  const activeMinutes = stageReport?.sessions.reduce((sum, item) => sum + item.activeMinutes, 0) ?? 0;
  return <section className="card overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4"><SectionHeader title="训练记录和阶段性报告" description="只展示当前患者已关联的数据；所有摘要均可追溯到原始记录。" /><button type="button" className="btn-secondary" onClick={() => onOpenPatient(task.patientId, "sessions")}><ClipboardList className="h-4 w-4" />查看患者全部记录</button></div><div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]"><div><div className="mb-3 flex items-center justify-between"><b className="text-sm">单次训练记录</b><span className="text-xs text-slate-400">共 {reports.length} 条</span></div><div className="space-y-2">{reports.slice(0, 5).map((report) => <article key={report.id} className="grid grid-cols-[1fr_0.7fr_0.7fr_0.8fr] items-center rounded-xl border border-slate-200 p-3 text-xs"><span><b>{report.exercise}</b><span className="mt-1 block text-xs text-slate-400">{report.actualStartAt.slice(0, 16).replace("T", " ")}</span></span><span>{report.totalMinutes}分钟</span><span>HR {report.hrStats.average}/{report.hrStats.peak}</span><span className={report.safetySummary === "无异常" ? "text-emerald-600" : "font-bold text-amber-700"}>{report.safetySummary}</span></article>)}{!reports.length && <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-400">暂无该患者训练记录</p>}</div></div>{stageReport ? <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><p className="text-xs font-bold text-blue-600">阶段性报告 · {stageReport.reportPeriod.start} 至 {stageReport.reportPeriod.end}</p><h3 className="mt-2 text-lg font-bold text-slate-950">阶段康复摘要</h3><div className="mt-4 grid grid-cols-2 gap-3"><Metric label="纳入训练" value={`${stageReport.sessions.length}次`} /><Metric label="实际运动" value={`${activeMinutes}分钟`} /><Metric label="异常记录" value={`${stageReport.safetyEvents.length}次`} /><Metric label="数据来源" value={`${stageReport.sessions.length}条记录`} /></div><p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">{stageReport.clinicalConclusion.summary}</p><StatusBadge tone="blue">{task.sourceLabel === "阶段性报告" ? "本次处方依据" : "可供复核"}</StatusBadge></div> : <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><FileText className="h-9 w-9 text-slate-300" /><h3 className="mt-3 text-base font-bold text-slate-700">暂无该患者阶段报告</h3><p className="mt-2 text-sm text-slate-500">系统不会借用其他患者的Demo报告。</p></div>}</div></section>;
}

function RehabTab({ task, profile, content, reports, assessments, treatments, followUps, canManage, onOpenPatient, onSave }: { task: PrescriptionTask; profile: PatientClinicalProfile; content: PrescriptionContent; reports: RehabReport[]; assessments: AssessmentRecord[]; treatments: CardiopulmonaryTreatmentRecord[]; followUps: FollowUpRecord[]; canManage: boolean; onOpenPatient: (patientId: string, tab?: string) => void; onSave: (report: RehabReport) => void }) {
  const latest = [...reports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
  const [draft, setDraft] = useState<RehabReport | null>(latest ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const trainingReports = singleTrainingReportDetails.filter((item) => item.patientId === task.patientId);
  const stageReport = getStageReportData(task.patientId);
  const locked = draft?.status === "published";

  function generate() {
    if (!canManage) return;
    const now = new Date().toISOString();
    const prescription = task.doctorFinal ?? task.aiSuggestion;
    const missingFields = [!assessments.length && "已确认体能评估", !treatments.length && "已完成治疗记录", !trainingReports.length && "单次训练报告", !stageReport && "阶段性报告", !followUps.length && "已完成随访记录"].filter(Boolean) as string[];
    const sourceRefs = [`处方:${task.id}`, ...assessments.map((item) => `评估:${item.assessmentId}`), ...treatments.map((item) => `治疗:${item.treatmentId}`), ...trainingReports.map((item) => `训练:${item.id}`), ...(stageReport ? [`阶段报告:${stageReport.reportPeriod.generatedAt}`] : []), ...followUps.map((item) => `随访:${item.recordId}`)];
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
    {!draft ? <section className="card p-10 text-center"><FileHeart className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 text-base font-bold">尚未生成康复报告</h3><p className="mt-2 text-sm text-slate-500">责任医生可基于当前患者已有记录生成最小报告草稿。</p></section> : <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><SectionHeader title={`康复报告 V${draft.version ?? 1}`} description={`生成时间：${draft.generatedAt}`} /><StatusBadge tone={draft.status === "published" ? "green" : draft.status === "doctor_confirmed" ? "blue" : "orange"}>{stateLabel}</StatusBadge></div><div className="space-y-5 p-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><b className="text-sm">生成依据</b><p className="mt-2 text-xs leading-6 text-slate-600">{draft.sourceRefs.join("；") || "未采集"}</p>{Boolean(draft.missingFields?.length) && <p className="mt-2 text-xs font-semibold text-amber-700">缺失字段：{draft.missingFields?.join("、")}</p>}</div>
      <div className="grid gap-4 lg:grid-cols-2"><ReportField label="诊断摘要" value={draft.medicalSection.clinicalConclusion} disabled={locked || !canManage} onChange={(value) => updateSection("medicalSection", "clinicalConclusion", value)} /><ReportField label="体能评估摘要" value={draft.rehabSection.assessmentSummary} disabled={locked || !canManage} onChange={(value) => updateSection("rehabSection", "assessmentSummary", value)} /><ReportField label="实际治疗情况" value={draft.medicalSection.treatmentCourse} disabled={locked || !canManage} onChange={(value) => updateSection("medicalSection", "treatmentCourse", value)} /><ReportField label="实际训练情况" value={draft.rehabSection.trainingSummary} disabled={locked || !canManage} onChange={(value) => updateSection("rehabSection", "trainingSummary", value)} /><ReportField label="阶段变化总结" value={draft.rehabSection.improvementSummary} disabled={locked || !canManage} onChange={(value) => updateSection("rehabSection", "improvementSummary", value)} /></div>
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="mb-3 flex items-center gap-2"><Award className="h-5 w-5 text-emerald-600" /><b className="text-sm text-emerald-950">患者手册开篇文案</b></div><div className="grid gap-3 md:grid-cols-2"><ReportInput label="问候语" value={draft.patientNarrative?.greeting ?? `${profile.name}，你好！`} disabled={locked || !canManage} onChange={(value) => setDraft({ ...draft, patientNarrative: { ...(draft.patientNarrative ?? { admissionDate: "", dischargeDate: "", completedTrainingCount: 0, celebrationMessage: "" }), greeting: value } })} /><ReportInput label="完成训练次数" type="number" value={String(draft.patientNarrative?.completedTrainingCount ?? 0)} disabled={locked || !canManage} onChange={(value) => setDraft({ ...draft, patientNarrative: { ...(draft.patientNarrative ?? { greeting: `${profile.name}，你好！`, admissionDate: "", dischargeDate: "", celebrationMessage: "" }), completedTrainingCount: Number(value) || 0 } })} /><ReportInput label="入院/开始康复日期" type="date" value={draft.patientNarrative?.admissionDate ?? ""} disabled={locked || !canManage} onChange={(value) => setDraft({ ...draft, admissionDate: value, patientNarrative: { ...(draft.patientNarrative ?? { greeting: `${profile.name}，你好！`, dischargeDate: "", completedTrainingCount: 0, celebrationMessage: "" }), admissionDate: value } })} /><ReportInput label="出院/完成日期" type="date" value={draft.patientNarrative?.dischargeDate ?? ""} disabled={locked || !canManage} onChange={(value) => setDraft({ ...draft, dischargeDate: value, patientNarrative: { ...(draft.patientNarrative ?? { greeting: `${profile.name}，你好！`, admissionDate: "", completedTrainingCount: 0, celebrationMessage: "" }), dischargeDate: value } })} /></div><label className="mt-3 block"><span className="field-label">祝贺与鼓励语</span><textarea className="text-field min-h-20 py-3 disabled:bg-white/70" disabled={locked || !canManage} value={draft.patientNarrative?.celebrationMessage ?? ""} onChange={(event) => setDraft({ ...draft, patientNarrative: { ...(draft.patientNarrative ?? { greeting: `${profile.name}，你好！`, admissionDate: "", dischargeDate: "", completedTrainingCount: 0 }), celebrationMessage: event.target.value } })} /></label></section>
      <label><span className="field-label">运动、饮食、用药、停止条件与复查建议</span><textarea className="text-field min-h-40 py-3 disabled:bg-slate-50" disabled={locked || !canManage} value={draft.recommendationDraft} onChange={(event) => setDraft({ ...draft, recommendationDraft: event.target.value })} /></label>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div><b className="text-sm text-slate-900">患者端图文手册预览</b><p className="mt-1 text-xs leading-5 text-slate-500">图文版只用于患者阅读和打印预览，医生编辑区保持结构化文书形式。</p></div><button type="button" className="btn-secondary" onClick={() => setPreviewOpen(true)}><FileHeart className="h-4 w-4" />打开患者端预览</button></section>
      <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4"><button type="button" className="btn-secondary" onClick={() => onOpenPatient(task.patientId, "rehabReport")}><FileText className="h-4 w-4" />患者档案中的报告版本</button>{canManage && !locked && <div className="flex gap-2"><button type="button" className="btn-secondary" onClick={() => persist("draft")}><Save className="h-4 w-4" />保存草稿</button>{draft.status === "draft" && <button type="button" className="btn-secondary" onClick={() => persist("doctor_confirmed")}><BadgeCheck className="h-4 w-4" />医生确认</button>}{draft.status === "doctor_confirmed" && <button type="button" className="btn-primary" onClick={() => persist("published")}><ArrowRight className="h-4 w-4" />发送患者端</button>}</div>}</div>
    </div></section>}
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
