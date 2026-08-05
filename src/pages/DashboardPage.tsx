import { Activity, AlertTriangle, CheckCircle2, ClipboardList, FileText, MonitorUp, PhoneCall, Sparkles, TrendingUp, UserCheck, UsersRound } from "lucide-react";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "../components/UI";
import type { FollowUpTask } from "../followUpData";
import { isFollowUpVisibleInPending } from "../followUpData";
import type { Role } from "../types";
import type { ManagedPatient } from "./PatientArchivePage";
import type { FollowUpView } from "./FollowUpManagementPage";

export function DashboardPage({ role, patients, followUpTasks, onOpenFollowUps, onOpenReports, onOpenTraining }: {
  role: Exclude<Role, "PATIENT">;
  patients: ManagedPatient[];
  followUpTasks: FollowUpTask[];
  onOpenFollowUps: (view?: FollowUpView, taskId?: string) => void;
  onOpenReports: () => void;
  onOpenTraining: () => void;
}) {
  const pendingFollowUps = followUpTasks.filter((task) => isFollowUpVisibleInPending(task));
  const patientMap = new Map(patients.map((patient) => [patient.patient_demo_id, patient]));
  if (role === "REHAB_EXECUTION") {
    return <section data-testid="page-VIEW-DASHBOARD">
      <PageHeader eyebrow="康复师 · 当前康复中心" title="周康复师，上午好" description="按患者实际到诊完成项目核对、训练前后评估、设备连接、报告发送和随访记录。" action={<StatusBadge tone="green"><MonitorUp className="h-3.5 w-3.5" />设备数据连接正常</StatusBadge>} />
      <div className="mb-5 grid grid-cols-5 gap-4">
        <StatCard label="今日到诊" value="12" note="以现场签到为准" icon={<UserCheck className="h-5 w-5" />} />
        <StatCard label="待选择项目" value="3" note="对照纸质处方" tone="orange" icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard label="在训患者" value="2" note="功率车 01、02" tone="green" icon={<MonitorUp className="h-5 w-5" />} />
        <StatCard label="训练后确认" value="3" note="复测后生成单次报告" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="异常待上报" value="1" note="胸闷主诉" tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <TaskCard onOpenTraining={onOpenTraining} />
        <BoundaryCard />
      </div>
    </section>;
  }

  return <section data-testid="page-VIEW-DASHBOARD">
    <PageHeader eyebrow="康复管理系统 · 管理视图" title="林管理员，上午好" description="查看系统运行和内容发布情况；管理员不能编辑治疗记录或代替康复师完成业务签署。" action={<StatusBadge tone="blue"><FileText className="h-3.5 w-3.5" />只读概览</StatusBadge>} />
    <div className="mb-5 grid grid-cols-5 gap-4">
      <StatCard label="患者数据" value={String(patients.length)} note="OCR与人工核对" icon={<UsersRound className="h-5 w-5" />} />
      <StatCard label="累计训练记录" value="42" note="设备与人工记录" icon={<Activity className="h-5 w-5" />} />
      <StatCard label="待生成阶段报告" value="3" note="选择具体训练记录" tone="orange" icon={<Sparkles className="h-5 w-5" />} />
      <StatCard label="平均完成率" value="83%" note="本月训练" tone="green" icon={<TrendingUp className="h-5 w-5" />} />
      <StatCard label="异常待复核" value="1" note="训练中主诉" tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card p-5"><SectionHeader title="阶段报告概览" description="管理员只读查看，报告由康复师在患者档案内生成并发送。" />
        <div className="mt-4 space-y-3">{[
          ["陈女士", "最近4次训练数据已齐", "含1次胸闷事件", "orange"],
          ["李先生", "已有6次完成记录", "可生成阶段草稿", "blue"],
          ["赵女士", "阶段末评估未采集", "只能保存草稿", "orange"]
        ].map(([name, detail, note, tone]) => <button type="button" onClick={onOpenReports} key={name} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-blue-200 hover:bg-blue-50"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">{name.slice(0, 1)}</span><span className="flex-1"><b className="text-sm text-slate-900">{name}</b><span className="mt-1 block text-[10px] text-slate-500">{detail} · {note}</span></span><StatusBadge tone={tone as "orange" | "blue"}>{tone === "orange" ? "待处理" : "可生成"}</StatusBadge></button>)}</div>
        <button type="button" onClick={onOpenReports} className="btn-primary mt-4 w-full">进入阶段报告</button>
      </section>
      <section className="card p-5"><SectionHeader title="随访待办" description="出院报告发布后自动生成提醒；以短信/在线消息和人工电话为主。" />
        <div className="mt-4 space-y-3">{pendingFollowUps.slice(0, 3).map((task) => <button type="button" key={task.id} onClick={() => onOpenFollowUps("pending", task.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-emerald-200 hover:bg-emerald-50"><PhoneCall className="h-4 w-4 text-emerald-600" /><span className="flex-1"><b className="text-sm text-slate-900">{patientMap.get(task.patientId)?.name ?? "待核对患者"}</b><span className="mt-1 block text-[10px] text-slate-500">{task.milestoneMonth}个月随访 · 计划 {task.currentDueDate}</span></span><StatusBadge tone="orange">待联系</StatusBadge></button>)}</div>
        {!pendingFollowUps.length && <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400">当前没有待随访任务</p>}
        <button type="button" onClick={() => onOpenFollowUps("pending")} className="btn-secondary mt-4 w-full">查看全部随访</button>
      </section>
    </div>
  </section>;
}

function TaskCard({ onOpenTraining }: { onOpenTraining: () => void }) {
  return <section className="card p-5"><SectionHeader title="下一步执行任务" description="按实际到诊与风险顺序处理，不依赖预约数据。" /><div className="mt-4 space-y-3">{[
    ["陈女士", "选择本次训练项目", "待核对"],
    ["李秀兰", "训练后生命体征复测", "待记录"],
    ["周海明", "训练中断与现场处置", "重点关注"]
  ].map(([name, task, status]) => <button type="button" onClick={onOpenTraining} key={name} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-blue-50"><Activity className="h-4 w-4 text-blue-600" /><span className="flex-1"><b className="text-sm text-slate-900">{name}</b><span className="mt-1 block text-[10px] text-slate-500">{task}</span></span><StatusBadge tone={status === "重点关注" ? "red" : "orange"}>{status}</StatusBadge></button>)}</div></section>;
}

function BoundaryCard() {
  return <section className="card p-5"><SectionHeader title="执行权限边界" /><div className="mt-4 space-y-3">{[
    [true, "可核对患者身份、训练项目和次数"],
    [true, "可记录生命体征、RPE和现场处置"],
    [false, "不能修改诊断、风险等级和正式处方"],
    [false, "不能形成医生报告结论或代签"]
  ].map(([allowed, text]) => <div key={String(text)} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">{allowed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}<span className="text-xs font-medium text-slate-700">{text}</span></div>)}</div></section>;
}
