import { useMemo, useState } from "react";
import { ArrowRight, ClipboardList, LockKeyhole, PencilLine, Printer, RotateCcw, Search } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";
import type { PrescriptionListStatusFilter, PrescriptionTask } from "../prescriptionData";
import { prescriptionStatusLabels, sourceTypeLabels } from "../prescriptionData";
import { formatDateTime } from "../utils/dateTime";
import { singleTrainingReportDetails } from "../clinicalSharedData";

type PrescriptionFilters = {
  patientId: string;
  prescriptionId: string;
  assignedDoctor: string;
  status: PrescriptionListStatusFilter;
};

function emptyFilters(status: PrescriptionListStatusFilter = "all", assignedDoctor = ""): PrescriptionFilters {
  return { patientId: "", prescriptionId: "", assignedDoctor, status };
}

export function PrescriptionManagementPage({
  role,
  currentDoctor,
  tasks,
  initialStatusFilter = "all",
  onOpen,
  onGenerate
}: {
  role: "ADMIN" | "DOCTOR" | "REHAB_EXECUTION";
  currentDoctor: string;
  tasks: PrescriptionTask[];
  initialStatusFilter?: PrescriptionListStatusFilter;
  onOpen: (id: string) => void;
  onGenerate: (id: string) => void;
}) {
  const doctorScope = role === "DOCTOR" ? currentDoctor : "";
  const pendingTasks = tasks.filter((task) => task.status !== "completed");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const [draftFilters, setDraftFilters] = useState<PrescriptionFilters>(() => emptyFilters(initialStatusFilter, doctorScope));
  const [appliedFilters, setAppliedFilters] = useState<PrescriptionFilters>(() => emptyFilters(initialStatusFilter, doctorScope));
  const doctorOptions = useMemo(() => Array.from(new Set(tasks.map((task) => task.assignedDoctor))).sort(), [tasks]);
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const patientId = appliedFilters.patientId.trim().toLowerCase();
    const prescriptionId = appliedFilters.prescriptionId.trim().toLowerCase();
    const matchesPatientId = !patientId || task.patientNo.toLowerCase().includes(patientId);
    const matchesPrescriptionId = !prescriptionId || task.prescriptionNo.toLowerCase().includes(prescriptionId);
    const matchesDoctor = !appliedFilters.assignedDoctor || task.assignedDoctor === appliedFilters.assignedDoctor;
    const matchesStatus = appliedFilters.status === "all"
      || (appliedFilters.status === "unfinished" ? task.status !== "completed" : task.status === appliedFilters.status);
    return matchesPatientId && matchesPrescriptionId && matchesDoctor && matchesStatus;
  }), [appliedFilters, tasks]);

  function updateDraft<K extends keyof PrescriptionFilters>(key: K, value: PrescriptionFilters[K]) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    const next = emptyFilters("all", doctorScope);
    setDraftFilters(next);
    setAppliedFilters(next);
  }

  return (
    <section data-testid="page-VIEW-PRESCRIPTIONS">
      <PageHeader eyebrow="处方执行计划" title={role === "ADMIN" ? "运动处方执行总台" : role === "REHAB_EXECUTION" ? "康复执行项目" : "我的处方执行任务"} description={role === "ADMIN" ? "处方由院内 HIS 或纸质流程开具，本系统只维护执行计划、训练数据关联和报告入口。" : role === "REHAB_EXECUTION" ? "对照院内正式处方选择本次训练项目并查看执行记录；诊断、开方和签署不在本系统完成。" : `仅展示所属医生为${currentDoctor}的执行任务；本系统不重复录入完整临床医嘱。`} action={<span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600"><ClipboardList className="h-4 w-4 text-blue-600" />未完成 {pendingTasks.length} · 已完成 {completedTasks.length}</span>} />
      <section className="card overflow-hidden">
        <div className="px-5 pt-5">
          <SectionHeader title={role === "ADMIN" ? "全部执行任务" : "本人执行任务"} description="未完成与已完成任务放在同一张工作表里，通过状态筛选切换；原始临床处方仍以 HIS/纸质记录为准。" />
        </div>
        <form onSubmit={(event) => { event.preventDefault(); setAppliedFilters(draftFilters); }} className="grid grid-cols-1 gap-3 border-y border-slate-100 bg-slate-50 px-5 py-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.9fr_0.9fr_auto] xl:items-end">
          <FilterField label="患者号">
            <input value={draftFilters.patientId} onChange={(event) => updateDraft("patientId", event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="例如 000001" className="text-field" />
          </FilterField>
          <FilterField label="处方号">
            <input value={draftFilters.prescriptionId} onChange={(event) => updateDraft("prescriptionId", event.target.value)} placeholder="例如 CRH-RX-20260729-0001" className="text-field" />
          </FilterField>
          <FilterField label="所属医生">
            {role === "ADMIN" ? <select value={draftFilters.assignedDoctor} onChange={(event) => updateDraft("assignedDoctor", event.target.value)} className="text-field"><option value="">全部医生</option>{doctorOptions.map((doctor) => <option key={doctor} value={doctor}>{doctor}</option>)}</select> : <div className="text-field flex items-center justify-between bg-slate-100 font-semibold text-slate-700"><span>{currentDoctor}</span><span className="text-[10px] text-slate-400">仅本人</span></div>}
          </FilterField>
          <FilterField label="状态">
            <select value={draftFilters.status} onChange={(event) => updateDraft("status", event.target.value as PrescriptionListStatusFilter)} className="text-field" data-testid="prescription-status-filter">
              <option value="all">全部</option>
              <option value="unfinished">未完成</option>
              <option value="pending_generation">待同步执行计划</option>
              <option value="pending_review">待复核</option>
              <option value="pending_signature">待签名</option>
              <option value="completed">已完成</option>
            </select>
          </FilterField>
          <div className="flex gap-2 md:col-span-2 xl:col-span-1">
            <button type="submit" className="btn-primary flex-1 xl:flex-none"><Search className="h-4 w-4" />查询</button>
            <button type="button" onClick={resetFilters} className="btn-secondary flex-1 xl:flex-none"><RotateCcw className="h-4 w-4" />重置</button>
          </div>
        </form>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
          <span>查询结果 <b className="text-slate-900">{filteredTasks.length}</b> 条</span>
          {appliedFilters.status === "unfinished" && <StatusBadge tone="orange">已筛选：未完成处方</StatusBadge>}
        </div>
        <PrescriptionTable tasks={filteredTasks} onOpen={onOpen} onGenerate={onGenerate} />
      </section>
    </section>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="field-label">{label}</span>{children}</label>;
}

function PrescriptionTable({ tasks, onOpen, onGenerate }: { tasks: PrescriptionTask[]; onOpen: (id: string) => void; onGenerate: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[1300px] grid-cols-[0.58fr_0.68fr_0.9fr_0.48fr_0.58fr_0.44fr_0.46fr_0.58fr_0.78fr_0.58fr_0.6fr_0.95fr] bg-white px-5 py-2.5 text-[10px] font-bold text-slate-400">
        <span>患者姓名</span><span>患者号</span><span>处方号</span><span>版本</span><span>阶段</span><span>分组</span><span>类型</span><span>依据</span><span>生成时间</span><span>所属医生</span><span>状态</span><span>操作</span>
      </div>
      {tasks.map((task) => (
        (() => {
          const completedSessions = singleTrainingReportDetails.filter((report) => report.patientId === task.patientId).length;
          const completionGate = task.kind === "adjustment" && completedSessions < 4 && task.status !== "completed";
          return <button type="button" key={task.id} onClick={() => { if (completionGate) return; onOpen(task.id); }} className={`grid min-w-[1300px] w-full grid-cols-[0.58fr_0.68fr_0.9fr_0.48fr_0.58fr_0.44fr_0.46fr_0.58fr_0.78fr_0.58fr_0.6fr_0.95fr] items-center border-t border-slate-100 px-5 py-3 text-left text-xs ${completionGate ? "cursor-not-allowed bg-slate-50" : "hover:bg-blue-50"}`}>
          <span className="font-bold text-slate-900">{task.patientName}</span>
          <span className="font-mono text-[10px] text-slate-500">{task.patientNo}</span>
          <span className="font-mono text-[10px] text-slate-500">{task.prescriptionNo}</span>
          <span className="font-bold text-slate-700">{task.versionNo}</span>
          <span className="text-slate-600">{task.stage}</span>
          <StatusBadge tone={task.risk === "高危" ? "red" : task.risk === "中危" ? "orange" : "green"}>{task.risk}</StatusBadge>
          <span className="text-slate-600">{task.kind === "initial" ? "初始" : "调整"}</span>
          <span className="text-slate-600">{sourceTypeLabels[task.sourceType]}</span>
          <span className="text-[10px] text-slate-500">{formatDateTime(task.createdAt)}</span>
          <span className="font-semibold text-slate-700">{task.assignedDoctor}</span>
          <StatusBadge tone={completionGate ? "gray" : task.status === "completed" ? "green" : task.status === "pending_generation" ? "blue" : "orange"}>{completionGate ? "待完成训练" : prescriptionStatusLabels[task.status]}</StatusBadge>
          <span className="flex items-center gap-1 font-bold text-blue-700">
            {completionGate ? <><LockKeyhole className="h-3.5 w-3.5" />完成 4 次训练后可调方</> : task.status === "completed" ? <><LockKeyhole className="h-3.5 w-3.5" />查看/打印<Printer className="h-3.5 w-3.5" /></> : task.status === "pending_generation" ? <><PencilLine className="h-3.5 w-3.5" />查看执行计划</> : <><PencilLine className="h-3.5 w-3.5" />编辑审核</>}
            {!completionGate && <ArrowRight className="h-3.5 w-3.5" />}
          </span>
        </button>;
        })()
      ))}
      {tasks.length === 0 && <div className="px-5 py-12 text-center text-xs text-slate-400">当前筛选条件下暂无处方。</div>}
    </div>
  );
}
