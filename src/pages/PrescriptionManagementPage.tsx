import { ArrowRight, ClipboardList, LockKeyhole, PencilLine, Printer, Sparkles } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { PrescriptionTask } from "../prescriptionData";
import { prescriptionStatusLabels, sourceTypeLabels } from "../prescriptionData";

export function PrescriptionManagementPage({ tasks, onOpen, onGenerate }: { tasks: PrescriptionTask[]; onOpen: (id: string) => void; onGenerate: (id: string) => void }) {
  const pendingTasks = tasks.filter((task) => task.status !== "completed");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  return (
    <section data-testid="page-VIEW-PRESCRIPTIONS">
      <PageHeader eyebrow="处方管理" title="运动处方总台" description="未完成处方可编辑、保存和确认；已完成处方已签署归档，只能查看和打印。" action={<span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600"><ClipboardList className="h-4 w-4 text-blue-600" />未完成 {pendingTasks.length} · 已完成 {completedTasks.length}</span>} />
      <div className="grid grid-cols-[1.1fr_0.9fr] gap-5">
        <PrescriptionTable title="未完成处方" description="可进入编辑；确认完成后自动数字签名并生成正式处方。" tasks={pendingTasks} mode="editable" onOpen={onOpen} onGenerate={onGenerate} />
        <PrescriptionTable title="已完成处方" description="已签署版本不可修改，只能查看正式处方和打印。" tasks={completedTasks} mode="readonly" onOpen={onOpen} onGenerate={onGenerate} />
      </div>
    </section>
  );
}

function PrescriptionTable({ title, description, tasks, mode, onOpen, onGenerate }: { title: string; description: string; tasks: PrescriptionTask[]; mode: "editable" | "readonly"; onOpen: (id: string) => void; onGenerate: (id: string) => void }) {
  return (
    <section className="card overflow-hidden">
      <div className="px-5 pt-5">
        <SectionHeader title={title} description={description} action={<StatusBadge tone={mode === "editable" ? "orange" : "green"}>{tasks.length} 项</StatusBadge>} />
      </div>
      <div className="grid grid-cols-[0.45fr_0.95fr_0.9fr_0.6fr_0.78fr_0.9fr] border-y border-slate-100 bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400">
        <span>序号</span><span>患者</span><span>阶段</span><span>分组</span><span>依据</span><span>状态 / 操作</span>
      </div>
      {tasks.map((task, index) => (
        <button type="button" key={task.id} onClick={() => task.status === "pending_generation" ? onGenerate(task.id) : onOpen(task.id)} className="grid w-full grid-cols-[0.45fr_0.95fr_0.9fr_0.6fr_0.78fr_0.9fr] items-center border-b border-slate-100 px-5 py-3 text-left text-xs hover:bg-blue-50">
          <span className="font-mono text-slate-400">{String(index + 1).padStart(2, "0")}</span>
          <span className="font-bold text-slate-900">{task.patientName}<small className="mt-1 block font-normal text-slate-400">{task.patientId}</small></span>
          <span className="text-slate-600">{task.stage}</span>
          <StatusBadge tone={task.risk === "高危" ? "red" : task.risk === "中危" ? "orange" : "green"}>{task.risk}</StatusBadge>
          <span className="text-slate-600">{sourceTypeLabels[task.sourceType]}</span>
          <span className="space-y-1">
            <StatusBadge tone={task.status === "completed" ? "green" : task.status === "pending_generation" ? "blue" : "orange"}>{prescriptionStatusLabels[task.status]}</StatusBadge>
            <span className="flex items-center gap-1 font-bold text-blue-700">{mode === "readonly" ? <><LockKeyhole className="h-3.5 w-3.5" />查看/打印<Printer className="h-3.5 w-3.5" /></> : task.status === "pending_generation" ? <><Sparkles className="h-3.5 w-3.5" />生成草稿</> : <><PencilLine className="h-3.5 w-3.5" />编辑处方</>}<ArrowRight className="h-3.5 w-3.5" /></span>
          </span>
        </button>
      ))}
      {tasks.length === 0 && <div className="px-5 py-12 text-center text-xs text-slate-400">暂无{title}。</div>}
    </section>
  );
}
