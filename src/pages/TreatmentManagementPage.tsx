import { useMemo, useState } from "react";
import { Activity, ClipboardCheck, FileBarChart, History, Sparkles, Stethoscope, UserRound } from "lucide-react";
import { SectionHeader, StatusBadge } from "../components/UI";
import type { PatientClinicalProfile } from "../prescriptionWorkspaceData";
import type { CardiopulmonaryTreatmentRecord } from "../treatmentData";
import type { PrescriptionTask } from "../clinicalWorkflowData";
import type { StaffRole } from "../types";
import { stageReportData } from "../patient/stageReportData";
import { createBlankTreatment, type ManagedPatient, TreatmentRecordPage } from "./PatientArchivePage";

type TreatmentTab = "profile" | "current" | "previous" | "prescription" | "stage";

const treatmentTabs: { key: TreatmentTab; label: string; icon: typeof UserRound }[] = [
  { key: "profile", label: "患者基本信息", icon: UserRound },
  { key: "current", label: "本次治疗记录", icon: Stethoscope },
  { key: "previous", label: "上一次治疗记录", icon: History },
  { key: "prescription", label: "处方管理（只读）", icon: ClipboardCheck },
  { key: "stage", label: "阶段性报告", icon: FileBarChart }
];

export function TreatmentManagementPage({ role, currentAccount, patients, profiles, treatmentRecords, prescriptionTasks, onSave }: {
  role: StaffRole;
  currentAccount: string;
  patients: ManagedPatient[];
  profiles: PatientClinicalProfile[];
  treatmentRecords: CardiopulmonaryTreatmentRecord[];
  prescriptionTasks: PrescriptionTask[];
  onSave: (record: CardiopulmonaryTreatmentRecord) => void;
}) {
  const [patientId, setPatientId] = useState(patients[0]?.patient_demo_id ?? "");
  const selectedPatient = patients.find((item) => item.patient_demo_id === patientId) ?? patients[0];
  const profile = profiles.find((item) => item.patientId === selectedPatient?.patient_demo_id);
  const patientTreatments = useMemo(() => treatmentRecords.filter((item) => item.patientId === patientId).sort((a, b) => b.treatmentAt.localeCompare(a.treatmentAt)), [patientId, treatmentRecords]);
  const prescription = prescriptionTasks.find((item) => item.patientId === patientId && item.status === "completed") ?? prescriptionTasks.find((item) => item.patientId === patientId);
  const [activeTab, setActiveTab] = useState<TreatmentTab>("current");
  const [currentDraft, setCurrentDraft] = useState<CardiopulmonaryTreatmentRecord>(() => selectedPatient ? createBlankTreatment(selectedPatient, currentAccount) : treatmentRecords[0]);
  const [generatedFromStage, setGeneratedFromStage] = useState(false);

  if (!selectedPatient || !currentDraft) return <section className="card p-10 text-center text-sm text-slate-500">暂无可用于治疗记录的患者。</section>;

  function changePatient(nextId: string) {
    const next = patients.find((item) => item.patient_demo_id === nextId);
    if (!next) return;
    setPatientId(nextId);
    setCurrentDraft(createBlankTreatment(next, currentAccount));
    setGeneratedFromStage(false);
    setActiveTab("current");
  }

  function generateFromStageReport() {
    const next = createBlankTreatment(selectedPatient, currentAccount);
    const resting = profile?.rehabAssessment.restingVitals;
    next.prescriptionVersionId = prescription?.version;
    next.diagnosis = profile?.diagnosis ?? selectedPatient.diagnosis_summary;
    next.specialMedications = profile?.specialMedications ?? selectedPatient.current_medications;
    next.preAssessment = {
      ...next.preAssessment,
      heartRate: resting?.heartRate ?? null,
      bloodPressure: resting?.systolic && resting.diastolic ? `${resting.systolic}/${resting.diastolic} mmHg` : "",
      spo2: resting?.spo2 ?? null
    };
    next.interventions = next.interventions.map((item) => ({
      ...item,
      selected: ["endurance", "ecg", "bike"].includes(item.code),
      durationMinutes: item.code === "bike" ? 30 : item.durationMinutes,
      notes: item.code === "bike" ? "根据阶段性报告建议：热身5分钟、主训练20分钟、放松5分钟" : item.notes
    }));
    next.treatmentSummary = `根据阶段报告（${stageReportData.reportPeriod.start} 至 ${stageReportData.reportPeriod.end}）自动形成治疗记录草稿：${stageReportData.clinicalConclusion.summary}`;
    setCurrentDraft(next);
    setGeneratedFromStage(true);
  }

  const tabState: Record<TreatmentTab, string> = {
    profile: profile ? "资料可用" : "资料待补",
    current: generatedFromStage ? "阶段报告已带入" : "可编辑",
    previous: patientTreatments.length ? `${patientTreatments.length}条历史` : "暂无记录",
    prescription: prescription ? `${prescription.version} · 只读` : "未获取",
    stage: "报告可用"
  };

  return <section className="space-y-4 pb-10" data-testid="page-TREATMENT-MANAGEMENT">
    <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div><p className="text-[11px] font-bold text-teal-600">治疗管理 · 康复师治疗工作区</p><h1 className="mt-1 text-xl font-bold text-slate-950">本次心肺康复治疗</h1><p className="mt-1 text-xs text-slate-500">进入页面后默认打开本次治疗记录；阶段报告仅用于生成可编辑草稿。</p></div>
        <label className="min-w-56"><span className="field-label">当前患者</span><select className="text-field" value={patientId} onChange={(event) => changePatient(event.target.value)}>{patients.map((patient) => <option key={patient.patient_demo_id} value={patient.patient_demo_id}>{patient.name} · {patient.patient_no}</option>)}</select></label>
      </div>
      <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-6">
        <Summary label="患者" value={`${selectedPatient.name} · ${selectedPatient.gender} · ${selectedPatient.age}岁`} />
        <Summary label="患者编号" value={selectedPatient.patient_no} />
        <Summary label="康复阶段" value={selectedPatient.rehab_stage} />
        <Summary label="患者状态" value={patientStatusLabel(selectedPatient.patient_status)} />
        <Summary label="当前处方" value={prescription ? `${prescription.prescriptionNo} · ${prescription.version}` : "未获取"} />
        <Summary label="本次记录" value={generatedFromStage ? "阶段报告已生成草稿" : "待填写"} accent={generatedFromStage} />
      </div>
    </header>

    <nav className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm lg:grid-cols-5" aria-label="康复师治疗工作区栏目">
      {treatmentTabs.map(({ key, label, icon: Icon }, index) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex min-h-16 items-center gap-3 rounded-xl px-3 text-left transition ${activeTab === key ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${activeTab === key ? "bg-white/15" : "bg-slate-100"}`}><Icon className="h-4 w-4" /></span><span><span className="block text-xs font-bold">{index + 1}. {label}</span><span className={`mt-1 block text-[10px] font-semibold ${activeTab === key ? "text-teal-100" : key === "current" ? "text-teal-600" : "text-slate-400"}`}>{tabState[key]}</span></span></button>)}
    </nav>

    {activeTab === "profile" && <ProfilePanel patient={selectedPatient} profile={profile} />}
    {activeTab === "current" && <div className="space-y-4"><section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-teal-600 p-2.5 text-white"><Sparkles className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-teal-950">根据阶段性报告生成本次治疗记录</h2><p className="mt-1 text-xs text-teal-800">自动带入患者摘要、既有处方版本、基线生命体征与建议训练项目；康复师必须核对并可继续编辑。</p></div></div><button type="button" className="btn-primary !bg-teal-600 hover:!bg-teal-700" onClick={generateFromStageReport}><Sparkles className="h-4 w-4" />生成治疗记录草稿</button></section><TreatmentRecordPage key={currentDraft.treatmentId} patient={selectedPatient} record={currentDraft} role={role} embedded onBack={() => undefined} onSave={(record) => { setCurrentDraft(record); onSave(record); }} onCorrect={setCurrentDraft} /></div>}
    {activeTab === "previous" && <PreviousTreatmentPanel patient={selectedPatient} record={patientTreatments[0]} role={role} onSave={onSave} />}
    {activeTab === "prescription" && <PrescriptionReadonlyPanel prescription={prescription} />}
    {activeTab === "stage" && <StageReportPanel />}
  </section>;
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`min-h-20 bg-white px-4 py-3 ${accent ? "!bg-teal-50" : ""}`}><p className="text-[9px] font-bold text-slate-400">{label}</p><p className={`mt-1.5 text-xs font-bold leading-5 ${accent ? "text-teal-700" : "text-slate-800"}`}>{value}</p></div>;
}

function ProfilePanel({ patient, profile }: { patient: ManagedPatient; profile?: PatientClinicalProfile }) {
  const data = [["患者姓名", patient.name], ["性别 / 年龄", `${patient.gender} / ${patient.age}岁`], ["患者编号", patient.patient_no], ["联系电话", patient.phone], ["康复阶段", patient.rehab_stage], ["患者状态", patientStatusLabel(patient.patient_status)], ["诊断摘要", profile?.diagnosis ?? patient.diagnosis_summary], ["特殊用药", profile?.specialMedications ?? patient.current_medications], ["最近资料更新", patient.updated_at], ["当前训练状态", patient.training_status]];
  return <section className="card overflow-hidden"><div className="border-b p-5"><SectionHeader title="患者基本信息" description="仅展示完成本次治疗记录需要的最小信息。" /></div><div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-5">{data.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1.5 text-xs font-semibold text-slate-700">{value || "未提供"}</p></div>)}</div></section>;
}

function PreviousTreatmentPanel({ patient, record, role, onSave }: { patient: ManagedPatient; record?: CardiopulmonaryTreatmentRecord; role: StaffRole; onSave: (record: CardiopulmonaryTreatmentRecord) => void }) {
  if (!record) return <section className="card p-10 text-center text-xs text-slate-400">该患者暂无上一条治疗记录。</section>;
  return <TreatmentRecordPage key={record.treatmentId} patient={patient} record={record} role={role === "REHAB_EXECUTION" ? "ADMIN" : role} embedded onBack={() => undefined} onSave={onSave} onCorrect={() => undefined} />;
}

function PrescriptionReadonlyPanel({ prescription }: { prescription?: PrescriptionTask }) {
  if (!prescription) return <section className="card p-10 text-center text-xs text-slate-400">尚未获取该患者处方信息。</section>;
  const draft = prescription.doctorFinal ?? prescription.aiSuggestion ?? prescription.previous;
  return <section className="card overflow-hidden"><div className="flex items-center justify-between border-b p-5"><SectionHeader title="处方管理（只读）" description="康复师只能查看医生处方及版本，不能编辑、复核或签署。" /><StatusBadge tone={prescription.status === "completed" ? "green" : "orange"}>{prescription.status === "completed" ? "已签署" : "尚未完成"}</StatusBadge></div><div className="grid gap-4 p-5 lg:grid-cols-[0.72fr_1.28fr]"><div className="space-y-3">{[["处方号", prescription.prescriptionNo], ["版本", prescription.version], ["所属医生", prescription.assignedDoctorName], ["康复阶段", prescription.rehabStage], ["危险分组", prescription.risk], ["生成依据", prescription.sourceLabel ?? "未说明"]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-xs font-bold text-slate-700">{value}</p></div>)}</div><div className="rounded-2xl border border-slate-200 p-4"><h3 className="text-sm font-bold">运动处方项目</h3>{draft ? <div className="mt-3 space-y-2">{draft.items.map((item) => <div key={item.category} className="rounded-xl bg-slate-50 p-3"><b className="text-xs">{item.category} · {item.project}</b><p className="mt-1 text-[10px] leading-5 text-slate-500">{item.intensity}｜{item.duration}｜{item.frequency}</p></div>)}</div> : <p className="mt-5 text-xs text-slate-400">处方内容尚未生成。</p>}</div></div></section>;
}

function StageReportPanel() {
  const completed = stageReportData.sessions.filter((item) => item.completed).length;
  const minutes = stageReportData.sessions.reduce((sum, item) => sum + item.activeMinutes, 0);
  return <section className="card overflow-hidden"><div className="border-b p-5"><SectionHeader title="阶段性报告" description="治疗记录生成时只引用已确认的阶段摘要；原始报告保持只读。" /></div><div className="grid gap-4 p-5 lg:grid-cols-[0.7fr_1.3fr]"><div className="grid grid-cols-2 gap-3"><Metric label="纳入训练" value={`${completed}次`} /><Metric label="实际运动" value={`${minutes}分钟`} /><Metric label="报告周期" value={`${stageReportData.reportPeriod.start.slice(5)} 至 ${stageReportData.reportPeriod.end.slice(5)}`} wide /><Metric label="数据完整率" value="96%" /></div><div className="rounded-2xl border border-teal-100 bg-teal-50 p-5"><p className="text-[10px] font-bold text-teal-600">阶段结论</p><p className="mt-3 text-xs leading-6 text-slate-700">{stageReportData.clinicalConclusion.summary}</p><p className="mt-4 rounded-xl bg-white p-3 text-xs font-semibold text-teal-800">治疗参考：{stageReportData.clinicalConclusion.nextPrescription}</p></div></div></section>;
}

function Metric({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`rounded-xl bg-slate-50 p-3 ${wide ? "col-span-2" : ""}`}><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>;
}

function patientStatusLabel(status?: ManagedPatient["patient_status"]) {
  if (status === "prescription_opened") return "开具处方";
  if (status === "recovered") return "已康复";
  return "康复治疗";
}
