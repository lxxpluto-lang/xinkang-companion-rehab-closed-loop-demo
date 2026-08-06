import { useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, FileSignature, FileText, MonitorUp, PhoneCall, Sparkles, Stethoscope, TrendingUp, UserCheck, UsersRound } from "lucide-react";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "../components/UI";
import type { FollowUpTask } from "../followUpData";
import { isFollowUpVisibleInPending } from "../followUpData";
import type { Role } from "../types";
import type { ManagedPatient } from "./PatientArchivePage";
import type { FollowUpView } from "./FollowUpManagementPage";
import type { AlertEvent, Appointment, PrescriptionTask } from "../clinicalWorkflowData";
import type { CardiopulmonaryTreatmentRecord } from "../treatmentData";
import type { DoctorPageKey } from "../types";

export function DashboardPage({ role, patients, followUpTasks, prescriptionTasks, treatmentRecords, alertEvents, appointments, accountId, currentAccount, onOpenFollowUps, onOpenReports, onOpenTraining, onOpenPrescriptions, onOpenPrescriptionTask, onOpenTreatments, onOpenTreatmentRecord, onOpenAlerts, onNavigate }: {
  role: Exclude<Role, "PATIENT">;
  patients: ManagedPatient[];
  followUpTasks: FollowUpTask[];
  prescriptionTasks: PrescriptionTask[];
  treatmentRecords: CardiopulmonaryTreatmentRecord[];
  alertEvents: AlertEvent[];
  appointments: Appointment[];
  accountId: string;
  currentAccount: string;
  onOpenFollowUps: (view?: FollowUpView, taskId?: string) => void;
  onOpenReports: () => void;
  onOpenTraining: () => void;
  onOpenPrescriptions: (status: "all" | "unfinished") => void;
  onOpenPrescriptionTask: (taskId: string) => void;
  onOpenTreatments: (status: "all" | "unfinished") => void;
  onOpenTreatmentRecord: (patientId: string, recordId?: string) => void;
  onOpenAlerts: (status?: "all" | "unfinished" | "pending_doctor_review") => void;
  onNavigate: (page: DoctorPageKey) => void;
}) {
  const [rehabTaskTab, setRehabTaskTab] = useState<"appointments" | "followups">("appointments");
  const pendingFollowUps = followUpTasks.filter((task) => isFollowUpVisibleInPending(task));
  const patientMap = new Map(patients.map((patient) => [patient.patient_demo_id, patient]));
  const pendingAlerts = alertEvents.filter((event) => event.status !== "closed");
  const todayAppointments = appointments.filter((item) => item.date === "2026-08-05" && item.status !== "cancelled");
  if (role === "DOCTOR") {
    const myTasks = prescriptionTasks.filter((task) => task.assignedDoctorId === accountId);
    const myPatientIds = new Set(myTasks.map((task) => task.patientId));
    const pendingPrescriptions = myTasks.filter((task) => task.status !== "completed" && task.status !== "withdrawn");
    const myPendingAlerts = pendingAlerts.filter((item) => myPatientIds.has(item.patientId) && item.status === "pending_doctor_review");
    const myAppointments = todayAppointments.filter((item) => item.doctorId === accountId);
    return <section data-testid="page-VIEW-DASHBOARD">
      <PageHeader eyebrow="康复医生 · 本人任务" title="医生工作台" description="集中处理本人处方、异常复核、今日安排和到期随访；低频管理页面统一从工作台进入。" action={<StatusBadge tone="blue"><FileSignature className="h-3.5 w-3.5" />{pendingPrescriptions.length} 份处方待办</StatusBadge>} />
      <div className="mb-5 grid grid-cols-5 gap-3">
        <DoctorMetric label="总患者数" value={String(myPatientIds.size)} note="进入患者档案" icon={UsersRound} onClick={() => onNavigate("patients")} />
        <DoctorMetric label="总运动处方量" value={String(myTasks.length)} note="查看本人全部处方" icon={ClipboardList} onClick={() => onOpenPrescriptions("all")} />
        <DoctorMetric label="待开具处方数" value={String(pendingPrescriptions.length)} note="点击进入处方管理" icon={Sparkles} highlight onClick={() => onOpenPrescriptions("unfinished")} />
        <DoctorMetric label="平均训练完成率" value="83%" note="进入训练执行概览" icon={TrendingUp} tone="green" onClick={onOpenTraining} />
        <DoctorMetric label="待处理异常数" value={String(myPendingAlerts.length)} note="本人患者待医学复核" icon={AlertTriangle} tone="red" onClick={() => onOpenAlerts("pending_doctor_review")} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2"><section className="card p-5"><SectionHeader title="我的处方待办" description="点击患者直接进入该患者的“本次处方”。" /><div className="mt-4 space-y-3">{pendingPrescriptions.map((task) => <button key={task.id} onClick={() => onOpenPrescriptionTask(task.id)} className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:border-blue-200 hover:bg-blue-50"><ClipboardList className="h-4 w-4 text-blue-600" /><span className="flex-1"><b>{task.patientName}</b><span className="mt-1 block text-xs text-slate-500">{task.prescriptionNo} · {task.version} · {task.risk}</span></span><StatusBadge tone={task.status === "pending_signature" ? "orange" : "blue"}>{task.status === "pending_generation" ? "待生成" : task.status === "pending_review" ? "待复核" : "待签署"}</StatusBadge><ArrowRight className="h-4 w-4 text-blue-600" /></button>)}</div><button onClick={() => onOpenPrescriptions("unfinished")} className="btn-primary mt-4 w-full">今日处方管理 · 查看本人未完成处方</button></section><section className="card p-5"><SectionHeader title="今日临床任务" description="异常、预约和随访不占用侧边栏，只在需要处理时从这里进入。" /><div className="mt-4 grid gap-3 sm:grid-cols-2"><DashboardShortcut title="待复核异常" detail={`${myPendingAlerts.length} 条本人患者待医学复核`} icon={AlertTriangle} tone="red" onClick={() => onOpenAlerts("pending_doctor_review")} /><DashboardShortcut title="今日患者安排" detail={`本人名下 ${myAppointments.length} 人`} icon={CalendarDays} onClick={() => onNavigate("appointments")} /><DashboardShortcut title="到期随访" detail={`${pendingFollowUps.length} 项待联系`} icon={PhoneCall} tone="green" onClick={() => onOpenFollowUps("pending")} /><DashboardShortcut title="训练进展" detail="只读查看中心训练状态" icon={MonitorUp} onClick={onOpenTraining} /></div></section></div>
    </section>;
  }
  if (role === "REHAB_EXECUTION") {
    const myTreatmentRecords = treatmentRecords.filter((record) => record.therapist === currentAccount);
    const pendingTreatments = myTreatmentRecords.filter((record) => record.status === "draft" || !record.signature);
    const dueFollowUps = pendingFollowUps.filter((task) => task.currentDueDate <= new Date().toISOString().slice(0, 10));
    const pendingFieldAlerts = pendingAlerts.filter((item) => item.status === "pending");
    return <section data-testid="page-VIEW-DASHBOARD">
      <PageHeader eyebrow="康复师 · 本人任务" title={`${currentAccount}，上午好`} description="优先完成本人名下待填写、待签署的治疗记录，再进入现场训练与随访任务。" action={<button type="button" className="btn-primary" onClick={() => onOpenTreatments("unfinished")}><FileSignature className="h-4 w-4" />{pendingTreatments.length} 条待签署</button>} />
      <div className="mb-5 grid grid-cols-5 gap-3">
        <DoctorMetric label="今日到诊" value={String(todayAppointments.length)} note="进入预约管理" icon={UserCheck} onClick={() => onNavigate("appointments")} />
        <DoctorMetric label="在训患者" value="2" note="进入训练大屏" icon={MonitorUp} tone="green" onClick={onOpenTraining} />
        <DoctorMetric label="待核对治疗单" value={String(pendingTreatments.length)} note="本人未完成记录" icon={FileSignature} highlight onClick={() => onOpenTreatments("unfinished")} />
        <DoctorMetric label="异常上报" value={String(pendingFieldAlerts.length)} note="查看待上报事件" icon={AlertTriangle} tone="red" onClick={() => onOpenAlerts("unfinished")} />
        <DoctorMetric label="今日待随访" value={String(dueFollowUps.length)} note="查看未完成随访" icon={PhoneCall} onClick={() => onOpenFollowUps("pending")} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card flex flex-col p-5"><SectionHeader title="待核对治疗单" description="工作台核心任务：点击患者直接进入该患者的本次治疗记录。" /><div className="mt-4 space-y-3">{pendingTreatments.slice(0, 2).map((record) => { const patient = patientMap.get(record.patientId); return <button type="button" key={record.treatmentId} onClick={() => onOpenTreatmentRecord(record.patientId, record.treatmentId)} className="flex w-full items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-4 text-left hover:border-blue-200 hover:bg-blue-50"><Stethoscope className="h-5 w-5 text-blue-600" /><span className="flex-1"><b className="text-sm text-slate-900">{patient?.name ?? record.patientNo}</b><span className="mt-1 block text-xs text-slate-500">{record.treatmentNo} · {record.treatmentAt.slice(0, 16).replace("T", " ")}</span></span><StatusBadge tone="orange">待核对</StatusBadge><ArrowRight className="h-4 w-4 text-blue-600" /></button>; })}</div>{!pendingTreatments.length && <p className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">当前没有待核对治疗单</p>}{pendingTreatments.length > 2 && <p className="mt-3 text-center text-xs font-bold text-slate-400">另有 {pendingTreatments.length - 2} 条已隐藏，请进入列表查看</p>}<button type="button" onClick={() => onOpenTreatments("unfinished")} className="btn-primary mt-auto w-full translate-y-1">查看全部待核对治疗单</button></section>
        <section className="card p-5">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-slate-900">今日到诊与随访</h2><p className="mt-1 text-xs text-slate-500">按任务类型切换查看，一条记录占一行。</p></div><div className="flex shrink-0 rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setRehabTaskTab("appointments")} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${rehabTaskTab === "appointments" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>今日到诊</button><button type="button" onClick={() => setRehabTaskTab("followups")} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${rehabTaskTab === "followups" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>随访记录</button></div></div>
          <div className="mt-4 space-y-3">
            {rehabTaskTab === "appointments" && todayAppointments.slice(0, 2).map((item) => <button type="button" key={item.id} onClick={() => onNavigate("appointments")} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-4 text-left hover:border-blue-200 hover:bg-blue-50"><CalendarDays className="h-5 w-5 text-blue-600" /><span className="flex-1"><b className="text-sm text-slate-900">{item.patientName}</b><span className="mt-1 block text-xs text-slate-500">{item.time} · {item.project} · {item.station}</span></span><StatusBadge tone={item.status === "completed" ? "green" : "blue"}>{item.status === "completed" ? "已完成" : "待到诊"}</StatusBadge><ArrowRight className="h-4 w-4 text-blue-600" /></button>)}
            {rehabTaskTab === "followups" && dueFollowUps.slice(0, 2).map((task) => <button type="button" key={task.id} onClick={() => onOpenFollowUps("pending", task.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-4 text-left hover:border-blue-200 hover:bg-blue-50"><PhoneCall className="h-5 w-5 text-blue-600" /><span className="flex-1"><b className="text-sm text-slate-900">{patientMap.get(task.patientId)?.name ?? "待核对患者"}</b><span className="mt-1 block text-xs text-slate-500">{task.milestoneMonth}个月随访 · 到期 {task.currentDueDate}</span></span><StatusBadge tone="orange">待随访</StatusBadge><ArrowRight className="h-4 w-4 text-blue-600" /></button>)}
            {rehabTaskTab === "appointments" && !todayAppointments.length && <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">今日暂无到诊安排</p>}
            {rehabTaskTab === "followups" && !dueFollowUps.length && <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">今日暂无待随访记录</p>}
            {rehabTaskTab === "appointments" && todayAppointments.length > 2 && <p className="text-center text-xs font-bold text-slate-400">另有 {todayAppointments.length - 2} 条已隐藏，请进入列表查看</p>}
            {rehabTaskTab === "followups" && dueFollowUps.length > 2 && <p className="text-center text-xs font-bold text-slate-400">另有 {dueFollowUps.length - 2} 条已隐藏，请进入列表查看</p>}
          </div>
          <button type="button" onClick={() => rehabTaskTab === "appointments" ? onNavigate("appointments") : onOpenFollowUps("pending")} className="btn-primary mt-4 w-full">{rehabTaskTab === "appointments" ? "进入预约管理" : "进入随访管理"}<ArrowRight className="h-4 w-4" /></button>
        </section>
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
      <StatCard label="异常待复核" value={String(pendingAlerts.length)} note="全中心只读" tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
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

function DoctorMetric({ label, value, note, icon: Icon, highlight = false, tone = "blue", onClick }: { label: string; value: string; note: string; icon: typeof Activity; highlight?: boolean; tone?: "blue" | "green" | "red"; onClick?: () => void }) {
  const tones = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "red" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700";
  const content = <><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${highlight ? "bg-amber-50 text-amber-700" : tones}`}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className={`block text-[11px] font-bold ${highlight ? "text-amber-800" : "text-slate-500"}`}>{label}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{note}</span></span><strong className={`text-2xl tabular-nums ${highlight ? "text-amber-950" : "text-slate-950"}`}>{value}</strong>{onClick && <ArrowRight className={`h-4 w-4 ${highlight ? "text-amber-600" : "text-blue-600"}`} />}</>;
  const className = `flex min-h-[108px] items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left shadow-sm ${highlight ? "border-2 border-amber-400 bg-amber-50/30 shadow-amber-100" : "border-slate-100"} ${onClick ? "transition hover:-translate-y-0.5 hover:shadow-md" : ""}`;
  return onClick ? <button type="button" onClick={onClick} className={className}>{content}</button> : <div className={className}>{content}</div>;
}

function DashboardShortcut({ title, detail, icon: Icon, tone = "blue", onClick }: { title: string; detail: string; icon: typeof Activity; tone?: "blue" | "green" | "red"; onClick: () => void }) {
  const toneClass = tone === "red" ? "border-red-100 bg-red-50 text-red-700" : tone === "green" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-blue-700";
  return <button type="button" onClick={onClick} className={`flex min-h-24 items-center gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${toneClass}`}><Icon className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1"><b className="block text-sm text-slate-900">{title}</b><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></span><ArrowRight className="h-4 w-4 shrink-0" /></button>;
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
