import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, PhoneCall, UserCheck } from "lucide-react";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "../components/UI";
import type { Role } from "../types";

type FollowupTask = {
  id: string;
  patient: string;
  trigger: string;
  due: string;
  priority: "常规" | "重点";
  status: "待认领" | "进行中" | "已完成" | "异常升级";
  owner?: string;
  summary?: string;
};

const seedTasks: FollowupTask[] = [
  { id: "FU-260729-01", patient: "陈建国", trigger: "阶段处方 V4 完成后", due: "今天 10:30", priority: "重点", status: "待认领" },
  { id: "FU-260729-02", patient: "李秀兰", trigger: "出院后第 7 天", due: "今天 11:00", priority: "常规", status: "进行中", owner: "周康复师" },
  { id: "FU-260729-03", patient: "周海明", trigger: "训练中断后 24 小时", due: "今天 14:00", priority: "重点", status: "异常升级", owner: "刘护士", summary: "昨晚胸闷持续约 3 分钟，已转王医生处理。" },
  { id: "FU-260728-04", patient: "王淑芬", trigger: "处方生效后第 3 天", due: "昨天 16:00", priority: "常规", status: "已完成", owner: "周康复师", summary: "训练依从性良好，无明显不适。" }
];

export function FollowupPage({ role }: { role: Exclude<Role, "PATIENT"> }) {
  const [tasks, setTasks] = useState(seedTasks);
  const [selectedId, setSelectedId] = useState(seedTasks[0].id);
  const [note, setNote] = useState("");
  const selected = useMemo(() => tasks.find((task) => task.id === selectedId) ?? tasks[0], [selectedId, tasks]);
  const canExecute = role === "ADMIN" || role === "REHAB_EXECUTION";

  function claimTask() {
    setTasks((items) => items.map((task) => task.id === selected.id ? { ...task, owner: "周康复师", status: "进行中" } : task));
  }

  function completeTask(escalate = false) {
    setTasks((items) => items.map((task) => task.id === selected.id ? {
      ...task,
      owner: task.owner || "周康复师",
      status: escalate ? "异常升级" : "已完成",
      summary: note || (escalate ? "患者报告新的不适症状，已升级给责任医生。" : "已完成电话随访，患者状态平稳。")
    } : task));
    setNote("");
  }

  return (
    <section data-testid="page-VIEW-FOLLOWUP">
      <PageHeader
        eyebrow="规则自动生成 · 共享队列认领"
        title="随访管理"
        description={canExecute ? "康复执行岗从本中心共享队列认领任务，记录症状、依从性和复诊情况；临床异常升级给指定医生。" : "医生查看团队患者随访结果，并处理由执行岗升级的临床异常。"}
        action={<StatusBadge tone="blue"><CalendarClock className="h-3.5 w-3.5" />今日 3 项</StatusBadge>}
      />
      <div className="mb-5 grid grid-cols-4 gap-4">
        <StatCard label="今日待随访" value="3" note="规则生成 2 · 人工补充 1" icon={<PhoneCall className="h-5 w-5" />} />
        <StatCard label="共享任务池" value="1" note="尚未指定执行人员" tone="orange" icon={<UserCheck className="h-5 w-5" />} />
        <StatCard label="已完成" value="8" note="今日完成率 73%" tone="green" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="异常升级" value="1" note="已转王医生处理" tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
      </div>
      <div className="grid grid-cols-[1.1fr_0.9fr] gap-5">
        <section className="card overflow-hidden">
          <div className="px-5 pt-5"><SectionHeader title="本中心随访任务" description="任务认领采用占用校验，避免两人同时领取。" /></div>
          <div className="grid grid-cols-[0.9fr_1fr_1.2fr_0.8fr_0.9fr] border-y border-slate-100 bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400">
            <span>任务编号</span><span>患者</span><span>生成规则</span><span>负责人</span><span>状态</span>
          </div>
          {tasks.map((task) => (
            <button key={task.id} type="button" onClick={() => setSelectedId(task.id)} className={`grid w-full grid-cols-[0.9fr_1fr_1.2fr_0.8fr_0.9fr] items-center border-b border-slate-100 px-5 py-3 text-left text-xs ${selectedId === task.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
              <span className="font-mono text-[10px] text-slate-500">{task.id}</span>
              <span><b className="text-slate-800">{task.patient}</b><small className="mt-1 block text-[9px] text-slate-400">{task.due}</small></span>
              <span className="text-slate-600">{task.trigger}</span>
              <span className="text-slate-500">{task.owner || "共享队列"}</span>
              <StatusBadge tone={task.status === "已完成" ? "green" : task.status === "异常升级" ? "red" : task.status === "待认领" ? "orange" : "blue"}>{task.status}</StatusBadge>
            </button>
          ))}
        </section>
        <section className="card p-5">
          <SectionHeader title={`${selected.patient} · 随访任务`} description={`${selected.trigger} · ${selected.due}`} action={<StatusBadge tone={selected.priority === "重点" ? "red" : "gray"}>{selected.priority}</StatusBadge>} />
          <div className="grid grid-cols-2 gap-3">
            {[["任务编号", selected.id], ["当前负责人", selected.owner || "尚未认领"], ["任务状态", selected.status], ["数据范围", "当前康复中心"]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] text-slate-400">{label}</p><p className="mt-1.5 font-bold text-slate-800">{value}</p></div>)}
          </div>
          {selected.summary && <div className={`mt-4 rounded-xl border p-4 text-xs leading-5 ${selected.status === "异常升级" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}><b>最近记录：</b>{selected.summary}</div>}
          {canExecute ? (
            <>
              <label className="mt-4 block"><span className="field-label">随访记录</span><textarea value={note} onChange={(event) => setNote(event.target.value)} className="text-field min-h-28 resize-none" placeholder="记录症状、服药、运动依从性、复诊情况及下次安排……" /></label>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {selected.status === "待认领" && <button type="button" onClick={claimTask} className="btn-primary"><UserCheck className="h-4 w-4" />认领任务</button>}
                {selected.status === "进行中" && <>
                  <button type="button" onClick={() => completeTask(true)} className="btn-secondary text-red-600"><AlertTriangle className="h-4 w-4" />升级给医生</button>
                  <button type="button" onClick={() => completeTask(false)} className="btn-primary"><ClipboardCheck className="h-4 w-4" />完成随访</button>
                </>}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-700">医生工作区为只读视图。异常升级事件将在“异常中心”和“今日工作台”生成本人待办。</div>
          )}
        </section>
      </div>
    </section>
  );
}
