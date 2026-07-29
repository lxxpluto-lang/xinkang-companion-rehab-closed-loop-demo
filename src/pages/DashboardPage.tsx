import { Activity, AlertTriangle, CalendarClock, CheckCircle2, FileClock, MonitorUp, PenTool, PhoneCall, Sparkles, UserCheck } from "lucide-react";
import type { PrescriptionStatus, PrescriptionTask } from "../prescriptionData";
import { PrescriptionWorklist } from "../components/PrescriptionWorklist";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "../components/UI";
import type { Role } from "../types";

export function DashboardPage({
  role,
  tasks,
  onOpen,
  onGenerate
}: {
  role: Exclude<Role, "PATIENT">;
  tasks: PrescriptionTask[];
  onOpen: (taskId: string) => void;
  onGenerate: (taskId: string) => void;
}) {
  const count = (status: PrescriptionStatus) => tasks.filter((task) => task.status === status).length;
  if (role === "REHAB_EXECUTION") {
    return (
      <section data-testid="page-VIEW-DASHBOARD">
        <PageHeader eyebrow="康复执行岗 · 当前康复中心" title="周康复师，上午好" description="聚合今天需要执行的训练、随访与异常任务；临床复核和处方签署由医生负责。" action={<StatusBadge tone="green"><MonitorUp className="h-3.5 w-3.5" />设备数据连接正常</StatusBadge>} />
        <div className="mb-5 grid grid-cols-5 gap-4">
          <StatCard label="今日训练计划" value="15" note="上午 9 人 · 下午 6 人" icon={<Activity className="h-5 w-5" />} />
          <StatCard label="待接诊" value="3" note="2 人已签到" tone="orange" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="在训患者" value="2" note="功率车 01、02" tone="green" icon={<MonitorUp className="h-5 w-5" />} />
          <StatCard label="今日待随访" value="3" note="共享队列 1 项" icon={<PhoneCall className="h-5 w-5" />} />
          <StatCard label="异常待上报" value="1" note="随访胸闷主诉" tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
        </div>
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-5">
          <section className="card p-5"><SectionHeader title="下一步执行任务" description="按到期时间和风险等级排序。" /><div className="space-y-3">{[
            ["10:20", "陈建国", "功率车训练前准备", "待连接设备", "orange"],
            ["10:30", "李秀兰", "处方完成后随访", "待认领", "blue"],
            ["11:00", "周海明", "训练中断后随访", "重点关注", "red"]
          ].map(([time, patient, task, status, tone]) => <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3" key={String(time) + patient}><span className="w-12 font-mono text-[10px] text-slate-400">{time}</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><CalendarClock className="h-4 w-4" /></span><div className="flex-1"><b className="text-slate-800">{patient}</b><p className="mt-1 text-[10px] text-slate-400">{task}</p></div><StatusBadge tone={tone as "orange" | "blue" | "red"}>{status}</StatusBadge></div>)}</div></section>
          <section className="card p-5"><SectionHeader title="执行权限边界" /><div className="space-y-3">{["可修改基础资料、生命体征和训练记录", "可认领随访并上报异常", "诊断、危险分组和处方字段只读", "不能复核或签署临床处方"].map((item, index) => <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3" key={item}>{index < 2 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}<span className="text-xs font-medium text-slate-700">{item}</span></div>)}</div></section>
        </div>
      </section>
    );
  }
  return (
    <section data-testid="page-VIEW-DASHBOARD">
      <PageHeader eyebrow={role === "ADMIN" ? "管理员临床全权视图" : "医生处方工作台"} title={role === "ADMIN" ? "林管理员，上午好" : "王医生，上午好"} description={role === "ADMIN" ? "可查看和处理全部临床任务；签署时记录管理员本人身份并进行二次确认。" : "根据患者报告完成处方生成、临床复核与签名。训练执行和设备监测由康复执行工作台与训练平板负责。"} action={<span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">今日计划训练 15 人 · 仅供参考</span>} />
      <div className="mb-5 grid grid-cols-4 gap-4">
        <StatCard label="待生成处方" value={String(count("pending_generation"))} note="报告已就绪，等待生成草稿" icon={<Sparkles className="h-5 w-5" />} />
        <StatCard label="待医生复核" value={String(count("pending_review"))} note="含初始处方与AI草稿" tone="orange" icon={<FileClock className="h-5 w-5" />} />
        <StatCard label="待数字签名" value={String(count("pending_signature"))} note="参数已确认，等待正式签署" tone="orange" icon={<PenTool className="h-5 w-5" />} />
        <StatCard label="今日已完成" value={String(count("completed"))} note="已形成不可覆盖处方版本" tone="green" icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>
      <PrescriptionWorklist tasks={tasks} onOpen={onOpen} onGenerate={onGenerate} compact />
    </section>
  );
}
