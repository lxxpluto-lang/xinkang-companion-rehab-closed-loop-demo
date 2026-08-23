import { useMemo, useState } from "react";
import { Activity, ArrowLeft, ArrowRight, ClipboardCheck, FileBarChart, FileText, History, Search, Sparkles, Stethoscope, Trash2, UserRound } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { PatientClinicalProfile } from "../prescriptionWorkspaceData";
import type { CardiopulmonaryTreatmentRecord } from "../treatmentData";
import type { PrescriptionTask } from "../clinicalWorkflowData";
import type { StaffRole } from "../types";
import { createBlankTreatment, type ManagedPatient, SingleReportCard, TreatmentRecordPage } from "./PatientArchivePage";
import { displayClinicalMetric, type StoredSingleReport, type StoredStageReport } from "../reportData";
import type { TrainingEncounter } from "../trainingEncounterData";

type TreatmentTab = "profile" | "current" | "previous" | "prescription" | "single" | "stage";

const treatmentTabs: { key: TreatmentTab; label: string; icon: typeof UserRound }[] = [
  { key: "profile", label: "患者基本信息", icon: UserRound },
  { key: "current", label: "本次治疗记录", icon: Stethoscope },
  { key: "previous", label: "上一次治疗记录", icon: History },
  { key: "prescription", label: "处方管理（只读）", icon: ClipboardCheck },
  { key: "single", label: "单次训练报告", icon: FileText },
  { key: "stage", label: "阶段性报告", icon: FileBarChart }
];

export function TreatmentManagementPage({ role, currentAccount, patients, profiles, treatmentRecords, prescriptionTasks, encounters = [], singleReports = [], stageReports = [], initialStatus = "all", initialPatientId, initialRecordId, onOpenRecord, onBackToList, onSave, onDelete, onAdvanceToDevice, onPaperArchive, onOpenStageReport }: {
  role: StaffRole;
  currentAccount: string;
  patients: ManagedPatient[];
  profiles: PatientClinicalProfile[];
  treatmentRecords: CardiopulmonaryTreatmentRecord[];
  prescriptionTasks: PrescriptionTask[];
  encounters?: TrainingEncounter[];
  singleReports?: StoredSingleReport[];
  stageReports?: StoredStageReport[];
  initialStatus?: "all" | "unfinished";
  initialPatientId?: string | null;
  initialRecordId?: string | null;
  onOpenRecord: (patientId: string, recordId?: string) => void;
  onBackToList: () => void;
  onSave: (record: CardiopulmonaryTreatmentRecord) => void;
  onDelete: (recordIds: string[]) => void;
  onAdvanceToDevice?: (record: CardiopulmonaryTreatmentRecord) => void;
  onPaperArchive?: (record: CardiopulmonaryTreatmentRecord) => void;
  onOpenStageReport?: (patientId: string) => void;
}) {
  const patientId = initialPatientId ?? patients[0]?.patient_demo_id ?? "";
  const selectedPatient = patients.find((item) => item.patient_demo_id === patientId) ?? patients[0];
  const profile = profiles.find((item) => item.patientId === selectedPatient?.patient_demo_id);
  const allPatientTreatments = useMemo(() => treatmentRecords.filter((item) => item.patientId === patientId).sort((a, b) => b.treatmentAt.localeCompare(a.treatmentAt)), [patientId, treatmentRecords]);
  const prescription = prescriptionTasks.find((item) => item.patientId === patientId && item.status === "completed") ?? prescriptionTasks.find((item) => item.patientId === patientId);
  const stageReport = stageReports.find((item) => item.patientId === patientId && item.status === "sent") ?? stageReports.find((item) => item.patientId === patientId);
  const [activeTab, setActiveTab] = useState<TreatmentTab>("current");
  const [currentDraft, setCurrentDraft] = useState<CardiopulmonaryTreatmentRecord>(() => treatmentRecords.find((item) => item.treatmentId === initialRecordId) ?? (selectedPatient ? createBlankTreatment(selectedPatient, currentAccount) : treatmentRecords[0]));
  const linkedEncounter = encounters.find((item) => item.encounterId === currentDraft?.encounterId || item.treatmentId === currentDraft?.treatmentId);
  const encounter = linkedEncounter && currentDraft?.status === "completed" && linkedEncounter.status !== "completed"
    ? { ...linkedEncounter, status: "completed" as const }
    : linkedEncounter;
  const [generatedFromStage, setGeneratedFromStage] = useState(false);
  const patientTreatments = allPatientTreatments.filter((item) => item.treatmentId !== currentDraft?.treatmentId);

  if (!initialPatientId) return <TreatmentTaskList role={role} currentAccount={currentAccount} patients={patients} treatmentRecords={treatmentRecords} initialStatus={initialStatus} onOpen={onOpenRecord} onDelete={onDelete} />;

  if (!selectedPatient || !currentDraft) return <section className="card p-10 text-center text-sm text-slate-500">暂无可用于治疗记录的患者。</section>;

  function generateFromStageReport() {
    if (!stageReport) return;
    const next = createBlankTreatment(selectedPatient, currentAccount);
    next.prescriptionVersionId = prescription?.version;
    next.diagnosis = profile?.diagnosis ?? selectedPatient.diagnosis_summary;
    next.specialMedications = profile?.specialMedications ?? selectedPatient.current_medications;
    next.aiAdvice = {
      suggestionId: `AI-TREATMENT-${selectedPatient.patient_demo_id}-${Date.now()}`,
      patientId: selectedPatient.patient_demo_id,
      type: "TREATMENT_ADVICE",
      sourceRecordIds: stageReport.selectedSessionIds,
      missingFields: ["本次训练前生命体征", "本次实际训练项目", "本次训练后生命体征", "Borg评分"],
      content: stageReport.clinicalConclusion.nextPrescription,
      status: "DRAFT",
      generatedAt: new Date().toISOString()
    };
    setCurrentDraft(next);
    setGeneratedFromStage(true);
  }

  const tabState: Record<TreatmentTab, string> = {
    profile: profile ? "资料可用" : "资料待补",
    current: currentDraft.status === "completed" ? "已签署锁定" : generatedFromStage ? "AI建议待核对" : role === "DOCTOR" ? "只读查看 · 待康复师补充" : "可编辑",
    previous: patientTreatments.length ? `${patientTreatments.length}条历史` : "暂无记录",
    prescription: prescription ? `${prescription.version} · 只读` : "未获取",
    single: singleReports.filter((item) => item.patientId === patientId).length ? `${singleReports.filter((item) => item.patientId === patientId).length}份报告` : "暂无报告",
    stage: stageReport ? "报告可用" : "暂无报告"
  };

  return <section className="space-y-4 pb-10" data-testid="page-TREATMENT-MANAGEMENT">
    <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3"><button type="button" aria-label="返回治疗记录列表" className="btn-secondary !px-3" onClick={onBackToList}><ArrowLeft className="h-4 w-4" /></button><div><p className="text-xs font-bold text-blue-600">治疗管理 · {role === "DOCTOR" ? "医生查阅工作区" : "康复师治疗工作区"}</p><h1 className="mt-1 text-2xl font-bold text-slate-950">本次心肺康复治疗</h1><p className="mt-1 text-sm text-slate-500">{role === "DOCTOR" ? "医生只读查看康复师填写的事实记录；待补充内容不会计为医生待办。" : "已直接定位“本次治疗记录”；阶段报告只生成下一阶段治疗建议。"}</p></div></div>
      </div>
      <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-6">
        <Summary label="患者" value={`${selectedPatient.name} · ${selectedPatient.gender} · ${selectedPatient.age}岁`} />
        <Summary label="患者编号" value={selectedPatient.patient_no} />
        <Summary label="康复阶段" value={selectedPatient.rehab_stage} />
        <Summary label="患者状态" value={patientStatusLabel(selectedPatient.patient_status)} />
        <Summary label="当前处方" value={prescription ? `${prescription.prescriptionNo} · ${prescription.version}` : "未获取"} />
        <Summary label="本次记录" value={currentDraft.status === "completed" ? "已签署并锁定" : generatedFromStage ? "AI建议待核对，事实字段仍为空" : role === "DOCTOR" ? "待康复师补充" : "待填写"} accent={generatedFromStage} />
      </div>
    </header>

    <nav className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm md:grid-cols-2 xl:grid-cols-6" aria-label={role === "DOCTOR" ? "医生治疗查阅工作区栏目" : "康复师治疗工作区栏目"}>
      {treatmentTabs.map(({ key, label, icon: Icon }, index) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex min-h-16 items-center gap-3 rounded-xl px-3 text-left transition ${activeTab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${activeTab === key ? "bg-white/15" : "bg-slate-100"}`}><Icon className="h-4 w-4" /></span><span><span className="block text-sm font-bold">{index + 1}. {label}</span><span className={`mt-1 block text-xs font-semibold ${activeTab === key ? "text-blue-100" : key === "current" ? "text-blue-600" : "text-slate-400"}`}>{tabState[key]}</span></span></button>)}
    </nav>

    {activeTab === "profile" && <ProfilePanel patient={selectedPatient} profile={profile} />}
    {activeTab === "current" && <div className="space-y-4"><section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-600 p-2.5 text-white"><Sparkles className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-blue-950">AI辅助核对治疗记录</h2><p className="mt-1 text-sm text-blue-800">AI只提示缺失项并生成总结草稿；生命体征、实际项目、Borg和处置仍由设备或康复师记录。</p></div></div>{role === "DOCTOR" ? <span className="inline-flex min-h-10 items-center rounded-lg bg-white px-3 text-xs font-semibold text-slate-500">医生只读查看</span> : <button type="button" className="btn-primary" disabled={!stageReport} onClick={generateFromStageReport}><Sparkles className="h-4 w-4" />{stageReport ? "引用阶段报告" : "暂无阶段报告"}</button>}</section>{currentDraft.aiAdvice && <AiAdvicePanel advice={currentDraft.aiAdvice} onConfirm={() => setCurrentDraft({ ...currentDraft, aiAdvice: { ...currentDraft.aiAdvice!, status: "CONFIRMED", confirmedBy: currentAccount } })} />}<TreatmentRecordPage key={`${currentDraft.treatmentId}-${currentDraft.aiAdvice?.status ?? "NO_AI"}-${encounter?.status ?? "NO_ENCOUNTER"}`} patient={selectedPatient} record={currentDraft} encounter={encounter} role={role} embedded onBack={() => undefined} onSave={(record) => { setCurrentDraft(record); onSave(record); }} onAdvanceToDevice={onAdvanceToDevice} onPaperArchive={(record) => { setCurrentDraft(record); onPaperArchive?.(record); }} onCorrect={setCurrentDraft} /></div>}
    {activeTab === "previous" && <PreviousTreatmentPanel patient={selectedPatient} record={patientTreatments[0]} role={role} onSave={onSave} />}
    {activeTab === "prescription" && <PrescriptionReadonlyPanel prescription={prescription} />}
    {activeTab === "single" && <SingleTrainingReportsPanel patientId={patientId} reports={singleReports} />}
    {activeTab === "stage" && <StageReportPanel patientId={patientId} reports={stageReports} onOpen={onOpenStageReport} />}
  </section>;
}

function TreatmentTaskList({ role, currentAccount, patients, treatmentRecords, initialStatus, onOpen, onDelete }: {
  role: StaffRole;
  currentAccount: string;
  patients: ManagedPatient[];
  treatmentRecords: CardiopulmonaryTreatmentRecord[];
  initialStatus: "all" | "unfinished";
  onOpen: (patientId: string, recordId?: string) => void;
  onDelete: (recordIds: string[]) => void;
}) {
  const [patientKeyword, setPatientKeyword] = useState("");
  const [therapist, setTherapist] = useState(role === "REHAB_EXECUTION" ? currentAccount : "all");
  const [status, setStatus] = useState<"all" | "unfinished" | "completed">(initialStatus);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const patientMap = new Map(patients.map((patient) => [patient.patient_demo_id, patient]));
  const filtered = treatmentRecords.filter((record) => {
    const patient = patientMap.get(record.patientId);
    const keyword = patientKeyword.trim().toLowerCase();
    if (role === "REHAB_EXECUTION" && record.therapist !== currentAccount) return false;
    if (therapist !== "all" && record.therapist !== therapist) return false;
    if (keyword && !`${patient?.name ?? ""} ${record.patientNo} ${record.treatmentNo}`.toLowerCase().includes(keyword)) return false;
    if (status === "unfinished") return record.status === "draft" || !record.signature;
    if (status === "completed") return record.status === "completed" && Boolean(record.signature);
    return true;
  }).sort((a, b) => b.treatmentAt.localeCompare(a.treatmentAt));
  const unfinishedCount = treatmentRecords.filter((record) => (role !== "REHAB_EXECUTION" || record.therapist === currentAccount) && (record.status === "draft" || !record.signature)).length;
  const completedCount = treatmentRecords.filter((record) => (role !== "REHAB_EXECUTION" || record.therapist === currentAccount) && record.status === "completed" && record.signature).length;

  function reset() {
    setPatientKeyword("");
    setTherapist(role === "REHAB_EXECUTION" ? currentAccount : "all");
    setStatus("all");
  }

  return <section data-testid="page-TREATMENT-MANAGEMENT-LIST">
    <PageHeader eyebrow="治疗管理" title={role === "REHAB_EXECUTION" ? "我的治疗记录" : role === "DOCTOR" ? "治疗记录查阅台" : "治疗记录总台"} description={role === "DOCTOR" ? "医生只读查看康复师填写和签署的治疗事实；待补充记录不属于医生可处理任务。" : "工作台跳转会自动筛选本人未完成记录；点击患者直接进入本次治疗记录。"} action={<span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"><Stethoscope className="h-4 w-4 text-blue-600" />{role === "DOCTOR" ? "待康复师补充" : "未完成"} {unfinishedCount} · 已完成 {completedCount}</span>} />
    <section className="card overflow-hidden">
      <div className="px-5 pt-5"><SectionHeader title={role === "DOCTOR" ? "治疗记录" : "本人治疗记录任务"} description={role === "DOCTOR" ? "治疗事实由康复师记录，医生端只读查看并追溯签署状态。" : "通过患者、康复师和签署状态组合筛选。"} /></div>
      <div className="mt-4 grid grid-cols-[1.4fr_1fr_1fr_auto_auto] items-end gap-3 border-y border-slate-100 bg-slate-50 px-5 py-4">
        <label><span className="field-label">患者姓名 / 编号 / 治疗记录号</span><input className="text-field" value={patientKeyword} onChange={(event) => setPatientKeyword(event.target.value)} placeholder="例如 陈女士 / P-000001" /></label>
        <label><span className="field-label">所属康复师</span><select className="text-field disabled:bg-slate-100" disabled={role === "REHAB_EXECUTION"} value={therapist} onChange={(event) => setTherapist(event.target.value)}><option value="all">全部康复师</option><option value="周康复师">周康复师</option></select></label>
        <label><span className="field-label">状态</span><select className="text-field" value={status} onChange={(event) => setStatus(event.target.value as "all" | "unfinished" | "completed")}><option value="all">全部状态</option><option value="unfinished">{role === "DOCTOR" ? "待康复师补充" : "未完成 / 待签署"}</option><option value="completed">已签署</option></select></label>
        <button type="button" className="btn-primary"><Search className="h-4 w-4" />查询</button>
        <button type="button" className="btn-secondary" onClick={reset}>重置</button>
      </div>
      <div className="flex items-center justify-between px-5 py-3 text-sm text-slate-500"><span>查询结果 {filtered.length} 条 · 已选择 {selectedIds.length} 条</span><div className="flex gap-2">{status === "unfinished" && <StatusBadge tone="orange">{role === "DOCTOR" ? "待康复师补充" : "本人 · 未完成"}</StatusBadge>}<button type="button" className="btn-primary !min-h-9" disabled={!selectedIds.length} onClick={() => { if (window.confirm(`确认删除已选择的 ${selectedIds.length} 条治疗记录？`)) { onDelete(selectedIds); setSelectedIds([]); } }}><Trash2 className="h-4 w-4" />删除所选</button></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead><tr className="border-y border-slate-100 bg-slate-50 text-xs text-slate-500"><th className="p-3"><input type="checkbox" aria-label="选择全部治疗记录" checked={Boolean(filtered.length) && filtered.every((item) => selectedIds.includes(item.treatmentId))} onChange={(event) => setSelectedIds(event.target.checked ? filtered.map((item) => item.treatmentId) : [])} /></th><th>患者</th><th>患者编号</th><th>治疗记录号</th><th>治疗时间</th><th>所属康复师</th><th>状态</th><th>操作</th></tr></thead><tbody>{filtered.map((record) => { const patient = patientMap.get(record.patientId); const unfinished = record.status === "draft" || !record.signature; return <tr key={record.treatmentId} className="cursor-pointer border-b border-slate-100 hover:bg-blue-50/50" onClick={() => onOpen(record.patientId, record.treatmentId)}><td className="p-3"><input type="checkbox" aria-label={`选择治疗记录${record.treatmentNo}`} checked={selectedIds.includes(record.treatmentId)} onClick={(event) => event.stopPropagation()} onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, record.treatmentId] : selectedIds.filter((id) => id !== record.treatmentId))} /></td><td className="font-bold text-slate-900">{patient?.name ?? "待核对患者"}</td><td className="font-mono text-slate-500">{record.patientNo}</td><td className="font-mono text-blue-700">{record.treatmentNo}</td><td>{record.treatmentAt.slice(0, 16).replace("T", " ")}</td><td>{record.therapist}</td><td><StatusBadge tone={unfinished ? "orange" : "green"}>{unfinished ? (role === "DOCTOR" ? "待康复师补充" : "待核对") : "已签署"}</StatusBadge></td><td><button type="button" className="inline-flex items-center gap-1 font-bold text-blue-700" onClick={(event) => { event.stopPropagation(); onOpen(record.patientId, record.treatmentId); }}>{role === "DOCTOR" || !unfinished ? "查看记录" : "填写并核对"}<ArrowRight className="h-4 w-4" /></button></td></tr>; })}</tbody></table>{!filtered.length && <p className="py-12 text-center text-sm text-slate-400">当前筛选条件下暂无治疗记录。</p>}</div>
    </section>
  </section>;
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`min-h-20 bg-white px-4 py-3 ${accent ? "!bg-blue-50" : ""}`}><p className="text-xs font-bold text-slate-400">{label}</p><p className={`mt-1.5 text-sm font-bold leading-5 ${accent ? "text-blue-700" : "text-slate-800"}`}>{value}</p></div>;
}

function ProfilePanel({ patient, profile }: { patient: ManagedPatient; profile?: PatientClinicalProfile }) {
  const data = [["患者姓名", patient.name], ["性别 / 年龄", `${patient.gender} / ${patient.age}岁`], ["患者编号", patient.patient_no], ["联系电话", patient.phone], ["康复阶段", patient.rehab_stage], ["患者状态", patientStatusLabel(patient.patient_status)], ["诊断摘要", profile?.diagnosis ?? patient.diagnosis_summary], ["特殊用药", profile?.specialMedications ?? patient.current_medications], ["最近资料更新", patient.updated_at], ["当前训练状态", patient.training_status]];
  return <section className="card overflow-hidden"><div className="border-b p-5"><SectionHeader title="患者基本信息" description="仅展示完成本次治疗记录需要的最小信息。" /></div><div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-5">{data.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1.5 text-sm font-semibold text-slate-700">{value || "未提供"}</p></div>)}</div></section>;
}

function PreviousTreatmentPanel({ patient, record, role, onSave }: { patient: ManagedPatient; record?: CardiopulmonaryTreatmentRecord; role: StaffRole; onSave: (record: CardiopulmonaryTreatmentRecord) => void }) {
  if (!record) return <section className="card p-10 text-center text-xs text-slate-400">该患者暂无上一条治疗记录。</section>;
  return <TreatmentRecordPage key={record.treatmentId} patient={patient} record={record} role={role} embedded readOnly onBack={() => undefined} onSave={onSave} onCorrect={() => undefined} />;
}

function PrescriptionReadonlyPanel({ prescription }: { prescription?: PrescriptionTask }) {
  if (!prescription) return <section className="card p-10 text-center text-xs text-slate-400">尚未获取该患者处方信息。</section>;
  const draft = prescription.doctorFinal ?? prescription.aiSuggestion ?? prescription.previous;
  return <section className="card overflow-hidden"><div className="flex items-center justify-between border-b p-5"><SectionHeader title="处方管理（只读）" description="康复师只能查看医生处方及版本，不能编辑、复核或签署。" /><StatusBadge tone={prescription.status === "completed" ? "green" : "orange"}>{prescription.status === "completed" ? "已签署" : "尚未完成"}</StatusBadge></div><div className="grid gap-4 p-5 lg:grid-cols-[0.72fr_1.28fr]"><div className="space-y-3">{[["处方号", prescription.prescriptionNo], ["版本", prescription.version], ["所属医生", prescription.assignedDoctorName], ["康复阶段", prescription.rehabStage], ["危险分组", prescription.risk], ["生成依据", prescription.sourceLabel ?? "未说明"]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-xs font-bold text-slate-700">{value}</p></div>)}</div><div className="rounded-2xl border border-slate-200 p-4"><h3 className="text-sm font-bold">运动处方项目</h3>{draft ? <div className="mt-3 space-y-2">{draft.items.map((item) => <div key={item.category} className="rounded-xl bg-slate-50 p-3"><b className="text-xs">{item.category} · {item.project}</b><p className="mt-1 text-[10px] leading-5 text-slate-500">{item.intensity}｜{item.duration}｜{item.frequency}</p></div>)}</div> : <p className="mt-5 text-xs text-slate-400">处方内容尚未生成。</p>}</div></div></section>;
}

function SingleTrainingReportsPanel({ patientId, reports: allReports }: { patientId: string; reports: StoredSingleReport[] }) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const reports = allReports
    .filter((item) => item.patientId === patientId)
    .sort((a, b) => b.actualStartAt.localeCompare(a.actualStartAt));
  if (!reports.length) return <section className="card p-10 text-center"><FileText className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 text-base font-bold text-slate-700">暂无该患者单次训练报告</h2><p className="mt-2 text-sm text-slate-500">患者完成一次训练并生成报告后，将在这里按时间展示。</p></section>;
  if (selectedReportId) return <SingleReportCard reportId={selectedReportId} reports={reports} onBack={() => setSelectedReportId(null)} />;
  return <section className="card overflow-hidden"><div className="border-b p-5"><SectionHeader title="单次训练报告" description="设备结束先生成即时摘要；完成训练后评估后，同一报告自动升级为完整报告。" /></div><div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-500"><th className="p-4">报告时间</th><th>报告编号</th><th>运动项目</th><th>实际时长</th><th>平均/峰值心率</th><th>数据状态</th><th>操作</th></tr></thead><tbody>{reports.map((report) => <tr key={report.singleReportId} className="border-b border-slate-100"><td className="p-4">{report.actualStartAt.replace("T", " ").slice(0, 16)}</td><td className="font-mono text-blue-700">{report.singleReportNo}</td><td className="font-semibold text-slate-800">{report.exercise}</td><td>{report.activeMinutes} 分钟</td><td>{displayClinicalMetric("心率", report.hrStats.average)} / {displayClinicalMetric("心率", report.hrStats.peak)} bpm</td><td><StatusBadge tone={report.reportStage === "instant" ? "orange" : "green"}>{report.reportStage === "instant" ? "即时摘要" : "完整报告"}</StatusBadge></td><td><button type="button" className="font-bold text-blue-700" onClick={() => setSelectedReportId(report.id)}>查看详情</button></td></tr>)}</tbody></table></div></section>;
}

function StageReportPanel({ patientId, reports, onOpen }: { patientId: string; reports: StoredStageReport[]; onOpen?: (patientId: string) => void }) {
  const patientReports = reports.filter((item) => item.patientId === patientId).sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const report = patientReports.find((item) => item.reportId === selectedReportId) ?? patientReports[0];
  if (!report) return <section className="card p-10 text-center"><FileBarChart className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 text-base font-bold text-slate-700">暂无该患者阶段报告</h2><p className="mt-2 text-sm text-slate-500">至少完成并选择两次有效训练后，才能生成患者专属阶段报告。</p></section>;
  return <section className="card overflow-hidden"><div className="border-b p-5"><SectionHeader title={`阶段性报告 V${report.version ?? 1}`} description="达到处方周期后自动生成；每次新增报告保留原版本和纳入记录，不覆盖历史。" action={onOpen ? <button type="button" className="btn-primary" onClick={() => onOpen(patientId)}><ArrowRight className="h-4 w-4" />进入阶段报告工作区</button> : undefined} /></div><div className="flex flex-wrap gap-2 border-b bg-slate-50 px-5 py-3">{patientReports.map((item) => <button key={item.reportId} type="button" onClick={() => setSelectedReportId(item.reportId)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${item.reportId === report.reportId ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>V{item.version ?? 1} · {item.periodEnd}</button>)}</div><div className="grid gap-4 p-5 lg:grid-cols-[0.7fr_1.3fr]"><div className="grid grid-cols-2 gap-3"><Metric label="纳入训练" value={`${report.selectedSessionIds.length}次`} /><Metric label="实际运动" value={`${report.aggregate.totalActiveMinutes}分钟`} /><Metric label="报告周期" value={`${report.periodStart.slice(5)} 至 ${report.periodEnd.slice(5)}`} wide /><Metric label="生成方式" value={report.generatedBy || "系统自动生成"} wide /></div><div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><p className="text-xs font-bold text-blue-600">阶段结论</p><p className="mt-3 text-sm leading-6 text-slate-700">{report.clinicalConclusion.summary || "未提供"}</p><p className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-blue-800">治疗参考：{report.clinicalConclusion.nextPrescription || "未提供"}</p></div></div></section>;
}

function AiAdvicePanel({ advice, onConfirm }: { advice: NonNullable<CardiopulmonaryTreatmentRecord["aiAdvice"]>; onConfirm: () => void }) {
  return <section className="card border-blue-200 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><StatusBadge tone={advice.status === "CONFIRMED" ? "green" : "blue"}>{advice.status === "CONFIRMED" ? "人工已核对" : "AI辅助草稿"}</StatusBadge><span className="text-xs text-slate-500">引用 {advice.sourceRecordIds.length} 条训练记录</span></div><h2 className="mt-3 text-base font-bold text-slate-900">下一阶段治疗建议</h2><p className="mt-2 text-sm leading-6 text-slate-700">{advice.content}</p></div>{advice.status === "DRAFT" && <button type="button" className="btn-secondary" onClick={onConfirm}>确认已核对建议</button>}</div><div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><b>本次仍需现场采集：</b>{advice.missingFields.join("、")}。AI不会自动填写这些事实字段。</div></section>;
}

function Metric({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`rounded-xl bg-slate-50 p-3 ${wide ? "col-span-2" : ""}`}><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>;
}

function patientStatusLabel(status?: ManagedPatient["patient_status"]) {
  if (status === "prescription_opened") return "开具处方";
  if (status === "recovered") return "已康复";
  return "康复治疗";
}
