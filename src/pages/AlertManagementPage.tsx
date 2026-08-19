import { useMemo, useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, Search, Settings2, X } from "lucide-react";
import { canActAs } from "../accessControl";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { AlertEvent, AlertRule, AlertSeverity, AlertStatus, PrescriptionTask } from "../clinicalWorkflowData";
import type { StaffRole } from "../types";
import type { ManagedPatient } from "./PatientArchivePage";

const severityLabel: Record<AlertSeverity, string> = { notice: "提示", warning: "警告", critical: "严重" };
const statusLabel: Record<AlertStatus, string> = { pending: "待处理", processing: "处理中", pending_doctor_review: "待医生复核", closed: "已完成" };
export type AlertStatusFilter = AlertStatus | "all" | "unfinished";

export function AlertManagementPage({ role, accountId, initialStatus = "all", patients, prescriptionTasks, events, setEvents, rules, setRules }: {
  role: StaffRole;
  accountId: string;
  initialStatus?: AlertStatusFilter;
  patients: ManagedPatient[];
  prescriptionTasks: PrescriptionTask[];
  events: AlertEvent[];
  setEvents: React.Dispatch<React.SetStateAction<AlertEvent[]>>;
  rules: AlertRule[];
  setRules: React.Dispatch<React.SetStateAction<AlertRule[]>>;
}) {
  const [tab, setTab] = useState<"events" | "rules">("events");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [status, setStatus] = useState<AlertStatusFilter>(initialStatus);
  const [patientName, setPatientName] = useState("");
  const [patientNo, setPatientNo] = useState("");
  const canRecordOnSite = canActAs(role, "REHAB_EXECUTION");
  const canReview = canActAs(role, "DOCTOR");
  const selected = events.find((item) => item.id === selectedId);
  const patientMap = useMemo(() => new Map(patients.map((patient) => [patient.patient_demo_id, patient])), [patients]);
  const doctorPatientIds = useMemo(() => new Set(prescriptionTasks.filter((task) => task.assignedDoctorId === accountId).map((task) => task.patientId)), [accountId, prescriptionTasks]);
  const scopedEvents = useMemo(() => role === "DOCTOR" ? events.filter((item) => doctorPatientIds.has(item.patientId)) : events, [doctorPatientIds, events, role]);
  const filteredEvents = useMemo(() => scopedEvents.filter((item) => {
    if (patientName.trim() && !item.patientName.includes(patientName.trim())) return false;
    const currentPatientNo = patientMap.get(item.patientId)?.patient_no ?? item.patientId;
    if (patientNo.trim() && !currentPatientNo.toLowerCase().includes(patientNo.trim().toLowerCase())) return false;
    if (status === "unfinished") return item.status !== "closed";
    return status === "all" || item.status === status;
  }).sort((a, b) => {
    if (a.status === "closed" && b.status !== "closed") return 1;
    if (a.status !== "closed" && b.status === "closed") return -1;
    return b.occurredAt.localeCompare(a.occurredAt);
  }), [patientMap, patientName, patientNo, scopedEvents, status]);

  function updateEvent(patch: Partial<AlertEvent>) {
    if (!selected) return;
    setEvents((items) => items.map((item) => item.id === selected.id ? { ...item, ...patch } : item));
  }

  function resetFilters() {
    setStatus("all");
    setPatientName("");
    setPatientNo("");
  }

  function saveAndComplete() {
    if (!selected?.doctorConclusion?.trim() || !canReview) return;
    setEvents((items) => items.map((item) => item.id === selected.id ? { ...item, status: "closed" } : item));
    setSelectedId(null);
  }

  return <section data-testid="page-VIEW-ALERTS">
    <PageHeader eyebrow="训练安全 · 事件闭环" title="异常告警" description="设备异常和患者主诉先形成快照，康复师记录现场处置，医生完成临床复核；阈值均为Demo演示口径。" action={<StatusBadge tone="red"><AlertTriangle className="h-3.5 w-3.5" />{scopedEvents.filter((item) => item.status !== "closed").length} 条待闭环</StatusBadge>} />
    <div className="mb-4 flex gap-2"><button className={tab === "events" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("events")}>异常事件</button><button className={tab === "rules" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("rules")}><Settings2 className="h-4 w-4" />异常规则</button></div>
    {tab === "events" ? <section className="card overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-end gap-3 border-b border-slate-100 bg-slate-50 p-4">
        <label><span className="field-label">状态</span><select className="text-field" value={status} onChange={(event) => setStatus(event.target.value as AlertStatusFilter)}><option value="all">全部状态</option><option value="unfinished">全部未完成</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span className="field-label">患者姓名</span><input className="text-field" value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="输入患者姓名" /></label>
        <label><span className="field-label">患者号</span><input className="text-field" value={patientNo} onChange={(event) => setPatientNo(event.target.value)} placeholder="例如 000001" /></label>
        <button type="button" className="btn-primary"><Search className="h-4 w-4" />查询</button>
        <button type="button" className="btn-secondary" onClick={resetFilters}>重置</button>
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500"><span>查询结果 {filteredEvents.length} 条</span>{role === "DOCTOR" && <StatusBadge tone="blue">仅显示本人负责患者</StatusBadge>}</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-xs"><thead><tr className="bg-slate-50 text-slate-500"><th className="p-3">患者</th><th>训练记录</th><th>异常类型</th><th>严重度</th><th>测量值</th><th>Demo阈值</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>{filteredEvents.map((item) => <tr key={item.id} className="border-t"><td className="p-3"><b>{item.patientName}</b><span className="block text-xs text-slate-400">{patientMap.get(item.patientId)?.patient_no ?? item.patientId}</span></td><td>{item.sessionId}</td><td>{item.type}</td><td><StatusBadge tone={item.severity === "critical" ? "red" : "orange"}>{severityLabel[item.severity]}</StatusBadge></td><td className="font-bold text-red-600">{item.value}</td><td>{item.threshold}</td><td><StatusBadge tone={item.status === "closed" ? "green" : item.status === "pending_doctor_review" ? "orange" : "blue"}>{statusLabel[item.status]}</StatusBadge></td><td>{item.occurredAt}</td><td><button className="font-bold text-blue-600" onClick={() => { setSelectedId(item.id); setAiOpen(false); }}>{item.status === "closed" ? "查看结果" : "填写处理"}</button><button className="ml-3 font-bold text-violet-600" onClick={() => { setSelectedId(item.id); setAiOpen(true); }}>AI解读</button></td></tr>)}</tbody></table>{!filteredEvents.length && <p className="py-12 text-center text-sm text-slate-400">当前筛选条件下暂无异常记录。</p>}</div>
    </section> : <RulePanel role={role} rules={rules} setRules={setRules} />}

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6" onMouseDown={() => { setSelectedId(null); setAiOpen(false); }}><article className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-red-600">{selected.id} · {severityLabel[selected.severity]}</p><h2 className="mt-1 text-lg font-bold">{selected.patientName} · {selected.type}</h2></div><button onClick={() => { setSelectedId(null); setAiOpen(false); }}><X className="h-5 w-5" /></button></div>{aiOpen ? <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-blue-900"><Bot className="h-5 w-5" />AI辅助解读</h3><p className="mt-3 text-xs leading-6 text-blue-900">该记录触发“{selected.type}”规则。建议结合运动阶段、患者症状、用药、设备质量和复测结果综合判断；优先确认传感器连接并按现场流程暂停或降低强度。</p><p className="mt-3 border-t border-blue-200 pt-3 text-xs font-bold text-blue-700">辅助信息，不替代医生判断，不生成诊断或处方。</p></div> : <div className="mt-5 space-y-4"><div className="rounded-xl bg-slate-50 p-4 text-xs leading-6"><b>触发快照：</b>{selected.snapshot}</div><label><span className="field-label">康复师现场记录</span><textarea disabled={!canRecordOnSite || selected.status === "closed"} className="text-field min-h-24" value={selected.onSiteRecord ?? ""} onChange={(event) => updateEvent({ onSiteRecord: event.target.value, status: "processing" })} placeholder="记录暂停、复测与现场处置" /></label><label><span className="field-label">医生处理结论</span><textarea disabled={!canReview || selected.status === "closed"} className="text-field min-h-24" value={selected.doctorConclusion ?? ""} onChange={(event) => updateEvent({ doctorConclusion: event.target.value })} placeholder="填写复核判断和后续处理意见" /></label><div className="flex items-center justify-between"><StatusBadge tone={selected.status === "closed" ? "green" : "orange"}>{statusLabel[selected.status]}</StatusBadge><div className="flex gap-3">{canRecordOnSite && selected.status !== "closed" && <button className="btn-primary" disabled={!selected.onSiteRecord?.trim()} onClick={() => updateEvent({ status: "pending_doctor_review" })}>保存并提交医生</button>}{canReview && selected.status !== "closed" && <button className="btn-primary" disabled={!selected.doctorConclusion?.trim()} onClick={saveAndComplete}><CheckCircle2 className="h-4 w-4" />保存并完成</button>}</div></div></div>}</article></div>}
  </section>;
}

function RulePanel({ role, rules, setRules }: { role: StaffRole; rules: AlertRule[]; setRules: React.Dispatch<React.SetStateAction<AlertRule[]>> }) {
  return <div className="space-y-4"><p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">所有阈值仅用于界面与流程演示，不代表医院临床标准；正式阈值必须由医院确认。</p>{(["心率", "血氧", "收缩压"] as const).map((metric) => <section key={metric} className="card overflow-hidden"><div className="border-b p-4"><SectionHeader title={`${metric}规则`} /></div><table className="w-full text-left text-xs"><thead><tr className="bg-slate-50 text-slate-500"><th className="p-3">规则名称</th><th>条件</th><th>编码</th><th>严重度</th><th>医学说明</th><th>启用</th></tr></thead><tbody>{rules.filter((rule) => rule.metric === metric).map((rule) => <tr key={rule.id} className="border-t"><td className="p-3 font-semibold">{rule.name}</td><td>{rule.condition}</td><td className="font-mono text-[10px]">{rule.code}</td><td>{severityLabel[rule.severity]}</td><td className="max-w-md text-slate-500">{rule.explanation}</td><td><button disabled={role !== "ADMIN"} className={`h-6 w-11 rounded-full p-1 ${rule.enabled ? "bg-blue-600" : "bg-slate-300"} disabled:opacity-50`} onClick={() => setRules((items) => items.map((item) => item.id === rule.id ? { ...item, enabled: !item.enabled } : item))}><span className={`block h-4 w-4 rounded-full bg-white transition ${rule.enabled ? "translate-x-5" : ""}`} /></button></td></tr>)}</tbody></table></section>)}</div>;
}
