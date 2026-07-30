import { useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, BadgeCheck, BarChart3, CalendarClock, CheckCircle2, ClipboardList, FileText, MonitorUp, PenTool, PhoneCall, Printer, RefreshCw, Signature, Sparkles, TrendingUp, UserCheck, UsersRound } from "lucide-react";
import { doctorAppointments, prescriptionStatusLabels, type DoctorAppointment, type PrescriptionListStatusFilter, type PrescriptionTask } from "../prescriptionData";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "../components/UI";
import type { Role } from "../types";
import { clinicalSnapshotChen, getPrescriptionVersionDetail, getSingleTrainingReportDetail, minimalSafetyEvents } from "../clinicalSharedData";
import { stageReportData } from "../patient/stageReportData";

export function DashboardPage({
  role,
  tasks,
  onOpenPrescriptionList,
  onOpen,
  onGenerate,
  onConfirm,
  onSign
}: {
  role: Exclude<Role, "PATIENT">;
  tasks: PrescriptionTask[];
  onOpenPrescriptionList: (status?: PrescriptionListStatusFilter) => void;
  onOpen: (taskId: string) => void;
  onGenerate: (taskId: string) => void;
  onConfirm: (taskId: string) => void;
  onSign: (taskId: string) => void;
}) {
  const pendingPrescriptionTasks = tasks.filter((task) => task.status !== "completed");
  if (role === "REHAB_EXECUTION") {
    return (
      <section data-testid="page-VIEW-DASHBOARD">
        <PageHeader eyebrow="康复执行岗 · 当前康复中心" title="周康复师，上午好" description="聚合今天需要执行的训练、训练后确认与异常上报任务；临床复核和处方签署由医生负责。" action={<StatusBadge tone="green"><MonitorUp className="h-3.5 w-3.5" />设备数据连接正常</StatusBadge>} />
        <div className="mb-5 grid grid-cols-5 gap-4">
          <StatCard label="今日训练计划" value="15" note="上午 9 人 · 下午 6 人" icon={<Activity className="h-5 w-5" />} />
          <StatCard label="待接诊" value="3" note="2 人已签到" tone="orange" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="在训患者" value="2" note="功率车 01、02" tone="green" icon={<MonitorUp className="h-5 w-5" />} />
          <StatCard label="训练后确认" value="3" note="复测与离场确认" icon={<PhoneCall className="h-5 w-5" />} />
          <StatCard label="异常待上报" value="1" note="训练中胸闷主诉" tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
        </div>
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-5">
          <section className="card p-5"><SectionHeader title="下一步执行任务" description="按到期时间和风险等级排序。" /><div className="space-y-3">{[
            ["10:20", "陈女士", "功率车训练前准备", "待连接设备", "orange"],
            ["10:30", "李秀兰", "训练后生命体征确认", "待记录", "blue"],
            ["11:00", "周海明", "训练中断后异常上报", "重点关注", "red"]
          ].map(([time, patient, task, status, tone]) => <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3" key={String(time) + patient}><span className="w-12 font-mono text-[10px] text-slate-400">{time}</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><CalendarClock className="h-4 w-4" /></span><div className="flex-1"><b className="text-slate-800">{patient}</b><p className="mt-1 text-[10px] text-slate-400">{task}</p></div><StatusBadge tone={tone as "orange" | "blue" | "red"}>{status}</StatusBadge></div>)}</div></section>
          <section className="card p-5"><SectionHeader title="执行权限边界" /><div className="space-y-3">{["可修改基础资料、生命体征和训练记录", "可完成训练后确认并上报异常", "诊断、危险分组和处方字段只读", "不能复核或签署临床处方"].map((item, index) => <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3" key={item}>{index < 2 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}<span className="text-xs font-medium text-slate-700">{item}</span></div>)}</div></section>
        </div>
      </section>
    );
  }
  const reviewCounts = {
    single: doctorAppointments.reduce((total, item) => total + item.singleReportIds.length, 0),
    stage: doctorAppointments.reduce((total, item) => total + item.stageReportIds.length, 0),
    abnormal: doctorAppointments.filter((item) => item.reportReviewStatus === "异常优先").length
  };
  const taskRankings = [
    ["处方待处理", pendingPrescriptionTasks.length, "医生决策"],
    ["阶段报告", reviewCounts.stage, "复核优先"],
    ["单次报告", reviewCounts.single, "训练反馈"]
  ] as const;
  const reminders = [
    ["异常复核提醒", "陈女士训练中胸闷主诉已进入处方调方依据，请优先查看阶段报告。", "09:48", "red"],
    ["处方即将到期", "李先生本周处方计划将于 2026-08-02 到期，建议完成单次报告复核。", "10:10", "orange"],
    ["数据补录提醒", "孙女士缺少 CPET 与 6 分钟步行数据，当前只能保存草稿，不能签署。", "08:24", "blue"]
  ] as const;
  const trend = [34, 46, 42, 58, 54, 73, 66];
  return (
    <section data-testid="page-VIEW-DASHBOARD">
      <PageHeader
        eyebrow={role === "ADMIN" ? "AI 运动康复管理系统 · 管理员视图" : "AI 运动康复管理系统 · 医生工作台"}
        title={role === "ADMIN" ? "林管理员，上午好" : "王医生，上午好"}
        description={role === "ADMIN" ? "汇总全院康复闭环运行情况，并保留处方签署、异常复核等高风险操作入口。" : "以数据概览、趋势提醒和处方任务为主，帮助医生先处理需要临床判断的事项。"}
        action={<button type="button" className="btn-secondary"><RefreshCw className="h-4 w-4" />刷新</button>}
      />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <OverviewMetric icon={<UsersRound className="h-5 w-5" />} label="总患者数" value="168" note="本月新增 12" />
        <OverviewMetric icon={<ClipboardList className="h-5 w-5" />} label="总运动处方量" value="42" note="当前执行" />
        <OverviewMetric icon={<TrendingUp className="h-5 w-5" />} label="平均训练完成率" value="83%" note="本月平均" tone="green" />
        <OverviewMetric icon={<AlertTriangle className="h-5 w-5" />} label="训练异常记录数" value="5" note="等待处理" tone="red" />
        <OverviewMetric icon={<PenTool className="h-5 w-5" />} label="待开具处方数" value={String(pendingPrescriptionTasks.length)} note="点击查看未完成处方" tone="orange" onClick={() => onOpenPrescriptionList("unfinished")} />
      </div>

      <div className="mb-5 grid grid-cols-[1.08fr_0.92fr] gap-5">
        <TrendCard values={trend} />
        <RankingCard items={taskRankings} />
      </div>

      <div className="mb-5 grid grid-cols-[1.1fr_0.9fr] gap-5">
        <ReminderCard items={reminders} />
        <TodayAppointmentCard appointments={doctorAppointments} onOpen={(taskId) => {
          const task = tasks.find((item) => item.id === taskId);
          if (!task) return;
          task.status === "pending_generation" ? onGenerate(task.id) : onOpen(task.id);
        }} />
      </div>

    </section>
  );
}

function AppointmentDetail({
  appointment,
  task,
  onBack,
  onOpen,
  onGenerate,
  onConfirm,
  onSign
}: {
  appointment: DoctorAppointment;
  task: PrescriptionTask;
  onBack: () => void;
  onOpen: (taskId: string) => void;
  onGenerate: (taskId: string) => void;
  onConfirm: (taskId: string) => void;
  onSign: (taskId: string) => void;
}) {
  const [reportType, setReportType] = useState<"single" | "stage">(appointment.stageReportIds.length ? "stage" : "single");
  const [exercise, setExercise] = useState("功率车连续训练");
  const [frequency, setFrequency] = useState("每周 3 次");
  const [targetHr, setTargetHr] = useState("100–116 bpm");
  const [power, setPower] = useState("50–70 W");
  const [times, setTimes] = useState("5 + 22 + 5 分钟");
  const [rpe, setRpe] = useState("11–13");
  const [diet, setDiet] = useState("低盐低脂，训练前避免过饱，训练后少量多次饮水。");
  const singleReport = getSingleTrainingReportDetail(appointment.singleReportIds[0]);
  const latestBp = singleReport.bpMeasurements[singleReport.bpMeasurements.length - 1]?.value ?? "未采集";
  const previousVersion = getPrescriptionVersionDetail(task.previousVersionId?.match(/V[1-4]/)?.[0] ?? "V4");
  const linkedSafetyEvent = minimalSafetyEvents.find((event) => event.patientId === appointment.patientId);
  const canConfirm = task.status === "pending_review" && !task.missingFields?.length;

  function printFinalReport() {
    document.body.classList.add("printing-prescription");
    window.print();
    window.setTimeout(() => document.body.classList.remove("printing-prescription"), 300);
  }

  return (
    <section data-testid="page-VIEW-APPOINTMENT-DETAIL">
      <PageHeader eyebrow="预约患者处方闭环" title={`${appointment.patientName} · ${appointment.time} 预约`} description="从预约进入报告依据，右侧生成AI运动参数草稿，医生确认后签名并打印最终报告。" action={<button type="button" className="btn-secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" />返回今日预约</button>} />
      <div className="grid grid-cols-[0.7fr_1.05fr_0.85fr] gap-5">
        <section className="card p-5">
          <SectionHeader title="患者与报告入口" description={appointment.purpose} />
          <div className="grid grid-cols-2 gap-3">
            {[["姓名", appointment.patientName], ["编号", appointment.patientId], ["阶段", appointment.stage], ["风险", appointment.risk]].map(([label, value]) => <InfoTile key={label} label={label} value={value} />)}
          </div>
          <div className="mt-5 flex rounded-lg bg-slate-100 p-1">
            <button type="button" onClick={() => setReportType("stage")} disabled={!appointment.stageReportIds.length} className={`flex-1 rounded-md px-3 py-2 text-xs font-bold disabled:text-slate-300 ${reportType === "stage" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>阶段性报告</button>
            <button type="button" onClick={() => setReportType("single")} className={`flex-1 rounded-md px-3 py-2 text-xs font-bold ${reportType === "single" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>单次报告</button>
          </div>
          <div className="mt-4 space-y-3">
            {appointment.stageReportIds.map((id) => <button type="button" key={id} onClick={() => setReportType("stage")} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-blue-50"><FileText className="h-4 w-4 text-blue-600" /><span className="flex-1 text-xs font-bold text-slate-700">{id}</span><StatusBadge tone="orange">待复核</StatusBadge></button>)}
            {appointment.singleReportIds.map((id) => <button type="button" key={id} onClick={() => setReportType("single")} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-blue-50"><Activity className="h-4 w-4 text-emerald-600" /><span className="flex-1 text-xs font-bold text-slate-700">{id}</span><StatusBadge tone="blue">单次</StatusBadge></button>)}
          </div>
        </section>

        <section className="card p-5">
          {reportType === "stage" ? (
            <>
              <SectionHeader title="阶段性报告摘要" description="医生看临床判断，患者版说明会进入最终报告。" />
              <div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-bold text-blue-700">医生摘要</p><p className="mt-2 text-sm font-bold leading-6 text-slate-800">{stageReportData.clinicalConclusion.summary}</p></div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[["完成", "11 / 12次"], ["靶区", "84%"], ["异常", "1项已复核"]].map(([label, value]) => <InfoTile key={label} label={label} value={value} />)}
              </div>
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">患者版会说明：运动耐量提升、血压/血氧总体稳定、下一阶段建议维持强度，并附饮食和停止运动提醒。</div>
              {linkedSafetyEvent && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-800"><b>关联异常：</b>{linkedSafetyEvent.type} · {linkedSafetyEvent.metricSnapshot}<br /><b>现场处置：</b>{linkedSafetyEvent.fieldAction}<br /><b>医生复核：</b>{linkedSafetyEvent.doctorReview}</div>}
            </>
          ) : (
            <>
              <SectionHeader title="单次报告摘要" description={singleReport.dataSourceNote} action={<StatusBadge tone={singleReport.dataMode === "demo" ? "orange" : "blue"}>{singleReport.dataMode === "demo" ? "Demo 数据" : "设备采样"}</StatusBadge>} />
              <div className="grid grid-cols-3 gap-3">
                {[["运动", singleReport.exercise], ["平均心率", `${singleReport.hrStats.average} bpm`], ["靶区时间", `${singleReport.targetZoneMinutes}分钟`], ["血压", latestBp], ["血氧", singleReport.spo2Summary], ["安全", singleReport.safetySummary]].map(([label, value]) => <InfoTile key={label} label={label} value={value} />)}
              </div>
              <div className="mt-4 rounded-xl border border-slate-100 p-3 text-xs leading-5 text-slate-600">心电：{singleReport.ecgSummary}</div>
              {linkedSafetyEvent && <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-800"><b>异常闭环：</b>{linkedSafetyEvent.patientComplaint}；{linkedSafetyEvent.fieldAction}；{linkedSafetyEvent.doctorReviewStatus}。</div>}
            </>
          )}
        </section>

        <section id="printable-prescription" className="card p-5">
          <SectionHeader title="AI运动参数建议" description={`依据：${task.sourceLabel}`} action={<StatusBadge tone={task.status === "completed" ? "green" : "orange"}>{prescriptionStatusLabels[task.status]}</StatusBadge>} />
          <div className="space-y-3">
            <EditLine label="运动项目" value={exercise} setValue={setExercise} disabled={task.status === "completed"} />
            <EditLine label="频次" value={frequency} setValue={setFrequency} disabled={task.status === "completed"} />
            <EditLine label="热身 + 训练 + 放松" value={times} setValue={setTimes} disabled={task.status === "completed"} />
            <EditLine label="靶心率" value={targetHr} setValue={setTargetHr} disabled={task.status === "completed"} />
            <EditLine label="功率/阻力" value={power} setValue={setPower} disabled={task.status === "completed"} />
            <EditLine label="RPE" value={rpe} setValue={setRpe} disabled={task.status === "completed"} />
            <label><span className="field-label">饮食与注意事项</span><textarea value={diet} onChange={(event) => setDiet(event.target.value)} disabled={task.status === "completed"} className="text-field min-h-20 resize-none disabled:bg-slate-50" /></label>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">上一版：{previousVersion.version} · {previousVersion.targetPower.join("–")}W · {previousVersion.targetHr.join("–")} bpm。AI建议仅为草稿，医生确认后才能签名。</div>
          {task.missingFields?.length && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">缺失关键数据：{task.missingFields.join("、")}。可保存草稿，禁止确认和签名。</div>}
          <div className="mt-5 flex flex-wrap gap-2">
            {task.status === "pending_generation" && <button type="button" className="btn-primary" onClick={() => onGenerate(task.id)}><Sparkles className="h-4 w-4" />生成AI草稿</button>}
            {task.status === "pending_review" && <button type="button" className="btn-primary" disabled={!canConfirm} onClick={() => onConfirm(task.id)}><PenTool className="h-4 w-4" />医生确认参数</button>}
            {task.status === "pending_signature" && <button type="button" className="btn-primary" onClick={() => onSign(task.id)}><Signature className="h-4 w-4" />数字签名</button>}
            {task.status === "completed" && <button type="button" className="btn-primary" onClick={printFinalReport}><Printer className="h-4 w-4" />打印最终报告</button>}
            <button type="button" className="btn-secondary" onClick={() => onOpen(task.id)}><BadgeCheck className="h-4 w-4" />进入完整复核页</button>
          </div>
          {task.status === "completed" && <div className="print-only"><h1>心脏康复最终处方报告</h1><p>患者：{appointment.patientName}　处方编号：{task.id}　版本：{task.version}</p><p>报告依据：{task.sourceLabel}　签署人：{task.signedBy ?? task.confirmedBy ?? "待签署"}　签名时间：{task.signedAt}</p><p>处方参数：{exercise}，{frequency}，{times}，靶心率 {targetHr}，功率 {power}，RPE {rpe}</p><p>注意事项：{diet}</p></div>}
        </section>
      </div>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-2 text-xs font-bold leading-5 text-slate-800">{value}</p></div>;
}

function OverviewMetric({ icon, label, value, note, tone = "blue", onClick }: { icon: React.ReactNode; label: string; value: string; note: string; tone?: "blue" | "orange" | "red" | "green"; onClick?: () => void }) {
  const classes = {
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    green: "bg-emerald-50 text-emerald-700"
  };
  const content = (
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${classes[tone]}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-slate-400">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
        <b className="text-3xl text-slate-950">{value}</b>
      </div>
  );
  const className = "w-full rounded-xl border border-slate-100 bg-white px-4 py-4 text-left shadow-sm";
  return onClick
    ? <button type="button" onClick={onClick} className={`${className} cursor-pointer hover:border-amber-200 hover:bg-amber-50/40`} aria-label={`${label} ${value}，进入处方管理查看未完成处方`}>{content}</button>
    : <article className={className}>{content}</article>;
}

function TrendCard({ values }: { values: number[] }) {
  const points = values.map((value, index) => `${20 + index * 72},${150 - value}`).join(" ");
  return (
    <section className="card p-5">
      <SectionHeader title="本周康复闭环趋势" description="参考资料页的数据趋势结构，展示训练完成、报告回流和处方复核的综合变化。" action={<StatusBadge tone="blue"><BarChart3 className="h-3.5 w-3.5" />近 7 天</StatusBadge>} />
      <div className="mt-2 h-44 rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
        <svg viewBox="0 0 480 170" className="h-full w-full" role="img" aria-label="本周康复闭环趋势折线图">
          {[30, 70, 110, 150].map((y) => <line key={y} x1="0" x2="480" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />)}
          <polyline points={points} fill="none" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {values.map((value, index) => <circle key={`${value}-${index}`} cx={20 + index * 72} cy={150 - value} r="5" fill="#0ea5e9" stroke="white" strokeWidth="3" />)}
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">{["周一", "周二", "周三", "周四", "周五", "周六", "今日"].map((day) => <span key={day}>{day}</span>)}</div>
    </section>
  );
}

function RankingCard({ items }: { items: readonly (readonly [string, number, string])[] }) {
  const max = Math.max(...items.map((item) => item[1]));
  return (
    <section className="card p-5">
      <SectionHeader title="医生待办任务构成" description="用排行榜形式展示今日最需要医生注意的工作类型。" />
      <div className="mt-6 flex h-44 items-end justify-center gap-10">
        {items.map(([label, value, note], index) => (
          <div key={label} className="flex w-24 flex-col items-center">
            <span className="mb-2 text-sm font-bold text-slate-900">{value}</span>
            <div className="w-16 rounded-t-xl bg-gradient-to-b from-sky-500 to-medical-700 shadow-sm" style={{ height: `${Math.max(42, (value / max) * 128)}px` }} />
            <span className="mt-3 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">NO.{index + 1}</span>
            <b className="mt-1 text-xs text-slate-800">{label}</b>
            <span className="mt-0.5 text-[10px] text-slate-400">{note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReminderCard({ items }: { items: readonly (readonly [string, string, string, string])[] }) {
  const dotClasses: Record<string, string> = { red: "bg-red-500", orange: "bg-amber-500", blue: "bg-sky-500" };
  return (
    <section className="card overflow-hidden">
      <div className="px-5 pt-5"><SectionHeader title="提醒信息" description="把异常、到期和数据缺失放在医生首页，不让关键事项藏在列表里。" action={<button type="button" className="text-xs font-bold text-medical-700">查看全部</button>} /></div>
      <div className="divide-y divide-slate-100">
        {items.map(([title, detail, time, tone]) => (
          <div key={title} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4">
            <div className="flex gap-3">
              <span className={`mt-1.5 h-2 w-2 rounded-full ${dotClasses[tone] ?? dotClasses.blue}`} />
              <div>
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
              </div>
            </div>
            <span className="font-mono text-[10px] text-slate-400">{time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TodayAppointmentCard({ appointments, onOpen }: { appointments: DoctorAppointment[]; onOpen: (taskId: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const visibleAppointments = showAll ? appointments : appointments.slice(0, 3);
  const hasMore = appointments.length > 3;
  return (
    <section className="card overflow-hidden">
      <div className="px-5 pt-5">
        <SectionHeader
          title="今日预约患者"
          description="按预约时间展示今日患者，点击可进入对应处方任务。"
          action={hasMore
            ? <button type="button" onClick={() => setShowAll((current) => !current)} className="text-xs font-bold text-medical-700">{showAll ? "收起" : `查看全部（${appointments.length}）`}</button>
            : <span className="text-xs font-bold text-slate-400">共 {appointments.length} 人</span>}
        />
      </div>
      <div className="divide-y divide-slate-100">
        {visibleAppointments.map((appointment) => (
          <button key={appointment.id} type="button" onClick={() => onOpen(appointment.linkedTaskId)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4 text-left hover:bg-blue-50">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-medical-100 text-sm font-bold text-medical-700">{appointment.patientName.slice(0, 1)}</span>
            <span>
              <span className="flex items-center gap-2"><b className="text-sm text-slate-900">{appointment.patientName}</b><StatusBadge tone={appointment.risk === "高危" ? "red" : appointment.risk === "中危" ? "orange" : "green"}>{appointment.risk}</StatusBadge></span>
              <span className="mt-1 block text-xs text-slate-500">{appointment.stage} · {appointment.purpose}</span>
            </span>
            <span className="text-right"><span className="block text-[10px] font-bold text-slate-400">预约时间</span><span className="mt-1 block font-mono text-sm font-bold text-slate-700">{appointment.time}</span></span>
          </button>
        ))}
      </div>
    </section>
  );
}

function EditLine({ label, value, setValue, disabled }: { label: string; value: string; setValue: (value: string) => void; disabled: boolean }) {
  return <label><span className="field-label">{label}</span><input value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} className="text-field disabled:bg-slate-50" /></label>;
}
