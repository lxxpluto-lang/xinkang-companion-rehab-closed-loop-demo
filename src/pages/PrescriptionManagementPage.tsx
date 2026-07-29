import { useMemo, useState } from "react";
import { ArrowRight, ClipboardList, LockKeyhole, PencilLine, Printer, Search, Sparkles } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { PrescriptionStatus, PrescriptionTask } from "../prescriptionData";
import { prescriptionStatusLabels, sourceTypeLabels } from "../prescriptionData";

export function PrescriptionManagementPage({ tasks, onOpen, onGenerate }: { tasks: PrescriptionTask[]; onOpen: (id: string) => void; onGenerate: (id: string) => void }) {
  const pendingTasks = tasks.filter((task) => task.status !== "completed");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const [statusFilter, setStatusFilter] = useState<"all" | "unfinished" | PrescriptionStatus>("unfinished");
  const [riskFilter, setRiskFilter] = useState<"all" | PrescriptionTask["risk"]>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | PrescriptionTask["sourceType"]>("all");
  const [query, setQuery] = useState("");
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesStatus = statusFilter === "all" || (statusFilter === "unfinished" ? task.status !== "completed" : task.status === statusFilter);
    const matchesRisk = riskFilter === "all" || task.risk === riskFilter;
    const matchesSource = sourceFilter === "all" || task.sourceType === sourceFilter;
    const keyword = query.trim();
    const matchesKeyword = !keyword || `${task.patientName}${task.patientId}${task.stage}${task.version}${task.sourceLabel}`.includes(keyword);
    return matchesStatus && matchesRisk && matchesSource && matchesKeyword;
  }), [query, riskFilter, sourceFilter, statusFilter, tasks]);
  return (
    <section data-testid="page-VIEW-PRESCRIPTIONS">
      <PageHeader eyebrow="处方管理" title="运动处方总台" description="未完成处方可编辑、保存和确认；已完成处方已签署归档，只能查看和打印。" action={<span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600"><ClipboardList className="h-4 w-4 text-blue-600" />未完成 {pendingTasks.length} · 已完成 {completedTasks.length}</span>} />
      <section className="card overflow-hidden">
        <div className="px-5 pt-5">
          <SectionHeader title="全部处方任务" description="未完成与已完成处方放在同一张工作表里，通过状态筛选切换；已完成版本只读。" />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-y border-slate-100 bg-slate-50 px-5 py-3">
          {[
            ["unfinished", `未完成 ${pendingTasks.length}`],
            ["pending_generation", "未生成"],
            ["pending_review", "待复核"],
            ["pending_signature", "待签名"],
            ["completed", `已完成 ${completedTasks.length}`],
            ["all", "全部"]
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setStatusFilter(value as "all" | "unfinished" | PrescriptionStatus)} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${statusFilter === value ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>{label}</button>
          ))}
          <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as "all" | PrescriptionTask["risk"])} className="ml-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600">
            <option value="all">全部分组</option>
            <option value="低危">低危</option>
            <option value="中危">中危</option>
            <option value="高危">高危</option>
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "all" | PrescriptionTask["sourceType"])} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600">
            <option value="all">全部依据</option>
            <option value="baseline_assessment">基线评估</option>
            <option value="single_report">单次报告</option>
            <option value="stage_report">阶段性报告</option>
          </select>
          <label className="flex w-48 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] text-slate-400">
            <Search className="h-3.5 w-3.5" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="患者/编号/版本" className="min-w-0 flex-1 bg-transparent font-medium text-slate-700 outline-none" />
          </label>
        </div>
        <PrescriptionTable tasks={filteredTasks} onOpen={onOpen} onGenerate={onGenerate} />
      </section>
    </section>
  );
}

function PrescriptionTable({ tasks, onOpen, onGenerate }: { tasks: PrescriptionTask[]; onOpen: (id: string) => void; onGenerate: (id: string) => void }) {
  return (
    <>
      <div className="grid grid-cols-[0.3fr_0.62fr_0.72fr_0.72fr_0.46fr_0.5fr_0.65fr_0.62fr_0.66fr_0.82fr] bg-white px-5 py-2.5 text-[10px] font-bold text-slate-400">
        <span>序号</span><span>患者姓名</span><span>患者编码</span><span>阶段</span><span>分组</span><span>类型</span><span>依据</span><span>所属医生</span><span>状态</span><span>操作</span>
      </div>
      {tasks.map((task, index) => (
        <button type="button" key={task.id} onClick={() => task.status === "pending_generation" ? onGenerate(task.id) : onOpen(task.id)} className="grid w-full grid-cols-[0.3fr_0.62fr_0.72fr_0.72fr_0.46fr_0.5fr_0.65fr_0.62fr_0.66fr_0.82fr] items-center border-t border-slate-100 px-5 py-3 text-left text-xs hover:bg-blue-50">
          <span className="font-mono text-slate-400">{String(index + 1).padStart(2, "0")}</span>
          <span className="font-bold text-slate-900">{task.patientName}</span>
          <span className="font-mono text-[10px] text-slate-500">{task.patientId}</span>
          <span className="text-slate-600">{task.stage}</span>
          <StatusBadge tone={task.risk === "高危" ? "red" : task.risk === "中危" ? "orange" : "green"}>{task.risk}</StatusBadge>
          <span className="text-slate-600">{task.kind === "initial" ? "初始" : "调整"}</span>
          <span className="text-slate-600">{sourceTypeLabels[task.sourceType]}</span>
          <span className="font-semibold text-slate-700">{task.confirmedBy ?? task.signedBy ?? "王医生"}</span>
          <StatusBadge tone={task.status === "completed" ? "green" : task.status === "pending_generation" ? "blue" : "orange"}>{prescriptionStatusLabels[task.status]}</StatusBadge>
          <span className="flex items-center gap-1 font-bold text-blue-700">
            {task.status === "completed" ? <><LockKeyhole className="h-3.5 w-3.5" />查看/打印<Printer className="h-3.5 w-3.5" /></> : task.status === "pending_generation" ? <><Sparkles className="h-3.5 w-3.5" />生成草稿</> : <><PencilLine className="h-3.5 w-3.5" />编辑审核</>}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>
      ))}
      {tasks.length === 0 && <div className="px-5 py-12 text-center text-xs text-slate-400">当前筛选条件下暂无处方。</div>}
    </>
  );
}
