import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, FileSignature, PencilLine, Printer, Search, Sparkles, X } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import { createAiDraft, type PrescriptionDraft, type PrescriptionStatus, type PrescriptionTask } from "../clinicalWorkflowData";
import type { StaffRole } from "../types";

const statusLabel: Record<PrescriptionStatus, string> = {
  pending_generation: "待生成",
  pending_review: "待复核",
  pending_signature: "待签署",
  completed: "已完成",
  withdrawn: "已撤回"
};

type StatusFilter = PrescriptionStatus | "all" | "unfinished";

export function PrescriptionManagementPage({ role, accountId, tasks, setTasks, initialStatus = "all" }: {
  role: StaffRole;
  accountId: string;
  tasks: PrescriptionTask[];
  setTasks: React.Dispatch<React.SetStateAction<PrescriptionTask[]>>;
  initialStatus?: "all" | "unfinished";
}) {
  const [patientNo, setPatientNo] = useState("");
  const [prescriptionNo, setPrescriptionNo] = useState("");
  const [doctorId, setDoctorId] = useState(role === "DOCTOR" ? accountId : "all");
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmResponsibility, setConfirmResponsibility] = useState(false);
  const selected = tasks.find((item) => item.id === selectedId);
  const pendingCount = tasks.filter((item) => item.status !== "completed" && item.status !== "withdrawn" && (role !== "DOCTOR" || item.assignedDoctorId === accountId)).length;
  const completedCount = tasks.filter((item) => item.status === "completed" && (role !== "DOCTOR" || item.assignedDoctorId === accountId)).length;

  useEffect(() => setStatus(initialStatus), [initialStatus]);
  useEffect(() => { if (role === "DOCTOR") setDoctorId(accountId); }, [accountId, role]);

  const filtered = useMemo(() => tasks.filter((item) => {
    if (role === "DOCTOR" && item.assignedDoctorId !== accountId) return false;
    if (doctorId !== "all" && item.assignedDoctorId !== doctorId) return false;
    if (patientNo && !item.patientNo.toLowerCase().includes(patientNo.trim().toLowerCase())) return false;
    if (prescriptionNo && !item.prescriptionNo.toLowerCase().includes(prescriptionNo.trim().toLowerCase())) return false;
    if (status === "unfinished") return item.status !== "completed" && item.status !== "withdrawn";
    return status === "all" || item.status === status;
  }), [accountId, doctorId, patientNo, prescriptionNo, role, status, tasks]);

  const editable = Boolean(selected && ((role === "DOCTOR" && selected.assignedDoctorId === accountId) || role === "ADMIN"));

  function updateSelected(patch: Partial<PrescriptionTask>) {
    if (!selected || !editable) return;
    setTasks((items) => items.map((item) => item.id === selected.id ? { ...item, ...patch, updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }) } : item));
  }

  function resetFilters() {
    setPatientNo("");
    setPrescriptionNo("");
    setDoctorId(role === "DOCTOR" ? accountId : "all");
    setStatus("all");
  }

  return <section data-testid="page-VIEW-PRESCRIPTIONS">
    <PageHeader eyebrow="处方管理" title={role === "DOCTOR" ? "我的运动处方" : "运动处方总台"} description={role === "REHAB_EXECUTION" ? "康复师可查看已确认处方及训练依据，不可生成、编辑或签署。" : "未完成处方可生成草稿、复核和签署；已完成处方只读并可打印。"} action={<span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600"><ClipboardList className="h-4 w-4 text-blue-600" />未完成 {pendingCount} · 已完成 {completedCount}</span>} />
    <section className="card overflow-hidden">
      <div className="px-5 pt-5"><SectionHeader title="本人处方任务" description="通过患者号、处方号、所属医生和状态组合筛选；工作台跳转会自动带入未完成状态。" /></div>
      <div className="mt-4 grid grid-cols-[1fr_1.1fr_1fr_1fr_auto_auto] items-end gap-3 border-y border-slate-100 bg-slate-50 px-5 py-4">
        <label><span className="field-label">患者号</span><input value={patientNo} onChange={(event) => setPatientNo(event.target.value)} className="text-field" placeholder="例如 P-000001" /></label>
        <label><span className="field-label">处方号</span><input value={prescriptionNo} onChange={(event) => setPrescriptionNo(event.target.value)} className="text-field" placeholder="例如 RX-10001-0020" /></label>
        <label><span className="field-label">所属医生</span><select disabled={role === "DOCTOR"} value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="text-field disabled:bg-slate-100"><option value="all">全部医生</option><option value="doctor001">王医生</option><option value="doctor002">李医生</option></select></label>
        <label><span className="field-label">状态</span><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="text-field"><option value="all">全部状态</option><option value="unfinished">未完成</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" className="btn-primary"><Search className="h-4 w-4" />查询</button>
        <button type="button" onClick={resetFilters} className="btn-secondary">重置</button>
      </div>
      <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500"><span>查询结果 {filtered.length} 条</span>{status === "unfinished" && <StatusBadge tone="orange">已筛选：未完成处方</StatusBadge>}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1380px] text-left text-xs">
          <thead><tr className="border-y border-slate-100 bg-slate-50 text-[10px] text-slate-400"><th className="p-3">患者姓名</th><th>患者号</th><th>处方号</th><th>版本</th><th>阶段</th><th>分组</th><th>类型</th><th>依据</th><th>生成时间</th><th>所属医生</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>{filtered.map((item) => <tr key={item.id} className="border-b border-slate-100 hover:bg-blue-50/40"><td className="p-3 font-bold text-slate-900">{item.patientName}</td><td className="font-mono text-slate-500">{item.patientNo}</td><td className="font-mono text-blue-700">{item.prescriptionNo}</td><td>{item.version}</td><td>{item.rehabStage}</td><td><StatusBadge tone={item.risk === "高危" ? "red" : item.risk === "中危" ? "orange" : "green"}>{item.risk}</StatusBadge></td><td>{item.kind === "initial" ? "初始" : "调整"}</td><td>{item.sourceLabel ?? "基线评估"}</td><td className="text-slate-500">{item.generatedAt ?? item.updatedAt}</td><td>{item.assignedDoctorName}</td><td><StatusBadge tone={item.status === "completed" ? "green" : item.status === "withdrawn" ? "red" : item.status === "pending_signature" ? "orange" : "blue"}>{statusLabel[item.status]}</StatusBadge></td><td><button type="button" onClick={() => { setSelectedId(item.id); setConfirmResponsibility(false); }} className="inline-flex items-center gap-1 font-bold text-blue-700">{item.status === "pending_generation" ? <><Sparkles className="h-3.5 w-3.5" />AI生成草稿</> : item.status === "completed" ? <><Printer className="h-3.5 w-3.5" />查看/打印</> : <><PencilLine className="h-3.5 w-3.5" />编辑审核</>}<ArrowRight className="h-3.5 w-3.5" /></button></td></tr>)}</tbody>
        </table>
        {!filtered.length && <p className="py-12 text-center text-xs text-slate-400">当前筛选条件下暂无处方。</p>}
      </div>
    </section>

    {selected && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onMouseDown={() => setSelectedId(null)}>
      <article className="h-full w-[min(1120px,94vw)] overflow-y-auto bg-[#f7f9fc] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4"><div><p className="text-[10px] font-bold text-blue-600">处方审核</p><h2 className="mt-1 text-lg font-bold">{selected.prescriptionNo} · {selected.patientName}</h2></div><button type="button" onClick={() => setSelectedId(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
        <div className="space-y-5 p-6">
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-900"><b>AI辅助说明：</b>根据患者分组、风险和既有报告生成可编辑草稿。AI不替代医生判断，不自动诊断、签署或发布；所有参数必须由有权人员确认。</section>
          <section className="card p-5"><SectionHeader title="患者临床摘要" description="仅展示处方判断所需的最小信息，详细数据可回到患者档案查看。" /><div className="mt-4 grid grid-cols-4 gap-3">{[["姓名/年龄", `${selected.patientName} / ${selected.age}岁`], ["康复阶段", selected.rehabStage], ["危险分组", selected.risk], ["诊断", selected.diagnosis], ["特殊用药", selected.specialMedication], ["上一版", selected.previous ? "有可追溯版本" : "—"], ["体能评估", "已完成（Demo）"], ["最近训练", "数据完整率96%"]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] text-slate-400">{label}</p><p className="mt-1 text-xs font-semibold text-slate-800">{value}</p></div>)}</div></section>
          {!selected.aiSuggestion && <button type="button" disabled={!editable} onClick={() => updateSelected({ aiSuggestion: createAiDraft(selected), status: "pending_review" })} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"><Sparkles className="h-4 w-4" />生成AI处方草稿</button>}
          {selected.aiSuggestion && <PrescriptionComparison previous={selected.previous} ai={selected.aiSuggestion} final={selected.doctorFinal ?? selected.aiSuggestion} editable={editable && selected.status !== "completed" && selected.status !== "withdrawn"} onChange={(next) => updateSelected({ doctorFinal: next })} />}
          {selected.aiSuggestion && selected.status !== "completed" && selected.status !== "withdrawn" && <section className="card p-5"><label className="flex items-start gap-3 text-xs"><input type="checkbox" className="mt-0.5" checked={confirmResponsibility} onChange={(event) => setConfirmResponsibility(event.target.checked)} /><span><b>责任确认</b><span className="mt-1 block text-slate-500">我已核对患者身份、评估状态、异常事件和处方参数，并知晓AI内容仅供辅助。</span></span></label><div className="mt-4 flex justify-end gap-3"><button type="button" disabled={!editable} className="btn-secondary disabled:opacity-40" onClick={() => updateSelected({ status: "pending_review", doctorFinal: selected.doctorFinal ?? selected.aiSuggestion })}>保存最终值</button>{selected.status === "pending_review" && <button type="button" disabled={!editable || !confirmResponsibility} className="btn-primary disabled:opacity-40" onClick={() => updateSelected({ status: "pending_signature", doctorFinal: selected.doctorFinal ?? selected.aiSuggestion })}><CheckCircle2 className="h-4 w-4" />确认处方内容</button>}{selected.status === "pending_signature" && <button type="button" disabled={!editable || !confirmResponsibility} className="btn-primary disabled:opacity-40" onClick={() => updateSelected({ status: "completed" })}><FileSignature className="h-4 w-4" />签署并发布</button>}</div></section>}
          {!editable && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">当前账号仅可查看。康复师不能生成、编辑或签署处方；医生只能处理本人处方。</p>}
        </div>
      </article>
    </div>}
  </section>;
}

function PrescriptionComparison({ previous, ai, final, editable, onChange }: { previous?: PrescriptionDraft; ai: PrescriptionDraft; final: PrescriptionDraft; editable: boolean; onChange: (next: PrescriptionDraft) => void }) {
  return <section className="card overflow-hidden"><div className="border-b p-5"><SectionHeader title="参数差异（三值对比）" description="上一版用于追溯，AI建议为辅助草稿，最终值才是签署内容。" /></div><div className="grid grid-cols-3 divide-x"><DraftColumn title="上一版" draft={previous} /><DraftColumn title="AI建议" draft={ai} accent /><div className="p-5"><h3 className="text-xs font-bold text-slate-800">最终值</h3><textarea disabled={!editable} className="text-field mt-3 min-h-20" value={final.summary} onChange={(event) => onChange({ ...final, summary: event.target.value })} />{final.items.map((item, index) => <div key={item.category} className="mt-3 rounded-xl border border-slate-200 p-3"><b className="text-xs">{item.category}</b><input disabled={!editable} className="text-field mt-2" value={item.project} onChange={(event) => onChange({ ...final, items: final.items.map((row, rowIndex) => rowIndex === index ? { ...row, project: event.target.value } : row) })} /><input disabled className="text-field mt-2" value={`${item.intensity}｜${item.duration}｜${item.frequency}`} readOnly /></div>)}</div></div></section>;
}

function DraftColumn({ title, draft, accent = false }: { title: string; draft?: PrescriptionDraft; accent?: boolean }) {
  return <div className={`p-5 ${accent ? "bg-blue-50/70" : ""}`}><h3 className="text-xs font-bold text-slate-800">{title}</h3>{!draft ? <p className="mt-4 text-xs text-slate-400">—</p> : <><p className="mt-3 text-xs leading-6 text-slate-600">{draft.summary}</p>{draft.items.map((item) => <div key={item.category} className="mt-3"><b className="text-xs text-slate-800">{item.category} · {item.project}</b><p className="mt-1 text-[10px] leading-5 text-slate-500">{item.intensity}｜{item.duration}｜{item.frequency}<br />理由：{item.reason}</p></div>)}</>}</div>;
}
