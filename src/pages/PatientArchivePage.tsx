import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  FileText,
  HeartPulse,
  MessageSquareText,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRound,
  X
} from "lucide-react";
import { demoPatients } from "../mockData";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { Role } from "../types";
import {
  clinicalSnapshotChen,
  patientMasterChen,
  prescriptionVersionDetails,
  singleTrainingReportDetails
} from "../clinicalSharedData";
import type { PrescriptionTask } from "../prescriptionData";
import { prescriptionStatusLabels } from "../prescriptionData";
import { stageReportData } from "../patient/stageReportData";

type PatientWorkspaceTab = "profile" | "narratives" | "prescriptions" | "sessions" | "reports";

type ManagedPatient = {
  patient_demo_id: string;
  name: string;
  id_number: string;
  phone: string;
  age: number;
  gender: string;
  diagnosis_summary: string;
  risk_level: string;
  rehab_group: string;
  rehab_stage: string;
  assessment: { cpet: string; six_mwt: string; resting_hr: number };
  prescription_version: string;
  training_status: string;
  latest_abnormal: string;
  report_status: string;
  last_followup: string;
};

const patientProfiles = [
  { name: patientMasterChen.name, id_number: patientMasterChen.idNumber, phone: patientMasterChen.phone, rehab_group: patientMasterChen.rehabGroup, rehab_stage: "Ⅱ期 · 第4周", last_followup: patientMasterChen.latestFollowUp },
  { name: "李秀兰", id_number: "3702********4826", phone: "136****1938", rehab_group: "运动康复 A 组", rehab_stage: "Ⅱ期 · 第2周", last_followup: "2026-07-26" },
  { name: "王先生", id_number: "3702********7714", phone: "159****2850", rehab_group: "运动康复 B 组", rehab_stage: "Ⅱ期 · 第3周", last_followup: "2026-07-25" },
  { name: "赵女士", id_number: "3702********3409", phone: "137****8246", rehab_group: "重点监护组", rehab_stage: "首次评估", last_followup: "2026-07-24" }
];

const initialPatients: ManagedPatient[] = demoPatients.map((patient, index) => ({ ...patient, ...patientProfiles[index] }));

const narrativeRecords = [
  { id: "N-003", patientId: "P-DEMO-001", time: "2026-07-25 10:15", author: "周康复师", type: "训练后沟通", symptoms: "训练第18分钟出现短暂胸闷，暂停后缓解。", lifestyle: "近期睡眠约7小时，低盐饮食执行较好。", adherence: "训练依从性良好，能主动记录身体感受。" },
  { id: "N-002", patientId: "P-DEMO-001", time: "2026-07-12 09:55", author: "王医生", type: "医生随访", symptoms: "自述日常步行耐力改善，爬一层楼气促减轻。", lifestyle: "训练前偶有进食过饱。", adherence: "已说明训练前饮食和血压复测要求。" },
  { id: "N-001", patientId: "P-DEMO-001", time: "2026-06-16 08:40", author: "周康复师", type: "首次访谈", symptoms: "PCI术后担心运动诱发胸闷，运动信心一般。", lifestyle: "既往运动较少，久坐时间偏长。", adherence: "愿意按每周3次计划参加康复。" }
];

const trainingRecords = [
  { id: "TR-20260725-012", patientId: "P-DEMO-001", date: "2026-07-25 09:30", project: "功率车", version: "V4.0", duration: "30分钟", target: "84%", status: "已完成", event: "胸闷1次 · 已复核" },
  { id: "TR-20260723-011", patientId: "P-DEMO-001", date: "2026-07-23 09:20", project: "功率车", version: "V4.0", duration: "30分钟", target: "79%", status: "已完成", event: "无异常" },
  { id: "TR-20260716-009", patientId: "P-DEMO-001", date: "2026-07-16 09:10", project: "功率车", version: "V3.0", duration: "30分钟", target: "80%", status: "已完成", event: "无异常" }
];

const stageReports = [
  { id: "STAGE-202607", patientId: "P-DEMO-001", period: "2026-06-16 至 2026-07-25", versions: "V1–V4", completion: "11/12次", target: "84%", status: "已审核" },
  { id: "STAGE-202607-003", patientId: "P-DEMO-003", period: "2026-07-05 至 2026-07-28", versions: "V1–V3", completion: "9/10次", target: "78%", status: "待复核" }
];

function riskTone(risk: string): "red" | "orange" | "green" {
  return risk === "高危" ? "red" : risk === "中危" ? "orange" : "green";
}

export function PatientArchivePage({
  role,
  tasks,
  initialPatientId,
  initialTab = "profile",
  onOpenPrescription
}: {
  role: Exclude<Role, "PATIENT">;
  tasks: PrescriptionTask[];
  initialPatientId?: string | null;
  initialTab?: PatientWorkspaceTab;
  onOpenPrescription: (taskId: string) => void;
}) {
  const [patients, setPatients] = useState<ManagedPatient[]>(initialPatients);
  const [selectedId, setSelectedId] = useState<string | null>(initialPatientId ?? null);
  const [activeTab, setActiveTab] = useState<PatientWorkspaceTab>(initialTab);
  const [keyword, setKeyword] = useState("");
  const [riskFilter, setRiskFilter] = useState("全部风险");
  const [stageFilter, setStageFilter] = useState("全部阶段");
  const [editDraft, setEditDraft] = useState<ManagedPatient | null>(null);
  const [editingMode, setEditingMode] = useState<"create" | "edit">("edit");
  const canEditClinical = role === "ADMIN" || role === "DOCTOR";
  const selected = selectedId ? patients.find((patient) => patient.patient_demo_id === selectedId) ?? null : null;

  const filteredPatients = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    return patients.filter((patient) => {
      const matchesKeyword = !value || [patient.name, patient.patient_demo_id, patient.id_number, patient.phone, patient.diagnosis_summary].some((field) => field.toLowerCase().includes(value));
      const matchesRisk = riskFilter === "全部风险" || patient.risk_level === riskFilter;
      const matchesStage = stageFilter === "全部阶段" || patient.rehab_stage.startsWith(stageFilter);
      return matchesKeyword && matchesRisk && matchesStage;
    });
  }, [keyword, patients, riskFilter, stageFilter]);

  function savePatient() {
    if (!editDraft) return;
    setPatients((items) => editingMode === "create" ? [editDraft, ...items] : items.map((patient) => patient.patient_demo_id === editDraft.patient_demo_id ? editDraft : patient));
    setSelectedId(editDraft.patient_demo_id);
    setEditDraft(null);
  }

  function openEdit(patient: ManagedPatient) {
    setEditingMode("edit");
    setEditDraft({ ...patient, assessment: { ...patient.assessment } });
  }

  function openCreate() {
    const nextNumber = patients.length + 1;
    setEditingMode("create");
    setEditDraft({
      patient_demo_id: `P-DEMO-${String(nextNumber).padStart(3, "0")}`,
      name: "",
      id_number: "",
      phone: "",
      age: 60,
      gender: "男",
      diagnosis_summary: canEditClinical ? "冠心病Ⅱ期院内康复待完善" : "待医生完善",
      risk_level: "中危",
      rehab_group: "运动康复 A 组",
      rehab_stage: "首次评估",
      assessment: { cpet: "待补充", six_mwt: "待补充", resting_hr: 72 },
      prescription_version: "待开具",
      training_status: "待建档",
      latest_abnormal: "无",
      report_status: "未生成",
      last_followup: patientMasterChen.latestFollowUp
    });
  }

  return (
    <section data-testid="page-VIEW-PATIENT-ARCHIVES">
      {selected ? (
        <PatientDetail
          patient={selected}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tasks={tasks.filter((task) => task.patientId === selected.patient_demo_id)}
          onBack={() => { setSelectedId(null); setActiveTab("profile"); }}
          onEdit={() => openEdit(selected)}
          onOpenPrescription={onOpenPrescription}
        />
      ) : (
        <>
          <PageHeader eyebrow="患者主索引" title="患者档案" description="首页只保留患者列表和快速查询。点击患者姓名进入患者详情，查看档案、沟通、处方、训练和报告。" action={<button type="button" onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" />新增患者</button>} />
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
              <label className="relative block min-w-[280px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-400" placeholder="搜索姓名、患者编码、证件号、电话或诊断" />
              </label>
              <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600"><option>全部风险</option><option>低危</option><option>中危</option><option>高危</option></select>
              <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600"><option>全部阶段</option><option>首次评估</option><option>Ⅱ期</option></select>
              <span className="ml-2 text-[10px] font-bold text-slate-400">共 {filteredPatients.length} 位患者</span>
            </div>
            <div className="grid grid-cols-[0.72fr_0.76fr_0.56fr_1.2fr_0.5fr_0.72fr_0.68fr_0.7fr] bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400">
              <span>患者姓名</span><span>患者编码</span><span>性别/年龄</span><span>诊断摘要</span><span>风险</span><span>康复阶段</span><span>当前处方</span><span>操作</span>
            </div>
            {filteredPatients.map((patient) => (
              <div key={patient.patient_demo_id} className="grid grid-cols-[0.72fr_0.76fr_0.56fr_1.2fr_0.5fr_0.72fr_0.68fr_0.7fr] items-center border-t border-slate-100 px-5 py-3 text-xs hover:bg-blue-50">
                <button type="button" onClick={() => setSelectedId(patient.patient_demo_id)} className="flex items-center gap-2 text-left font-bold text-blue-700"><UserRound className="h-4 w-4" />{patient.name}</button>
                <span className="font-mono text-[10px] text-slate-500">{patient.patient_demo_id}</span><span>{patient.gender} / {patient.age}岁</span><span className="pr-3 leading-5 text-slate-600">{patient.diagnosis_summary}</span>
                <StatusBadge tone={riskTone(patient.risk_level)}>{patient.risk_level}</StatusBadge><span>{patient.rehab_stage}</span><b className="text-blue-700">{patient.prescription_version}</b>
                <button type="button" onClick={() => { setSelectedId(patient.patient_demo_id); setActiveTab("profile"); }} className="inline-flex items-center gap-1 font-bold text-blue-700">患者详情<ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {filteredPatients.length === 0 && <div className="py-12 text-center text-xs text-slate-400">没有符合条件的患者</div>}
          </section>
        </>
      )}
      {editDraft && <PatientEditModal patient={editDraft} setPatient={setEditDraft} canEditClinical={canEditClinical} mode={editingMode} onClose={() => setEditDraft(null)} onSave={savePatient} />}
    </section>
  );
}

function PatientDetail({ patient, activeTab, setActiveTab, tasks, onBack, onEdit, onOpenPrescription }: {
  patient: ManagedPatient;
  activeTab: PatientWorkspaceTab;
  setActiveTab: (tab: PatientWorkspaceTab) => void;
  tasks: PrescriptionTask[];
  onBack: () => void;
  onEdit: () => void;
  onOpenPrescription: (taskId: string) => void;
}) {
  const tabs: { key: PatientWorkspaceTab; label: string; icon: typeof UserRound }[] = [
    { key: "profile", label: "基础档案", icon: UserRound },
    { key: "narratives", label: "历史口述", icon: MessageSquareText },
    { key: "prescriptions", label: "历次处方", icon: FileText },
    { key: "sessions", label: "训练记录", icon: Activity },
    { key: "reports", label: "报告", icon: CalendarRange }
  ];
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="患者详情页面" title={`${patient.name} · ${patient.patient_demo_id}`} description="以患者为中心聚合基础档案、医患沟通、历次处方、每次训练记录和报告。" action={<button type="button" onClick={onBack} className="btn-secondary"><ArrowLeft className="h-4 w-4" />返回患者列表</button>} />
      <section className="card p-4">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UserRound className="h-6 w-6" /></span>
          <div className="grid flex-1 grid-cols-6 gap-3">
            <Summary label="患者编码" value={patient.patient_demo_id} /><Summary label="年龄 / 性别" value={`${patient.age}岁 / ${patient.gender}`} /><Summary label="危险分组" value={patient.risk_level} /><Summary label="康复阶段" value={patient.rehab_stage} /><Summary label="当前处方" value={patient.prescription_version} /><Summary label="训练状态" value={patient.training_status} />
          </div>
          <button type="button" onClick={onEdit} className="btn-secondary"><Pencil className="h-4 w-4" />编辑信息</button>
        </div>
      </section>
      <nav className="card flex gap-1 p-1.5" aria-label="患者详情栏目">
        {tabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-bold ${activeTab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}><Icon className="h-4 w-4" />{label}</button>)}
      </nav>
      {activeTab === "profile" && <ProfileTab patient={patient} />}
      {activeTab === "narratives" && <NarrativesTab patientId={patient.patient_demo_id} />}
      {activeTab === "prescriptions" && <PrescriptionsTab tasks={tasks} onOpen={onOpenPrescription} />}
      {activeTab === "sessions" && <SessionsTab patientId={patient.patient_demo_id} />}
      {activeTab === "reports" && <ReportsTab patientId={patient.patient_demo_id} onOpenPrescription={onOpenPrescription} tasks={tasks} />}
    </div>
  );
}

function ProfileTab({ patient }: { patient: ManagedPatient }) {
  const specialMedication = patient.patient_demo_id === clinicalSnapshotChen.patientId ? clinicalSnapshotChen.specialMedications.join("、") : "未录入";
  return <section className="card p-5"><SectionHeader title="基础档案与临床信息" /><div className="grid grid-cols-4 gap-3">{[
    ["证件号码", patient.id_number], ["联系电话", patient.phone], ["康复分组", patient.rehab_group], ["静息心率", `${patient.assessment.resting_hr} bpm`],
    ["CPET", patient.assessment.cpet], ["6分钟步行", patient.assessment.six_mwt], ["最近随访", patient.last_followup], ["特殊用药", specialMedication]
  ].map(([label, value]) => <Summary key={label} label={label} value={value} />)}</div><div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-bold text-slate-400">诊断摘要</p><p className="mt-2 text-xs font-semibold leading-6 text-slate-700">{patient.diagnosis_summary}</p></div></section>;
}

function NarrativesTab({ patientId }: { patientId: string }) {
  const records = narrativeRecords.filter((item) => item.patientId === patientId);
  return <section className="card p-5"><SectionHeader title="历史口述与医患沟通" description="记录患者主诉、症状变化、生活方式、依从性及医护沟通内容。" />{records.length ? <div className="space-y-3">{records.map((record) => <article key={record.id} className="grid grid-cols-[130px_1fr] gap-4 rounded-xl border border-slate-100 p-4"><div><b className="text-slate-800">{record.time.slice(0, 10)}</b><p className="mt-1 text-[10px] text-slate-400">{record.time.slice(11)} · {record.author}</p><StatusBadge tone="blue">{record.type}</StatusBadge></div><div className="grid grid-cols-3 gap-3 text-xs leading-5"><NarrativeItem label="患者主诉" value={record.symptoms} /><NarrativeItem label="生活方式" value={record.lifestyle} /><NarrativeItem label="依从性与处置" value={record.adherence} /></div></article>)}</div> : <EmptyState text="该患者暂无历史口述记录" />}</section>;
}

function PrescriptionsTab({ tasks, onOpen }: { tasks: PrescriptionTask[]; onOpen: (taskId: string) => void }) {
  const rows = tasks.length ? tasks : [];
  return <section className="card overflow-hidden"><div className="px-5 pt-5"><SectionHeader title="历次处方" description="患者历史处方统一沉淀在档案中；处方管理仅承担医生任务。" /></div><div className="grid grid-cols-[0.8fr_0.9fr_1fr_0.8fr_0.8fr_0.7fr] bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>版本</span><span>处方类型</span><span>依据</span><span>更新时间</span><span>状态</span><span>操作</span></div>{rows.map((task) => <button type="button" key={task.id} onClick={() => onOpen(task.id)} className="grid w-full grid-cols-[0.8fr_0.9fr_1fr_0.8fr_0.8fr_0.7fr] items-center border-t border-slate-100 px-5 py-3 text-left text-xs hover:bg-blue-50"><b>{task.version}</b><span>{task.kind === "initial" ? "初始处方" : "调整处方"}</span><span>{task.sourceLabel}</span><span>{task.updatedAt.slice(0, 10)}</span><StatusBadge tone={task.status === "completed" ? "green" : "orange"}>{prescriptionStatusLabels[task.status]}</StatusBadge><span className="font-bold text-blue-700">{task.status === "completed" ? "查看/打印" : "进入审核"}</span></button>)}{!rows.length && <EmptyState text="该患者暂无处方记录" />}</section>;
}

function SessionsTab({ patientId }: { patientId: string }) {
  const rows = trainingRecords.filter((item) => item.patientId === patientId);
  return <section className="card overflow-hidden"><div className="px-5 pt-5"><SectionHeader title="每次训练记录" /></div><div className="grid grid-cols-[0.95fr_0.7fr_0.7fr_0.65fr_0.65fr_1fr_0.65fr] bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>训练时间</span><span>项目</span><span>处方版本</span><span>时长</span><span>靶区达标</span><span>异常/处置</span><span>状态</span></div>{rows.map((row) => <div key={row.id} className="grid grid-cols-[0.95fr_0.7fr_0.7fr_0.65fr_0.65fr_1fr_0.65fr] items-center border-t border-slate-100 px-5 py-3 text-xs"><span>{row.date}</span><b>{row.project}</b><span>{row.version}</span><span>{row.duration}</span><b className="text-blue-700">{row.target}</b><span>{row.event}</span><StatusBadge tone="green">{row.status}</StatusBadge></div>)}{!rows.length && <EmptyState text="该患者暂无训练记录" />}</section>;
}

function ReportsTab({ patientId, tasks, onOpenPrescription }: { patientId: string; tasks: PrescriptionTask[]; onOpenPrescription: (taskId: string) => void }) {
  const [reportType, setReportType] = useState<"stage" | "single">("stage");
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedSingleId, setSelectedSingleId] = useState<string | null>(null);
  const stages = stageReports.filter((item) => item.patientId === patientId);
  const singles = singleTrainingReportDetails.filter((item) => item.patientId === patientId);
  if (selectedStageId) return <StageReportDetail reportId={selectedStageId} onBack={() => setSelectedStageId(null)} taskId={tasks.find((task) => task.sourceType === "stage_report")?.id} onOpenPrescription={onOpenPrescription} />;
  if (selectedSingleId) {
    const report = singles.find((item) => item.id === selectedSingleId);
    if (report) return <SingleReportDetail report={report} onBack={() => setSelectedSingleId(null)} />;
  }
  return <section className="card overflow-hidden"><div className="flex items-center justify-between px-5 pt-5"><SectionHeader title="患者报告" description="单次报告和阶段性报告均归入患者档案。" /><div className="flex rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setReportType("stage")} className={`rounded-md px-4 py-2 text-[10px] font-bold ${reportType === "stage" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>阶段性报告</button><button type="button" onClick={() => setReportType("single")} className={`rounded-md px-4 py-2 text-[10px] font-bold ${reportType === "single" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>单次报告</button></div></div>{reportType === "stage" ? <><ReportHeader labels={["报告周期", "处方版本", "完成情况", "靶区达标", "状态", "操作"]} />{stages.map((row) => <button type="button" key={row.id} onClick={() => setSelectedStageId(row.id)} className="grid w-full grid-cols-6 items-center border-t border-slate-100 px-5 py-3 text-left text-xs hover:bg-blue-50"><span>{row.period}</span><b>{row.versions}</b><span>{row.completion}</span><b className="text-blue-700">{row.target}</b><StatusBadge tone="green">{row.status}</StatusBadge><span className="font-bold text-blue-700">查看阶段报告<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></span></button>)}{!stages.length && <EmptyState text="该患者暂无阶段性报告" />}</> : <><ReportHeader labels={["训练时间", "运动项目", "运动类型", "总时长", "状态", "操作"]} />{singles.map((row) => <button type="button" key={row.id} onClick={() => setSelectedSingleId(row.id)} className="grid w-full grid-cols-6 items-center border-t border-slate-100 px-5 py-3 text-left text-xs hover:bg-blue-50"><span>{row.dateTime}</span><b>{row.exercise}</b><span>{row.trainingType}</span><span>{row.totalMinutes}分钟</span><StatusBadge tone="green">{row.status}</StatusBadge><span className="font-bold text-blue-700">查看单次报告<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></span></button>)}{!singles.length && <EmptyState text="该患者暂无单次报告" />}</>}</section>;
}

function StageReportDetail({ reportId, taskId, onBack, onOpenPrescription }: { reportId: string; taskId?: string; onBack: () => void; onOpenPrescription: (taskId: string) => void }) {
  const completed = stageReportData.sessions.filter((item) => item.completed).length;
  const planned = stageReportData.prescriptionVersions.reduce((sum, item) => sum + item.plannedSessions, 0);
  const targetMinutes = stageReportData.sessions.reduce((sum, item) => sum + item.targetZoneMinutes, 0);
  const activeMinutes = stageReportData.sessions.reduce((sum, item) => sum + item.activeMinutes, 0);
  const targetRate = Math.round((targetMinutes / activeMinutes) * 100);
  return <div className="space-y-4">
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-slate-950 to-blue-950 px-5 py-4 text-white">
        <div className="flex items-start gap-3"><button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><ArrowLeft className="h-4 w-4" /></button><div><p className="text-[10px] font-bold text-blue-200">阶段性报告 · {reportId} · Demo 汇总数据</p><h2 className="mt-1 text-lg font-bold">陈女士 · 运动康复阶段评估</h2><p className="mt-1 text-[10px] text-slate-300">{stageReportData.reportPeriod.start} 至 {stageReportData.reportPeriod.end} · 患者编码 P-DEMO-001</p></div></div>
        <div className="text-right"><StatusBadge tone="orange">中危 · 状态稳定</StatusBadge><p className="mt-2 text-[10px] text-slate-300">王医生已复核</p></div>
      </div>
      <div className="grid grid-cols-[1.4fr_repeat(4,0.65fr)] gap-3 p-5">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="flex items-center gap-2 text-xs font-bold text-blue-900"><Stethoscope className="h-4 w-4" />阶段结论</p><p className="mt-2 text-xs font-semibold leading-6 text-slate-700">{stageReportData.clinicalConclusion.summary}</p></div>
        <Metric label="计划完成" value={`${completed}/${planned}`} note={`${Math.round(completed / planned * 100)}%`} /><Metric label="靶区达标" value={`${targetRate}%`} note="按实际运动时间" /><Metric label="安全事件" value={`${stageReportData.safetyEvents.length}`} note="均已处置复核" tone="orange" /><Metric label="耐量变化" value="+18%" note="相近HR/RPE下" tone="green" />
      </div>
    </section>
    <section className="card p-5"><SectionHeader title="阶段前后对照" description="用相同口径判断患者是否真正改善。" /><div className="grid grid-cols-4 gap-3">{stageReportData.patientStageConclusion.beforeAfterComparison.map((item) => <div key={item.metric} className="rounded-xl border border-slate-100 p-4"><p className="text-[10px] font-bold text-slate-400">{item.metric}</p><div className="mt-3 flex items-center gap-2"><span className="text-xs text-slate-500">{item.before}</span><ArrowRight className="h-3.5 w-3.5 text-blue-500" /><b className="text-blue-700">{item.after}</b></div><p className="mt-2 text-[10px] leading-4 text-slate-500">{item.meaning}</p></div>)}</div></section>
    <div className="grid grid-cols-[1.18fr_0.82fr] gap-4">
      <section className="card overflow-hidden"><div className="px-5 pt-5"><SectionHeader title="V1–V4处方演变" description="突出每次调整方向和临床原因。" /></div><div className="grid grid-cols-[0.5fr_0.65fr_0.72fr_0.72fr_0.72fr_1.4fr] bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>版本</span><span>方向</span><span>训练时间</span><span>靶心率</span><span>目标功率</span><span>调整原因</span></div>{stageReportData.prescriptionVersions.map((item) => <div key={item.id} className="grid grid-cols-[0.5fr_0.65fr_0.72fr_0.72fr_0.72fr_1.4fr] items-center border-t border-slate-100 px-5 py-3 text-xs"><b>{item.id}</b><StatusBadge tone={item.direction === "维持" ? "orange" : "blue"}>{item.direction}</StatusBadge><span>{item.trainingMinutes}分钟</span><span>{item.targetHr.join("–")}</span><span>{item.targetPower.join("–")}W</span><span className="leading-5 text-slate-600">{item.adjustmentReason}</span></div>)}</section>
      <section className="card p-5"><SectionHeader title="安全事件与复核" action={<ShieldAlert className="h-4 w-4 text-amber-600" />} /><div className="space-y-3">{stageReportData.safetyEvents.map((event) => <div key={event.id} className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs"><div className="flex items-center justify-between"><b className="text-amber-900">{event.type}</b><StatusBadge tone="orange">{event.severity}</StatusBadge></div><p className="mt-2 text-amber-800">{event.occurredAt} · {event.value}</p><p className="mt-1 leading-5 text-slate-600">{event.action}；{event.review}</p></div>)}</div></section>
    </div>
    <section className="card flex items-center justify-between p-4"><div><b className="text-slate-900">下一阶段建议</b><p className="mt-1 text-xs text-slate-500">{stageReportData.clinicalConclusion.nextPrescription}</p></div>{taskId && <button type="button" onClick={() => onOpenPrescription(taskId)} className="btn-primary">基于报告审核处方<ArrowRight className="h-4 w-4" /></button>}</section>
  </div>;
}

function SingleReportDetail({ report, onBack }: { report: typeof singleTrainingReportDetails[number]; onBack: () => void }) {
  return <section className="card p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><button type="button" onClick={onBack} className="btn-secondary"><ArrowLeft className="h-4 w-4" />返回报告列表</button><div><p className="text-[10px] font-bold text-blue-600">单次报告 · {report.id}</p><h2 className="mt-1 text-lg font-bold">{report.exercise} · {report.dateTime}</h2></div></div><StatusBadge tone="orange">{report.dataMode === "demo" ? "Demo 数据" : "设备采样"}</StatusBadge></div><div className="mt-5 grid grid-cols-6 gap-3"><Metric label="总时长" value={`${report.totalMinutes}分`} /><Metric label="实际运动" value={`${report.activeMinutes}分`} /><Metric label="靶区时间" value={`${report.targetZoneMinutes}分`} /><Metric label="平均心率" value={`${report.hrStats.average}`} note="bpm" /><Metric label="峰值心率" value={`${report.hrStats.peak}`} note="bpm" /><Metric label="安全摘要" value={report.safetySummary} /></div><p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">{report.dataSourceNote}</p></section>;
}

function PatientEditModal({ patient, setPatient, canEditClinical, mode, onClose, onSave }: { patient: ManagedPatient; setPatient: (patient: ManagedPatient) => void; canEditClinical: boolean; mode: "create" | "edit"; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm"><form onSubmit={(event) => { event.preventDefault(); onSave(); }} className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><div><p className="text-[10px] font-bold text-blue-600">患者档案</p><h2 className="mt-1 text-lg font-bold">{mode === "create" ? "新增患者信息" : "编辑基本信息"} · {patient.patient_demo_id}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="grid grid-cols-3 gap-4 p-6"><EditField label="患者姓名" value={patient.name} onChange={(value) => setPatient({ ...patient, name: value })} /><EditField label="联系电话" value={patient.phone} onChange={(value) => setPatient({ ...patient, phone: value })} /><EditField label="证件号码" value={patient.id_number} onChange={(value) => setPatient({ ...patient, id_number: value })} /><label><span className="field-label">危险分组</span><select disabled={!canEditClinical} value={patient.risk_level} onChange={(event) => setPatient({ ...patient, risk_level: event.target.value })} className="text-field disabled:bg-slate-100"><option>低危</option><option>中危</option><option>高危</option></select></label><EditField label="康复阶段" value={patient.rehab_stage} onChange={(value) => setPatient({ ...patient, rehab_stage: value })} /><EditField label="康复分组" value={patient.rehab_group} onChange={(value) => setPatient({ ...patient, rehab_group: value })} /><label className="col-span-3"><span className="field-label">诊断摘要</span><textarea disabled={!canEditClinical} value={patient.diagnosis_summary} onChange={(event) => setPatient({ ...patient, diagnosis_summary: event.target.value })} className="text-field min-h-20 py-2 disabled:bg-slate-100" /></label></div><div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><button type="button" onClick={onClose} className="btn-secondary">取消</button><button type="submit" className="btn-primary"><Save className="h-4 w-4" />保存</button></div></form></div>;
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="field-label">{label}</span><input required value={value} onChange={(event) => onChange(event.target.value)} className="text-field" /></label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1.5 text-xs font-bold leading-5 text-slate-800">{value}</p></div>;
}

function NarrativeItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><b className="text-[10px] text-slate-400">{label}</b><p className="mt-1 text-slate-600">{value}</p></div>;
}

function Metric({ label, value, note, tone = "blue" }: { label: string; value: string; note?: string; tone?: "blue" | "orange" | "green" }) {
  const colors = tone === "orange" ? "bg-amber-50 text-amber-800" : tone === "green" ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-900";
  return <div className={`rounded-xl p-4 ${colors}`}><p className="text-[10px] font-bold opacity-60">{label}</p><p className="mt-2 text-xl font-bold">{value}</p>{note && <p className="mt-1 text-[9px] opacity-60">{note}</p>}</div>;
}

function ReportHeader({ labels }: { labels: string[] }) {
  return <div className="grid grid-cols-6 bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400">{labels.map((label) => <span key={label}>{label}</span>)}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex flex-col items-center py-12 text-xs text-slate-400"><FileText className="mb-2 h-6 w-6" />{text}</div>;
}
