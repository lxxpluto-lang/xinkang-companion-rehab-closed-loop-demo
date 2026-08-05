import { useMemo, useState } from "react";
import { CheckCircle2, FileSignature, Search, Sparkles, X } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import { createAiDraft, type PrescriptionDraft, type PrescriptionStatus, type PrescriptionTask } from "../clinicalWorkflowData";
import type { StaffRole } from "../types";

const statusLabel: Record<PrescriptionStatus, string> = {
  pending_generation: "待生成",
  pending_review: "待复核",
  pending_signature: "待签署",
  completed: "已完成"
};

export function PrescriptionManagementPage({ role, accountId, tasks, setTasks }: {
  role: StaffRole;
  accountId: string;
  tasks: PrescriptionTask[];
  setTasks: React.Dispatch<React.SetStateAction<PrescriptionTask[]>>;
}) {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<PrescriptionStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmResponsibility, setConfirmResponsibility] = useState(false);
  const selected = tasks.find((item) => item.id === selectedId);
  const filtered = useMemo(() => tasks.filter((item) => {
    const hit = !keyword || [item.patientName, item.patientNo, item.prescriptionNo, item.assignedDoctorName].some((value) => value.includes(keyword));
    return hit && (status === "all" || item.status === status);
  }), [keyword, status, tasks]);
  const editable = Boolean(selected && role === "DOCTOR" && selected.assignedDoctorId === accountId);

  function updateSelected(patch: Partial<PrescriptionTask>) {
    if (!selected || !editable) return;
    setTasks((items) => items.map((item) => item.id === selected.id ? { ...item, ...patch, updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }) } : item));
  }

  function updateFinal(next: PrescriptionDraft) {
    updateSelected({ doctorFinal: next });
  }

  return <section data-testid="page-VIEW-PRESCRIPTIONS">
    <PageHeader eyebrow="医生业务 · 处方闭环" title="处方管理" description="以原PRD的三值对比完成处方复核；AI只生成可编辑草稿，不自动诊断、签署或发布。" action={<StatusBadge tone="blue">处方 Demo</StatusBadge>} />
    <section className="card p-5">
      <div className="grid gap-3 md:grid-cols-[1fr_190px_auto]">
        <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="text-field pl-10" placeholder="患者姓名 / 编号 / 处方号 / 医生" value={keyword} onChange={(event) => setKeyword(event.target.value)} /></label>
        <select className="text-field" value={status} onChange={(event) => setStatus(event.target.value as PrescriptionStatus | "all")}><option value="all">全部状态</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button className="btn-secondary" onClick={() => { setKeyword(""); setStatus("all"); }}>清空筛选</button>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs"><thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-3">处方号</th><th>患者</th><th>危险分组</th><th>版本</th><th>责任医生</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="p-3 font-semibold text-blue-700">{item.prescriptionNo}</td><td><b>{item.patientName}</b><span className="block text-[10px] text-slate-400">{item.patientNo}</span></td><td>{item.risk}</td><td>{item.version}</td><td>{item.assignedDoctorName}</td><td><StatusBadge tone={item.status === "completed" ? "green" : item.status === "pending_signature" ? "orange" : "blue"}>{statusLabel[item.status]}</StatusBadge></td><td className="text-slate-500">{item.updatedAt}</td><td><button className="text-xs font-bold text-blue-600" onClick={() => { setSelectedId(item.id); setConfirmResponsibility(false); }}>查看/复核</button></td></tr>)}</tbody></table>
      </div>
    </section>

    {selected && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onMouseDown={() => setSelectedId(null)}>
      <article className="h-full w-[min(1120px,94vw)] overflow-y-auto bg-[#f7f9fc] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4"><div><p className="text-[10px] font-bold text-blue-600">处方审核</p><h2 className="mt-1 text-lg font-bold">{selected.prescriptionNo} · {selected.patientName}</h2></div><button onClick={() => setSelectedId(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
        <div className="space-y-5 p-6">
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-900"><b>AI辅助说明：</b>根据患者分组、风险和既有报告生成可编辑草稿。AI不替代医生判断，不自动发布或签名；所有参数必须由责任医生确认。</section>
          <section className="card p-5"><SectionHeader title="患者临床摘要" description="仅展示处方判断所需的最小信息，详细数据可回到患者档案查看。" /><div className="mt-4 grid grid-cols-4 gap-3">{[["姓名/年龄", `${selected.patientName} / ${selected.age}岁`], ["康复阶段", selected.rehabStage], ["危险分组", selected.risk], ["诊断", selected.diagnosis], ["特殊用药", selected.specialMedication], ["上一版", selected.previous ? "有可追溯版本" : "—"], ["体能评估", "已完成（Demo）"], ["最近训练", "数据完整率96%"]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] text-slate-400">{label}</p><p className="mt-1 text-xs font-semibold text-slate-800">{value}</p></div>)}</div></section>
          {!selected.aiSuggestion && <button disabled={!editable} onClick={() => updateSelected({ aiSuggestion: createAiDraft(selected), status: "pending_review" })} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"><Sparkles className="h-4 w-4" />生成AI处方草稿</button>}
          {selected.aiSuggestion && <PrescriptionComparison previous={selected.previous} ai={selected.aiSuggestion} final={selected.doctorFinal ?? selected.aiSuggestion} editable={editable && selected.status !== "completed"} onChange={updateFinal} />}
          {selected.aiSuggestion && selected.status !== "completed" && <section className="card p-5"><label className="flex items-start gap-3 text-xs"><input type="checkbox" className="mt-0.5" checked={confirmResponsibility} onChange={(event) => setConfirmResponsibility(event.target.checked)} /><span><b>责任确认</b><span className="mt-1 block text-slate-500">我已核对患者身份、评估状态、异常事件和处方参数，并知晓AI内容仅供辅助。</span></span></label><div className="mt-4 flex justify-end gap-3"><button disabled={!editable} className="btn-secondary disabled:opacity-40" onClick={() => updateSelected({ status: "pending_review", doctorFinal: selected.doctorFinal ?? selected.aiSuggestion })}>保存医生值</button>{selected.status === "pending_review" && <button disabled={!editable || !confirmResponsibility} className="btn-primary disabled:opacity-40" onClick={() => updateSelected({ status: "pending_signature", doctorFinal: selected.doctorFinal ?? selected.aiSuggestion })}><CheckCircle2 className="h-4 w-4" />确认处方内容</button>}{selected.status === "pending_signature" && <button disabled={!editable || !confirmResponsibility} className="btn-primary disabled:opacity-40" onClick={() => updateSelected({ status: "completed" })}><FileSignature className="h-4 w-4" />医生签署并发布</button>}</div></section>}
          {!editable && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">当前账号仅可查看。只有该任务的责任医生可以编辑、确认和签署。</p>}
        </div>
      </article>
    </div>}
  </section>;
}

function PrescriptionComparison({ previous, ai, final, editable, onChange }: { previous?: PrescriptionDraft; ai: PrescriptionDraft; final: PrescriptionDraft; editable: boolean; onChange: (next: PrescriptionDraft) => void }) {
  return <section className="card overflow-hidden"><div className="border-b p-5"><SectionHeader title="参数差异（三值对比）" description="上一版用于追溯，AI建议为辅助草稿，医生最终值才是签署内容。" /></div><div className="grid grid-cols-3 divide-x"><DraftColumn title="上一版" draft={previous} /><DraftColumn title="AI建议" draft={ai} accent /><div className="p-5"><h3 className="text-xs font-bold text-slate-800">医生最终值</h3><textarea disabled={!editable} className="text-field mt-3 min-h-20" value={final.summary} onChange={(event) => onChange({ ...final, summary: event.target.value })} />{final.items.map((item, index) => <div key={item.category} className="mt-3 rounded-xl border border-slate-200 p-3"><b className="text-xs">{item.category}</b><input disabled={!editable} className="text-field mt-2" value={item.project} onChange={(event) => onChange({ ...final, items: final.items.map((row, rowIndex) => rowIndex === index ? { ...row, project: event.target.value } : row) })} /><input disabled={!editable} className="text-field mt-2" value={`${item.intensity}｜${item.duration}｜${item.frequency}`} readOnly /></div>)}</div></div></section>;
}

function DraftColumn({ title, draft, accent = false }: { title: string; draft?: PrescriptionDraft; accent?: boolean }) {
  return <div className={`p-5 ${accent ? "bg-blue-50/70" : ""}`}><h3 className="text-xs font-bold text-slate-800">{title}</h3>{!draft ? <p className="mt-4 text-xs text-slate-400">—</p> : <><p className="mt-3 text-xs leading-6 text-slate-600">{draft.summary}</p>{draft.items.map((item) => <div key={item.category} className="mt-3"><b className="text-xs text-slate-800">{item.category} · {item.project}</b><p className="mt-1 text-[10px] leading-5 text-slate-500">{item.intensity}｜{item.duration}｜{item.frequency}<br />理由：{item.reason}</p></div>)}</>}</div>;
}
