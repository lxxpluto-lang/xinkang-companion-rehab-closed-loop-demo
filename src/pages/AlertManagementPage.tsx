import { useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, Settings2, X } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { AlertEvent, AlertRule, AlertSeverity, AlertStatus } from "../clinicalWorkflowData";
import type { StaffRole } from "../types";

const severityLabel: Record<AlertSeverity, string> = { notice: "提示", warning: "警告", critical: "严重" };
const statusLabel: Record<AlertStatus, string> = { pending: "待处理", processing: "处理中", pending_doctor_review: "待医生复核", closed: "已闭环" };

export function AlertManagementPage({ role, events, setEvents, rules, setRules }: {
  role: StaffRole;
  events: AlertEvent[];
  setEvents: React.Dispatch<React.SetStateAction<AlertEvent[]>>;
  rules: AlertRule[];
  setRules: React.Dispatch<React.SetStateAction<AlertRule[]>>;
}) {
  const [tab, setTab] = useState<"events" | "rules">("events");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const selected = events.find((item) => item.id === selectedId);

  function updateEvent(patch: Partial<AlertEvent>) {
    if (!selected || role === "ADMIN") return;
    setEvents((items) => items.map((item) => item.id === selected.id ? { ...item, ...patch } : item));
  }

  return <section data-testid="page-VIEW-ALERTS">
    <PageHeader eyebrow="训练安全 · 事件闭环" title="异常告警" description="设备异常和患者主诉先形成快照，康复师记录现场处置，医生完成临床复核；阈值均为Demo演示口径。" action={<StatusBadge tone="red"><AlertTriangle className="h-3.5 w-3.5" />{events.filter((item) => item.status !== "closed").length} 条待闭环</StatusBadge>} />
    <div className="mb-4 flex gap-2"><button className={tab === "events" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("events")}>异常事件</button><button className={tab === "rules" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("rules")}><Settings2 className="h-4 w-4" />异常规则</button></div>
    {tab === "events" ? <section className="card overflow-hidden"><table className="w-full min-w-[980px] text-left text-xs"><thead><tr className="bg-slate-50 text-slate-500"><th className="p-3">患者</th><th>训练记录</th><th>异常类型</th><th>严重度</th><th>测量值</th><th>Demo阈值</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>{events.map((item) => <tr key={item.id} className="border-t"><td className="p-3"><b>{item.patientName}</b><span className="block text-[10px] text-slate-400">{item.patientId}</span></td><td>{item.sessionId}</td><td>{item.type}</td><td><StatusBadge tone={item.severity === "critical" ? "red" : "orange"}>{severityLabel[item.severity]}</StatusBadge></td><td className="font-bold text-red-600">{item.value}</td><td>{item.threshold}</td><td><StatusBadge tone={item.status === "closed" ? "green" : "blue"}>{statusLabel[item.status]}</StatusBadge></td><td>{item.occurredAt}</td><td><button className="font-bold text-blue-600" onClick={() => setSelectedId(item.id)}>闭环处理</button><button className="ml-3 font-bold text-violet-600" onClick={() => { setSelectedId(item.id); setAiOpen(true); }}>AI解读</button></td></tr>)}</tbody></table></section> : <RulePanel role={role} rules={rules} setRules={setRules} />}

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6" onMouseDown={() => { setSelectedId(null); setAiOpen(false); }}><article className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold text-red-600">{selected.id} · {severityLabel[selected.severity]}</p><h2 className="mt-1 text-lg font-bold">{selected.patientName} · {selected.type}</h2></div><button onClick={() => { setSelectedId(null); setAiOpen(false); }}><X className="h-5 w-5" /></button></div>{aiOpen ? <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-blue-900"><Bot className="h-5 w-5" />AI辅助解读</h3><p className="mt-3 text-xs leading-6 text-blue-900">该记录触发“{selected.type}”规则。建议结合运动阶段、患者症状、用药、设备质量和复测结果综合判断；优先确认传感器连接并按现场流程暂停或降低强度。</p><p className="mt-3 border-t border-blue-200 pt-3 text-[10px] font-bold text-blue-700">辅助信息，不替代医生判断，不生成诊断或处方。</p></div> : <div className="mt-5 space-y-4"><div className="rounded-xl bg-slate-50 p-4 text-xs leading-6"><b>触发快照：</b>{selected.snapshot}</div><label><span className="field-label">康复师现场记录</span><textarea disabled={role !== "REHAB_EXECUTION" || selected.status === "closed"} className="text-field min-h-24" value={selected.onSiteRecord ?? ""} onChange={(event) => updateEvent({ onSiteRecord: event.target.value, status: "processing" })} /></label><label><span className="field-label">医生复核结论</span><textarea disabled={role !== "DOCTOR" || selected.status === "closed"} className="text-field min-h-24" value={selected.doctorConclusion ?? ""} onChange={(event) => updateEvent({ doctorConclusion: event.target.value })} /></label><div className="flex justify-end gap-3">{role === "REHAB_EXECUTION" && selected.status !== "closed" && <button className="btn-primary" disabled={!selected.onSiteRecord} onClick={() => updateEvent({ status: "pending_doctor_review" })}>提交医生复核</button>}{role === "DOCTOR" && selected.status === "pending_doctor_review" && <button className="btn-primary" disabled={!selected.doctorConclusion} onClick={() => updateEvent({ status: "closed" })}><CheckCircle2 className="h-4 w-4" />确认闭环</button>}</div></div>}</article></div>}
  </section>;
}

function RulePanel({ role, rules, setRules }: { role: StaffRole; rules: AlertRule[]; setRules: React.Dispatch<React.SetStateAction<AlertRule[]>> }) {
  return <div className="space-y-4"><p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">所有阈值仅用于界面与流程演示，不代表医院临床标准；正式阈值必须由医院确认。</p>{(["心率", "血氧", "收缩压"] as const).map((metric) => <section key={metric} className="card overflow-hidden"><div className="border-b p-4"><SectionHeader title={`${metric}规则`} /></div><table className="w-full text-left text-xs"><thead><tr className="bg-slate-50 text-slate-500"><th className="p-3">规则名称</th><th>条件</th><th>编码</th><th>严重度</th><th>医学说明</th><th>启用</th></tr></thead><tbody>{rules.filter((rule) => rule.metric === metric).map((rule) => <tr key={rule.id} className="border-t"><td className="p-3 font-semibold">{rule.name}</td><td>{rule.condition}</td><td className="font-mono text-[10px]">{rule.code}</td><td>{severityLabel[rule.severity]}</td><td className="max-w-md text-slate-500">{rule.explanation}</td><td><button disabled={role !== "ADMIN"} className={`h-6 w-11 rounded-full p-1 ${rule.enabled ? "bg-blue-600" : "bg-slate-300"} disabled:opacity-50`} onClick={() => setRules((items) => items.map((item) => item.id === rule.id ? { ...item, enabled: !item.enabled } : item))}><span className={`block h-4 w-4 rounded-full bg-white transition ${rule.enabled ? "translate-x-5" : ""}`} /></button></td></tr>)}</tbody></table></section>)}</div>;
}
