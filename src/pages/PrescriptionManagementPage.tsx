import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, PencilLine, Printer, Search, Sparkles, Trash2 } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import { type PrescriptionStatus, type PrescriptionTask } from "../clinicalWorkflowData";
import type { StaffRole } from "../types";

const statusLabel: Record<PrescriptionStatus, string> = {
  pending_generation: "待生成",
  pending_review: "待复核",
  pending_signature: "待签署",
  completed: "已完成",
  withdrawn: "已撤回",
  archived: "已归档失效"
};

type StatusFilter = PrescriptionStatus | "all" | "unfinished";

export function PrescriptionManagementPage({ role, accountId, tasks, initialStatus = "all", onOpen, onDelete }: {
  role: StaffRole;
  accountId: string;
  tasks: PrescriptionTask[];
  initialStatus?: "all" | "unfinished";
  onOpen: (taskId: string) => void;
  onDelete: (taskIds: string[]) => void;
}) {
  const [patientNo, setPatientNo] = useState("");
  const [prescriptionNo, setPrescriptionNo] = useState("");
  const [doctorId, setDoctorId] = useState(role === "DOCTOR" ? accountId : "all");
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pendingCount = tasks.filter((item) => !["completed", "withdrawn", "archived"].includes(item.status) && (role !== "DOCTOR" || item.assignedDoctorId === accountId)).length;
  const completedCount = tasks.filter((item) => item.status === "completed" && (role !== "DOCTOR" || item.assignedDoctorId === accountId)).length;

  useEffect(() => setStatus(initialStatus), [initialStatus]);
  useEffect(() => { if (role === "DOCTOR") setDoctorId(accountId); }, [accountId, role]);

  const filtered = useMemo(() => tasks.filter((item) => {
    if (role === "DOCTOR" && item.assignedDoctorId !== accountId) return false;
    if (doctorId !== "all" && item.assignedDoctorId !== doctorId) return false;
    if (patientNo && !item.patientNo.toLowerCase().includes(patientNo.trim().toLowerCase())) return false;
    if (prescriptionNo && !item.prescriptionNo.toLowerCase().includes(prescriptionNo.trim().toLowerCase())) return false;
    if (status === "unfinished") return !["completed", "withdrawn", "archived"].includes(item.status);
    return status === "all" || item.status === status;
  }), [accountId, doctorId, patientNo, prescriptionNo, role, status, tasks]);

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
      <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500"><span>查询结果 {filtered.length} 条 · 已选择 {selectedIds.length} 条</span><div className="flex items-center gap-2">{status === "unfinished" && <StatusBadge tone="orange">已筛选：未完成处方</StatusBadge>}<button type="button" className="btn-primary !min-h-9" disabled={!selectedIds.length || role === "REHAB_EXECUTION"} onClick={() => { if (window.confirm(`确认删除已选择的 ${selectedIds.length} 条处方？`)) { onDelete(selectedIds); setSelectedIds([]); } }}><Trash2 className="h-4 w-4" />删除所选</button></div></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1380px] text-left text-xs">
          <thead><tr className="border-y border-slate-100 bg-slate-50 text-[10px] text-slate-400"><th className="p-3"><input type="checkbox" aria-label="选择全部处方" checked={Boolean(filtered.length) && filtered.every((item) => selectedIds.includes(item.id))} onChange={(event) => setSelectedIds(event.target.checked ? filtered.map((item) => item.id) : [])} /></th><th>患者姓名</th><th>患者号</th><th>处方号</th><th>版本</th><th>阶段</th><th>分组</th><th>类型</th><th>依据</th><th>生成时间</th><th>所属医生</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>{filtered.map((item) => <tr key={item.id} className="cursor-pointer border-b border-slate-100 hover:bg-blue-50/40" onClick={() => onOpen(item.id)}><td className="p-3"><input type="checkbox" aria-label={`选择处方${item.prescriptionNo}`} checked={selectedIds.includes(item.id)} onClick={(event) => event.stopPropagation()} onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, item.id] : selectedIds.filter((id) => id !== item.id))} /></td><td className="font-bold text-slate-900">{item.patientName}</td><td className="font-mono text-slate-500">{item.patientNo}</td><td className="font-mono text-blue-700">{item.prescriptionNo}</td><td>{item.version}</td><td>{item.rehabStage}</td><td><StatusBadge tone={item.risk === "高危" ? "red" : item.risk === "中危" ? "orange" : "green"}>{item.risk}</StatusBadge></td><td>{item.kind === "initial" ? "初始" : "调整"}</td><td>{item.sourceLabel ?? "基线评估"}</td><td className="text-slate-500">{item.generatedAt ?? item.updatedAt}</td><td>{item.assignedDoctorName}</td><td><StatusBadge tone={item.status === "completed" ? "green" : item.status === "withdrawn" ? "red" : item.status === "pending_signature" ? "orange" : "blue"}>{statusLabel[item.status]}</StatusBadge></td><td><button type="button" onClick={(event) => { event.stopPropagation(); onOpen(item.id); }} className="inline-flex items-center gap-1 font-bold text-blue-700">{item.status === "pending_generation" ? <><Sparkles className="h-3.5 w-3.5" />AI生成草稿</> : item.status === "completed" ? <><Printer className="h-3.5 w-3.5" />查看/打印</> : <><PencilLine className="h-3.5 w-3.5" />编辑审核</>}<ArrowRight className="h-3.5 w-3.5" /></button></td></tr>)}</tbody>
        </table>
        {!filtered.length && <p className="py-12 text-center text-xs text-slate-400">当前筛选条件下暂无处方。</p>}
      </div>
    </section>

  </section>;
}
