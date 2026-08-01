import { useMemo, useState } from "react";
import { ArrowRight, Filter, Search, Sparkles } from "lucide-react";
import type { PrescriptionStatus, PrescriptionTask } from "../prescriptionData";
import { prescriptionStatusLabels, sourceTypeLabels } from "../prescriptionData";
import { StatusBadge } from "./UI";
import { formatDateTime } from "../utils/dateTime";

const statusTone: Record<PrescriptionStatus, "blue" | "orange" | "green"> = {
  pending_generation: "blue",
  pending_review: "orange",
  pending_signature: "orange",
  completed: "green"
};

const actionLabels: Record<PrescriptionStatus, string> = {
  pending_generation: "AI 生成处方草稿",
  pending_review: "复核处方",
  pending_signature: "数字签名",
  completed: "查看 / 打印"
};

export function PrescriptionWorklist({
  tasks,
  onOpen,
  onGenerate,
  compact = false
}: {
  tasks: PrescriptionTask[];
  onOpen: (taskId: string) => void;
  onGenerate: (taskId: string) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | PrescriptionStatus>("all");
  const [kind, setKind] = useState<"all" | "initial" | "adjustment">("all");
  const [source, setSource] = useState<"all" | PrescriptionTask["sourceType"]>("all");

  const filtered = useMemo(() => tasks.filter((task) => {
    const matchesQuery = `${task.patientName}${task.patientNo}${task.prescriptionNo}${task.taskNo}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || task.status === status) && (kind === "all" || task.kind === kind) && (source === "all" || task.sourceType === source);
  }), [kind, query, source, status, tasks]);

  return (
    <section className="card overflow-hidden" data-testid="region-PRESCRIPTION-WORKLIST">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="card-title">{compact ? "今日处方工作列表" : "全部处方任务"}</h2>
          <p className="mt-1 text-xs text-slate-500">按照报告就绪时间排序，医生只处理开方、复核和签名。</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{filtered.length} 项任务</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
        <label className="relative min-w-[210px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-400" placeholder="搜索患者姓名、患者号或处方号" />
        </label>
        <Filter className="h-4 w-4 text-slate-400" />
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600">
          <option value="all">全部状态</option>
          {Object.entries(prescriptionStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600">
          <option value="all">全部处方类型</option><option value="initial">初始处方</option><option value="adjustment">调整处方</option>
        </select>
        {!compact && (
          <select value={source} onChange={(event) => setSource(event.target.value as typeof source)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600">
            <option value="all">全部依据来源</option><option value="baseline_assessment">基线评估</option><option value="single_report">单次报告</option><option value="stage_report">阶段性报告</option>
          </select>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[1050px] grid-cols-[1.1fr_0.9fr_0.72fr_1.18fr_0.72fr_0.72fr_0.85fr_0.9fr] bg-white px-5 py-2.5 text-[10px] font-bold text-slate-400">
          <span>患者</span><span>阶段 / 风险</span><span>处方类型</span><span>依据来源</span><span>当前版本</span><span>AI草稿</span><span>处方状态</span><span>更新时间 / 操作</span>
        </div>
        {filtered.map((task) => (
          <div key={task.id} className="grid min-w-[1050px] grid-cols-[1.1fr_0.9fr_0.72fr_1.18fr_0.72fr_0.72fr_0.85fr_0.9fr] items-center border-t border-slate-100 px-5 py-3 text-xs hover:bg-blue-50/30">
            <div><p className="font-bold text-slate-900">{task.patientName}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{task.patientNo} · {task.age}岁</p><p className="mt-0.5 font-mono text-[9px] text-slate-400">处方号 {task.prescriptionNo}</p></div>
            <div><p className="font-semibold text-slate-700">{task.stage}</p><StatusBadge tone={task.risk === "高危" ? "red" : task.risk === "中危" ? "orange" : "green"}>{task.risk}</StatusBadge></div>
            <span className="font-semibold text-slate-700">{task.kind === "initial" ? "初始处方" : "调整处方"}</span>
            <div><p className="font-semibold text-slate-700">{sourceTypeLabels[task.sourceType]}</p><p className="mt-1 max-w-[145px] truncate text-[10px] text-slate-400">{task.sourceLabel}</p></div>
            <span className="font-semibold text-slate-700">{task.version}</span>
            <span className={task.aiDraftStatus === "generated" ? "text-blue-700" : task.aiDraftStatus === "not_required" ? "text-slate-400" : "text-amber-700"}>
              {task.aiDraftStatus === "generated" ? "已生成" : task.aiDraftStatus === "not_required" ? "不适用" : "未生成"}
            </span>
            <StatusBadge tone={statusTone[task.status]}>{prescriptionStatusLabels[task.status]}</StatusBadge>
            <div><p className="text-[10px] text-slate-400">{formatDateTime(task.updatedAt)}</p><button type="button" onClick={() => task.status === "pending_generation" ? onGenerate(task.id) : onOpen(task.id)} className="mt-1.5 inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900">{task.status === "pending_generation" && <Sparkles className="h-3.5 w-3.5" />}{actionLabels[task.status]}<ArrowRight className="h-3.5 w-3.5" /></button></div>
          </div>
        ))}
        {filtered.length === 0 && <div className="px-5 py-12 text-center text-xs text-slate-400">没有符合当前筛选条件的处方任务。</div>}
      </div>
    </section>
  );
}
