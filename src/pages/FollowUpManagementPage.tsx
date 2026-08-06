import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Phone, PhoneCall, Save, Search, X } from "lucide-react";
import { PageHeader, StatusBadge } from "../components/UI";
import {
  contactResultLabels,
  daysUntil,
  effectiveFollowUpStatus,
  followUpStatusLabels,
  type ContactResult,
  type FollowUpRecord,
  type FollowUpStatus,
  type FollowUpTask
} from "../followUpData";
import type { ManagedPatient } from "./PatientArchivePage";

export type FollowUpView = "all" | "pending" | "overdue" | "completed";

function statusTone(status: FollowUpStatus): "gray" | "blue" | "orange" | "red" | "green" {
  if (status === "completed") return "green";
  if (status === "overdue" || status === "review_required") return "red";
  if (status === "due") return "orange";
  if (status === "rescheduled") return "blue";
  return "gray";
}

function nowForInput() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function FollowUpManagementPage({ role, currentAccount, patients, tasks, records, initialView = "pending", initialTaskId, onSaveRecord, onOpenPatient }: {
  role: "ADMIN" | "DOCTOR" | "REHAB_EXECUTION";
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

  useEffect(() => {
    setView(initialView);
    setSelectedTaskId(initialTaskId ?? null);
  }, [initialTaskId, initialView]);

  const scopedTasks = useMemo(() => role === "DOCTOR" ? tasks.filter((task) => task.assignedDoctor === currentAccount) : tasks, [currentAccount, role, tasks]);
  const patientMap = useMemo(() => new Map(patients.map((patient) => [patient.patient_demo_id, patient])), [patients]);
  const visibleTasks = useMemo(() => scopedTasks.filter((task) => {
    const patient = patientMap.get(task.patientId);
    if (!patient) return false;
    const status = effectiveFollowUpStatus(task);
    const matchesView = view === "all" || (view === "completed" ? status === "completed" : view === "overdue" ? status === "overdue" : status !== "completed");
    const text = `${patient.name} ${patient.patient_no} ${patient.assigned_doctor}`.toLowerCase();
    return matchesView && (!keyword.trim() || text.includes(keyword.trim().toLowerCase()));
  }).sort((left, right) => {
    const priority: Record<FollowUpStatus, number> = { overdue: 0, due: 1, review_required: 2, rescheduled: 3, upcoming: 4, completed: 5 };
    return priority[effectiveFollowUpStatus(left)] - priority[effectiveFollowUpStatus(right)] || left.currentDueDate.localeCompare(right.currentDueDate);
  }), [keyword, patientMap, scopedTasks, view]);

  const pendingCount = scopedTasks.filter((task) => effectiveFollowUpStatus(task) !== "completed").length;
  const completedCount = scopedTasks.length - pendingCount;
  const overdueCount = scopedTasks.filter((task) => effectiveFollowUpStatus(task) === "overdue").length;
  const selectedTask = selectedTaskId ? scopedTasks.find((task) => task.id === selectedTaskId) : undefined;
  const selectedPatient = selectedTask ? patientMap.get(selectedTask.patientId) : undefined;
  const selectedRecord = selectedTask ? records.filter((record) => record.taskId === selectedTask.id).sort((a, b) => b.contactedAt.localeCompare(a.contactedAt))[0] : undefined;
  const title = role === "DOCTOR" ? "我的随访管理" : role === "REHAB_EXECUTION" ? "中心随访管理" : "随访管理只读总览";

  return <section data-testid="page-VIEW-FOLLOWUPS">
    <PageHeader eyebrow="院后康复 · 最小随访闭环" title={title} description="系统仅提供到期提醒、电话拨号和联系结果记录；1/3/6个月节点为Demo规则，正式周期待医院确认。" action={<StatusBadge tone={role === "ADMIN" ? "gray" : "blue"}>{role === "ADMIN" ? "管理员只读" : "可执行电话随访"}</StatusBadge>} />

    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <Metric label="待随访" value={pendingCount} icon={<CalendarClock className="h-5 w-5" />} tone="orange" />
      <Metric label="已完成" value={completedCount} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
    </div>

    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex rounded-lg bg-slate-100 p-1">
          {([['all', `全部 ${scopedTasks.length}`], ['overdue', `已逾期 ${overdueCount}`], ['pending', `待随访 ${pendingCount}`], ['completed', `已完成 ${completedCount}`]] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setView(key)} className={`rounded-md px-4 py-2 text-xs font-bold ${view === key ? key === "overdue" ? "bg-red-50 text-red-700 shadow-sm" : "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>{label}</button>)}
        </div>
        <label className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="text-field pl-9" placeholder="患者姓名、编号或责任医生" /></label>
      </div>
      <div className="overflow-x-auto"><div className="min-w-[980px]">
        <div className="grid grid-cols-[1fr_0.8fr_0.9fr_0.9fr_0.75fr_0.8fr_1fr] bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500"><span>患者</span><span>患者编号</span><span>责任医生</span><span>联系电话</span><span>随访节点</span><span>计划日期</span><span>操作</span></div>
        {visibleTasks.map((task) => {
          const patient = patientMap.get(task.patientId)!;
          const status = effectiveFollowUpStatus(task);
          return <div key={task.id} className="grid grid-cols-[1fr_0.8fr_0.9fr_0.9fr_0.75fr_0.8fr_1fr] items-center border-t border-slate-100 px-5 py-3 text-sm">
            <button type="button" onClick={() => onOpenPatient(patient.patient_demo_id)} className="text-left font-bold text-blue-700">{patient.name}</button>
            <span className="font-mono text-xs">{patient.patient_no}</span><span>{task.assignedDoctor}</span><span>{patient.phone || "未录入"}</span><span>出院后{task.milestoneMonth}个月</span><span>{task.currentDueDate}</span>
            <div className="flex items-center gap-2"><StatusBadge tone={statusTone(status)}>{followUpStatusLabels[status]}</StatusBadge>{status !== "completed" && role !== "ADMIN" && <><a className="btn-secondary !min-h-8 !px-2" href={`tel:${patient.phone}`}><Phone className="h-3.5 w-3.5" />拨打</a><button type="button" className="btn-primary !min-h-8 !px-2" onClick={() => setSelectedTaskId(task.id)}>记录结果</button></>}{(status === "completed" || role === "ADMIN") && <button type="button" className="btn-secondary !min-h-8 !px-2" onClick={() => setSelectedTaskId(task.id)}>查看</button>}</div>
          </div>;
        })}
        {!visibleTasks.length && <p className="py-14 text-center text-sm text-slate-400">当前没有符合条件的随访任务</p>}
      </div></div>
    </section>

    {selectedTask && selectedPatient && <FollowUpDialog task={selectedTask} patient={selectedPatient} record={selectedRecord} readOnly={role === "ADMIN" || effectiveFollowUpStatus(selectedTask) === "completed"} currentAccount={currentAccount} onClose={() => setSelectedTaskId(null)} onSave={(record) => { onSaveRecord(record); setSelectedTaskId(null); }} />}
  </section>;
}

export function FollowUpDialog({ task, patient, record, readOnly, currentAccount, onClose, onSave }: { task: FollowUpTask; patient: ManagedPatient; record?: FollowUpRecord; readOnly: boolean; currentAccount: string; onClose: () => void; onSave: (record: FollowUpRecord) => void }) {
  const [result, setResult] = useState<ContactResult>(record?.contactResult ?? "reached");
  const [contactedAt, setContactedAt] = useState(record?.contactedAt?.slice(0, 16) ?? nowForInput());
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [needsRetry, setNeedsRetry] = useState(record ? Boolean(record.nextContactDate) : false);
  const [nextDate, setNextDate] = useState(record?.nextContactDate ?? "");
  const [error, setError] = useState("");

  function submit() {
    if (result !== "reached" && needsRetry && !nextDate) return setError("请选择下次联系日期。\n");
    if (result !== "reached" && !notes.trim()) return setError("请填写简要情况说明。\n");
    const now = new Date().toISOString();
    onSave({
      recordId: record?.recordId ?? `FU-REC-${Date.now()}`, taskId: task.id, patientId: task.patientId, milestoneMonth: task.milestoneMonth,
      contactResult: result, communicationMethod: "phone", contactedAt, symptoms: [], medicationAdherence: "未记录", exerciseAdherence: "未记录", trainingFrequency: "", trainingDuration: "", recentEmergencyOrHospitalization: false, vitalSigns: "", patientDifficulty: "", therapistAdvice: "", clinicalAssessment: result === "reached" ? "已完成人工电话随访" : "本次未完成有效沟通", notes, nextContactDate: result !== "reached" && needsRetry ? nextDate : undefined, operator: currentAccount, createdAt: now
    });
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><section className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
    <div className="flex items-start justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-bold text-blue-600">出院后{task.milestoneMonth}个月 · 计划 {task.currentDueDate}</p><h2 className="mt-1 text-xl font-bold">{patient.name} · 电话随访</h2><p className="mt-1 text-sm text-slate-500">{patient.phone || "联系电话未录入"} · 责任医生 {task.assignedDoctor}</p></div><button type="button" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button></div>
    <div className="space-y-4 p-5">
      {!readOnly && <a href={`tel:${patient.phone}`} className="btn-secondary w-fit"><PhoneCall className="h-4 w-4" />拨打患者电话</a>}
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">联系结果</span><select disabled={readOnly} className="text-field disabled:bg-slate-50" value={result} onChange={(event) => setResult(event.target.value as ContactResult)}>{Object.entries(contactResultLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="field-label">实际联系时间</span><input disabled={readOnly} type="datetime-local" className="text-field disabled:bg-slate-50" value={contactedAt} onChange={(event) => setContactedAt(event.target.value)} /></label></div>
      <label><span className="field-label">简要记录</span><textarea disabled={readOnly} className="text-field min-h-24 py-2 disabled:bg-slate-50" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="记录患者口述情况或本次未接通原因" /></label>
      {result !== "reached" && <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><label className="flex items-center gap-2 text-sm font-semibold"><input disabled={readOnly} type="checkbox" checked={needsRetry} onChange={(event) => setNeedsRetry(event.target.checked)} />需要再次联系</label>{needsRetry && <label><span className="field-label">下次联系日期</span><input disabled={readOnly} type="date" className="text-field disabled:bg-slate-100" value={nextDate} onChange={(event) => setNextDate(event.target.value)} /></label>}</div>}
      <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">操作人：{record?.operator ?? currentAccount}。患者不在患者端填写随访问卷。</p>{error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
    <div className="flex justify-end gap-2 border-t border-slate-100 p-4"><button type="button" className="btn-secondary" onClick={onClose}>{readOnly ? "关闭" : "取消"}</button>{!readOnly && <button type="button" className="btn-primary" onClick={submit}><Save className="h-4 w-4" />保存结果</button>}</div>
  </section></div>;
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "orange" | "green" }) {
  return <article className="card flex items-center gap-4 p-4"><span className={`rounded-xl p-3 ${tone === "orange" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{icon}</span><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div></article>;
}
