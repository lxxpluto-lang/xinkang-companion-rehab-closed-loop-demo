import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Phone, Save, Search, UserRound, X } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import {
  contactResultLabels,
  daysUntil,
  dispositionLabels,
  effectiveFollowUpStatus,
  followUpStatusLabels,
  todayDate,
  type ContactResult,
  type FollowUpDisposition,
  type FollowUpRecord,
  type FollowUpStatus,
  type FollowUpTask
} from "../followUpData";
import type { ManagedPatient } from "./PatientArchivePage";

export type FollowUpView = "pending" | "overdue" | "completed";

const symptomOptions = ["无明显不适", "胸闷", "持续胸痛", "气促", "心悸", "头晕", "晕厥", "下肢水肿"];

function statusTone(status: FollowUpStatus): "gray" | "blue" | "orange" | "red" | "green" {
  if (status === "completed") return "green";
  if (status === "overdue") return "red";
  if (status === "due") return "orange";
  if (status === "rescheduled") return "blue";
  return "gray";
}

function distanceLabel(task: FollowUpTask) {
  const distance = daysUntil(task.currentDueDate);
  if (distance < 0) return `逾期 ${Math.abs(distance)} 天`;
  if (distance === 0) return "今天到期";
  return `${distance} 天后`;
}

function nowForInput() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function FollowUpManagementPage({
  role,
  currentAccount,
  patients,
  tasks,
  records,
  initialView = "pending",
  initialTaskId,
  onSaveRecord,
  onOpenPatient
}: {
  role: "ADMIN" | "DOCTOR";
  currentAccount: string;
  patients: ManagedPatient[];
  tasks: FollowUpTask[];
  records: FollowUpRecord[];
  initialView?: FollowUpView;
  initialTaskId?: string | null;
  onSaveRecord: (record: FollowUpRecord) => void;
  onOpenPatient: (patientId: string) => void;
}) {
  const [view, setView] = useState<FollowUpView>(initialView);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId ?? null);
  const [keyword, setKeyword] = useState("");
  const [milestone, setMilestone] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setView(initialView);
    setSelectedTaskId(initialTaskId ?? null);
  }, [initialTaskId, initialView]);

  const scopedTasks = useMemo(() => role === "DOCTOR" ? tasks.filter((task) => task.assignedDoctor === currentAccount) : tasks, [currentAccount, role, tasks]);
  const patientMap = useMemo(() => new Map(patients.map((patient) => [patient.patient_demo_id, patient])), [patients]);
  const counts = useMemo(() => scopedTasks.reduce((result, task) => {
    const status = effectiveFollowUpStatus(task);
    if (status === "completed") result.completed += 1;
    else if (status === "overdue") result.overdue += 1;
    else if (status === "due") result.due += 1;
    else if (daysUntil(task.currentDueDate) <= 7) result.soon += 1;
    return result;
  }, { soon: 0, due: 0, overdue: 0, completed: 0 }), [scopedTasks]);

  const visibleTasks = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const riskPriority: Record<string, number> = { 高危: 0, 中危: 1, 低危: 2, 待评估: 3 };
    return scopedTasks.filter((task) => {
      const patient = patientMap.get(task.patientId);
      if (!patient) return false;
      const status = effectiveFollowUpStatus(task);
      const matchesView = view === "completed" ? status === "completed" : view === "overdue" ? status === "overdue" : status !== "completed" && status !== "overdue";
      const matchesKeyword = !normalizedKeyword || [patient.name, patient.patient_code, patient.hospital_patient_no].some((value) => value.toLowerCase().includes(normalizedKeyword));
      const matchesMilestone = milestone === "all" || task.milestoneMonth === Number(milestone);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesDate = (!dateFrom || task.currentDueDate >= dateFrom) && (!dateTo || task.currentDueDate <= dateTo);
      return matchesView && matchesKeyword && matchesMilestone && matchesStatus && matchesDate;
    }).sort((left, right) => {
      const leftPatient = patientMap.get(left.patientId);
      const rightPatient = patientMap.get(right.patientId);
      const statusOrder = { overdue: 0, due: 1, rescheduled: 2, upcoming: 3, completed: 4 };
      return statusOrder[effectiveFollowUpStatus(left)] - statusOrder[effectiveFollowUpStatus(right)]
        || (riskPriority[leftPatient?.risk_level ?? "待评估"] - riskPriority[rightPatient?.risk_level ?? "待评估"])
        || left.currentDueDate.localeCompare(right.currentDueDate);
    });
  }, [dateFrom, dateTo, keyword, milestone, patientMap, scopedTasks, statusFilter, view]);

  const selectedTask = selectedTaskId ? scopedTasks.find((task) => task.id === selectedTaskId) : undefined;
  const selectedPatient = selectedTask ? patientMap.get(selectedTask.patientId) : undefined;
  const selectedRecord = selectedTask ? [...records].filter((record) => record.taskId === selectedTask.id).sort((left, right) => right.contactedAt.localeCompare(left.contactedAt))[0] : undefined;

  return <section data-testid="page-VIEW-FOLLOWUPS">
    <PageHeader eyebrow="院后康复管理" title={role === "DOCTOR" ? "我的随访管理" : "全院随访管理"} description={role === "DOCTOR" ? `仅展示主管医生为${currentAccount}的患者；按出院后1、3、5个月生成随访任务。` : "管理员可查看全部医生的随访计划与完成记录，但不能代医生提交或改期。"} action={<StatusBadge tone={role === "DOCTOR" ? "blue" : "gray"}>{role === "DOCTOR" ? "本人患者" : "只读查看"}</StatusBadge>} />

    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="7天内待随访" value={counts.soon} tone="blue" icon={<CalendarClock className="h-4 w-4" />} />
      <Metric label="今日到期" value={counts.due} tone="orange" icon={<Clock3 className="h-4 w-4" />} />
      <Metric label="已逾期" value={counts.overdue} tone="red" icon={<AlertTriangle className="h-4 w-4" />} />
      <Metric label="已完成" value={counts.completed} tone="green" icon={<CheckCircle2 className="h-4 w-4" />} />
    </div>

    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 p-4">
        <div className="mb-4 flex rounded-lg bg-slate-100 p-1 sm:w-fit">
          {([['pending', '待随访'], ['overdue', '已逾期'], ['completed', '已完成']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setView(key)} className={`min-h-9 flex-1 rounded-md px-5 text-xs font-bold sm:flex-none ${view === key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>{label}</button>)}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.3fr_0.65fr_0.8fr_0.8fr_0.8fr_auto]">
          <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="text-field pl-9" placeholder="患者姓名、档案编码或病案号" /></label>
          <select aria-label="随访节点" value={milestone} onChange={(event) => setMilestone(event.target.value)} className="text-field"><option value="all">全部节点</option><option value="1">1个月</option><option value="3">3个月</option><option value="5">5个月</option></select>
          <select aria-label="随访状态" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="text-field"><option value="all">全部状态</option><option value="upcoming">待随访</option><option value="due">今日到期</option><option value="overdue">已逾期</option><option value="rescheduled">已改期</option><option value="completed">已完成</option></select>
          <input aria-label="计划日期开始" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="text-field" />
          <input aria-label="计划日期结束" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="text-field" />
          <button type="button" onClick={() => { setKeyword(""); setMilestone("all"); setStatusFilter("all"); setDateFrom(""); setDateTo(""); }} className="btn-secondary">重置</button>
        </div>
      </div>
      <div className="overflow-x-auto"><div className="min-w-[1120px]">
        <div className="grid grid-cols-[0.9fr_1fr_0.65fr_0.8fr_0.8fr_0.65fr_0.8fr_0.6fr] bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>患者</span><span>康复档案编码</span><span>随访节点</span><span>原计划日期</span><span>当前联系日期</span><span>距到期</span><span>最近结果</span><span>操作</span></div>
        {visibleTasks.map((task) => {
          const patient = patientMap.get(task.patientId)!;
          const status = effectiveFollowUpStatus(task);
          return <div key={task.id} className="grid grid-cols-[0.9fr_1fr_0.65fr_0.8fr_0.8fr_0.65fr_0.8fr_0.6fr] items-center border-t border-slate-100 px-5 py-3 text-xs hover:bg-blue-50"><button type="button" onClick={() => onOpenPatient(patient.patient_demo_id)} className="text-left"><b className="text-blue-700">{patient.name}</b><span className="mt-1 block text-[10px] text-slate-400">{patient.assigned_doctor} · {patient.risk_level}</span></button><span className="font-mono text-[10px] text-slate-500">{patient.patient_code}</span><b>{task.milestoneMonth}个月</b><span>{task.originalPlannedDate}</span><span>{task.currentDueDate}</span><StatusBadge tone={statusTone(status)}>{status === "completed" ? "已完成" : distanceLabel(task)}</StatusBadge><span>{task.lastContactResult ? contactResultLabels[task.lastContactResult] : "尚未联系"}</span><button type="button" onClick={() => setSelectedTaskId(task.id)} className="font-bold text-blue-700">{role === "DOCTOR" && status !== "completed" ? "去随访" : "查看详情"}</button></div>;
        })}
        {!visibleTasks.length && <div className="py-14 text-center text-xs text-slate-400">当前筛选条件下没有随访任务</div>}
      </div></div>
    </section>

    {selectedTask && selectedPatient && <FollowUpModal task={selectedTask} patient={selectedPatient} record={role === "ADMIN" || effectiveFollowUpStatus(selectedTask) === "completed" ? selectedRecord : undefined} readOnly={role === "ADMIN" || effectiveFollowUpStatus(selectedTask) === "completed"} currentAccount={currentAccount} onClose={() => setSelectedTaskId(null)} onSave={(record) => { onSaveRecord(record); setSelectedTaskId(null); }} />}
  </section>;
}

function Metric({ label, value, tone, icon }: { label: string; value: number; tone: "blue" | "orange" | "red" | "green"; icon: React.ReactNode }) {
  const colors = tone === "red" ? "bg-red-50 text-red-700" : tone === "orange" ? "bg-amber-50 text-amber-700" : tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";
  return <div className="card flex items-center justify-between p-4"><div><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div><span className={`rounded-lg p-2.5 ${colors}`}>{icon}</span></div>;
}

function FollowUpModal({ task, patient, record, readOnly, currentAccount, onClose, onSave }: { task: FollowUpTask; patient: ManagedPatient; record?: FollowUpRecord; readOnly: boolean; currentAccount: string; onClose: () => void; onSave: (record: FollowUpRecord) => void }) {
  const [contactResult, setContactResult] = useState<ContactResult>(record?.contactResult ?? "reached");
  const [communicationMethod, setCommunicationMethod] = useState<FollowUpRecord["communicationMethod"]>(record?.communicationMethod ?? "phone");
  const [contactedAt, setContactedAt] = useState(record?.contactedAt?.slice(0, 16) ?? nowForInput());
  const [symptoms, setSymptoms] = useState<string[]>(record?.symptoms ?? []);
  const [medicationAdherence, setMedicationAdherence] = useState(record?.medicationAdherence ?? "良好");
  const [exerciseAdherence, setExerciseAdherence] = useState(record?.exerciseAdherence ?? "基本按计划完成");
  const [recentHospitalization, setRecentHospitalization] = useState(record?.recentEmergencyOrHospitalization ?? false);
  const [vitalSigns, setVitalSigns] = useState(record?.vitalSigns ?? "");
  const [assessment, setAssessment] = useState(record?.clinicalAssessment ?? "");
  const [disposition, setDisposition] = useState<FollowUpDisposition | "">(record?.disposition ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [nextContactDate, setNextContactDate] = useState(record?.nextContactDate ?? "");
  const [error, setError] = useState("");
  const reached = contactResult === "reached";
  const highRisk = symptoms.includes("持续胸痛") || symptoms.includes("晕厥") || recentHospitalization;
  const callablePhone = /^1\d{10}$/.test(patient.phone);

  function submit() {
    setError("");
    if (!contactedAt) return setError("请选择实际沟通时间。");
    if (reached && !disposition) return setError("已接通随访必须选择后续处理措施。");
    if (reached && !assessment.trim()) return setError("请填写本次临床判断后再完成随访。");
    if (highRisk && disposition === "continue_plan") return setError("存在高风险信息，不能仅选择继续原计划；请明确复诊、处方评估或紧急就医措施。");
    if (!reached && (!nextContactDate || !notes.trim())) return setError("联系未成功时必须填写下次联系日期和情况说明。");
    if (!reached && nextContactDate <= todayDate()) return setError("下次联系日期必须晚于今天。");
    const createdAt = new Date().toISOString();
    onSave({
      recordId: record?.recordId ?? `FU-REC-${Date.now()}`,
      taskId: task.id,
      patientId: patient.patient_demo_id,
      milestoneMonth: task.milestoneMonth,
      contactResult,
      communicationMethod,
      contactedAt: new Date(contactedAt).toISOString(),
      symptoms,
      medicationAdherence,
      exerciseAdherence,
      recentEmergencyOrHospitalization: recentHospitalization,
      vitalSigns: vitalSigns.trim(),
      clinicalAssessment: assessment.trim(),
      disposition: disposition || undefined,
      notes: notes.trim(),
      nextContactDate: reached ? undefined : nextContactDate,
      operator: currentAccount,
      createdAt
    });
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6"><div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
    <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><p className="text-[10px] font-bold text-blue-600">{task.milestoneMonth}个月随访 · {task.currentDueDate}</p><h2 className="mt-1 text-lg font-bold">{patient.name} · {patient.patient_code}</h2><p className="mt-1 text-[10px] text-slate-500">主管医生 {patient.assigned_doctor} · 原计划 {task.originalPlannedDate}</p></div><button type="button" aria-label="关闭随访" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
    <div className="overflow-y-auto px-5 py-5 sm:px-6">
      <section className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="患者联系电话" value={patient.phone || "未录入"} /><Info label="随访节点" value={`出院后${task.milestoneMonth}个月`} /><Info label="当前联系日期" value={task.currentDueDate} /><Info label="任务状态" value={followUpStatusLabels[effectiveFollowUpStatus(task)]} /></section>
      <div className="mt-4 flex flex-wrap items-center gap-2">{callablePhone && !readOnly ? <a href={`tel:${patient.phone}`} className="btn-primary"><Phone className="h-4 w-4" />拨打患者电话</a> : <span className="btn-secondary cursor-not-allowed opacity-60"><Phone className="h-4 w-4" />{callablePhone ? "只读查看" : "演示号码已脱敏"}</span>}<p className="text-[10px] text-slate-400">电话入口仅发起系统拨号，不代表已经联系成功。</p></div>

      {readOnly && !record ? <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center"><CalendarClock className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 text-xs font-bold text-slate-700">该节点尚无沟通记录</p><p className="mt-1 text-[10px] text-slate-400">管理员仅可查看计划，不能代医生发起或完成随访。</p></div> : <>
      <section className="mt-5"><SectionHeader title={readOnly ? "随访记录" : "本次沟通结果"} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label><span className="field-label">联系结果</span><select disabled={readOnly} value={contactResult} onChange={(event) => setContactResult(event.target.value as ContactResult)} className="text-field disabled:bg-slate-50"><option value="reached">已接通</option><option value="no_answer">无人接听</option><option value="refused">拒绝沟通</option><option value="invalid_number">号码异常</option></select></label><label><span className="field-label">沟通方式</span><select disabled={readOnly} value={communicationMethod} onChange={(event) => setCommunicationMethod(event.target.value as FollowUpRecord["communicationMethod"])} className="text-field disabled:bg-slate-50"><option value="phone">电话</option><option value="outpatient">门诊沟通</option><option value="other">其他</option></select></label><label><span className="field-label">实际沟通时间</span><input disabled={readOnly} type="datetime-local" value={contactedAt} onChange={(event) => setContactedAt(event.target.value)} className="text-field disabled:bg-slate-50" /></label></div></section>

      {reached ? <div className="space-y-5 pt-5"><section><SectionHeader title="症状与事件" /><div className="flex flex-wrap gap-2">{symptomOptions.map((symptom) => <label key={symptom} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${symptoms.includes(symptom) ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}><input disabled={readOnly} type="checkbox" checked={symptoms.includes(symptom)} onChange={(event) => setSymptoms((items) => event.target.checked ? [...items, symptom] : items.filter((item) => item !== symptom))} />{symptom}</label>)}</div><label className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800"><input disabled={readOnly} type="checkbox" checked={recentHospitalization} onChange={(event) => setRecentHospitalization(event.target.checked)} />近期有急诊就诊或再次住院</label></section><section><SectionHeader title="依从性与临床判断" /><div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">用药依从性</span><select disabled={readOnly} value={medicationAdherence} onChange={(event) => setMedicationAdherence(event.target.value)} className="text-field disabled:bg-slate-50"><option>良好</option><option>偶有漏服</option><option>较差</option><option>无法判断</option></select></label><label><span className="field-label">运动依从性</span><select disabled={readOnly} value={exerciseAdherence} onChange={(event) => setExerciseAdherence(event.target.value)} className="text-field disabled:bg-slate-50"><option>基本按计划完成</option><option>部分完成</option><option>未执行</option><option>无法判断</option></select></label><label><span className="field-label">患者自报生命体征</span><input disabled={readOnly} value={vitalSigns} onChange={(event) => setVitalSigns(event.target.value)} className="text-field disabled:bg-slate-50" placeholder="选填，如家庭血压、心率" /></label><label><span className="field-label">处理措施 *</span><select disabled={readOnly} value={disposition} onChange={(event) => setDisposition(event.target.value as FollowUpDisposition)} className="text-field disabled:bg-slate-50"><option value="">请选择</option>{Object.entries(dispositionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="sm:col-span-2"><span className="field-label">临床判断 *</span><textarea disabled={readOnly} value={assessment} onChange={(event) => setAssessment(event.target.value)} className="text-field min-h-20 py-2 disabled:bg-slate-50" /></label><label className="sm:col-span-2"><span className="field-label">沟通备注</span><textarea disabled={readOnly} value={notes} onChange={(event) => setNotes(event.target.value)} className="text-field min-h-16 py-2 disabled:bg-slate-50" /></label></div></section></div> : <section className="mt-5"><SectionHeader title="再次联系安排" description="联系失败不算完成，原计划日期和本次尝试会继续保留。" /><div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">下次联系日期 *</span><input disabled={readOnly} type="date" min={new Date().toISOString().slice(0, 10)} value={nextContactDate} onChange={(event) => setNextContactDate(event.target.value)} className="text-field disabled:bg-slate-50" /></label><label><span className="field-label">情况说明 *</span><textarea disabled={readOnly} value={notes} onChange={(event) => setNotes(event.target.value)} className="text-field min-h-20 py-2 disabled:bg-slate-50" /></label></div></section>}

      {highRisk && <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-800"><AlertTriangle className="h-5 w-5 shrink-0" /><div><b>发现高风险信息</b><p className="mt-1">请明确提前复诊、处方调整评估或紧急就医措施。本系统不替代医生诊断及急救处置。</p></div></div>}
      {error && <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
      </>}
      {!!task.rescheduleHistory.length && <section className="mt-5"><SectionHeader title="改期记录" /><div className="space-y-2">{task.rescheduleHistory.map((item, index) => <div key={`${item.changedAt}-${index}`} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{item.fromDate} → {item.toDate} · {item.reason} · {item.changedBy}</div>)}</div></section>}
    </div>
    <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6"><button type="button" onClick={onClose} className="btn-secondary">{readOnly ? "关闭" : "取消"}</button>{!readOnly && <button type="button" onClick={submit} className="btn-primary"><Save className="h-4 w-4" />{reached ? "完成随访" : "保存联系结果"}</button>}</div>
  </div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-bold text-blue-500">{label}</p><p className="mt-1 text-xs font-bold text-blue-950">{value}</p></div>;
}
